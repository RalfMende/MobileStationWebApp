
from flask import Flask, request, jsonify, render_template
import socket

app = Flask(__name__)
UDP_IP = "192.168.20.42"
UDP_PORT = 15731

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/api/toggle', methods=['POST'])
def toggle():
    running = request.json.get('state', False)
    hex_msg = "00000300500000000001" if running else "00000300500000000000"
    msg = bytes.fromhex(hex_msg)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(msg, (UDP_IP, UDP_PORT))
        return jsonify(status='ok')
    except Exception as e:
        return jsonify(status='error', message=str(e)), 500

@app.route('/api/speed', methods=['POST'])
def speed():
    data = request.json
    print(f"{data['loco']} speed = {data['speed']}")
    return jsonify(ok=True)

@app.route('/api/direction', methods=['POST'])
def direction():
    data = request.json
    print(f"{data['loco']} direction = {data['direction']}")
    return jsonify(ok=True)

@app.route('/api/function', methods=['POST'])
def function():
    data = request.json
    print(f"{data['loco']} {data['function']} = {data['state']}")
    return jsonify(ok=True)

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
                # Vorherige Lok speichern
                if current_locomotive:
                    if current_functions:
                        current_locomotive["funktionen"] = current_functions
                    locomotives.append(current_locomotive)
                # Neue Lok starten
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
                    current_functions[current_function_key][key.strip()] = value.strip()
                elif line.startswith(".") and "=" in line and not line.startswith(".."):
                    # Lokdaten
                    key, value = line[1:].split("=", 1)
                    current_locomotive[key.strip()] = value.strip()
                    parsing_function = False

        # Letzte Lok sichern
        if current_locomotive:
            if current_functions:
                current_locomotive["funktionen"] = current_functions
            locomotives.append(current_locomotive)

    return locomotives

def parse_magnetartikel_cs2(file_path="tmp/magnetartikel.cs2"):
    switches = {}
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
                    if "artikel" not in switches:
                        switches["artikel"] = []
                    switches["artikel"].append(current_entry)
            else:
                # Zeile mit Schlüssel-Wert-Paar
                key_value = line.lstrip('.').split('=', 1)
                if len(key_value) == 2:
                    key, value = key_value
                    try:
                        value = int(value)
                    except ValueError:
                        pass
                    if current_section == "artikel":
                        current_entry[key] = value

    return switches

if __name__ == '__main__':
    loc_list = parse_lokomotive_cs2()
    switch_list = parse_magnetartikel_cs2()
    app.run(host='0.0.0.0', port=5005)
