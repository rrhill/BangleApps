# GoDice for Bangle.js 2

A native Bangle.js 2 application based on Particula's published GoDice JavaScript API. It discovers up to six `GoDice_` devices, decodes their documented roll packets for D4, D6, D8, D10, D10X, D12 and D20 shells, shows battery/color information, pulses a die for identification, vibrates on rolls, groups near-simultaneous rolls, and stores recent history.

Version 0.1.8 uses active, unfiltered BLE discovery before matching the GoDice
name. This is required for dice whose complete local name is sent only in the
BLE scan-response packet. It also uses large three-die dashboard pages, exposes
online/offline state, reports command-write errors, retries delayed battery
requests after notification setup, forces GoDice-compatible connection
intervals, and cancels stuck connection attempts after 12 seconds so one die
cannot block the remaining queue. Connection requests made during a scan are
queued until the scan ends; transient `BLE task is already...` errors are
automatically retried.

Menu and message screens now hold a modal display lock, preventing dashboard,
history, popup, touch, swipe, and incoming BLE updates from painting over them.

GATT service, write-characteristic, notification-characteristic, and
notification-subscription operations are strictly serialized. This is required
by Espruino's single foreground BLE-task model and fixes the repeating
`BLE busy; retrying` connection loop.

Identify now uses the broadly supported `SET_LED` command to hold both die LEDs
blue for one second and then explicitly turn them off. The dashboard renders
the reported physical die color as an outlined color marker, and the die menu
shows the color name.

After a shell is selected, roll-start packets show `ROLLING`. Stable,
tilt-stable, and move-stable packets are transformed using that shell and shown
as a large result popup, written to history, and included in session
statistics. Near-identical final packets are deduplicated. A roll wakes the LCD.

## Important connection limit

The stock Bangle.js 2 firmware is compiled with `CENTRAL_LINK_COUNT=2`, so it can maintain **two outgoing GoDice links at once**. The app remembers and displays up to six dice, but live notifications from all six at the same time require a custom Bangle.js 2 firmware compiled for six central links. This is a firmware limit, not an application setting or a limitation of the nRF52840 hardware.

Leave **Live links** set to 2 on normal firmware. Only raise it after installing and validating a custom firmware as described in `docs/SIX_CONNECTION_FIRMWARE.md`.

## Install with a local BangleApps loader

1. Update the watch to the latest official Bangle.js 2 firmware and install the current bootloader/settings apps.
2. Download and unzip this project.
3. Clone the official BangleApps repository, then copy `apps/godice` from this project into its `apps` directory.
4. In the BangleApps repository directory, start a local web server:

   ```sh
   python3 -m http.server 8000
   ```

5. In Chrome or Edge, open `http://localhost:8000`, select **Bangle.js 2**, connect to the watch, search for **GoDice**, and choose Install.
6. Ensure phone/PC GoDice apps are disconnected, wake the dice, and launch **GoDice** on the watch.

The ZIP also contains `apps/godice`, ready to copy into a fork of BangleApps for normal App Loader deployment.

## Use

- Swipe left/right: Dashboard, History, Session statistics.
- Tap a large die row: view connection/battery status, refresh it, select its
  shell, or pulse its LEDs to identify it.
- Tap the dashboard footer to move between pages when more than three dice have
  been discovered.
- Press the watch button: scan, configure dice, clear history, or reset session statistics.
- Settings app: vibration, history size, grouping window, scan timing, and live-link limit.

All newly discovered dice default to D6. Select the correct physical shell for each die; face results are wrong when the selected shell does not match.

## Testing checklist

1. Start with one D6. Confirm it appears, connects, and its battery is shown.
2. Tap its row, choose Identify, and confirm its LEDs pulse blue.
3. Roll each face several times and confirm 1–6.
4. Assign and test each other shell separately, especially D10 (`0`–`9`) and D10X (`00`–`90`).
5. Connect two dice on stock firmware and roll them within the grouping window.
6. Power a die off and back on; confirm reconnect behavior.
7. Check History, Session stats, vibration, and persistence after relaunch.
8. For a six-link custom firmware, add dice one at a time while monitoring `process.memory()` and the console for SoftDevice/GATT errors before testing simultaneous rolls.

## If no dice are detected

1. Quit or disconnect the GoDice phone/desktop application; a die already
   connected to another central device will normally stop advertising.
2. Shake or roll each die immediately before selecting **Scan now** so it is
   awake.
3. Keep the die within 30 cm of the watch for the first connection.
4. Temporarily disconnect Gadgetbridge and close the browser App Loader after
   installation, then launch GoDice again.
5. Read the bottom status line. `No dice; saw 0` means the watch received no BLE
   advertisements. `No dice; saw N` means advertisements were present but none
   advertised a name beginning with `GoDice`.
6. Increase **Scan seconds** to 15 and retry.

## Status and scope

Protocol parsing has automated tests against packets and vectors from the published API. The code and package can be statically verified without hardware. BLE stability, power use, and six concurrent links require physical GoDice and a suitably configured firmware; they are not claimed as hardware-tested here.

See `docs/PROTOCOL.md`, `docs/SIX_CONNECTION_FIRMWARE.md`, and `THIRD_PARTY_LICENSE.md`.
