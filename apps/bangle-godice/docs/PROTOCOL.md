# Protocol reference used by this port

Source: ParticulaCode/GoDiceJavaScriptAPI, `godice.js`, main branch as retrieved on 2026-07-18.

- Advertised name prefix: `GoDice_`
- Nordic UART service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- Watch writes to: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- Watch subscribes to: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`
- Commands: battery `3`, set LEDs `8`, pulse LEDs `16`, color `23`
- Events: `R` rolling; `S` stable; `FS` fake stable; `TS` tilt stable; `MS` move stable; `Bat` battery; `Col` color.

Only `S` is counted as a legitimate roll. `FS`, `TS`, and `MS` are decoded but do not enter roll history. Shell face calculation uses the original nearest-vector algorithm and the original D10/D10X/D4/D8/D12 transform tables.
