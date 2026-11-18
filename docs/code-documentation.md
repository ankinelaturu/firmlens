# Code documentation

All FirmLens implementation code is **JavaScript**. Types and contracts are documented with **JSDoc**, not TypeScript. Generated or hand-maintained API reference is produced from these comments (tooling TBD: `jsdoc` CLI or TypeDoc for JS).

## Goals

- Every **public module** has a file-level `@file` / `@module` description.
- Every **exported** function, class, and constant has a summary; non-obvious behavior gets `@remarks`.
- **Complex objects** use `@typedef` + `@property` so IDEs show types without a build step.
- **Side effects and security** (reads files, spawns helper, never logs bytes) are stated in the docblock.

Internal helpers may use a single-line `/** … */` if the name is clear; anything security- or correctness-sensitive gets full blocks.

## Module template

```javascript
/**
 * @fileoverview Sparse Intel HEX memory image: parse once, bounded reads at load/hover.
 * @module lib/hex/hex-memory
 */

/**
 * @typedef {object} HexReadResult
 * @property {Uint8Array} bytes Values for requested range (length equals requested size).
 * @property {boolean[]} available Per-byte false where address was not in snapshot (hole).
 */

/**
 * Read a contiguous logical range from sparse memory.
 * Does not zero-fill holes; check `available`.
 *
 * @param {number} address Byte address in target space.
 * @param {number} length Number of bytes.
 * @returns {HexReadResult}
 */
function read(address, length) {
  // …
}
```

## `SnapshotSession` (contract sketch)

Document this typedef in `src/session.js` (or wherever the session lives):

```javascript
/**
 * @typedef {object} SnapshotSession
 * @property {number} loadGeneration Incremented on each successful load; hovers must ignore stale generations.
 * @property {string} snapshotLabel Display name (e.g. HEX basename).
 * @property {string} hexPath Absolute path to loaded HEX file.
 * @property {string} axfPath Absolute path to loaded AXF/ELF file.
 * @property {import('../lib/hex/hex-memory').HexMemory} memory Parsed snapshot.
 * @property {import('../lib/dwarf/dwarf-index').DwarfIndex} dwarf Debug index.
 * @property {import('../lib/metadata').SnapshotMetadata | undefined} [metadata] Optional sidecar.
 */
```

Prefer `@import` type references between modules so cross-links stay accurate.

## VS Code extension entry

`extension.js` must document:

- `activate(context)` — what is registered, session lifetime.
- `deactivate()` — what is disposed.

```javascript
/**
 * FirmLens VS Code extension entry.
 * @param {import('vscode').ExtensionContext} context
 * @returns {void}
 */
function activate(context) { /* … */ }
```

Use `/// <reference types="vscode" />` at the top of extension-only files **only** if you add `@types/vscode` as a devDependency for editor IntelliSense—runtime still does not compile.

## Documentation checklist (per PR / chunk of work)

- [ ] New file: module banner present.
- [ ] Exported API: `@param` / `@returns` / `@throws` where applicable.
- [ ] Public `@typedef` updated when shape changes (**no backward compatibility** — update callers and docs together).
- [ ] User-facing errors: same wording as spec where relevant (link to `docs/` in `@remarks` if helpful).

## Relationship to `docs/`

| Kind of doc | Where |
| --- | --- |
| Why / acceptance / UX | `docs/firmlens-idea.md`, architecture, plan |
| API contracts & parameters | JSDoc on functions and typedefs |
| Install & symlink | [dev-setup.md](./dev-setup.md) |

When behavior changes, update **both** JSDoc and the relevant markdown doc; do not leave deprecated migration notes unless briefly explaining a one-time break.

## Optional: generate HTML reference

When the codebase exists, a single script may run:

```bash
npx jsdoc anki.firmlens-0.1.0/lib anki.firmlens-0.1.0/src -d docs/api/generated
```

Generated output can be gitignored; committed docs stay in `docs/`. Not required for the extension to run.