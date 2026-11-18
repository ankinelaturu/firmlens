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

Load **`snapshot.hex`** (runtime capture) + **`firmware.axf`**, open matching `firmware.c`.  
If paths differ from build (`/fixture/...`), set **`firmlens.sourceRootRemap`** e.g. `{ "from": "/fixture", "to": "/path/to/fixures-2" }`.

Details: [docs/dev-setup.md](docs/dev-setup.md).

## Test HEX parser

```bash
node test/hex-memory.test.js
node test/sniff.test.js
node test/fixures-2-hover.test.js
```

## Fixtures

```bash
./fixtures/build-fixtures.sh
```

See [fixtures/README.md](fixtures/README.md).

## Development

Open this repo in VS Code/Cursor and use **Run Extension** (`.vscode/launch.json`) or the symlink workflow above.