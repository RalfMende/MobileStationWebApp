
from flask import Flask, request, jsonify, render_template
import socket

app = Flask(__name__)
UDP_IP = "192.168.20.42" #TODO: Get this dynamically
UDP_PORT = 15731
DEVICE_UID = 0x0 #TODO: Get this dynamically

COMMAND_SYSTEM = 0
COMMAND_DISCOVERY = 0x01
COMMAND_BIND = 0x02
COMMAND_VERIFY = 0x03
COMMAND_SPEED = 0x04
COMMAND_DIRECTION = 0x05
COMMAND_FUNCTION = 0x06
COMMAND_READ_CONFIG = 0x07
COMMAND_WRITE_CONFIG = 0x08
COMMAND_SWITCH = 0x0B

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
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/locs')
def get_locs():
    return jsonify(loc_list)

@app.route('/api/speed', methods=['POST'])
def speed():
    data = request.get_json()
    loco_uid = data.get("loco_id")
    speed = data.get("speed")

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
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT))
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

    can_id = build_can_id(DEVICE_UID, COMMAND_DIRECTION, prio=0, resp=0)

    # Datenfeld: D0..D3 = Loc-ID (BE), D4 = Richtung (1 Byte), Padding auf 8 Bytes
    data_bytes = bytearray()
    data_bytes.extend(loco_uid.to_bytes(4, "big"))
    data_bytes.append((1 if direction == "forward" else 2) & 0xFF)
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
        sock.sendto(sendBytes, (UDP_IP, UDP_PORT))
        return jsonify(
            status='ok'
        )
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/function', methods=['POST'])
def function():
    data = request.json
    print(f"{data['loco']} {data['function']} = {data['state']}")
    return jsonify(ok=True)

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
    
def parse_lokomotive_cs2(file_path="tmp/lokomotive.cs2"):
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

def parse_magnetartikel_cs2(file_path="tmp/magnetartikel.cs2"):
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

if __name__ == '__main__':
    loc_list = parse_lokomotive_cs2()
    switch_list = parse_magnetartikel_cs2()
    app.run(host='0.0.0.0', port=5005)
