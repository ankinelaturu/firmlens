# Technical decisions

Lightweight ADR log. When you choose, move rows from **Open** to **Decided** with date and rationale.

## Open

| ID | Topic | Options | Notes |
| --- | --- | --- | --- |
| D-001 | User-visible command prefix | `FirmLens:*` vs `Firmware Snapshot:*` | Spec uses “Firmware Snapshot”; marketplace brand is FirmLens |
| D-002 | DWARF access | WASM/native npm binding vs CLI helper (no shell) vs forked parser | Hover path must not spawn shell; index at load only |
| D-003 | C definition resolution | In-house lexer + scope rules vs reuse tree-sitter vs optional clangd query | Spec forbids name-only; clangd may differ by machine |
| D-004 | Languages activated | `c` only vs `c` + `cpp` | Many firmware files are `.c`; headers may be C++ |
| D-005 | Hover merge behavior | Append markdown section vs standalone hover | Prefer augmenting clangd when present |
| D-006 | Metadata JSON shape | Minimal hash + ranges vs richer capture tool integration | Optional; schema may break without migration |
| D-007 | Fixture toolchain | Keil on Windows vs `arm-none-eabi-gcc` debug ELF | Spec allows GCC fixture if Keil unavailable |

## Decided

| ID | Decision | Rationale |
| --- | --- | --- |
| D-100 | Offline, read-only | Product trust; no accidental data exfiltration ([firmlens-idea.md](./firmlens-idea.md)) |
| D-101 | Sparse HEX, no gap zero-fill | Wrong values worse than “unavailable” |
| D-102 | Session atomic swap + generation id | Prevents stale hover after failed/slow load |
| D-103 | Fixed-address globals/statics first | Reduces wrong-value risk; clear “unavailable” for rest |
| D-104 | **JavaScript only; no build steps** | Extension loads `.js` directly; no tsc/webpack on the critical path ([dev-setup.md](./dev-setup.md)) |
| D-105 | **Folder-based install via symlink** | `anki.firmlens-0.1.0/` in repo → link under `~/.vscode/extensions` and `~/.cursor/extensions` ([dev-setup.md](./dev-setup.md)) |
| D-106 | **No product versioning; no backward compatibility** | Ship the full idea incrementally in repo; break settings/metadata/API when needed—no migration shims |
| D-107 | **JSDoc is the code API documentation** | Replace TS types with `@typedef` / exported docblocks ([code-documentation.md](./code-documentation.md)) |

## Metadata schema (draft v1)

Optional sidecar JSON loaded with snapshot:

```json
{
  "schemaVersion": 1,
  "buildId": "app-1.2.3+git.abc",
  "axfSha256": "…",
  "captureRanges": [
    { "start": 536870912, "end": 536936448, "source": "ram-dump" }
  ]
}
```

Addresses in metadata are numeric (decimal or hex string — pick one when implementing and document).

Provenance rules:

- If `captureRanges` cover all bytes needed for displayed fields → stronger provenance text.
- If `axfSha256` present and mismatch → warn user; still allow user-selected pairing if they insist (warn only).

## Naming conventions (code)

| Concept | Suggested name |
| --- | --- |
| Sparse memory image | `HexMemory` |
| Debug index | `DwarfIndex` |
| Active load | `SnapshotSession` |
| Hover orchestration | `HoverPipeline` or `provideFirmwareHover` |