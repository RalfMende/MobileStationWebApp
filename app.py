"""
THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
stuff. If we meet someday, and you think this stuff is worth it, you can
buy me a beer in return.
Ralf Mende
"""

from flask import Flask, request, jsonify, render_template, Response, stream_with_context
import socket
import os
import threading
import queue
import json
from enum import IntEnum, Enum
import argparse

app = Flask(__name__)

subscribers = set()
subs_lock = threading.Lock()

loco_state = {}
switch_state = [0] * 64  # 64 switches, default state 0

class SystemState(str, Enum):
    """System state as string-valued enum to keep JSON/API wire format unchanged."""
    STOPPED = 'stopped'
    RUNNING = 'running'
    HALTED  = 'halted'
system_state = SystemState.STOPPED

path_config_files = 'tmp'  # default, kann via CLI/Debug überschrieben werden
UDP_IP = '192.168.20.42'   # default, kann via CLI/Debug überschrieben werden
UDP_PORT_TX = 15731
UDP_PORT_RX = 15730
DEVICE_UID = 0

K_STATE = 'state'
K_LOCO_ID = 'loco_id'
K_SPEED = 'speed'
K_DIRECTION = 'direction'
K_FUNCTION = 'function'
K_VALUE = 'value'
_listener_started = False
_stop_evt = threading.Event()

class Command(IntEnum):
    SYSTEM = 0
    DISCOVERY = 1
    BIND = 2
    VERIFY = 3
    SPEED = 4
    DIRECTION = 5
    FUNCTION = 6
    READ_CONFIG = 7
    WRITE_CONFIG = 8
    SWITCH = 11

class SystemSubCmd(IntEnum):
    """System sub-commands as per CS2 protocol (table 1.4 / section 2)."""
    STOP = 0x00
    GO = 0x01
    HALT = 0x02
    LOCO_EMERGENCY_STOP = 0x03
    LOCO_CYCLE_STOP = 0x04
    LOCO_DATA_PROTOCOL = 0x05
    ACCESSORY_SWITCH_TIME = 0x06
    FAST_READ_MFX_SID = 0x07
    TRACK_PROTOCOL_ENABLE = 0x08
    MFX_REENROLL_COUNTER = 0x09
    SYSTEM_OVERLOAD = 0x0A
    SYSTEM_STATUS = 0x0B
    DEVICE_ID = 0x0C
    MFX_SEEK = 0x30
    SYSTEM_RESET = 0x80

class Direction(IntEnum):
    """Direction parameter values used by the 'Lok Richtung' command."""
    KEEP = 0
    FORWARD = 1
    REVERSE = 2
    TOGGLE = 3

# Function index and limits per protocol (0 == F0, 31 == F31).
FUNCTION_MIN = 0
FUNCTION_MAX = 31

#************************************************************************************
# General event handling
#************************************************************************************

def _require_json() -> dict:
    """Return JSON body or an empty dict if none was provided."""
    return request.get_json(silent=True) or {}

def publish_event(ev: dict):
    """Function `publish_event`.
    Args:
        ev
    Returns:
        See implementation."""
    try:
        data = json.dumps(ev, separators=(',', ':'))
    except Exception:
        return
    with subs_lock:
        dead = []
        for q in list(subscribers):
            try:
                q.put_nowait(data)
            except Exception:
                dead.append(q)
        for q in dead:
            subscribers.discard(q)

@app.get('/api/events')
def sse_events():
    """Function `sse_events`.
    Args:
        None
    Returns:
        See implementation."""
    q = queue.Queue(maxsize=1000)
    with subs_lock:
        subscribers.add(q)

    def stream():
        """Function `stream`.
        Args:
            None
        Returns:
            See implementation."""
        try:
            # On first connect, send a snapshot of current server state to this subscriber only.
            try:
                # 1) System running state (1 running, 0 otherwise)
                status = 1 if system_state == SystemState.RUNNING else 0
                q.put_nowait(json.dumps({'type': 'system', 'status': status}, separators=(',', ':')))

                # 2) Locomotive states: speed, direction, and active functions
                for uid, st in loco_state.items():
                    try:
                        spd = int(st.get('speed', 0))
                        dirv = int(st.get('direction', 1))
                        q.put_nowait(json.dumps({'type': 'speed', 'loc_id': uid, 'value': spd}, separators=(',', ':')))
                        q.put_nowait(json.dumps({'type': 'direction', 'loc_id': uid, 'value': dirv}, separators=(',', ':')))
                        # Functions: emit only those that are truthy/defined
                        fnmap = st.get('functions') or {}
                        for fn_idx, active in fnmap.items():
                            try:
                                fn_i = int(fn_idx)
                                fn_v = 1 if bool(active) else 0
                                q.put_nowait(json.dumps({'type': 'function', 'loc_id': uid, 'fn': fn_i, 'value': fn_v}, separators=(',', ':')))
                            except Exception:
                                continue
                    except Exception:
                        continue

                # 3) Switch states (0..63)
                try:
                    for idx, val in enumerate(switch_state):
                        q.put_nowait(json.dumps({'type': 'switch', 'idx': idx, 'value': int(val)}, separators=(',', ':')))
                except Exception:
                    # If switch_state is a dict-like mapping (unlikely), fall back
                    try:
                        for idx in range(64):
                            v = int(switch_state.get(idx, 0))
                            q.put_nowait(json.dumps({'type': 'switch', 'idx': idx, 'value': v}, separators=(',', ':')))
                    except Exception:
                        pass
            except Exception:
                # Snapshot is best-effort; continue with live stream regardless
                pass

            while True:
                data = q.get()
                yield f'data: {data}\n\n'
        except GeneratorExit:
            pass
        finally:
            with subs_lock:
                subscribers.discard(q)

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no"  # wichtig, falls hinter nginx
    }
    return Response(stream_with_context(stream()),
                    mimetype='text/event-stream',
                    headers=headers)

#************************************************************************************
# System state handling
#************************************************************************************

def _payload_system_state(device_uid: int, running: bool) -> bytes:
    """Build payload for starting/stopping the system."""
    b = bytearray()
    b.extend(device_uid.to_bytes(4, 'big'))
    b.append(1 if running else 0)
    return b

def set_system_state(new_state):
    global system_state
    if system_state != new_state:
        system_state = new_state
        state_wif = 1 if system_state == SystemState.RUNNING else 0
        publish_event({'type': 'system', 'status': state_wif})

@app.route('/api/stop_button', methods=['POST'])
def toggle():
    """Function `stop_button`.
    Args:
        None
    Returns:
        See implementation."""
    data = _require_json()
    running = bool(data.get(K_STATE, False))
    payload = {
        K_LOCO_ID: DEVICE_UID,
        K_STATE: running
    }
    set_system_state(SystemState.RUNNING if running else SystemState.STOPPED)
    return send_cs2_udp(
        payload,
        [K_STATE],
        Command.SYSTEM,
        _payload_system_state,
        5
    )

#************************************************************************************
# Loco state handling
#************************************************************************************

def _ensure_loco_state(uid: int):
    """Return mutable state dict for a loco, creating defaults if missing."""
    st = loco_state.get(uid)
    if st is None:
        st = {'speed': 0, 'direction': 1, 'functions': {}}
        loco_state[uid] = st
    return st

def _payload_speed(loco_uid: int, speed: int) -> bytes:
    """Build payload for setting a locomotive's speed."""
    b = bytearray()
    b.extend(loco_uid.to_bytes(4, 'big'))
    b.extend(int(speed).to_bytes(2, 'big'))
    return b

def _payload_direction(loco_uid: int, direction: int) -> bytes:
    """Build payload for setting a locomotive's direction."""
    b = bytearray()
    b.extend(loco_uid.to_bytes(4, 'big'))
    b.append(direction & 255)
    return b

def _payload_function(loco_uid: int, function: int, value: int) -> bytes:
    """Build payload for toggling a locomotive function (e.g., lights)."""
    b = bytearray()
    b.extend(loco_uid.to_bytes(4, 'big'))
    b.append(function & 255)
    b.append(value & 255)
    return b

def _get_first(data: dict, *keys):
    """Return the first present key from *keys in data (or None)."""
    for k in keys:
        if k in data:
            return data.get(k)
    return None

def set_loco_state_speed(loc_id, speed):
    st = _ensure_loco_state(int(loc_id))
    st['speed'] = int(speed)
    publish_event({'type': 'speed', 'loc_id': loc_id, 'value': speed})

def set_loco_state_direction(loc_id, direction):
    st = _ensure_loco_state(int(loc_id))
    st['direction'] = int(direction)
    publish_event({'type': 'direction', 'loc_id': loc_id, 'value': direction})

def set_loco_state_function(loc_id, fn_no, fn_val):
    st = _ensure_loco_state(int(loc_id))
    st['functions'][int(fn_no)] = bool(fn_val)
    publish_event({'type': 'function', 'loc_id': loc_id, 'fn': fn_no, 'value': fn_val})
    
@app.route('/api/loco_list')
def get_locs():
    """Function `get_locs`.
    Args:
        None
    Returns:
        See implementation."""
    loc_dict = {str(loco['uid']): loco for loco in loc_list}
    return jsonify(loc_dict)

@app.route('/api/loco_state')
def get_state():
    """Return full state or state for a specific loco_id (query param)."""
    uid = request.args.get('loco_id', type=int)
    if uid is None:
        return jsonify({str(k): v for k, v in loco_state.items()})
    return jsonify(loco_state.get(uid, {}))

@app.route('/api/control_event', methods=['POST'])
def control_event():
    """Unified control endpoint for speed, direction, and function.

    Expected JSON payload:
    - loco_id: number (required)
    - One of:
        • speed: 0..1023
        • direction: 0/1/2/3 or 'keep'/'forward'/'reverse'/'toggle'
        • function (+ value): fn/function index and value/val/on (0/1 or truthy)
    """
    data = _require_json()
    if data.get(K_LOCO_ID) is None:
        return jsonify({'status': 'error', 'message': 'loco_id required'}), 400

    if K_SPEED in data:
        set_loco_state_speed(data.get(K_LOCO_ID), data.get(K_SPEED))
        return send_cs2_udp(
            data,
            [K_SPEED],
            Command.SPEED,
            _payload_speed,
            6
        )

    if K_DIRECTION in data:
        set_loco_state_direction(data.get(K_LOCO_ID), data.get(K_DIRECTION))
        return send_cs2_udp(
            data,
            [K_DIRECTION],
            Command.DIRECTION,
            _payload_direction,
            5
        )

    fn = _get_first(data, K_FUNCTION, 'fn')
    if fn is not None:
        val = _get_first(data, K_VALUE, 'val', 'on')
        data[K_FUNCTION] = fn
        data[K_VALUE] = val
        set_loco_state_function(data.get(K_LOCO_ID), fn, val)
        return send_cs2_udp(
            data,
            [K_FUNCTION, K_VALUE],
            Command.FUNCTION,
            _payload_function,
            6
        )
    
    return jsonify({'status': 'error', 'message': 'no control field (speed/direction/function)'}), 400

#************************************************************************************
# Switch state handling
#************************************************************************************

def _ensure_switch_state(uid: int):
    """Return mutable state dict for a schitch, creating defaults if missing."""
    st = switch_state.get(uid)
    if st is None:
        st = {'value': 0}
        switch_state[uid] = st
    return st

def _payload_switch(loco_uid: int, switch_state: int) -> bytes:
    # CS2-Protokoll: 4 Byte Index, 1 Byte Wert, 1 Byte Protokoll (optional)
    b = bytearray()
    b.extend(loco_uid.to_bytes(4, 'big'))
    b.append(switch_state & 255)
    b.append(0x01)
    return b

@app.route('/api/switch_list')
def get_switch_list():
    return jsonify(switch_list)

@app.route('/api/switch_state')
def get_switch_state():
    """Return the state of all switches."""
    return jsonify({'switch_state': switch_state})

def set_switch_state(idx, value):
    idx = int(idx)
    value = int(value)
    if 0 <= idx < 64:
        switch_state[idx] = value
        publish_event({'type': 'switch', 'idx': idx, 'value': value})

@app.route('/api/keyboard_event', methods=['POST'])
def keyboard_event():
    """Empfängt Keyboard-Events von der UI, setzt den Wert im switch_state und sendet ein UDP-Frame gemäß CS2-Protokoll."""
    data = _require_json()
    idx = data.get('idx')
    value = data.get('value')
    if idx is None or value is None:
        return jsonify({'status': 'error', 'message': 'idx and value required'}), 400
    try:
        idx = int(idx)
        value = int(value)
    except Exception:
        return jsonify({'status': 'error', 'message': 'idx and value must be integers'}), 400

    set_switch_state(idx, value)

    # Determine UID from switch_list if available
    uid = idx
    artikel = switch_list.get('artikel') if isinstance(switch_list, dict) else None
    if isinstance(artikel, list) and idx < len(artikel):
        entry = artikel[idx]
        uid = entry.get('uid', idx)

    payload = {
        K_LOCO_ID: uid,
        K_VALUE: value
    }
    return send_cs2_udp(
        payload,
        [K_VALUE],
        Command.SWITCH,
        _payload_switch,
        6
    )
    
#************************************************************************************
# CS2 interaction
#************************************************************************************

def generate_hash(uid: int) -> int:
    """Function `generate_hash`.
    Args:
        uid
    Returns:
        See implementation."""
    hi = uid >> 16 & 65535
    lo = uid & 65535
    h = hi ^ lo
    h = h << 3 & 65280 | 768 | h & 127
    return h & 65535

def build_can_id(uid: int, command: int, prio: int=0, resp: int=0) -> int:
    """Function `build_can_id`.
    Args:
        uid, command, prio, resp
    Returns:
        See implementation."""
    hash16 = generate_hash(uid)
    return prio << 25 | (command << 1 | resp & 1) << 16 | hash16

def _pad_to_8(data: bytearray | bytes) -> bytes:
    """Utility: Pad payload to 8 bytes for CAN frames."""
    b = bytearray(data)
    while len(b) < 8:
        b.append(0)
    return bytes(b)

def _udp_send_frame(can_id: int, payload: bytes | bytearray, dlc: int) -> None:
    """Utility: Assemble and send one UDP-encapsulated CAN frame to the CS2 bridge."""
    data_bytes = _pad_to_8(payload)
    send_bytes = bytearray()
    send_bytes.extend(can_id.to_bytes(4, 'big'))
    send_bytes.append(dlc & 255)
    send_bytes.extend(data_bytes)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        target_ip = app.config.get('UDP_IP', UDP_IP)
        target_port = app.config.get('UDP_PORT_TX', UDP_PORT_TX)
    except Exception:
        target_ip = UDP_IP
        target_port = UDP_PORT_TX
    sock.sendto(send_bytes, (target_ip, target_port))

def _require_int(data: dict, key: str, err_msg: str) -> int:
    """Fetch and cast a JSON field to int; raise ValueError with friendly message on failure."""
    try:
        return int(data.get(key))
    except (TypeError, ValueError):
        raise ValueError(err_msg)

def _clamp_speed10(x: int) -> int:
    """Clamp speed to 10-bit range (0..1023)."""
    return max(0, min(1023, int(x)))


def _coerce_direction(val) -> int:
    """Coerce direction input to enum int (KEEP/FORWARD/REVERSE/TOGGLE)."""
    try:
        if isinstance(val, (int, float)):
            i = int(val)
            return i
        s = str(val).strip().lower()
        mapping = {'keep': 0, 'forward': 1, 'fwd': 1, 'reverse': 2, 'rev': 2, 'toggle': 3}
        if s in mapping:
            return mapping[s]
        return int(s)
    except Exception:
        return 0

def _coerce_bool(val) -> int:
    """Coerce truthy/falsy representations to 0/1 int for payloads."""
    if isinstance(val, bool):
        return 1 if val else 0
    try:
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return 1 if int(val) != 0 else 0
        s = str(val).strip().lower()
        return 1 if s in ('1', 'true', 'on', 'yes') else 0
    except Exception:
        return 0

def send_cs2_udp(data, key_map, can_command, payload_func, dlc):
    """Send UDP frame for loco/switch commands. No state changes here."""
    try:
        uid_int = _require_int(data, K_LOCO_ID, 'invalid loco_id')
    except ValueError as e:
        return (jsonify(status='error', message=str(e)), 400)
    try:
        values = [data.get(k) for k in key_map]
        if can_command == Command.SPEED:
            values[0] = _clamp_speed10(int(values[0]))
        elif can_command == Command.DIRECTION:
            values[0] = _coerce_direction(values[0])
        elif can_command == Command.FUNCTION:
            values[0] = int(values[0])
            values[1] = _coerce_bool(values[1])
        elif can_command == Command.SWITCH:
            values[0] = int(values[0])
    except (TypeError, ValueError):
        return (jsonify(status='error', message=f'invalid {key_map}'), 400)
    can_id = build_can_id(DEVICE_UID, can_command, prio=0, resp=0)
    data_bytes = payload_func(uid_int, *values)
    data_bytes = _pad_to_8(data_bytes)
    try:
        _udp_send_frame(can_id, data_bytes, dlc=dlc)
        return jsonify(status='ok')
    except Exception as e:
        return (jsonify(status='error', message=str(e)), 500)
    
def listen_cs2_udp(host: str='', port: int=UDP_PORT_RX, stop_event: threading.Event | None=None):
    """Function `listen_cs2_udp`.
    Args:
        host, port, stop_event
    Returns:
        See implementation."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((host, port))
    except OSError as e:
        publish_event({'type': 'error', 'message': f'UDP bind failed: {e}'})
        return
    s.settimeout(1.0)
    try:
        while not (stop_event and stop_event.is_set()):
            try:
                pkt, _ = s.recvfrom(2048)
            except socket.timeout:
                continue
            except Exception as e:
                publish_event({'type': 'error', 'message': f'UDP recv error: {e}'})
                continue
            if len(pkt) != 13:
                continue
            can_id = int.from_bytes(pkt[0:4], 'big')
            dlc = pkt[4]
            data = pkt[5:13]
            cmd_resp = can_id >> 16 & 511
            command = cmd_resp >> 1 & 255
            resp_bit = cmd_resp & 1
            if resp_bit == 1:
                if command == Command.SYSTEM and dlc >= 5:
                    sub = data[4]
                    if sub in (0, 1, 2):
                        state = {0: SystemState.STOPPED, 1: SystemState.RUNNING, 2: SystemState.HALTED}[sub]
                        set_system_state(state)
                elif command == Command.SPEED and dlc >= 6:
                    loc_id = int.from_bytes(data[0:4], 'big')
                    speed = int.from_bytes(data[4:6], 'big')
                    set_loco_state_speed(loc_id, speed)
                elif command == Command.DIRECTION and dlc >= 5:
                    loc_id = int.from_bytes(data[0:4], 'big')
                    direction = data[4]
                    set_loco_state_direction(loc_id, direction)
                elif command == Command.FUNCTION and dlc >= 5:
                    loc_id = int.from_bytes(data[0:4], 'big')
                    fn_no = data[4]
                    fn_val = data[5] if dlc >= 6 else 1
                    set_loco_state_function(loc_id, fn_no, fn_val)
                elif command == Command.SWITCH and dlc >= 6:
                    #loc_id = int.from_bytes(data[0:4], 'big')
                    #idx = loc_id & 0xFFFF
                    #protocol = (loc_id >> 16) & 0xFFFF
                    idx = int.from_bytes(data[3:4], 'big')
                    value = data[4]
                    set_switch_state(idx, value)
    except Exception as e:
        publish_event({'type': 'error', 'message': f'UDP listener crashed: {e}'})
    finally:
        try:
            s.close()
        except Exception:
            pass

#************************************************************************************
# Custom Event API for Info-Site
#************************************************************************************

@app.route('/api/info_events', methods=['POST'])
def srseii_commands():
    """API-Endpunkt für Info-Seite: Führt beliebige Funktion für aktuelle Lok aus."""
    data = _require_json()
    loco_id = data.get('loco_id')
    fn_no = data.get('function', 0)
    value = data.get('value', 1)
    if loco_id is None:
        return jsonify({'status': 'error', 'message': 'loco_id fehlt'}), 400
    payload = {
        K_LOCO_ID: loco_id,
        K_FUNCTION: fn_no,
        K_VALUE: value
    }
    return send_cs2_udp(
        payload,
        [K_FUNCTION, K_VALUE],
        Command.FUNCTION,
        _payload_function,
        6
    )

#************************************************************************************
# Config file handling
#************************************************************************************

def parse_value(val):
    """Function `parse_value`.
    Args:
        val
    Returns:
        See implementation."""
    val = val.strip()
    if val.startswith('0x'):
        try:
            return int(val, 16)
        except ValueError:
            return val
    if val.isdigit():
        return int(val)
    return val

def magnetartikel_uid(id_int, dectyp):
    id_int = id_int - 1
    if dectyp == 'mm2':
        return 0x3000 | (id_int & 0x3FF)   # MM2
    elif dectyp == 'dcc':
        return 0x3800 | (id_int & 0x3FF)   # DCC
    elif dectyp == 'sx1':
        return 0x2800 | (id_int & 0x3FF)   # SX1
    else:
        return (id_int & 0x3FF)            # Fallback
    
def parse_lokomotive_cs2(file_path):
    """Function `parse_lokomotive_cs2`.
    Args:
        file_path
    Returns:
        See implementation."""
    locomotives = []
    current_locomotive = None
    current_functions = {}
    current_function_key = None
    parsing_function = False
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        for line in file:
            line = line.strip()
            if line == 'lokomotive':
                if current_locomotive:
                    if current_functions:
                        current_locomotive['funktionen'] = current_functions
                    locomotives.append(current_locomotive)
                current_locomotive = {}
                current_functions = {}
                current_function_key = None
                parsing_function = False
            elif current_locomotive is not None:
                if '.funktionen' in line:
                    parsing_function = True
                    current_function_key = None
                elif parsing_function and line.startswith('..nr='):
                    current_function_key = line.split('=', 1)[1].strip()
                    current_functions[current_function_key] = {}
                elif parsing_function and line.startswith('..') and ('=' in line) and current_function_key:
                    key, value = line[2:].split('=', 1)
                    current_functions[current_function_key][key.strip()] = parse_value(value)
                elif line.startswith('.') and '=' in line and (not line.startswith('..')):
                    key, value = line[1:].split('=', 1)
                    current_locomotive[key.strip()] = parse_value(value)
                    parsing_function = False
        if current_locomotive:
            if current_functions:
                current_locomotive['funktionen'] = current_functions
            locomotives.append(current_locomotive)
    return locomotives

def parse_magnetartikel_cs2(file_path):
    """Function `parse_magnetartikel_cs2`.
    Args:
        file_path
    Returns:
        See implementation."""
    articles = {}
    current_section = None
    current_entry = {}
    with open(file_path, 'r', encoding='utf-8') as file:
        for line in file:
            line = line.strip()
            if not line:
                continue
            if not line.startswith('.'):
                if line == 'artikel':
                    current_section = 'artikel'
                    current_entry = {}
                    if 'artikel' not in articles:
                        articles['artikel'] = []
                    articles['artikel'].append(current_entry)
            else:
                key_value = line.lstrip('.').split('=', 1)
                if len(key_value) == 2:
                    key, value = key_value
                    value = parse_value(value)
                    if current_section == 'artikel':
                        current_entry[key] = value
    for entry in articles.get('artikel', []):
        id_val = entry.get('id')
        dectyp = str(entry.get('dectyp', '')).lower()
        if id_val is not None:
            try:
                id_int = int(id_val)
            except Exception:
                continue
            entry['uid'] = magnetartikel_uid(id_int, dectyp)
    return articles

#************************************************************************************
# Main
#************************************************************************************
    
@app.route('/')
def index():
    """Function `index`.
    Args:
        None
    Returns:
        See implementation."""
    return render_template('index.html')

@app.route('/info')
def info():
    """Info-Seite für das Webinterface."""
    return render_template('info.html')

def parse_args():
    parser = argparse.ArgumentParser(description='MobileStationWebApp Server')
    parser.add_argument('--udp-ip', dest='udp_ip', default=UDP_IP, help='IP-Adresse des CS2-UDP-Ziels')
    parser.add_argument('--config', dest='config_path', default=path_config_files, help='Pfad zu den CS2-Konfigurationsdateien')
    parser.add_argument('--host', dest='host', default='0.0.0.0', help='Bind Host für Flask')
    parser.add_argument('--port', dest='port', type=int, default=6020, help='Port für Flask')
    return parser.parse_args()

def run_server(udp_ip: str = UDP_IP, config_path: str = path_config_files, host: str = '0.0.0.0', port: int = 6020):
    """Startet den Server mit konfigurierbarer UDP-IP und Pfad zu den CS2-Konfigdateien."""
    global loc_list, switch_list
    # App-Konfiguration setzen
    app.config['UDP_IP'] = udp_ip
    app.config['UDP_PORT_TX'] = UDP_PORT_TX
    app.config['UDP_PORT_RX'] = UDP_PORT_RX
    app.config['CONFIG_PATH'] = config_path

    # CS2-Dateien laden
    try:
        loc_list = parse_lokomotive_cs2(os.path.join(config_path, 'lokomotive.cs2'))
    except Exception as e:
        loc_list = []
        print(f"Error loading lokomotive.cs2 file: {e}")

    try:
        switch_list = parse_magnetartikel_cs2(os.path.join(config_path, 'magnetartikel.cs2'))
    except Exception as e:
        switch_list = []
        print(f"Error loading magnetartikel.cs2 file: {e}")

    # Loco-States initialisieren
    try:
        for loco in loc_list:
            _ensure_loco_state(int(loco.get('uid') if isinstance(loco, dict) else loco['uid']))
    except Exception:
        pass

    # UDP Listener starten
    t = threading.Thread(target=listen_cs2_udp, args=('', UDP_PORT_RX, _stop_evt), daemon=True)
    t.start()

    # Flask starten
    app.run(host=host, port=port)

if __name__ == '__main__':
    args = parse_args()
    run_server(udp_ip=args.udp_ip, config_path=args.config_path, host=args.host, port=args.port)