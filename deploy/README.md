# FirmLens deploy bundle

Standard layout at the **workspace root** for auto-load on window reload.

| File | Role |
| --- | --- |
| `snapshot.hex` | Runtime capture |
| `firmware.axf` | Debug image (ELF/DWARF) |
| `firmware.map` | Optional GNU map corroboration |
| `metadata.json` | Optional provenance sidecar |

FirmLens looks here when `firmlens.autoLoadOnStartup` is true (default). It tries `firmlens.deployDirectory` (default `deploy`), then `build/`.

Populate from the repo fixture:

```bash
./fixtures/project/build.sh
```

Override paths with `firmlens.autoLoadPaths` in settings if needed.

Opening a `.hex` file in this folder (or any workspace `**/*.hex`) uses the **FirmLens Hex Snapshot** custom editor:

- **Image (symbols)** — 16-byte memory map, DWARF symbol gutter, colored bytes, decode tooltips (hover a byte).
- **HEX records** — Intel HEX lines with a **Symbols** column for overlapping globals.