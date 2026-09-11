"""Shared helpers for backend integration tests (starting mswebapp_cpp, etc.)."""
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_SRC_DIR = REPO_ROOT / "var" / "config"
FRONTEND_DIR = REPO_ROOT / "src" / "frontend"

BACKEND_CANDIDATES = [
    REPO_ROOT / "src" / "backend" / "build-macos-debug" / "mswebapp",
    REPO_ROOT / "src" / "backend" / "build-macos-release" / "mswebapp",
    REPO_ROOT / "src" / "backend" / "build-macos-debug" / "mswebapp_cpp",
    REPO_ROOT / "src" / "backend" / "build-macos-release" / "mswebapp_cpp",
]


def find_backend_binary():
    for candidate in BACKEND_CANDIDATES:
        if candidate.is_file():
            return candidate
    return None


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def parse_int_auto(value):
    """Mirror parse_int_auto() from main.cpp: decimal or 0x-prefixed hex."""
    value = value.strip()
    if len(value) > 2 and value[0] == "0" and value[1] in "xX":
        try:
            return int(value, 16)
        except ValueError:
            return 0
    try:
        return int(value)
    except ValueError:
        return 0


class BackendServer:
    """Starts mswebapp_cpp against a temp copy of var/config and tears it down again."""

    def __init__(self, config_src_dir=CONFIG_SRC_DIR):
        self.config_src_dir = config_src_dir
        self.proc = None
        self.port = None
        self.tmpdir = None

    def start(self, timeout=10.0):
        binary = find_backend_binary()
        if binary is None:
            raise RuntimeError(
                "mswebapp_cpp backend binary not built; run the "
                "'C++ backend: Build Debug (macOS)' task first")

        self.tmpdir = tempfile.mkdtemp(prefix="mswebapp_test_")
        cfg_dir = Path(self.tmpdir) / "config"
        shutil.copytree(self.config_src_dir, cfg_dir)

        self.port = find_free_port()
        self.proc = subprocess.Popen(
            [str(binary), "--config", self.tmpdir, "--www", str(FRONTEND_DIR),
             "--host", "127.0.0.1", "--port", str(self.port)],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        self._wait_for_ready(timeout)
        return self

    def _wait_for_ready(self, timeout):
        url = f"{self.base_url}/api/loco_list"
        deadline = time.time() + timeout
        last_err = None
        while time.time() < deadline:
            if self.proc.poll() is not None:
                out = self.proc.stdout.read() if self.proc.stdout else ""
                raise RuntimeError(f"backend exited early (code {self.proc.returncode}): {out}")
            try:
                with urllib.request.urlopen(url, timeout=1.0):
                    return
            except (urllib.error.URLError, ConnectionError) as exc:
                last_err = exc
                time.sleep(0.2)
        raise RuntimeError(f"backend did not become ready in time: {last_err}")

    @property
    def base_url(self):
        return f"http://127.0.0.1:{self.port}"

    def get_json(self, path):
        import json
        with urllib.request.urlopen(f"{self.base_url}{path}", timeout=5.0) as resp:
            if resp.status != 200:
                raise RuntimeError(f"GET {path} returned status {resp.status}")
            return json.loads(resp.read().decode("utf-8"))

    def post_json(self, path, payload):
        """POST a JSON body; returns (status_code, parsed_json_or_None).

        Uses compact separators (no spaces) to match how the real frontend's
        JSON.stringify() serializes bodies -- some handlers (e.g. stop_button)
        do a naive literal substring search like `"state":true` that would
        not match if spaces were inserted after ':'.
        """
        import json
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}", data=data, method="POST",
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, (json.loads(body) if body else None)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            try:
                return exc.code, json.loads(body) if body else None
            except json.JSONDecodeError:
                return exc.code, None

    def post_raw(self, path, raw_body, content_type="application/json"):
        """POST an arbitrary raw string body (e.g. malformed JSON); returns
        (status_code, response_text)."""
        req = urllib.request.Request(
            f"{self.base_url}{path}", data=raw_body.encode("utf-8"), method="POST",
            headers={"Content-Type": content_type})
        try:
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read().decode("utf-8")

    def stop(self):
        if self.proc is not None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait(timeout=5)
        if self.tmpdir is not None:
            shutil.rmtree(self.tmpdir, ignore_errors=True)
