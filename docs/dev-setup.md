# Development setup

FirmLens is a **folder-based** VS Code / Cursor extension: plain **JavaScript** in the repo, **no compile or bundle step**. You install it by placing the extension directory under the editor’s extensions folder, typically via a **symlink** from this repository.

## Repository layout (planned)

```text
FirmLens/
  anki.firmlens-0.1.0/       # Shippable VS Code extension root (package.json lives here)
    package.json
    extension.js             # activate / deactivate
    src/                     # session, hover wiring
    lib/                     # hex, dwarf, identity, decode, present (Node-runnable)
  fixtures/
  test/
  docs/
```

All runtime code is `.js` the editor loads directly. `package.json` → `"main": "./extension.js"` (or equivalent entry).

## Editor extensions directories

| Editor | Extensions folder (macOS) |
| --- | --- |
| VS Code | `~/.vscode/extensions/` |
| Cursor | `~/.cursor/extensions/` |

On Windows, use `%USERPROFILE%\.vscode\extensions` and `%USERPROFILE%\.cursor\extensions`.

VS Code expects each installed extension in a subdirectory named **`publisher.name-version`**. FirmLens does not ship versioned releases in the product sense (see [decisions.md](./decisions.md)), but the **folder name** still follows that pattern so the host recognizes it. Example:

```text
~/.vscode/extensions/anki.firmlens-0.1.0  →  symlink  →  …/FirmLens/anki.firmlens-0.1.0
```

Use the same publisher and name as in `package.json` (`publisher`: `anki`, `name`: `firmlens`). Bump the `-0.0.0` suffix only if the host fails to pick up the extension after a manual reinstall—not as a release process.

## Symlink workflow (recommended)

From the machine where you develop:

```bash
# Example — adjust paths to your clone
EXT_REPO="/Users/you/CursorProjects/FirmLens/anki.firmlens-0.1.0"
VSCODE_EXT="$HOME/.vscode/extensions/anki.firmlens-0.1.0"
CURSOR_EXT="$HOME/.cursor/extensions/anki.firmlens-0.1.0"

ln -sfn "$EXT_REPO" "$VSCODE_EXT"
ln -sfn "$EXT_REPO" "$CURSOR_EXT"
```

After changing code, **reload the window** (Command Palette → **Developer: Reload Window**) unless you are already using Extension Development Host.

Alternative (not primary): copy the folder into the extensions directory instead of symlinking.

## No build steps

- Do **not** add `tsc`, webpack, esbuild, or a `prepublish` compile unless this decision is explicitly reversed in [decisions.md](./decisions.md).
- Dependencies (if any) must be **require-able plain JS** or zero native build, or run as optional external helpers documented separately (e.g. DWARF helper binary).
- Linting and tests are optional developer tools; they are not part of the extension load path.

## Local debugging

**Option A — Symlink + reload (default for this project)**  
Edit JS in `anki.firmlens-0.1.0/` → reload window in VS Code or Cursor.

**Option B — Extension Development Host**  
Open the repo root in the editor; `.vscode/launch.json` launches **Extension Development Host** with `extensionDevelopmentPath` → `anki.firmlens-0.1.0`. No compile task is required.

## package.json essentials

- `"engines": { "vscode": "^1.85.0" }` (adjust as needed)
- `"activationEvents"` — prefer command-based + `onLanguage:c` to limit idle cost
- `"contributes.commands"` — FirmLens load / clear (see [decisions.md](./decisions.md) for naming)

No `"scripts": { "compile": … }"` required for normal use.

## What we do not do

- **No VSIX / marketplace release workflow** unless added later for convenience.
- **No backward compatibility** when changing settings, metadata JSON, or file layout — update docs and break old formats freely.
- **No versioned roadmaps** — implement the full [firmlens-idea.md](./firmlens-idea.md) scope; [plan.md](./plan.md) is sequencing only.

See [code-documentation.md](./code-documentation.md) for JSDoc requirements on all modules.