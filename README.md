# FirmLens

VS Code / Cursor extension: hover C variables and view values from an **Intel HEX** snapshot paired with an **AXF/ELF** debug image.

## Repo layout

```text
anki.firmlens-0.1.0/   Extension (JavaScript, no build step)
deploy/                Standard bundle for auto-load (from `build.sh`)
fixtures/              Multi-file `project/` + `generated/` HEX/AXF
docs/                  Architecture, plan, dev setup
test/                  Node tests (no VS Code required)
```

## Install (drop-in)

The extension **is** the folder `anki.firmlens-0.1.0/` (same layout as any VS Code extension). Put it in the editor extensions directory — symlink from this repo is fine:

```bash
./scripts/link-to-vscode.sh
```

Or manually:

```bash
ln -sfn "$PWD/anki.firmlens-0.1.0" ~/.vscode/extensions/anki.firmlens-0.1.0
ln -sfn "$PWD/anki.firmlens-0.1.0" ~/.cursor/extensions/anki.firmlens-0.1.0
```

Reload the window. With the repo open, FirmLens **auto-loads** `deploy/snapshot.hex` + `deploy/firmware.axf` on startup (see [deploy/README.md](deploy/README.md)). Command Palette → **FirmLens: Load Snapshot** for manual picks.

Put **`snapshot.hex`**, **`firmware.axf`**, optional **`firmware.map`** and **`metadata.json`** under workspace **`deploy/`** (or **`build/`**), open matching source.  
Hover **globals/statics**, **`->` / `.` members**, pointers (one-level struct preview), with **local shadowing** suppressed.

If paths differ from build (`/fixture/...`), set **`firmlens.sourceRootRemap`** e.g. `{ "from": "/fixture", "to": "/path/to/fixures-2" }`.  
Metadata schema: [docs/metadata-sidecar.md](docs/metadata-sidecar.md) (`fixures-2/metadata.example.json`).

Details: [docs/dev-setup.md](docs/dev-setup.md).

## Test HEX parser

```bash
node --test test/*.test.js
```

### Verified debug formats

| Variant | Status |
| --- | --- |
| Intel HEX (linear + segment) | tested (`test/hex-memory.test.js`) |
| ELF32 i386 DWARF 4 (synthetic `fixures-2/`) | tested (`test/fixures-2-hover.test.js`) |
| GNU ld `.map` symbol corroboration | tested (`test/metadata-map.test.js`) |
| Keil ARM AXF | **not verified in CI** — use repo fixtures until you validate your build |

## Fixtures

```bash
./fixtures/project/build.sh   # requires clang + ld.lld (brew install lld llvm on macOS)
```

See [fixtures/README.md](fixtures/README.md) and [fixtures/project/README.md](fixtures/project/README.md).

## Development

Open this repo in VS Code/Cursor and use **Run Extension** (`.vscode/launch.json`) or the symlink workflow above.