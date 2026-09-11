#!/usr/bin/env python3
"""Tests for POST /api/keyboard_event (switch/turnout control).

Starts the backend binary against a temp copy of var/config and exercises
the keyboard_event endpoint for switch index 0 (SW 1 from
var/config/magnetartikel.cs2), verifying state changes via
/api/switch_state.

Run with:
    python3 tests/test_keyboard_event.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR

MAGNETARTIKEL_CS2 = CONFIG_SRC_DIR / "magnetartikel.cs2"
TEST_SWITCH_IDX = 0  # "SW 1" in var/config/magnetartikel.cs2


@unittest.skipUnless(MAGNETARTIKEL_CS2.is_file(), "var/config/magnetartikel.cs2 not found")
class KeyboardEventTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    def switch_state(self):
        return self.server.get_json("/api/switch_state")["switch_state"]

    def test_position_updates_state(self):
        status, body = self.server.post_json(
            "/api/keyboard_event", {"idx": TEST_SWITCH_IDX, "pos": 1})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(self.switch_state()[TEST_SWITCH_IDX], 1)

        status, body = self.server.post_json(
            "/api/keyboard_event", {"idx": TEST_SWITCH_IDX, "pos": 0})
        self.assertEqual(status, 200)
        self.assertEqual(self.switch_state()[TEST_SWITCH_IDX], 0)

    def test_missing_idx_returns_400(self):
        status, body = self.server.post_json("/api/keyboard_event", {"pos": 1})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")

    def test_missing_pos_returns_400(self):
        status, body = self.server.post_json("/api/keyboard_event", {"idx": TEST_SWITCH_IDX})
        self.assertEqual(status, 400)
        self.assertEqual(body["status"], "error")


if __name__ == "__main__":
    unittest.main()
