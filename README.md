Märklin Mobile Station inspired Web UI to control locomotives and accessories (CS2/CS3 style) via a lightweight Flask backend. Provides a dynamic keyboard, locomotive function control, switch operations, state synchronization via Server-Sent Events (SSE), and a PWA-capable frontend.

## Features
- Locomotive speed, direction, and up to 32 functions
- Switch / accessory keyboard (64 slots, paged UI)
- Real-time state sync with SSE (initial snapshot + incremental updates)
- Unified control API (`/api/control_event` and `/api/keyboard_event`)
- CS2 `.cs2` file parsing for locomotives and magnet articles
- Service Worker + manifest for basic PWA behavior
- Health endpoint (`/api/health`) for monitoring / watchdogs
- Packaged `src/` layout; installable via `pyproject.toml`

## Quick Start (Development)
```bash
git clone <this-repo-url>
cd MobileStationWebApp
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .  # or: pip install Flask
python src/mobile_station_webapp/server.py --udp-ip 192.168.1.100 --config tmp --host 0.0.0.0 --port 6020
```
Then open: `http://<host>:6020`

Minimal (module) start alternative:
```bash
python -m mobile_station_webapp.server --config tmp
```

After packaging (see below):
```bash
pip install .
mswebapp --config /path/to/config --udp-ip 192.168.1.50
```

## Command Line Options
| Flag | Default | Description |
|------|---------|-------------|
| `--udp-ip` | `192.168.20.42` | Target CS2/bridge UDP IP for CAN frames |
| `--config` | `tmp` | Directory containing `lokomotive.cs2`, `magnetartikel.cs2` |
| `--host` | `0.0.0.0` | Bind host address |
| `--port` | `6020` | HTTP listen port |

## API Overview
Base path: root of server (`/` serves UI)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events` | GET (SSE) | Stream of system, loco, function, switch events |
| `/api/control_event` | POST | Loco speed / direction / function control |
| `/api/loco_list` | GET | Parsed locomotives (map keyed by UID) |
| `/api/loco_state` | GET | Full or single loco state (query `?loco_id=`) |
| `/api/keyboard_event` | POST | Switch (accessory) on/off event |
| `/api/switch_list` | GET | Raw parsed magnet article data |
| `/api/switch_state` | GET | Current switch state array/map |
| `/api/info_events` | POST | Function trigger for info page |
| `/api/stop_button` | POST | Toggle system running/stopped |
| `/api/health` | GET | Health/status JSON |

### Control Event Payload Examples

Speed:
```json
{ "loco_id": 123456, "speed": 400 }
```
Direction:
```json
{ "loco_id": 123456, "direction": "forward" }
```
Function:
```json
{ "loco_id": 123456, "function": 2, "value": 1 }
```

### Keyboard (Switch) Event
```json
{ "idx": 5, "value": 1 }
```

## Health Endpoint
`GET /api/health` returns:
```json
{
    "status": "ok",
    "system_state": "stopped",
    "loco_count": 12,
    "switch_count": 64,
    "udp_target": "192.168.20.42:15731",
    "version": "0.1.0"
}
```

## Parsing CS2 Files
Expected filenames in the config directory:
```
lokomotive.cs2
magnetartikel.cs2
```
The parser is intentionally tolerant; malformed lines are skipped.

## OpenWrt / Embedded Deployment
1. Install Python + pip (size constraints: remove caches after install).
2. Copy repo or install wheel (`pip install mobile-station-webapp-<ver>.whl`).
3. Provide config dir (e.g. `/root/mswebapp/config`).
4. Add init script (`/etc/init.d/mswebapp`) using `mswebapp --config /root/mswebapp/config --udp-ip <bridge-ip>`.
5. Ensure firewall permits UDP ports 15730/15731 and HTTP port (e.g. 6020).
6. (Optional) Reverse proxy via `uhttpd`.

Example procd script snippet:
```sh
#!/bin/sh /etc/rc.common
START=95
USE_PROCD=1
start_service() {
    procd_open_instance
    procd_set_param command /usr/bin/python3 -m mobile_station_webapp.server --config /root/mswebapp/config --udp-ip 192.168.1.50 --port 6020
    procd_set_param respawn
    procd_close_instance
}
```

## Packaging
`pyproject.toml` is provided (setuptools). Build and install locally:
```bash
python -m build  # requires: pip install build
pip install dist/mobile_station_webapp-0.1.0-py3-none-any.whl
```
Run after install:
```bash
mswebapp --config /path/to/config
```

## Development Notes
- Source under `src/mobile_station_webapp/`
- Static + templates packaged; service worker at `/sw.js`
- SSE initial snapshot + incremental updates; consumer JS keeps UI in sync
- Threaded Flask server (no reloader) for embedded stability

## Icons / Function Graphics
CS3 function icons (example):
```
http://<CS3-IP>/app/assets/fct/fkticon_i_001.svg
```
Indexes reportedly up to 296 (gap 176–197). Not all shipped here—add only what you need to save space.

## Original Inspiration / Reference
Original forum walkthrough (German):
https://www.stummiforum.de/t56814f5-M-rklin-Mobile-Station-App-Schritt-f-r-Schritt.html

## License
Beerware (see header in source files).

---
Feel free to open issues or contribute enhancements (error handling, authentication, multi-user state, etc.).
