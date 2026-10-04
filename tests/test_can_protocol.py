#!/usr/bin/env python3
"""Tests against the Märklin CS2 CAN-over-UDP interface described in the
CAN CS2 Protokoll PDF (packaging/.. not included in repo, see chat attachment).

The CS2 CAN-UDP gateway wraps CAN frames into 13-byte UDP packets:
4 bytes CAN-ID (big endian) + 1 byte DLC + 8 bytes data (zero-padded).
The backend (src/backend/main.cpp) sends outgoing frames to <udp-ip>:15731
(g_udp_tx) and listens for incoming frames on port 15730 (g_udp_rx).

These tests:
  1. Trigger HTTP control endpoints and verify the backend emits the correct
     CS2 CAN command frames (Lok Geschwindigkeit/Richtung/Funktion, Zubehör
     Schalten, System Stopp/Go) with the documented command codes and
     payload layout.
  2. Send synthetic inbound CS2 response frames (as a real Gleisbox/CS2
     would) and verify the backend's UDP listener updates its internal
     state, exposed via the HTTP API.

Run with:
    python3 tests/test_can_protocol.py
"""
import socket
import struct
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR, find_free_udp_port

LOKOMOTIVE_CS2 = CONFIG_SRC_DIR / "lokomotive.cs2"
MAGNETARTIKEL_CS2 = CONFIG_SRC_DIR / "magnetartikel.cs2"

CAN_TX_PORT = 15731  # backend sends outgoing CS2 frames here (g_udp_tx default)
CAN_RX_PORT = 15730  # backend listens for incoming CS2 frames here (g_udp_rx default)

# Command codes per "CAN CS2 Protokoll" chapter 1.4 (Übersicht Werte der Kommandos)
CMD_SYSTEM = 0x00
CMD_SPEED = 0x04
CMD_DIRECTION = 0x05
CMD_FUNCTION = 0x06
CMD_READ_CONFIG = 0x07
CMD_WRITE_CONFIG = 0x08
CMD_SWITCH = 0x0B

SYS_STOP = 0x00
SYS_GO = 0x01

TEST_LOCO_UID = 1       # "Lokliste" in var/config/lokomotive.cs2
TEST_DCC_LOCO_UID = 0xC005
TEST_SWITCH_IDX = 0     # "SW 1" in var/config/magnetartikel.cs2 (schaltzeit=200ms)


def pack_can_udp_frame(can_id, dlc, payload):
    """Pack a CAN frame into the 13-byte UDP wire format from protocol
    chapter 1.2.7: 4 bytes CAN-ID (big endian) + 1 byte DLC + 8 bytes data."""
    data = bytes(payload) + b"\x00" * (8 - len(payload))
    return struct.pack(">IB", can_id, dlc) + data[:8]


def unpack_can_udp_frame(raw):
    assert len(raw) == 13, f"expected 13-byte CS2 UDP frame, got {len(raw)} bytes"
    can_id, dlc = struct.unpack(">IB", raw[:5])
    return can_id, dlc, raw[5:13]


def decode_command(can_id):
    """Extract (command, resp_bit) from a CAN-ID, mirroring udp_listener_thread
    in main.cpp: bits 16-24 hold (command<<1)|resp."""
    cmd_resp = (can_id >> 16) & 0x1FF
    return (cmd_resp >> 1) & 0xFF, cmd_resp & 1


def build_inbound_can_id(command, resp=1):
    """Build a CAN-ID for a synthetic inbound frame. The backend does not
    validate the hash (lower 16 bits) on receipt, so any value works here."""
    return ((command << 1) | (resp & 1)) << 16


class CanCapture:
    """Binds to the port the backend sends outgoing CS2 UDP frames to,
    acting as a stand-in for the real Gleisbox/CS2 hardware."""

    def __init__(self, port=CAN_TX_PORT):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", port))
        self.sock.settimeout(3.0)

    def recv_frame(self):
        raw, _ = self.sock.recvfrom(64)
        return unpack_can_udp_frame(raw)

    def close(self):
        self.sock.close()


def send_inbound_frame(command, payload, dlc, resp=1, port=CAN_RX_PORT):
    """Send a synthetic CS2/GFP response frame into the backend's UDP listener."""
    can_id = build_inbound_can_id(command, resp)
    frame = pack_can_udp_frame(can_id, dlc, payload)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.sendto(frame, ("127.0.0.1", port))


def wait_until(predicate, timeout=2.0, interval=0.05):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(interval)
    return predicate()


@unittest.skipUnless(LOKOMOTIVE_CS2.is_file() and MAGNETARTIKEL_CS2.is_file(),
                     "var/config files not found")
class CanProtocolTest(unittest.TestCase):
    server = None
    capture = None

    @classmethod
    def setUpClass(cls):
        # Bind the capture socket before starting the backend so no outgoing
        # frame can be missed.
        cls.capture = CanCapture()
        cls.server = BackendServer(udp_rx_port=find_free_udp_port()).start()
        cls.initial_loco_list = cls.server.get_json("/api/loco_list")

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()
        if cls.capture is not None:
            cls.capture.close()

    def send_inbound(self, command, payload, dlc):
        send_inbound_frame(command, payload, dlc, port=self.server.udp_rx_port)

    # ---- Outgoing frames triggered by HTTP control endpoints ----

    def test_loco_cv_map_is_loaded_from_xml_at_startup(self):
        cv_map = self.server.get_json("/api/loco_cv_map")
        mfx_by_key = {definition["key"]: definition for definition in cv_map["mfx"]}
        dcc_by_key = {definition["key"]: definition for definition in cv_map["dcc"]}
        mm2_by_key = {definition["key"]: definition for definition in cv_map["mm2_prog"]}
        self.assertEqual(mfx_by_key["vmax"]["cv"], 2227)
        self.assertEqual(mfx_by_key["name"]["length"], 16)
        self.assertEqual(dcc_by_key["adresse"]["range"], "1-127")
        self.assertEqual(mm2_by_key["adresse"]["cv"], 1)
        self.assertNotIn("label", dcc_by_key["adresse"])
        self.assertNotIn("field", dcc_by_key["adresse"])

        locos = self.initial_loco_list
        self.assertEqual(locos["1"]["config_values"]["adresse"], "1")
        self.assertEqual(locos[str(0x4005)]["config_values"]["adresse"], "5")
        self.assertEqual(locos[str(0xC005)]["config_values"]["adresse"], "5")

        loco = self.server.get_json("/api/loco_list")[str(TEST_LOCO_UID)]
        self.assertIn("config_values", loco)
        for key in ("adresse", "vmin", "av", "bv", "vmax", "volume"):
            self.assertIn(key, loco["config_values"])

    def test_control_event_speed_emits_lok_geschwindigkeit_frame(self):
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 500})
        can_id, dlc, data = self.capture.recv_frame()
        command, resp = decode_command(can_id)
        self.assertEqual(command, CMD_SPEED)
        self.assertEqual(resp, 0)
        self.assertEqual(dlc, 6)
        uid = int.from_bytes(data[0:4], "big")
        speed = int.from_bytes(data[4:6], "big")
        self.assertEqual(uid, TEST_LOCO_UID)
        self.assertEqual(speed, 500)

    def test_control_event_direction_emits_lok_richtung_frame(self):
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "direction": 2})
        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_DIRECTION)
        self.assertEqual(dlc, 5)
        uid = int.from_bytes(data[0:4], "big")
        self.assertEqual(uid, TEST_LOCO_UID)
        self.assertEqual(data[4], 2)  # 2 = Fahrtrichtung rueckwaerts

    def test_control_event_function_emits_lok_funktion_frame(self):
        self.server.post_json(
            "/api/control_event", {"loco_id": TEST_LOCO_UID, "function": 3, "value": 1})
        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_FUNCTION)
        self.assertEqual(dlc, 6)
        uid = int.from_bytes(data[0:4], "big")
        self.assertEqual(uid, TEST_LOCO_UID)
        self.assertEqual(data[4], 3)  # function nr
        self.assertEqual(data[5], 1)  # value

    def test_loco_config_read_requests_one_cv_value(self):
        status, _ = self.server.post_json(
            "/api/loco_config", {"uid": TEST_LOCO_UID, "cvs": [1325], "count": 1})
        self.assertEqual(status, 200)

        can_id, dlc, data = self.capture.recv_frame()
        command, resp = decode_command(can_id)
        self.assertEqual(command, CMD_READ_CONFIG)
        self.assertEqual(resp, 0)
        self.assertEqual(dlc, 7)
        self.assertEqual(int.from_bytes(data[0:4], "big"), TEST_LOCO_UID)
        self.assertEqual(int.from_bytes(data[4:6], "big"), 1325)
        self.assertEqual(data[6], 1)

    def test_loco_config_read_requests_name_length(self):
        status, _ = self.server.post_json(
            "/api/loco_config", {"uid": TEST_LOCO_UID, "cvs": [1027], "count": 16})
        self.assertEqual(status, 200)

        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_READ_CONFIG)
        self.assertEqual(dlc, 7)
        self.assertEqual(int.from_bytes(data[4:6], "big"), 1027)
        self.assertEqual(data[6], 16)

    def test_loco_config_write_emits_write_config_frame(self):
        status, _ = self.server.post_json(
            "/api/loco_config", {"write": True, "uid": TEST_LOCO_UID, "cv": 5, "value": 120})
        self.assertEqual(status, 200)

        can_id, dlc, data = self.capture.recv_frame()
        command, resp = decode_command(can_id)
        self.assertEqual(command, CMD_WRITE_CONFIG)
        self.assertEqual(resp, 0)
        self.assertEqual(dlc, 8)
        self.assertEqual(int.from_bytes(data[0:4], "big"), TEST_LOCO_UID)
        self.assertEqual(int.from_bytes(data[4:6], "big"), 5)
        self.assertEqual(data[6], 120)
        self.assertEqual(data[7], 0)

    def test_stop_button_emits_system_stopp_go_frames(self):
        self.server.post_json("/api/stop_button", {"state": True})
        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_SYSTEM)
        self.assertEqual(dlc, 5)
        self.assertEqual(data[4], 1)  # System Go sub-cmd payload byte (running=1)

        self.server.post_json("/api/stop_button", {"state": False})
        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_SYSTEM)
        self.assertEqual(data[4], 0)  # System Stopp (running=0)

    def test_keyboard_event_emits_zubehoer_schalten_frame_and_auto_release(self):
        status, _ = self.server.post_json(
            "/api/keyboard_event", {"idx": TEST_SWITCH_IDX, "pos": 1})
        self.assertEqual(status, 200)

        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_SWITCH)
        self.assertEqual(dlc, 6)
        self.assertEqual(data[4], 1)  # Stellung
        self.assertEqual(data[5], 1)  # Strom (on)

        # SW 1 has schaltzeit=200ms in var/config/magnetartikel.cs2, so an
        # auto-release ("off") frame must follow shortly after.
        can_id2, dlc2, data2 = self.capture.recv_frame()
        command2, _ = decode_command(can_id2)
        self.assertEqual(command2, CMD_SWITCH)
        self.assertEqual(dlc2, 6)
        self.assertEqual(data2[5], 0)  # Strom (off)

    # ---- Inbound synthetic CS2/GFP response frames ----

    def test_inbound_system_go_sets_health_running(self):
        self.send_inbound(CMD_SYSTEM, bytes([0, 0, 0, 0, SYS_GO]), dlc=5)
        ok = wait_until(lambda: self.server.get_json("/api/health")["system_state"] == "running")
        self.assertTrue(ok, "backend did not report system_state=running after System Go frame")

    def test_inbound_system_stop_sets_health_stopped(self):
        self.send_inbound(CMD_SYSTEM, bytes([0, 0, 0, 0, SYS_GO]), dlc=5)
        wait_until(lambda: self.server.get_json("/api/health")["system_state"] == "running")

        self.send_inbound(CMD_SYSTEM, bytes([0, 0, 0, 0, SYS_STOP]), dlc=5)
        ok = wait_until(lambda: self.server.get_json("/api/health")["system_state"] == "stopped")
        self.assertTrue(ok, "backend did not report system_state=stopped after System Stopp frame")

    def test_inbound_speed_response_updates_loco_state(self):
        speed = 777
        payload = TEST_LOCO_UID.to_bytes(4, "big") + speed.to_bytes(2, "big")
        self.send_inbound(CMD_SPEED, payload, dlc=6)
        ok = wait_until(
            lambda: self.server.get_json(f"/api/loco_state?loco_id={TEST_LOCO_UID}")["speed"] == speed)
        self.assertTrue(ok, "backend did not update loco speed from inbound CAN frame")

    def test_inbound_function_response_updates_loco_state(self):
        payload = TEST_LOCO_UID.to_bytes(4, "big") + bytes([7, 1])
        self.send_inbound(CMD_FUNCTION, payload, dlc=6)
        ok = wait_until(
            lambda: self.server.get_json(f"/api/loco_state?loco_id={TEST_LOCO_UID}")
            ["functions"].get("7") == 1)
        self.assertTrue(ok, "backend did not update loco function state from inbound CAN frame")

    def test_inbound_write_config_response_updates_loco_config(self):
        cv = 5
        value = 123
        locos_before = self.server.get_json("/api/loco_list")
        self.assertEqual(locos_before[str(TEST_DCC_LOCO_UID)]["config_values"]["vmax"], "90")

        self.server.post_json(
            "/api/loco_config", {"write": True, "uid": TEST_DCC_LOCO_UID, "cv": cv, "value": value})
        can_id, dlc, data = self.capture.recv_frame()
        command, _ = decode_command(can_id)
        self.assertEqual(command, CMD_WRITE_CONFIG)
        self.assertEqual(dlc, 8)
        self.assertEqual(data[6], value)
        self.assertEqual(data[7], 0)
        locos_after_write = self.server.get_json("/api/loco_list")
        self.assertEqual(locos_after_write[str(TEST_DCC_LOCO_UID)]["config_values"]["vmax"], "90")

        payload = TEST_DCC_LOCO_UID.to_bytes(4, "big") + cv.to_bytes(2, "big") + bytes([value, 0])
        self.send_inbound(CMD_WRITE_CONFIG, payload, dlc=8)
        ok = wait_until(lambda: self.server.get_json("/api/loco_list")
                        [str(TEST_DCC_LOCO_UID)]["config_values"].get("vmax") == str(value))
        self.assertTrue(ok, "backend did not update the locomotive CV value from Write-Config response")

    def test_inbound_read_config_response_replaces_uid_derived_address(self):
        cv = 1
        value = 7
        payload = TEST_DCC_LOCO_UID.to_bytes(4, "big") + cv.to_bytes(2, "big") + bytes([value])
        self.send_inbound(CMD_READ_CONFIG, payload, dlc=7)
        ok = wait_until(lambda: self.server.get_json("/api/loco_list")
                        [str(TEST_DCC_LOCO_UID)]["config_values"].get("adresse") == str(value))
        self.assertTrue(ok, "Read-Config response did not replace the UID-derived address in config")


if __name__ == "__main__":
    unittest.main()
