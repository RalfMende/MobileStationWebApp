#!/usr/bin/env python3
"""Tests for POST /api/control_event (speed/direction/function control of a loco).

Starts the backend binary against a temp copy of var/config and exercises
the control_event endpoint for a known loco (uid=1, "Lokliste" from
var/config/lokomotive.cs2), verifying state changes via /api/loco_state.

Run with:
    python3 tests/test_control_event.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR

LOKOMOTIVE_CS2 = CONFIG_SRC_DIR / "lokomotive.cs2"
TEST_LOCO_UID = 1  # "Lokliste" in var/config/lokomotive.cs2


@unittest.skipUnless(LOKOMOTIVE_CS2.is_file(), "var/config/lokomotive.cs2 not found")
class ControlEventTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    def loco_state(self, uid=TEST_LOCO_UID):
        return self.server.get_json(f"/api/loco_state?loco_id={uid}")

    def test_speed_updates_state(self):
        status, body = self.server.post_json(
            "/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 500})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(self.loco_state()["speed"], 500)

    def test_speed_above_max_is_clamped_to_1023(self):
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 9999})
        self.assertEqual(self.loco_state()["speed"], 1023)

    def test_speed_zero_is_accepted(self):
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 300})
        self.assertEqual(self.loco_state()["speed"], 300)
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 0})
        self.assertEqual(self.loco_state()["speed"], 0)

    def test_negative_speed_is_ignored_not_clamped(self):
        """Backend quirk: the handler only clamps when speed>=0, so a negative
        value falls through all branches (speed/direction/function) as a no-op
        instead of being clamped to 0 -- state stays unchanged."""
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 400})
        self.assertEqual(self.loco_state()["speed"], 400)
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": -50})
        self.assertEqual(self.loco_state()["speed"], 400)

    def test_direction_change_resets_speed(self):
        self.server.post_json("/api/control_event", {"loco_id": TEST_LOCO_UID, "speed": 700})
        self.assertEqual(self.loco_state()["speed"], 700)

        status, body = self.server.post_json(
            "/api/control_event", {"loco_id": TEST_LOCO_UID, "direction": 2})
        self.assertEqual(status, 200)
        state = self.loco_state()
        self.assertEqual(state["direction"], 2)
        self.assertEqual(state["speed"], 0)

    def test_function_toggle(self):
        status, body = self.server.post_json(
            "/api/control_event", {"loco_id": TEST_LOCO_UID, "function": 3, "value": 1})
        self.assertEqual(status, 200)
        self.assertEqual(self.loco_state()["functions"]["3"], 1)

        self.server.post_json(
            "/api/control_event", {"loco_id": TEST_LOCO_UID, "function": 3, "value": 0})
        self.assertEqual(self.loco_state()["functions"]["3"], 0)

    def test_missing_loco_id_returns_400(self):
        status, body = self.server.post_json("/api/control_event", {"speed": 100})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")


if __name__ == "__main__":
    unittest.main()
