from flask import Flask, request, jsonify, render_template, Response
import socket
import os
import threading
import queue
import json
from enum import IntEnum, Enum

app = Flask(__name__)

subscribers = set()
subs_lock = threading.Lock()

loco_state = {}
class SystemState(str, Enum):
    """System state as string-valued enum to keep JSON/API wire format unchanged."""
    STOPPED = 'stopped'
    RUNNING = 'running'
    HALTED  = 'halted'
system_state = SystemState.STOPPED

path_config_files = 'tmp'
UDP_IP = '192.168.20.42'
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
    sock.sendto(send_bytes, (UDP_IP, UDP_PORT_TX))

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

def _require_json() -> dict:
    """Return JSON body or an empty dict if none was provided."""
    return request.get_json(silent=True) or {}

def _require_int(data: dict, key: str, err_msg: str) -> int:
    """Fetch and cast a JSON field to int; raise ValueError with friendly message on failure."""
    try:
        return int(data.get(key))
    except (TypeError, ValueError):
        raise ValueError(err_msg)


def _get_first(data: dict, *keys):
    """Return the first present key from *keys in data (or None)."""
    for k in keys:
        if k in data:
            return data.get(k)
    return None

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

def _clamp_speed10(x: int) -> int:
    """Clamp speed to 10-bit range (0..1023)."""
    return max(0, min(1023, int(x)))


def _payload_system_toggle(device_uid: int, running: bool) -> bytes:
    """Build payload for starting/stopping the system."""
    b = bytearray()
    b.extend(device_uid.to_bytes(4, 'big'))
    b.append(1 if running else 0)
    return b

def _payload_speed(loco_uid: int, speed: int) -> bytes:
    """Build payload for setting a locomotive's speed."""
    b = bytearray()
    b.extend(loco_uid.to_bytes(4, 'big'))
    b.append(speed & 255)
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
            while True:
                data = q.get()
                yield f'data: {data}\n\n'
        except GeneratorExit:
            pass
        finally:
            with subs_lock:
                subscribers.discard(q)

def _ensure_state(uid: int):
    """Return mutable state dict for a loco, creating defaults if missing."""
    st = loco_state.get(uid)
    if st is None:
        st = {'speed': 0, 'direction': 1, 'functions': {}}
        loco_state[uid] = st
    return st

def parse_cs2_generic(file_path: str) -> dict:
    """Generic, lenient parser for *.cs2 files.

    Skips meta sections ``version`` and ``session`` (including their nested keys) as per protocol doc.
    Also skips any bracketed header-like lines (e.g. "[ ... ]") and ignores root-level key/value pairs
    before the first real section begins.

    Parsing rules:
      - Blank lines are ignored.
      - "section{" starts a nested mapping; "}" closes it.
      - Lines beginning with a dot inside a section denote 'key=value' pairs ('.name=ICE 3').
      - Repeated section names become lists.
      - Values are parsed as int (0x / decimal) or left as string if not numeric.
      - Sections named in SKIP_SECTIONS are skipped entirely.
      - Root-level key/value pairs (before the first section) are ignored.

    Returns:
      A nested dict where repeated section names map to a list of dicts.
    """

    SKIP_SECTIONS = {"version", "session"}  # case-insensitive check below

    def parse_value(s: str):
        s = s.strip()
        if s.lower().startswith("0x"):
            try:
                return int(s, 16)
            except ValueError:
                return s
        try:
            return int(s)
        except ValueError:
            return s

    root: dict = {}
    stack = [root]
    section_stack = ["__root__"]
    opened_any_section = False  # becomes True once first real section starts

    # Skipping state for sections we ignore
    skipping = False         # inside a brace-delimited section we skip
    skip_depth = 0
    skipping_lone = False    # skipping a "lone" section without immediate '{'

    with open(file_path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue

            # Skip bracketed header lines like "[...]" at file start
            if line.startswith("[") and line.endswith("]"):
                continue

            # If currently skipping a brace-delimited section (e.g., "version{ ... }")
            if skipping:
                if line.endswith("{"):
                    # nested section inside a skipped section
                    skip_depth += 1
                    continue
                if line == "}":
                    skip_depth -= 1
                    if skip_depth <= 0:
                        skipping = False
                    continue
                # Any content within skipped section is ignored
                continue

            # If skipping a "lone" section (without an immediate '{'):
            # Stop skipping when a new section marker begins.
            if skipping_lone:
                if line.endswith("{") or ("." not in line and "=" not in line):
                    # this indicates a new (next) section => end skipping state
                    skipping_lone = False
                else:
                    # ignore key/value lines belonging to the skipped lone section
                    continue

            # Section with trailing '{'
            if line.endswith("{"):
                sect = line.split("{", 1)[0].strip()
                if sect.lower() in SKIP_SECTIONS:
                    skipping = True
                    skip_depth = 1
                    continue

                opened_any_section = True
                parent = stack[-1]
                node = {}
                if sect in parent:
                    if isinstance(parent[sect], list):
                        parent[sect].append(node)
                    else:
                        parent[sect] = [parent[sect], node]
                else:
                    parent[sect] = node
                stack.append(node)
                section_stack.append(sect)
                continue

            # Section close
            if line == "}":
                if len(stack) > 1:
                    stack.pop()
                    section_stack.pop()
                continue

            # Key within a section: ".key=value"
            if line.startswith("."):
                kv = line[1:].split("=", 1)
                if len(kv) == 2:
                    k, v = kv
                    stack[-1][k.strip()] = parse_value(v)
                continue

            # Lone section marker (no '=' and no dot), e.g. "lokomotive"
            if " " not in line and "=" not in line:
                sect = line
                if sect.lower() in SKIP_SECTIONS:
                    # start skipping until next section marker
                    skipping_lone = True
                    continue

                opened_any_section = True
                parent = stack[-1]
                node = {}
                if sect in parent:
                    if isinstance(parent[sect], list):
                        parent[sect].append(node)
                    else:
                        parent[sect] = [parent[sect], node]
                else:
                    parent[sect] = node
                stack.append(node)
                section_stack.append(sect)
                continue

            # key=value (either inside a section, or at root)
            # Ignore root-level kv BEFORE the first section starts (header-ish)
            kv = line.split("=", 1)
            if len(kv) == 2:
                if not opened_any_section and len(stack) == 1:
                    # header kv -> ignore
                    continue
                k, v = kv
                stack[-1][k.strip()] = parse_value(v)

    return root

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
    return articles

@app.route('/')
def index():
    """Function `index`.

Args:
    None

Returns:
    See implementation."""
    return render_template('index.html')

@app.route('/api/state')
def get_state():
    """Return full state or state for a specific loco_id (query param)."""
    uid = request.args.get('loco_id', type=int)
    if uid is None:
        return jsonify({str(k): v for k, v in loco_state.items()})
    return jsonify(loco_state.get(uid, {}))

@app.route('/api/locs')
def get_locs():
    """Function `get_locs`.

Args:
    None

Returns:
    See implementation."""
    loc_dict = {str(loco['uid']): loco for loco in loc_list}
    return jsonify(loc_dict)

@app.route('/api/toggle', methods=['POST'])
def toggle():
    """Function `toggle`.

Args:
    None

Returns:
    See implementation."""
    data = _require_json()
    running = bool(data.get(K_STATE, False))
    can_id = build_can_id(DEVICE_UID, Command.SYSTEM, prio=0, resp=0)
    data_bytes = _payload_system_toggle(DEVICE_UID, running)
    data_bytes = _pad_to_8(data_bytes)
    try:
        _udp_send_frame(can_id, data_bytes, dlc=5)
        return jsonify(status='ok')
    except Exception as e:
        return (jsonify(status='error', message=str(e)), 500)

@app.route('/api/speed', methods=['POST'])
def speed():
    """Function `speed`.

Args:
    None

Returns:
    See implementation."""
    data = _require_json()
    try:
        uid_int = _require_int(data, K_LOCO_ID, 'invalid loco_id')
    except ValueError as e:
        return (jsonify(status='error', message=str(e)), 400)
    speed = data.get(K_SPEED)
    st = _ensure_state(uid_int)
    try:
        speed10 = _clamp_speed10(int(speed))
        st['speed'] = speed10
    except (TypeError, ValueError):
        return (jsonify(status='error', message='invalid speed'), 400)
    can_id = build_can_id(DEVICE_UID, Command.SPEED, prio=0, resp=0)
    data_bytes = bytearray()
    data_bytes.extend(uid_int.to_bytes(4, 'big'))
    data_bytes.extend(speed10.to_bytes(2, 'big'))
    data_bytes = _pad_to_8(data_bytes)
    try:
        _udp_send_frame(can_id, data_bytes, dlc=6)
        return jsonify(status='ok')
    except Exception as e:
        return (jsonify(status='error', message=str(e)), 500)

@app.route('/api/direction', methods=['POST'])
def direction():
    """Function `direction`.

Args:
    None

Returns:
    See implementation."""
    data = _require_json()
    try:
        uid_int = _require_int(data, K_LOCO_ID, 'invalid loco_id')
    except ValueError as e:
        return (jsonify(status='error', message=str(e)), 400)
    direction = _get_first(data, K_DIRECTION, 'dir')
    st = _ensure_state(uid_int)
    try:
        dir_int = _coerce_direction(direction)
        st['direction'] = dir_int
    except (TypeError, ValueError):
        return (jsonify(status='error', message='invalid direction'), 400)
    can_id = build_can_id(DEVICE_UID, Command.DIRECTION, prio=0, resp=0)
    data_bytes = _payload_direction(uid_int, dir_int)
    data_bytes = _pad_to_8(data_bytes)
    try:
        _udp_send_frame(can_id, data_bytes, dlc=5)
        return jsonify(status='ok')
    except Exception as e:
        return (jsonify(status='error', message=str(e)), 500)

@app.route('/api/function', methods=['POST'])
def function():
    """Function `function`.

Args:
    None

Returns:
    See implementation."""
    data = _require_json()
    try:
        uid_int = _require_int(data, K_LOCO_ID, 'invalid loco_id')
    except ValueError as e:
        return (jsonify(status='error', message=str(e)), 400)
    function = _get_first(data, K_FUNCTION, 'fn')
    value = _get_first(data, K_VALUE, 'val', 'on')
    st = _ensure_state(uid_int)
    try:
        fn = int(function)
        val = bool(value)
    except (TypeError, ValueError):
        return (jsonify(status='error', message='invalid function/value'), 400)
    st['functions'][fn] = val
    can_id = build_can_id(DEVICE_UID, Command.FUNCTION, prio=0, resp=0)
    data_bytes = _payload_function(uid_int, fn, _coerce_bool(value))
    data_bytes = _pad_to_8(data_bytes)
    try:
        _udp_send_frame(can_id, data_bytes, dlc=6)
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
            if command == Command.SYSTEM and dlc >= 5:
                sub = data[4]
                if sub in (0, 1, 2):
                    state = {0: SystemState.STOPPED, 1: SystemState.RUNNING, 2: SystemState.HALTED}[sub]
                    system_state = state
                    publish_event({'type': 'system', 'status': state, 'resp': resp_bit})
            elif command == Command.SPEED and dlc >= 6:
                loc_id = int.from_bytes(data[0:4], 'big')
                speed = int.from_bytes(data[4:6], 'big')
                st = _ensure_state(int(loc_id))
                st['speed'] = int(speed)
                publish_event({'type': 'speed', 'loc_id': loc_id, 'value': speed, 'resp': resp_bit})
            elif command == Command.DIRECTION and dlc >= 5:
                loc_id = int.from_bytes(data[0:4], 'big')
                direction = data[4]
                st = _ensure_state(int(loc_id))
                st['direction'] = int(direction)
                publish_event({'type': 'direction', 'loc_id': loc_id, 'value': direction, 'resp': resp_bit})
            elif command == Command.FUNCTION and dlc >= 5:
                loc_id = int.from_bytes(data[0:4], 'big')
                fn_no = data[4]
                fn_val = data[5] if dlc >= 6 else 1
                st = _ensure_state(int(loc_id))
                st['functions'][int(fn_no)] = bool(fn_val)
                publish_event({'type': 'function', 'loc_id': loc_id, 'fn': fn_no, 'value': fn_val, 'resp': resp_bit})
    except Exception as e:
        publish_event({'type': 'error', 'message': f'UDP listener crashed: {e}'})
    finally:
        try:
            s.close()
        except Exception:
            pass

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

if __name__ == '__main__':
    loc_list = parse_lokomotive_cs2(os.path.join(path_config_files, 'lokomotive.cs2'))
    switch_list = parse_magnetartikel_cs2(os.path.join(path_config_files, 'magnetartikel.cs2'))
    try:
        for loco in loc_list:
            _ensure_state(int(loco.get('uid') if isinstance(loco, dict) else loco['uid']))
    except Exception:
        pass
    t = threading.Thread(target=listen_cs2_udp, args=('', UDP_PORT_RX, _stop_evt), daemon=True)
    t.start()
    app.run(host='0.0.0.0', port=5005)