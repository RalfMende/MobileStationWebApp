from flask import Flask, request, jsonify, render_template
import socket

app = Flask(__name__)

# Configuration of CS2 connection
STOP_UDP_IP = "192.168.20.42"  # Ip adress of CS2
STOP_UDP_PORT = 15731

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/api/light', methods=['POST'])
def toggle_light():
    data = request.json
    state = data.get("state", False)
    print(f"Licht: {'AN' if state else 'AUS'}")
    return jsonify({"light": state})

@app.route('/api/horn', methods=['POST'])
def horn():
    print("🚨 Hupe aktiviert")
    return jsonify({"horn": True})

@app.route('/api/speed', methods=['POST'])
def set_speed():
    speed = request.json.get("speed", 0)
    print(f"Geschwindigkeit: {speed} km/h")
    return jsonify({"speed": speed})

@app.route('/api/direction', methods=['POST'])
def set_direction():
    direction = request.json.get("dir", "forward")
    print(f"Richtung: {direction}")
    return jsonify({"direction": direction})

@app.route('/api/toggle', methods=['POST'])
def toggle_go_stop():
    data = request.json
    is_running = data.get("state", False)

    hex_msg = "00004711050000000001000000" if is_running else "00004711050000000000000000"
    message = bytes.fromhex(hex_msg)

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(message, (STOP_UDP_IP, STOP_UDP_PORT))
        print(f"{'▶️ GO' if is_running else '⛔ STOP'} gesendet!")
        return jsonify({"status": "sent"}), 200
    except Exception as e:
        print(f"Fehler beim UDP-Senden: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5005)