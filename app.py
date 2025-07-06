
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
