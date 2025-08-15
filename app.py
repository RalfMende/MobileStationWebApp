
from flask import Flask, request, jsonify, render_template, Response
import socket
import os
import threading
import queue
import json

app = Flask(__name__)

# === SSE PubSub for browser clients ===
subscribers = set()
subs_lock = threading.Lock()

def publish_event(ev: dict):
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

@app.get("/api/events")
def sse_events():
    q = queue.Queue(maxsize=1000)
    with subs_lock:
        subscribers.add(q)

    def stream():
        try:
            while True:
                data = q.get()
                yield f"data: {data}\n\n"
        except GeneratorExit:
            pass
        finally:
            with subs_lock:
                subscribers.discard(q)

# ---- Server-side loco state (uid -> dict) ----
# We keep the state in-memory. It can optionally be persisted later.
loco_state = {}  # type: dict[int, dict]

def _ensure_state(uid: int):
    """Return mutable state dict for a loco, creating defaults if missing."""
    st = loco_state.get(uid)
    if st is None:
        st = {"speed": 0, "direction": 1, "functions": {}}
        loco_state[uid] = st
    return st

@app.route('/api/state')
def get_state():
    """Return full state or state for a specific loco_id (query param)."""
    uid = request.args.get('loco_id', type=int)
    if uid is None:
        # Return a mapping with string keys for JSON friendliness
        return jsonify({str(k): v for k, v in loco_state.items()})
    return jsonify(loco_state.get(uid, {}))

system_state = "stopped"  # "stopped", "running", "halted"

path_config_files = "tmp"  # TODO: Get this dynamically or set as config

UDP_IP = "192.168.20.42" #TODO: Get this dynamically
UDP_PORT_TX = 15731
UDP_PORT_RX = 15730
DEVICE_UID = 0x0 #TODO: Get this dynamically

COMMAND_SYSTEM      = 0x00
COMMAND_DISCOVERY   = 0x01
COMMAND_BIND        = 0x02
COMMAND_VERIFY      = 0x03
COMMAND_SPEED       = 0x04
COMMAND_DIRECTION   = 0x05
COMMAND_FUNCTION    = 0x06
COMMAND_READ_CONFIG = 0x07
COMMAND_WRITE_CONFIG = 0x08
COMMAND_SWITCH      = 0x0B

@app.route('/')
def index():
    return render_template("index.html")

def generate_hash(uid: int) -> int:
    # Hash laut Doku: (UID_hi16 XOR UID_lo16), plus gesetzte CS1-Unterscheidungsbits
    hi = (uid >> 16) & 0xFFFF
    lo = uid & 0xFFFF
    h = hi ^ lo
    h = (((h << 3) & 0xFF00) | 0x0300) | (h & 0x7F)
    return h & 0xFFFF

def build_can_id(uid: int, command: int, prio: int = 0, resp: int = 0) -> int:
    hash16 = generate_hash(uid)
    return (prio << 25) | (((command << 1) | (resp & 1)) << 16) | hash16

@app.route('/api/toggle', methods=['POST'])
def toggle():
    running = request.json.get('state', False)
    
    can_id = build_can_id(DEVICE_UID, COMMAND_SYSTEM, prio=0, resp=0)

    # Datenfeld: D0 = Status (1 Byte), Rest Padding auf 8 Bytes
    data_bytes = bytearray()
    data_bytes.extend(DEVICE_UID.to_bytes(4, "big"))
    data_bytes.append((1 if running else 0) & 0xFF)
    while len(data_bytes) < 8:
        data_bytes.append(0x00)

    # UDP-Frame (immer 13 Bytes): [CAN-ID(4B)][DLC(1B)][DATA(8B)]
    sendBytes = bytearray()
    sendBytes.extend(can_id.to_bytes(4, "big"))
    sendBytes.append(5)  # DLC
    sendBytes.extend(data_bytes)  # genau 8 Bytes

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT_TX))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/locs')
def get_locs():
    loc_dict = {str(loco['uid']): loco for loco in loc_list}
    return jsonify(loc_dict)

@app.route('/api/speed', methods=['POST'])
def speed():
    data = request.get_json()
    loco_uid = data.get("loco_id")
    speed = data.get("speed")


    # --- update server-side state ---
    try:
        uid_int = int(loco_uid)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid loco_id'), 400
    st = _ensure_state(uid_int)
    try:
        st['speed'] = int(speed)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid speed'), 400
    can_id = build_can_id(DEVICE_UID, COMMAND_SPEED, prio=0, resp=0)

    # Datenfeld: D0..D3 = Loc-ID (BE), D4..D5 = Geschwindigkeit (BE), DLC=6
    data_bytes = bytearray()
    data_bytes.extend(loco_uid.to_bytes(4, "big"))
    data_bytes.extend(speed.to_bytes(2, "big"))
    # Padding auf 8 Datenbytes
    while len(data_bytes) < 8:
        data_bytes.append(0x00)

    # UDP-Frame (immer 13 Bytes): [CAN-ID(4B)][DLC(1B)][DATA(8B)]
    sendBytes = bytearray()
    sendBytes.extend(can_id.to_bytes(4, "big"))
    sendBytes.append(6)  # DLC
    sendBytes.extend(data_bytes)  # genau 8 Bytes

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT_TX))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/direction', methods=['POST'])
def direction():
    data = request.get_json()
    loco_uid = data.get("loco_id")
    direction = data.get("direction")


    # --- update server-side state ---
    try:
        uid_int = int(loco_uid)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid loco_id'), 400
    st = _ensure_state(uid_int)
    try:
        st['direction'] = int(direction)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid direction'), 400
    can_id = build_can_id(DEVICE_UID, COMMAND_DIRECTION, prio=0, resp=0)

    # Datenfeld: D0..D3 = Loc-ID (BE), D4 = Richtung (1 Byte), Padding auf 8 Bytes
    data_bytes = bytearray()
    data_bytes.extend(loco_uid.to_bytes(4, "big"))
    #data_bytes.append((1 if direction == "forward" else 2) & 0xFF)
    data_bytes.append(direction & 0xFF)
    # Padding auf 8 Datenbytes
    while len(data_bytes) < 8:
        data_bytes.append(0x00)

    # UDP-Frame (immer 13 Bytes): [CAN-ID(4B)][DLC(1B)][DATA(8B)]
    sendBytes = bytearray()
    sendBytes.extend(can_id.to_bytes(4, "big"))
    sendBytes.append(5)  # DLC
    sendBytes.extend(data_bytes)  # genau 8 Bytes

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT_TX))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/function', methods=['POST'])
def function():
    data = request.get_json()
    loco_uid = data.get("loco_id")
    function = data.get("function")
    value = data.get("value")
    

    # --- update server-side state ---
    try:
        uid_int = int(loco_uid)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid loco_id'), 400
    st = _ensure_state(uid_int)
    try:
        fn = int(function)
        val = bool(value)
    except (TypeError, ValueError):
        return jsonify(status='error', message='invalid function/value'), 400
    st['functions'][fn] = val
    can_id = build_can_id(DEVICE_UID, COMMAND_FUNCTION, prio=0, resp=0)

    # Datenfeld: D0..D3 = Loc-ID (BE), D4..D5 = Geschwindigkeit (BE), DLC=6
    data_bytes = bytearray()
    data_bytes.extend(loco_uid.to_bytes(4, "big"))
    data_bytes.append(function & 0xFF)
    data_bytes.append(value & 0xFF)
    #data_bytes.extend(value.to_bytes(2, "big"))
    # Padding auf 8 Datenbytes
    while len(data_bytes) < 8:
        data_bytes.append(0x00)

    # UDP-Frame (immer 13 Bytes): [CAN-ID(4B)][DLC(1B)][DATA(8B)]
    sendBytes = bytearray()
    sendBytes.extend(can_id.to_bytes(4, "big"))
    sendBytes.append(6)  # DLC
    sendBytes.extend(data_bytes)  # genau 8 Bytes

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT_TX))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

def parse_value(val):
    val = val.strip()
    # Hex-Werte wie '0x4006'
    if val.startswith('0x'):
        try:
            return int(val, 16)
        except ValueError:
            return val
    # Dezimalwerte
    if val.isdigit():
        return int(val)
    return val
    
def parse_lokomotive_cs2(file_path):
    locomotives = []
    current_locomotive = None
    current_functions = {}
    current_function_key = None
    parsing_function = False

    with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
        for line in file:
            line = line.strip()

            if line == "lokomotive":
                if current_locomotive:
                    if current_functions:
                        current_locomotive["funktionen"] = current_functions
                    locomotives.append(current_locomotive)
                current_locomotive = {}
                current_functions = {}
                current_function_key = None
                parsing_function = False

            elif current_locomotive is not None:
                if ".funktionen" in line:
                    parsing_function = True
                    current_function_key = None
                elif parsing_function and line.startswith("..nr="):
                    current_function_key = line.split("=", 1)[1].strip()
                    current_functions[current_function_key] = {}
                elif parsing_function and line.startswith("..") and "=" in line and current_function_key:
                    key, value = line[2:].split("=", 1)
                    current_functions[current_function_key][key.strip()] = parse_value(value)
                elif line.startswith(".") and "=" in line and not line.startswith(".."):
                    key, value = line[1:].split("=", 1)
                    current_locomotive[key.strip()] = parse_value(value)
                    parsing_function = False

        if current_locomotive:
            if current_functions:
                current_locomotive["funktionen"] = current_functions
            locomotives.append(current_locomotive)

    return locomotives

def parse_magnetartikel_cs2(file_path):
    articles = {}
    current_section = None
    current_entry = {}

    with open(file_path, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue

            # Neue Sektion beginnt
            if not line.startswith('.'):
                if line == "artikel":
                    current_section = "artikel"
                    current_entry = {}
                    if "artikel" not in articles:
                        articles["artikel"] = []
                    articles["artikel"].append(current_entry)
            else:
                # Zeile mit Schlüssel-Wert-Paar
                key_value = line.lstrip('.').split('=', 1)
                if len(key_value) == 2:
                    key, value = key_value
                    value = parse_value(value)
                    if current_section == "artikel":
                        current_entry[key] = value

    return articles

# === CS2/CS3 UDP listener: parses frames and publishes events via SSE ===
def listen_cs2_udp(host: str = "", port: int = UDP_PORT_RX, stop_event: threading.Event | None = None):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((host, port))
    except OSError as e:
        publish_event({"type":"error","message":f"UDP bind failed: {e}"})
        return
    s.settimeout(1.0)
    try:
        while not (stop_event and stop_event.is_set()):
            try:
                pkt, _ = s.recvfrom(2048)
            except socket.timeout:
                continue
            except Exception as e:
                publish_event({"type":"error","message":f"UDP recv error: {e}"})
                continue

            if len(pkt) != 13:
                continue

            can_id = int.from_bytes(pkt[0:4], "big")
            dlc    = pkt[4]
            data   = pkt[5:13]

            cmd_resp = (can_id >> 16) & 0x1FF
            command  = (cmd_resp >> 1) & 0xFF
            resp_bit = cmd_resp & 0x01

            # System: Stop/Go/Halt (0x00), D4=0x00/0x01/0x02
            if command == COMMAND_SYSTEM and dlc >= 5:
                sub = data[4]
                if sub in (0x00, 0x01, 0x02):
                    state = {0x00:"stopped", 0x01:"running", 0x02:"halted"}[sub]

                    system_state = state

                    publish_event({"type":"system","status":state,"resp":resp_bit})

            # Speed (0x04): D0..D3 Loc-ID, D4..D5 speed
            elif command == COMMAND_SPEED and dlc >= 6:
                loc_id = int.from_bytes(data[0:4], "big")
                speed  = int.from_bytes(data[4:6], "big")

                st = _ensure_state(int(loc_id))
                st['speed'] = int(speed)

                publish_event({"type":"speed","loc_id":loc_id,"value":speed,"resp":resp_bit})

            # Direction (0x05): D0..D3 Loc-ID, D4 dir
            elif command == COMMAND_DIRECTION and dlc >= 5:
                loc_id = int.from_bytes(data[0:4], "big")
                direction = data[4]

                st = _ensure_state(int(loc_id))
                st['direction'] = int(direction)

                publish_event({"type":"direction","loc_id":loc_id,"value":direction,"resp":resp_bit})

            # Function (0x06): D0..D3 Loc-ID, D4 fn, D5 val (optional)
            elif command == COMMAND_FUNCTION and dlc >= 5:
                loc_id = int.from_bytes(data[0:4], "big")
                fn_no  = data[4]
                fn_val = data[5] if dlc >= 6 else 1

                st = _ensure_state(int(loc_id))
                st['functions'][int(fn_no)] = bool(fn_val)

                publish_event({"type":"function","loc_id":loc_id,"fn":fn_no,"value":fn_val,"resp":resp_bit})
    except Exception as e:
        publish_event({"type":"error","message":f"UDP listener crashed: {e}"})
    finally:
        try:
            s.close()
        except Exception:
            pass


# === Start UDP listener on first request ===
_listener_started = False
_stop_evt = threading.Event()

if __name__ == '__main__':
    loc_list = parse_lokomotive_cs2(os.path.join(path_config_files, "lokomotive.cs2"))
    switch_list = parse_magnetartikel_cs2(os.path.join(path_config_files, "magnetartikel.cs2"))
    

    # initialize server-side state for all known locs
    try:
        for loco in loc_list:
            _ensure_state(int(loco.get('uid') if isinstance(loco, dict) else loco['uid']))
    except Exception:
        pass

    # UDP-Listener gleich starten
    t = threading.Thread(target=listen_cs2_udp, args=("", UDP_PORT_RX, _stop_evt), daemon=True)
    t.start()

    app.run(host='0.0.0.0', port=5005)
