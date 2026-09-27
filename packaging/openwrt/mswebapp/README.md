# OpenWrt Packaging Notes

This project is typically built in an OpenWrt SDK or Docker container that produces an `.ipk` for Omega2+/OpenWrt. The package definition is [Makefile](Makefile). Package runtime files are staged conventionally in [files](files), while the C++ sources remain under `src/backend`.

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

The package Makefile copies the backend sources from this repository and installs the frontend and init script from `files/`. It therefore needs to remain in this repository (or in a feed checkout that preserves the same relative layout).

## What changed
- Backend now serves `/static/...` with ETag and long caching (immutable).
- Service Worker precaches a few core assets.

## Packaging layout reminder
Recommended paths inside the ipk:
- Binary: `/usr/bin/mswebapp`
- Frontend: `/usr/share/mswebapp/www` (contains `index.html` and `static/`)
- Existing SRSEII data: `/www` (contains `config/`, `icons/`, `fcticons/`, and `magicons_/`)
- Init script: `/etc/init.d/mswebapp`

The included init script ([files/etc/init.d/mswebapp](files/etc/init.d/mswebapp)) passes `/www` as the backend configuration directory and does not modify its contents.

## Gotchas
- When updating assets, the ETag will change automatically (size/mtime-based).
- Service Worker is cache-aware but small—avoid precaching too many large files.
