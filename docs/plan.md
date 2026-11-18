# Implementation plan

Publisher: **anki** · Extension id: **firmlens**. Sequencing for the full [firmlens-idea.md](./firmlens-idea.md) scope — **not** semver releases. See [decisions.md](./decisions.md) (no backward compatibility).

**Stack:** JavaScript under `anki.firmlens-0.1.0/`, symlink install, JSDoc — [dev-setup.md](./dev-setup.md), [code-documentation.md](./code-documentation.md).

## Definition of done (MVP per spec)

- [ ] Extension runs from symlinked `anki.firmlens-0.1.0/` in VS Code and Cursor (reload window).
- [ ] Load HEX + AXF; Clear session; failed load preserves previous session.
- [ ] Hover shows captured values for supported globals/statics (not shadowing locals).
- [ ] Pointer one-level deref + struct preview with partial-byte behavior as in spec example.
- [ ] Provenance line when metadata absent; mismatch warning when metadata + hash disagree.
- [ ] Synthetic fixtures + tests runnable with Node; README + JSDoc cover behavior and install.
- [ ] Stated list of **verified** ELF/DWARF variants; Keil AXF called out as verified or pending.

## Phase 0 — Scaffold

**Goal:** Loadable extension folder, placeholder commands, no build step.

- Hand-scaffold `anki.firmlens-0.1.0/package.json` (`main` → `extension.js`).
- `extension.js`: register Load/Clear stubs; status bar placeholder.
- Optional `.vscode/launch.json` — Extension Development Host pointing at `anki.firmlens-0.1.0/` (no `preLaunchTask` compile).
- Layout:

```text
anki.firmlens-0.1.0/
  package.json
  extension.js              # activate / deactivate
  src/                      # session, hover provider wiring
  lib/                      # hex, dwarf, identity, decode, present
fixtures/
test/
docs/
```

Deliverable: symlink install works; commands appear in palette; JSDoc on `activate`.

## Phase 1 — HEX core

**Goal:** `HexMemory` with full test matrix from spec.

- Record types: data, EOF, extended linear/segment addressing.
- Reject conflicting overlaps; allow identical duplicate writes.
- `read(address, length)` → bytes + per-byte availability (hole tracking).
- Size limits and clear errors for corrupt lines.

Deliverable: **tests green** with `node --test` (or chosen runner) without VS Code.

## Phase 2 — DWARF index

**Goal:** `DwarfIndex` from one representative fixture (ARM 32-bit LE).

- Choose library or subprocess helper (see [decisions.md](./decisions.md)).
- Extract: name, decl file/line, scope, fixed address, base types, pointers, struct members + offsets.
- Mark unsupported: location lists, registers, stack, optimized-out, bitfields.

Deliverable: golden file or snapshot test listing expected symbols from `fixtures/demo.axf`.

## Phase 3 — Load session

**Goal:** Wire HEX + AXF into `SnapshotSession` with atomic swap.

- File dialogs (HEX, then AXF).
- Optional metadata JSON (minimal): `buildId`, `axfSha256`, `captureRanges[]` — schema may change without migration.
- Single error toast on failure; status bar shows active snapshot name.

Deliverable: command **Load** succeeds on fixtures; **Clear** resets UI.

## Phase 4 — Source identity

**Goal:** Correct symbol for hover position in open C file.

- Lexer or lightweight parser: skip comments/strings.
- Definition lookup for identifier at position (documented algorithm).
- `sourceRootRemap` for DWARF paths vs workspace paths.
- Tests: two `static` same name in different files; local shadows global → no false global value.

Deliverable: identity tests pass without hover UI.

## Phase 5 — Decode + hover

**Goal:** End-to-end hover for scalars, pointers, one struct level.

- Respect endianness and integer widths; use `BigInt` where needed for 64-bit.
- NULL pointer; partial pointee; direct struct variable.
- Caps: max fields, max bytes, single deref.
- Cancellation + generation check.

Deliverable: manual demo matches [firmlens-idea.md](./firmlens-idea.md) `mf_root` example.

## Phase 6 — Hardening + docs

**Goal:** Complete spec acceptance + maintainable docs.

- Provenance strings; build mismatch demo.
- README: symlink install, reload, test command, fixture generation.
- JSDoc complete on exported `lib/` and `src/` APIs; optional `jsdoc` HTML output gitignored.
- Document DWARF/ELF variants exercised in repo.

Deliverable: stable daily-driver via symlink; spec build order items all checked off.

## Dependency graph

```text
Phase 0 ──► Phase 1 ──► Phase 3 ──► Phase 5
              │            ▲
Phase 0 ──► Phase 2 ───────┘
              │
              └──► Phase 4 ──► Phase 5 ──► Phase 6
```

Phases 1 and 2 can proceed in parallel after Phase 0.

## Risk buffer

| Risk | Mitigation |
| --- | --- |
| Keil AXF quirks | Documented generic ARM ELF fixture; Keil verification tracked in tasks |
| C identity without clangd | Globals + file statics with explicit fixture tests first |
| Large HEX files | Load-time limits + progress notification if parse > ~1s |

## Deferred (not in initial spec scope)

- Debugger attach, live memory, or periodic refresh.
- Arrays, unions, enums as first-class pretty printers (enums as integers OK initially).
- Multi-level pointer chains, linked structure walking.
- Stack locals, registers, location lists.
- Snapshot diff or sidebar watch list ([roadmap.md](./roadmap.md)).