# FirmLens fixtures

Synthetic public inputs for demos and tests (no customer dumps).

| Path | Description |
| --- | --- |
| `c/demo_mf_root_sections.c` | Source for DWARF demo (`mf_root`, `demo_direct`) |
| `link/demo_mf_root.ld` | Linker script: `mf_root` @ `0x20000020`, `demo_direct` @ `0x20000030` |
| `hex/demo_mf_root.hex` | Full pointee (9 bytes @ `0x20001000`) |
| `hex/demo_mf_root_partial.hex` | Only 8 bytes at pointee (`initialized` unavailable) |
| `map/demo_mf_root.map` | Synthetic Keil-style map for address corroboration |
| `generated/` | Outputs from `build-fixtures.sh` (committed `.axf` may be unlinked ELF) |

## Regenerate

```bash
./fixtures/build-fixtures.sh
```

With `arm-none-eabi-gcc` installed, `generated/demo_mf_root.axf` is a linked ELF with runtime addresses in DWARF. Without it, the script emits an **unlinked** `elf32-littlearm` object with debug info (sufficient for early DWARF parser work).

## Spec crosswalk

Matches [docs/firmlens-idea.md](../docs/firmlens-idea.md): pointer `0x20000020` → `0x20001000`, struct bytes `01 00 00 00 03 00 00 00 01`.