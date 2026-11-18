# FirmLens fixtures

Synthetic public inputs for demos and tests (no customer dumps).

## Multi-file project (primary)

| Path | Description |
| --- | --- |
| `project/src/` | Multi-module C sources (`storage`, `board`, `network`, `diag`, `main`) |
| `project/link/project.ld` | RAM layout: `mf_root` @ `0x20000020`, `g_root` @ `0x20001000`, … |
| `generated/project.axf` | **Linked** ELF32 i386 + DWARF 4 (hover-ready) |
| `generated/project_snapshot.hex` | Post-init capture |
| `generated/project.map` | GNU map for corroboration |

Build (macOS: `brew install lld llvm`):

```bash
./fixtures/project/build.sh
```

FirmLens: load `project_snapshot.hex` + `project.axf`, open `project/src/*.c`, remap:

```json
[{ "from": "/fixture/project", "to": "<repo>/fixtures/project" }]
```

Legacy names `demo_mf_root.*` in `generated/` are copies of the project build for older docs.

## Smaller single-file sources (reference only)

| Path | Description |
| --- | --- |
| `c/demo_mf_root_sections.c` | Minimal 2-symbol source (superseded by `project/`) |
| `c/demo_mf_root.c` | Narrative readme example — use `project/src/storage.c` for DWARF paths |
| `hex/demo_mf_root_partial.hex` | Partial pointee (8 bytes; `initialized` unavailable) |

## Test

```bash
node --test test/fixtures-project-hover.test.js
```