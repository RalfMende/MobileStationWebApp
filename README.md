Märklin Mobile Station inspired Web UI to control locomotives and accessories (CS2/CS3 style).
Provides a self-contained C++ backend (HTTP, API, SSE, UDP) and an optional Python backend for development.

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
- C++ Backend (Windows): Build and run the "Debug C++ Backend" launch config in VS Code, or build with CMake tasks provided.
- C++ Backend (macOS/Linux): Configure with CMake; run resulting binary with flags below.
- Python (optional): `python -m mobile_station_webapp.server --config var --www src/frontend`

Open: `http://<host>:6020`

## Command Line Options (C++ and Python)
| Flag | Default | Description |
|------|---------|-------------|
| `--udp-ip` | `127.0.0.1` | Target CS2/bridge UDP IPv4 or hostname |
| `--config` | `var` | Base directory with `config/` (contains CS2 files and icons) |
| `--host` | `0.0.0.0` | Bind host address |
| `--port` | `6020` | HTTP listen port |
| `--www` | `src/frontend` | Frontend directory (templates/, static/, sw.js) |

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
`GET /api/health` returns for example:
```json
{
    "status": "ok",
    "system_state": "stopped",
    "loco_count": 12,
    "switch_count": 64,
    "udp_target": "127.0.0.1:15731",
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
- Prebuilt .ipk: download from GitHub Releases (Latest). Install and enable the init script to run on boot.
- Full guide: see `docs/INSTALL-openwrt.md`.

Init script (procd) is provided at `packaging/openwrt/init.d/mswebapp`. It prefers the C++ backend, falls back to Python if not present.

## Releases and Artifacts
- GitHub Releases: prebuilt `.ipk` artifacts are published per version (preferred).
- `packaging/`: packaging scripts and init files (do not install automatically).

Recommendation:
- Publish `.ipk` files under GitHub Releases and link from `docs/INSTALL-openwrt.md`.
- Commit the OpenWrt init script (`packaging/openwrt/init.d/mswebapp`) so users can inspect and reuse it.
- Place installation instructions under `docs/`, and link them from this README.

## Development Notes
- C++ backend in `src/backend_cpp` (single binary, header-only HTTP server)
- Optional Python backend in `src/backend_py` for development/testing
- Frontend in `src/frontend` (templates, static, sw.js)
- SSE initial snapshot + incremental updates; the frontend JS keeps the UI in sync

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
