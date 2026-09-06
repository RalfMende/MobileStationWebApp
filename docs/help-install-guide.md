# Install on SRSEII

This guide shows how to install and run MobileStationWebApp on the SRSEII using the provided .ipk package.

Prerequisites: SSH access to the SRSEII or use the terminal on the SRSEII (http://gleisbox:22). 

## Step-by-Step guide to install the .ipk package

1) Download the latest .ipk to the device (generic link without version in the URL):

```
wget -O /tmp/mswebapp.ipk "https://github.com/RalfMende/MobileStationWebApp/releases/latest/download/mswebapp_mipsel_24kc.ipk"
```

2) (Optional) Verify checksum:

```
sha256sum /tmp/mswebapp.ipk
```

3) Install the package:

```
opkg install /tmp/mswebapp.ipk
```

4) Verify that the existing SRSEII data is available:

```
ls -d /www/config /www/icons /www/fcticons /www/magicons_
```

5) Install the init script:

```
wget https://raw.githubusercontent.com/RalfMende/MobileStationWebApp/main/packaging/openwrt/init.d/mswebapp -O /etc/init.d/mswebapp
chmod +x /etc/init.d/mswebapp
```
Default arguments for the SRSEII:
- Config dir: /www
- Frontend dir: /usr/share/mswebapp/www

You can adjust defaults by editing /etc/init.d/mswebapp (simplest) or integrating with UCI later. The service does not create or copy configuration files or icons; it uses the existing SRSEII data under `/www`.

6) Enable and start the service:

```
/etc/init.d/mswebapp enable
/etc/init.d/mswebapp start
```

7. Open the UI in the Browser:
   
   http://gleisbox:6020 (hostname or ip of SRSEII)


## Command Line Options (C++ backend)
The flags below reflect the implementation in `src/backend/main.cpp`. On SRSEII, the init script may override paths.

| Flag | Default | Description |
|------|---------|-------------|
| `--config <dir>` | `var` | Base directory containing `config/`, `icons/`, `fcticons/`, `magicons_` |
| `--udp-ip <ip\|host>` | `127.0.0.1` | Target CS2/CS3(+)/can2lan via  IPv4 or hostname |
| `--host <addr>` | `0.0.0.0` | HTTP bind address |
| `--port <port>` | `6020` | HTTP listen port |
| `--www <dir>` | derived from executable | Frontend directory (templates/, static/, sw.js); optional override |
| `--bind[=<ms>]` | disabled (1000 ms when enabled) | Enable update of Locomotive.cs2 when ...ms after received MFX-BIND/READ_CONFIG |
| `--verbose` or `-v` | off | Enable verbose logging |
| `--help` or `-h` | — | Show usage and exit |


## Required files in the base directory
The application expects the following structure under the directory passed via the `--config` argument (default "/www" on the SRSEII):

```
<config-dir>/
    config/
        lokomotive.cs2
        magnetartikel.cs2
    icons/
        ... locomotive images (from CS2/CS3)
    fcticons/
        ... function icons (from CS2/CS3)
    magicons_/
        ... accessory images (from CS2/CS3)
```

- `lokomotive.cs2`: defines all controllable locomotives of the Gleisbox / Mobile Station.
- `magnetartikel.cs2`: defines all controllable switches, signals, and accessories.
- Both CS2 files must exist in the `config` subfolder. They are imported at startup and whenever they change.
- Icon folders are optional: if present, the app uses the CS2/CS3 graphics; otherwise the app falls back to its default icons.
