# Six simultaneous GoDice connections

## Why official firmware stops at two

The official Espruino `boards/BANGLEJS2.py` currently defines both `CENTRAL_LINK_COUNT` and `NRF_SDH_BLE_CENTRAL_LINK_COUNT` as 2. Those constants allocate the SoftDevice connection table at firmware build time; JavaScript cannot raise them.

## Experimental custom-firmware path

1. Clone the official Espruino firmware source and follow its documented Bangle.js 2 build/toolchain instructions.
2. Create a separate board definition derived from `boards/BANGLEJS2.py`; do not overwrite the official definition.
3. Change both central-link constants from 2 to 6.
4. Build once. The Nordic SoftDevice configuration/check reports the required application RAM start for that link count and the configured MTU/event length. Update the custom board's `LD_APP_RAM_BASE` to the exact reported value, then rebuild. Do not guess this address.
5. Flash using the official Bangle.js firmware-update procedure and retain a known-good official firmware image for recovery.
6. In GoDice settings, raise **Live links** one step at a time, validating stability and free memory at 3, 4, 5, then 6.

Custom firmware can reduce JavaScript RAM and may affect the watch's inbound phone connection, scan behavior, throughput, power draw, and stability. This package intentionally does not ship an untested firmware binary.
