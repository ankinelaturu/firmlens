# Task backlog

Working checklist synced with [plan.md](./plan.md). **JavaScript / no build / symlink install** — see [dev-setup.md](./dev-setup.md). **JSDoc** on exports — [code-documentation.md](./code-documentation.md).

## Phase 0 — Scaffold

- [ ] Create `anki.firmlens-0.1.0/package.json` (`publisher`: `anki`, `name`: `firmlens`, `main`: `extension.js`)
- [ ] `extension.js` with documented `activate` / `deactivate`
- [ ] Commands: `firmlens.loadSnapshot`, `firmlens.clearSnapshot`
- [ ] Status bar item: “FirmLens: no session”
- [ ] Symlink to `~/.vscode/extensions/anki.firmlens-0.0.0` and Cursor equivalent
- [ ] Root `README.md`: pointer to `docs/`, symlink one-liner
- [ ] Optional `.vscode/launch.json` — Extension Development Host, **no compile task**

## Phase 1 — HEX (`anki.firmlens-0.1.0/lib/hex`)

- [ ] Parse data records + checksum validation
- [ ] Extended linear address (type 0x04) and segment (type 0x02)
- [ ] EOF handling; reject garbage after EOF
- [ ] Sparse store; explicit holes on read
- [ ] Overlap: reject conflict; allow duplicate identical bytes
- [ ] `read` across non-contiguous regions (contiguous logical range)
- [ ] Input size / line count limits
- [ ] JSDoc: module banner, `HexReadResult`, public `read` / loader API
- [ ] Unit tests: vectors for each rule above (`node --test`)

## Phase 2 — DWARF (`anki.firmlens-0.1.0/lib/dwarf`)

- [ ] Pick ELF/DWARF approach — record in [decisions.md](./decisions.md)
- [ ] Load AXF; surface parse errors to user
- [ ] Index globals + file statics with decl file, line, name, scope key
- [ ] Fixed-address locations only for “available”
- [ ] Type graph: integers, bool, pointers, structs with member offsets
- [ ] Target endianness and address size
- [ ] JSDoc on index types and query API
- [ ] Fixture: synthetic debug ELF in `fixtures/`
- [ ] Golden test: symbol list + addresses + struct layout

## Phase 3 — Session (`anki.firmlens-0.1.0/src/session.js`)

- [ ] Load pipeline: HEX then AXF file picker
- [ ] Optional metadata JSON loader (schema can change; no migration code)
- [ ] Atomic session replace + `loadGeneration`
- [ ] Clear command resets session and status bar
- [ ] Failed load: toast once, keep old session
- [ ] JSDoc `SnapshotSession` typedef

## Phase 4 — Identity (`anki.firmlens-0.1.0/lib/identity`)

- [ ] Detect comment / string at hover position → suppress
- [ ] Resolve identifier → declaration in current document
- [ ] Match declaration to DWARF entry (path remap + line + scope)
- [ ] Two same-named statics in different files — distinct matches
- [ ] Local variable shadows global — never show global value on local hover
- [ ] Ambiguous match → user-visible reason string
- [ ] Unit tests with fixture C sources

## Phase 5 — Decode + hover

- [ ] `ValueDecoder` scalars: 8–64 bit, signed/unsigned
- [ ] Pointer: read address cells; NULL handling
- [ ] One-level pointee struct field expansion
- [ ] Direct struct global at fixed address
- [ ] Per-field “unavailable” when bytes missing
- [ ] `HoverProvider` registration for C
- [ ] Markdown formatter + escaping
- [ ] Provenance footer: snapshot name; “user-selected pairing” default
- [ ] Metadata hash mismatch warning (non-blocking)
- [ ] Respect `CancellationToken`; generation guard
- [ ] Integration test or manual checklist (`mf_root` scenario)

## Phase 6 — Hardening + docs

- [ ] `firmlens.maxStructFields` / `maxReadBytes` / `sourceRootRemap` in `package.json` contributes.configuration
- [ ] README: install symlink, load, hover, fixtures, test, limitations
- [ ] Full JSDoc pass on `anki.firmlens-0.1.0/lib` and `anki.firmlens-0.1.0/src`
- [ ] Document DWARF/ELF variants exercised
- [ ] Keil AXF verification note (done vs TODO)
- [ ] Spec acceptance items in [firmlens-idea.md](./firmlens-idea.md) all checked

---

## Backlog (unscheduled)

See [roadmap.md](./roadmap.md).

- [ ] Sidebar: pinned symbols from current session
- [ ] Command: copy hover summary to clipboard
- [ ] Export hover result as JSON for CI logs
- [ ] Watch mode: second HEX diff against first
- [ ] clangd coexistence test matrix (with/without C++ extension)

## Acceptance traceability

| Spec step ([firmlens-idea.md](./firmlens-idea.md)) | Tasks |
| --- | --- |
| 1. HEX + tests | Phase 1 |
| 2. AXF extraction fixture | Phase 2 |
| 3. Scalar hover + statics + shadowing | Phase 4 + 5 |
| 4. Pointer, partial, null, struct, 64-bit, provenance | Phase 5 |
| 5. Docs + fixture generation | Phase 6 |