# Quick Start Guide

This guide helps you get up and running fast and shows the key parts of the UI.

## What you need

- Install MobileStationWebApp on your SRSEII
- Make sure the service is running
- Connect your phone/tablet/PC to the same network as the SRSEII (or connect directly to the SRSEII)

Once the server is running, open your browser and navigate to:

- http://gleisbox:6020 (or http://<server-ip>:6020)

## 1) Control a locomotive

The control view shows speed, direction and function buttons.

![Control view](./mswebapp_control.jpg)

- Speed: Drag the main slider to set the speed.
- Direction: Tap the direction button to toggle forward/reverse.
- Functions: Tap F0, F1, … to toggle lights, sound, etc.

## 2) Keyboard / Switches

Operate turnouts and accessories via the keyboard view.

![Keyboard view](./mswebapp_keyboard.jpg)

- Each tile represents a switch or accessory.
- Tap to toggle the state; the current state is highlighted.

## 3) Change a locomotive icon

Change a locomotive's icon.

![Select a locomotive](./mswebapp_select.jpg)

- Click the central locomotive image to open the list of available icons.
- Scroll the list (or use search if available).
- Tap an icon to apply it.
- To cancel, use the upper-right or lower-right button.

## 4) System info and health

View system status and manage the SRSEII loco list.

![Info view](./mswebapp_info.jpg)

- System information: RUN/STOP state, loco/switch counts, backend version, UDP target
- Access Online Help
- Manage the SRSEII loco list (reload/update)

## Tips

### Mobile Usage: Install as WebApp
You can install the MobileStation Web App directly to your home screen for a native app-like experience:

- **iOS:** Open the app in Safari, tap the Share icon, then select "Add to Home Screen".
- **Android:** Open the app in Chrome (or most browsers), tap the menu (⋮), then choose "Install app" or "Add to Home screen".

The app includes a manifest and touch icon, so it launches fullscreen and behaves like a native app.
