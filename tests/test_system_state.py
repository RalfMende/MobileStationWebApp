#!/usr/bin/env python3
"""Tests for the system-state APIs: POST /api/stop_button and GET /api/health.

Starts the backend binary against a temp copy of var/config and verifies
that toggling the stop/go state via /api/stop_button is reflected in
/api/health, and that /api/health reports loco/switch counts consistent
with the imported config files.

Run with:
    python3 tests/test_system_state.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR

LOKOMOTIVE_CS2 = CONFIG_SRC_DIR / "lokomotive.cs2"
MAGNETARTIKEL_CS2 = CONFIG_SRC_DIR / "magnetartikel.cs2"


@unittest.skipUnless(LOKOMOTIVE_CS2.is_file() and MAGNETARTIKEL_CS2.is_file(),
                     "var/config files not found")
class SystemStateTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    def health(self):
        return self.server.get_json("/api/health")

    def test_health_reports_ok_status_and_counts(self):
        health = self.health()
        self.assertEqual(health["status"], "ok")
        self.assertIn(health["system_state"], ("running", "stopped"))
        # Cross-check against independently-parsed config sizes.
        loco_uids = set()
        with open(LOKOMOTIVE_CS2, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line.startswith(".uid="):
                    loco_uids.add(line.split("=", 1)[1].strip())
        self.assertEqual(health["loco_count"], len(loco_uids))
        with open(MAGNETARTIKEL_CS2, "r", encoding="utf-8", errors="replace") as f:
            article_count = sum(1 for line in f if line.strip() == "artikel")
        self.assertEqual(health["switch_count"], min(article_count, 64))

    def test_stop_button_starts_system(self):
        status, body = self.server.post_json("/api/stop_button", {"state": True})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(self.health()["system_state"], "running")

    def test_stop_button_stops_system(self):
        self.server.post_json("/api/stop_button", {"state": True})
        self.assertEqual(self.health()["system_state"], "running")

        status, body = self.server.post_json("/api/stop_button", {"state": False})
        self.assertEqual(status, 200)
        self.assertEqual(self.health()["system_state"], "stopped")

    def test_stop_button_accepts_numeric_state(self):
        """The handler also recognizes "state":1 / "state":0 (not just booleans)."""
        self.server.post_json("/api/stop_button", {"state": 1})
        self.assertEqual(self.health()["system_state"], "running")

        self.server.post_json("/api/stop_button", {"state": 0})
        self.assertEqual(self.health()["system_state"], "stopped")


if __name__ == "__main__":
    unittest.main()
