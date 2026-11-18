# Firmware Snapshot Hover test fixture

This is entirely synthetic. The ready-to-use debug binary is a 32-bit little-endian x86 ELF with DWARF 4 and an .axf extension. It exercises architecture-independent ELF/DWARF and Intel HEX handling. It was built with GCC and GNU binutils, so it does not establish compatibility with Keil ARM output. Treat this binary and both HEX files as test inputs for the extension.

## Try it in VS Code

1. Extract this archive and open its folder in your extension's Development Host.
2. Run **Firmware Snapshot: Load Snapshot** and select snapshot.hex and firmware.axf.
3. If the extension asks for source-root remapping, map the build path /fixture to the extracted folder. Open firmware.c and hover over mf_root, root, and retry_count.
4. Switch from snapshot.hex to build.hex using the same AXF to exercise the before/after comparison.

| Expression | Build image | Synthetic snapshot |
| --- | --- | --- |
| mf_root | 0x20001000 | 0x20001000 |
| mf_root->id | 1 | 1 |
| mf_root->file_count | 0 | 3 |
| mf_root->initialized | false | true |
| retry_count | 0 | 7 |

The pointer itself lives at 0x20000020. The pointee occupies 12 bytes at 0x20001000. Its fields are at offsets 0, 4, and 8, followed by three padding bytes. retry_count lives at 0x20000024. The capture generator models the state after the assignments in _start. It replaces the relevant build bytes without executing the firmware. The build and snapshot differ only in those values.

## Files and reproducibility

- firmware.c is the source for the symbols you hover over.
- firmware.axf is the compiled debug ELF. firmware.map is optional for address verification.
- build.hex is the original load image. snapshot.hex is the merged fixture.
- fixture.ld assigns predictable addresses.
- build.sh and make_snapshot.py regenerate the fixture on a Linux system or WSL with GCC supporting -m32, GNU binutils, and Python 3. No 32-bit C library is needed. Run sh build.sh in the extracted folder. Windows users can consume the bundled files without rebuilding.

To test actual Keil compatibility separately, compile this same synthetic C source in a Cortex-M Keil project with debug information, use the addresses from that build, and regenerate the capture for that layout.
