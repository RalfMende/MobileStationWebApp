# FAQ

## How do I install the app?

MobileStationWebApp can be installed on SRSEII as a service: SYSTEM > SOFTWARE > MSWEBAPP.  
On other systems, compile and install manually. See the [Installation Guide](help-install-guide.md).


## How do I connect my mobile device?

Make sure your device is connected to the SRSEII (Wi‑Fi or wired). Then open your browser and go to `http://gleisbox:6020` (or the SRSEII IP address) to access the app.


## How do I install the app on my mobile device?
You can install MobileStationWebApp directly to your home screen for a native app-like experience:
- **iOS:** Open the app in Safari, tap the Share icon, then select "Add to Home Screen".
- **Android:** Open the app in Chrome (or most browsers), tap the menu (⋮), then choose "Install app" or "Add to Home screen".
The app includes a manifest and touch icon, so it launches full screen and behaves like a native app.


## How do I load new locomotives?

The `Lokomotive.cs2` file on the SRSEII is monitored by the filesystem, and whenever it changes, mswebapp reloads the configuration. The buttons in the app’s info were initially intended for Teddy’s Railcontrol, but they also automatically update the locomotives in mswebapp as a side effect.


## How can I load and display Locomotive Pictures and Icons?

By default, MobileStationWebApp uses the Mobile Station graphics. To use the locomotive and function icons from the CS2/CS3, copy them to the SRSEII: `/www/icons` (locomotives) and `/www/fcticons` (functions).


## How do I set up switches/turnouts?

Edit `/www/config/magnetartikel.cs2` on the SRSEII, then restart the MSWEBAPP service for the changes to take effect.


## How can I display different turnout and signal icons?

This feature is not yet available. Only red and green icons are supported.


## How can I get help?

For help, visit the [Stummiforum](https://www.stummiforum.de/t238581f7-Mobile-Station-App-als-Webinterface-fuer-den-SRSEII.html#msg2862401) or use [GitHub Issues](https://github.com/RalfMende/MobileStationWebApp/issues) to report bugs.


## Where can I find the source code?

The source code is available on [GitHub](https://github.com/RalfMende/MobileStationWebApp).


## What license applies?

See [LICENSE](../LICENSE).