# OpenWrt Packaging Notes

This project is typically built in a Docker container that produces an `.ipk` for Omega2+/OpenWrt. To speed up the web UI on low-power devices, precompress static assets and ship both original and `.gz` files in the package.

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

The included init script (`packaging/openwrt/init.d/mswebapp`) already points the backend to these locations.

## Gotchas
- Keep both compressed and uncompressed files in the package so legacy clients still work.
- When updating assets, the ETag will change automatically (size/mtime-based).
- Service Worker is cache-aware but small—avoid precaching too many large files.
