# FirmLens

VS Code / Cursor extension: hover C variables and view values from an **Intel HEX** snapshot paired with an **AXF/ELF** debug image.

## Repo layout

```text
anki.firmlens-0.1.0/   Extension (JavaScript, no build step)
fixtures/              Synthetic HEX, MAP, AXF sources
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

Reload the window. Command Palette → **FirmLens: Load Snapshot**.

Load **`snapshot.hex`** (runtime capture) + **`firmware.axf`** (optional GNU **`.map`** and **`metadata.json`**), open matching `firmware.c` or C++.  
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
./fixtures/build-fixtures.sh
```

See [fixtures/README.md](fixtures/README.md).

## Development

Open this repo in VS Code/Cursor and use **Run Extension** (`.vscode/launch.json`) or the symlink workflow above.