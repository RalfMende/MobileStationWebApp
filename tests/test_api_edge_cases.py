#!/usr/bin/env python3
"""Validation / edge-case tests for the control APIs (see essential-tests review,
point 6): unknown loco_id / switch idx values, and malformed request bodies.

Run with:
    python3 tests/test_api_edge_cases.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR

LOKOMOTIVE_CS2 = CONFIG_SRC_DIR / "lokomotive.cs2"
MAGNETARTIKEL_CS2 = CONFIG_SRC_DIR / "magnetartikel.cs2"

UNKNOWN_LOCO_UID = 0x7FFFFFFF   # not present in var/config/lokomotive.cs2
OUT_OF_RANGE_SWITCH_IDX = 9999  # far beyond the 64-slot g_switches vector


@unittest.skipUnless(LOKOMOTIVE_CS2.is_file() and MAGNETARTIKEL_CS2.is_file(),
                     "var/config files not found")
class ApiEdgeCaseTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    # ---- Unknown IDs must not crash the server ----

    def test_control_event_unknown_loco_id_does_not_crash(self):
        """loco_id not present in lokomotive.cs2: g_loco_speed etc. are maps,
        so this should just create fresh state instead of erroring."""
        status, body = self.server.post_json(
            "/api/control_event", {"loco_id": UNKNOWN_LOCO_UID, "speed": 400})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")

        state = self.server.get_json(f"/api/loco_state?loco_id={UNKNOWN_LOCO_UID}")
        self.assertEqual(state["speed"], 400)

        # Server must still be alive and serving other endpoints afterwards.
        health = self.server.get_json("/api/health")
        self.assertEqual(health["status"], "ok")

    def test_keyboard_event_out_of_range_idx_does_not_crash(self):
        """idx far beyond the 64-entry g_switches vector used to be an
        unguarded vector access (out-of-bounds read) in main.cpp; must not
        crash the server and should respond gracefully."""
        status, body = self.server.post_json(
            "/api/keyboard_event", {"idx": OUT_OF_RANGE_SWITCH_IDX, "pos": 1})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")

        # Server must still be alive and serving other endpoints afterwards.
        health = self.server.get_json("/api/health")
        self.assertEqual(health["status"], "ok")

    # ---- Negative / missing values must be rejected, not crash ----

    def test_keyboard_event_negative_idx_returns_400(self):
        status, body = self.server.post_json("/api/keyboard_event", {"idx": -1, "pos": 1})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")

    def test_keyboard_event_negative_pos_returns_400(self):
        status, body = self.server.post_json("/api/keyboard_event", {"idx": 0, "pos": -1})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")

    def test_control_event_zero_loco_id_returns_400(self):
        status, body = self.server.post_json("/api/control_event", {"loco_id": 0, "speed": 100})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")

    # ---- Malformed / non-JSON bodies must not crash the server ----

    def test_control_event_malformed_json_returns_400(self):
        status, _ = self.server.post_raw("/api/control_event", "not valid json at all")
        self.assertEqual(status, 400)
        health = self.server.get_json("/api/health")
        self.assertEqual(health["status"], "ok")

    def test_control_event_empty_body_returns_400(self):
        status, _ = self.server.post_raw("/api/control_event", "")
        self.assertEqual(status, 400)

    def test_keyboard_event_malformed_json_returns_400(self):
        status, _ = self.server.post_raw("/api/keyboard_event", "{not: json}")
        self.assertEqual(status, 400)
        health = self.server.get_json("/api/health")
        self.assertEqual(health["status"], "ok")

    def test_stop_button_malformed_json_does_not_crash(self):
        """stop_button does a plain substring search, so malformed bodies are
        just treated as "state" not matched (state -> false) rather than
        rejected; the important part is that the server keeps running."""
        status, _ = self.server.post_raw("/api/stop_button", "{totally: broken")
        self.assertEqual(status, 200)
        health = self.server.get_json("/api/health")
        self.assertEqual(health["status"], "ok")
        self.assertEqual(health["system_state"], "stopped")


if __name__ == "__main__":
    unittest.main()
