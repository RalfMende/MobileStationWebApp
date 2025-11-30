# MobileStationWebApp Documentation

Welcome to the documentation for MobileStationWebApp!



## Table of Contents

- [Getting Started](help-quick-start.md)
- [Installation Guide on SRSEII](help-install-guide.md)
- [FAQ](#faq)



## FAQ

**How do I install the app?**

MobileStationWebApp can be installed on SRSEII as a service: SYSTEM > SOFTWARE > MSWEBAPP.  
On other systems, compile and install manually. See the [Installation Guide](INSTALL-openwrt.md).


**Where can I find the source code?**

The source code is available on [GitHub](https://github.com/RalfMende/MobileStationWebApp).


**What license applies?**

See [LICENSE](../LICENSE).

**How do I connect my mobile device?**

Make sure your device is connected to the SRSEII (Wi‑Fi or wired). Then open your browser and go to http://<SRSEII-IP-address>:6020 to access the app.


**How do I install the App on my device?**
You can install the MobileStation Web App directly to your home screen for a native app-like experience:
- **iOS:** Open the app in Safari, tap the Share icon, then select "Add to Home Screen".
- **Android:** Open the app in Chrome (or most browsers), tap the menu (⋮), then choose "Install app" or "Add to Home screen".
The app includes a manifest and touch icon, so it launches fullscreen and behaves like a native app.


**The Locomotive Icons are now displayed**

By default, MobileStationWebApp uses the Mobile Station graphics. To use the locomotive and function icons from the CS2/CS3, copy them to the SRSEII: /www/icons (locomotives) and /www/fcticons (functions).


**How do I setup Switches / Turnouts**

Please edit the configuration file on the SRSEII /www/config/magnetartikel.cs2


**How can I display different Turnout and Signal Icons?**

This feature isn't implemented yet. Only the red and green icon is available.


**How can I get help?**

Use the [GitHub Issues](https://github.com/RalfMende/MobileStationWebApp/issues) for questions and bug reports.

---

More information coming soon.
