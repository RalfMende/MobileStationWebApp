# Install on OpenWrt (Omega2+, etc.)

This guide shows how to install and run MobileStation Web App on OpenWrt devices using the provided .ipk or by manual setup.

## Option A: Install the .ipk package (from GitHub Releases)

Prerequisites: SSH access and opkg configured.

1. Download the .ipk to the device (choose one):
    - Latest (requires keeping a consistent asset name across releases):
       wget -O /tmp/mswebapp.ipk "https://github.com/RalfMende/MobileStationWebApp/releases/latest/download/mswebapp_1.0.0-1_mipsel_24kc.ipk"
    - Or specific tag (more explicit; replace v1.0.0 with your release tag and use the exact asset file name as published):
       wget -O /tmp/mswebapp.ipk "https://github.com/RalfMende/MobileStationWebApp/releases/download/v1.0.0/mswebapp_1.0.0-1_mipsel_24kc.ipk"

2. (Optional) Verify checksum:
   sha256sum /tmp/mswebapp.ipk
   # Expected (for the asset above): D875348ED4848CE89BBECADBE3DD4D2BE0A383ED0AEC20C0E161063BD446342A

3. Install:
   opkg install /tmp/mswebapp.ipk

4. Enable and start the service:
   /etc/init.d/mswebapp enable
   /etc/init.d/mswebapp start

5. Open the UI:
   http://<device-ip>:6020

Default arguments (SRSEII target):
- UDP target: 127.0.0.1
- Config dir: /www
- Frontend dir: /usr/share/mswebapp/www
- Host/Port: 0.0.0.0 / 6020

You can adjust defaults by editing /etc/init.d/mswebapp (simple) or integrating with UCI later.
On first start, the init script seeds missing folders under /www (config, fcticons, icons, magicons_) and copies default CS2 files (lokomotive.cs2, magnetartikel.cs2) from the packaged defaults if present.

Tip: If your asset file name differs from the example (e.g., different version or architecture), replace the file name in the URL accordingly or download from the Releases page in a browser and copy the link.

## Option B: Manual installation (no .ipk)

1. Install Python 3 (if using Python backend fallback):
   opkg update
   opkg install python3

2. Copy application files to the device:
   - /usr/bin/mswebapp_cpp (C++ backend binary) or Python package files
   - /usr/share/mswebapp/www (templates/, static/, sw.js)
   - /www/{config,fcticons,icons,magicons_} (lokomotive.cs2, magnetartikel.cs2, icons)

3. Install init script:
   scp packaging/openwrt/init.d/mswebapp root@<device>:/etc/init.d/
   chmod +x /etc/init.d/mswebapp
   /etc/init.d/mswebapp enable
   /etc/init.d/mswebapp start

## Logs and troubleshooting

- Status: /etc/init.d/mswebapp status (if implemented) or check process list
- Restart: /etc/init.d/mswebapp restart
- Logs: logread -f
- Ports: netstat -lntp | grep 6020

If the UI doesn't load, verify that the frontend files are present at /usr/share/mswebapp/frontend and that the config folder contains valid CS2 files.
