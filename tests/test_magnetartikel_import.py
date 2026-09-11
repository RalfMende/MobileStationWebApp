#!/usr/bin/env python3
"""Test that var/config/magnetartikel.cs2 is correctly imported by the mswebapp_cpp backend.

Starts the backend binary against a temp copy of var/config, queries
GET /api/switch_list and /api/switch_state, and compares the result against
an independent Python parse of magnetartikel.cs2 (mirroring the parsing
rules in src/backend/main.cpp: parse_magnetartikel_cs2).

Run with:
    python3 tests/test_magnetartikel_import.py
or:
    python3 -m unittest tests.test_magnetartikel_import
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR, parse_int_auto

MAGNETARTIKEL_CS2 = CONFIG_SRC_DIR / "magnetartikel.cs2"
MAX_SWITCHES = 64


def compute_uid(dectyp, article_id):
    id_int = article_id - 1
    if dectyp == "mm2":
        return 0x3000 | (id_int & 0x3FF)
    if dectyp == "dcc":
        return 0x3800 | (id_int & 0x3FF)
    if dectyp == "sx1":
        return 0x2800 | (id_int & 0x3FF)
    return id_int & 0x3FF


def parse_magnetartikel_cs2(path):
    """Reference Python re-implementation of parse_magnetartikel_cs2() in main.cpp.

    Returns a list of up to 64 entries: {name, typ, dectyp, switch_delay, uid}.
    Note: mirrors the original's quirk that .typ/.schaltzeit are NOT reset
    between "artikel" blocks (only .id/.dectyp/.name are), so a block missing
    one of those fields inherits the previous block's value.
    """
    switches = [{"name": "", "typ": "", "dectyp": "", "switch_delay": 0, "uid": -1}
                for _ in range(MAX_SWITCHES)]
    idx = 0
    cur_id = 0
    dectyp = ""
    cur_name = ""
    cur_typ = ""
    cur_time = 0

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for raw_line in f:
            line = raw_line.strip()
            if line == "artikel":
                idx += 1
                cur_id = 0
                dectyp = ""
                cur_name = ""
                continue
            if idx == 0 or not line.startswith(".") or "=" not in line:
                continue
            key, _, val = line[1:].partition("=")
            key = key.strip()
            val = val.strip()
            if key == "id":
                cur_id = parse_int_auto(val)
            elif key == "name":
                cur_name = val
            elif key == "typ":
                cur_typ = val
            elif key == "schaltzeit":
                cur_time = parse_int_auto(val)
            elif key == "dectyp":
                dectyp = val.lower()

            if 1 <= idx <= MAX_SWITCHES:
                vec_idx = idx - 1
                entry = switches[vec_idx]
                entry["uid"] = compute_uid(dectyp, cur_id)
                if cur_name:
                    entry["name"] = cur_name
                if cur_typ:
                    entry["typ"] = cur_typ
                entry["switch_delay"] = cur_time
                if dectyp:
                    entry["dectyp"] = dectyp
    return switches


@unittest.skipUnless(MAGNETARTIKEL_CS2.is_file(), "var/config/magnetartikel.cs2 not found")
class MagnetartikelImportTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    def fetch_switch_list(self):
        return self.server.get_json("/api/switch_list")["artikel"]

    def fetch_switch_state(self):
        return self.server.get_json("/api/switch_state")["switch_state"]

    def test_switch_count_matches(self):
        expected = parse_magnetartikel_cs2(MAGNETARTIKEL_CS2)
        actual = self.fetch_switch_list()
        self.assertEqual(len(actual), len(expected))

    def test_switch_fields_match(self):
        expected = parse_magnetartikel_cs2(MAGNETARTIKEL_CS2)
        actual = self.fetch_switch_list()

        for i, exp in enumerate(expected):
            with self.subTest(index=i, name=exp["name"]):
                got = actual[i]
                self.assertEqual(got["name"], exp["name"])
                self.assertEqual(got["uid"], exp["uid"])
                self.assertEqual(got.get("typ", ""), exp["dectyp"])

    def test_switch_state_initialized_to_zero(self):
        """Freshly imported switches should start in state 0 (no persisted state)."""
        expected = parse_magnetartikel_cs2(MAGNETARTIKEL_CS2)
        state = self.fetch_switch_state()
        self.assertEqual(len(state), len(expected))
        self.assertTrue(all(v == 0 for v in state))

    def test_known_sample_articles_present(self):
        """Sanity-check specific switches known to exist in var/config/magnetartikel.cs2."""
        actual = self.fetch_switch_list()

        sw1 = actual[0]
        self.assertEqual(sw1["name"], "SW 1")
        self.assertEqual(sw1["typ"], "mm2")
        self.assertEqual(sw1["uid"], 0x3000)  # id=1 -> id_int=0 -> 0x3000 | 0

        sw2 = actual[1]
        self.assertEqual(sw2["name"], "SW 2")
        self.assertEqual(sw2["uid"], 0x3001)  # id=2 -> id_int=1 -> 0x3000 | 1


if __name__ == "__main__":
    unittest.main()
