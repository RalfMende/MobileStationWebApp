# OpenWrt Packaging Notes

This project is typically built in an OpenWrt SDK or Docker container that produces an `.ipk` for Omega2+/OpenWrt. The package definition is [Makefile](Makefile). Package runtime files are staged conventionally in [files](files), while the C++ sources remain under `src/backend_cpp`. To speed up the web UI on low-power devices, precompress static assets and ship both original and `.gz` files in the package.

## Local feed setup

Register this directory as a local feed in the OpenWrt build tree:

```
echo "src-link mswebapp /absolute/path/to/MobileStationWebApp/packaging/openwrt" >> feeds.conf.default
./scripts/feeds update mswebapp
./scripts/feeds install mswebapp
```

Then select `Utilities -> mswebapp` in `make menuconfig` and build with:

```
make package/mswebapp/compile V=s
```

The package Makefile copies the backend sources from this repository and installs the frontend, default data and init script from `files/`. It therefore needs to remain in this repository (or in a feed checkout that preserves the same relative layout).

## What changed
- Backend now serves `/static/...` with ETag and long caching (immutable).
- If `Accept-Encoding: gzip` is present and a `*.gz` variant exists next to the original file, the server serves the `.gz` file (with `Content-Encoding: gzip`).
- Service Worker precaches a few core assets.

## Build-time precompression
Run this script before staging files into the package:

```
sh packaging/openwrt/precompress.sh
```

It creates:
- `src/frontend/static/style.css.gz`
- `src/frontend/static/script.js.gz`

You can add more files if beneficial.

## Packaging layout reminder
Recommended paths inside the ipk:
- Binary: `/usr/bin/mswebapp_cpp`
- Frontend: `/usr/share/mswebapp/www` (contains `templates/` and `static/`)
- Defaults (first-run seed): `/usr/share/mswebapp/var`
- Init script: `/etc/init.d/mswebapp`

The included init script ([files/etc/init.d/mswebapp](files/etc/init.d/mswebapp)) already points the backend to these locations.

## Gotchas
- Keep both compressed and uncompressed files in the package so legacy clients still work.
- When updating assets, the ETag will change automatically (size/mtime-based).
- Service Worker is cache-aware but small—avoid precaching too many large files.
