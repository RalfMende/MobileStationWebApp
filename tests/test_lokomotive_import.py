#!/usr/bin/env python3
"""Test that var/config/lokomotive.cs2 is correctly imported by the mswebapp_cpp backend.

Starts the backend binary against a temp copy of var/config, queries
GET /api/loco_list, and compares the result against an independent Python
parse of lokomotive.cs2 (mirroring the parsing rules in
src/backend/main.cpp: parse_lokomotive_cs2).

Run with:
    python3 tests/test_lokomotive_import.py
or:
    python3 -m unittest tests.test_lokomotive_import
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mswebapp_test_utils import BackendServer, CONFIG_SRC_DIR, parse_int_auto

LOKOMOTIVE_CS2 = CONFIG_SRC_DIR / "lokomotive.cs2"


def parse_lokomotive_cs2(path):
    """Reference Python re-implementation of parse_lokomotive_cs2() in main.cpp.

    Returns dict: uid -> {name, icon, symbol, tachomax, fn_count, funktionen: {nr: typ}}
    """
    locos = {}
    cur = None
    in_fn = False
    fn_nr = -1
    fn_typ = -1

    def flush():
        if cur is not None and cur["uid"]:
            locos[cur["uid"]] = cur

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for raw_line in f:
            line = raw_line.strip()
            if line == "lokomotive":
                flush()
                cur = {"uid": 0, "name": "", "icon": "", "symbol": 0,
                       "tachomax": 0, "fn_count": 0, "funktionen": {}}
                in_fn = False
                fn_nr = -1
                fn_typ = -1
                continue
            if cur is None:
                continue
            if line.startswith(".funktionen"):
                in_fn = True
                fn_nr = -1
                fn_typ = -1
                continue
            if in_fn and line.startswith("..") and "=" in line:
                key, _, val = line[2:].partition("=")
                key = key.strip()
                val = val.strip()
                if key == "nr":
                    fn_nr = parse_int_auto(val)
                    if 0 <= fn_nr < 32 and fn_nr + 1 > cur["fn_count"]:
                        cur["fn_count"] = fn_nr + 1
                elif key in ("typ", "type"):
                    fn_typ = parse_int_auto(val)
                if fn_nr >= 0 and fn_typ >= 0:
                    cur["funktionen"][fn_nr] = fn_typ
                    fn_nr = -1
                    fn_typ = -1
                    in_fn = False
                continue
            if line.startswith(".") and "=" in line and not line.startswith(".."):
                key, _, val = line[1:].partition("=")
                key = key.strip()
                val = val.strip()
                if key == "uid":
                    cur["uid"] = parse_int_auto(val)
                elif key == "name":
                    cur["name"] = val
                elif key == "icon":
                    cur["icon"] = val
                elif key == "symbol":
                    cur["symbol"] = parse_int_auto(val)
                elif key == "tachomax":
                    cur["tachomax"] = parse_int_auto(val)
    flush()
    return locos


@unittest.skipUnless(LOKOMOTIVE_CS2.is_file(), "var/config/lokomotive.cs2 not found")
class LokomotiveImportTest(unittest.TestCase):
    server = None

    @classmethod
    def setUpClass(cls):
        cls.server = BackendServer().start()

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.stop()

    def fetch_loco_list(self):
        return self.server.get_json("/api/loco_list")

    def test_loco_count_matches(self):
        expected = parse_lokomotive_cs2(LOKOMOTIVE_CS2)
        actual = self.fetch_loco_list()
        self.assertEqual(len(actual), len(expected),
                         "number of imported locos does not match lokomotive.cs2")

    def test_loco_fields_match(self):
        expected = parse_lokomotive_cs2(LOKOMOTIVE_CS2)
        actual = self.fetch_loco_list()

        self.assertEqual(sorted(int(u) for u in actual.keys()), sorted(expected.keys()))

        for uid, exp in expected.items():
            with self.subTest(uid=uid, name=exp["name"]):
                got = actual[str(uid)]
                self.assertEqual(got["uid"], uid)
                self.assertEqual(got["name"], exp["name"])
                self.assertEqual(got["icon"], exp["icon"])
                self.assertEqual(got["symbol"], exp["symbol"])
                self.assertEqual(got["tachomax"], exp["tachomax"])
                self.assertEqual(got["fn_count"], exp["fn_count"])
                got_fn = {int(k): v["typ"] for k, v in got.get("funktionen", {}).items()}
                self.assertEqual(got_fn, exp["funktionen"])

    def test_known_sample_locos_present(self):
        """Sanity-check specific locos known to exist in var/config/lokomotive.cs2."""
        actual = self.fetch_loco_list()

        loco1 = actual["1"]
        self.assertEqual(loco1["name"], "Lokliste")
        self.assertEqual(loco1["symbol"], 5)
        self.assertEqual(loco1["fn_count"], 16)

        loco_260 = actual[str(0x4005)]
        self.assertEqual(loco_260["name"], "260 417-1 DB")
        self.assertEqual(loco_260["symbol"], 1)


if __name__ == "__main__":
    unittest.main()
