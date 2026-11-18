# Architecture

This document describes how FirmLens is structured so parsing, symbol identity, decoding, and UI can be built and tested independently. Details and acceptance tests live in [firmlens-idea.md](./firmlens-idea.md).

## Problem shape

Inputs:

- **Snapshot** — Intel HEX file representing a slice of target memory at capture time.
- **Debug image** — AXF (ARM Keil) or equivalent ELF with DWARF describing globals/statics, types, and fixed addresses.

Output:

- A **hover** on a C identifier in the active editor showing typed values read from the snapshot at DWARF addresses, with provenance and limits clearly labeled.

Constraints:

- Parse and index **once per load**; hover path is lookup + bounded reads only.
- **Session switching** is atomic; failed loads keep the previous session; hovers carry a generation id and ignore stale results.

**Implementation:** plain **JavaScript** under `anki.firmlens-0.1.0/` ([dev-setup.md](./dev-setup.md)); contracts in **JSDoc** ([code-documentation.md](./code-documentation.md)). No compile step; install via symlink into the editor extensions folder.

## Layer diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        VS Code extension host                          │
│  commands · status bar · configuration · C HoverProvider · cancellation│
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │ SnapshotSession│               │ HoverPipeline │
            │ (singleton)    │               │ (per request) │
            └───────┬───────┘               └───────┬───────┘
                    │                               │
     ┌──────────────┼──────────────┐                │
     ▼              ▼              ▼                ▼
 HexMemory    DwarfIndex    Metadata?         SourceIdentity
 (sparse)     (symbols+types) (optional)       → SymbolMatch
     │              │              │                │
     └──────────────┴──────────────┴────────────────┘
                                    │
                                    ▼
                          ValueDecoder → HoverMarkdown
```

### Module responsibilities

| Layer | Responsibility | Must not |
| --- | --- | --- |
| `HexMemory` | Parse Intel HEX; sparse address → bytes; overlap rules; read API with holes | Fill gaps with 0; parse on hover |
| `DwarfIndex` | Load AXF/ELF once; globals/statics with file/line/scope; types (int, bool, ptr, struct layout); endianness & pointer width | Run shell on hover; guess addresses |
| `Metadata` (optional) | Build id, AXF hash, capture ranges for provenance | Required for 0.1.0 |
| `SourceIdentity` | Map hover position → declaration in current file; remapped paths; reject comments/strings; disambiguate statics | Name-only global lookup |
| `SymbolMatch` | Join declaration to `DwarfIndex` entry | Match shadowing locals to globals |
| `ValueDecoder` | Read bytes at symbol address; decode scalars; one-level ptr deref; struct fields at DWARF offsets | Unbounded deref or recursion |
| `HoverMarkdown` | Safe plain-text/markdown; provenance line; per-field unavailable | Execute or inject commands from data |
| `SnapshotSession` | Owns loaded artifacts, generation counter, snapshot display name | Partial updates visible to hovers |

## Data flow: load snapshot

1. User runs **FirmLens: Load Snapshot** (name TBD; see [decisions.md](./decisions.md)).
2. Pick HEX, then AXF (and optional metadata JSON).
3. Parse HEX → `HexMemory` (fail fast with clear error).
4. Parse AXF → `DwarfIndex` (fail fast; optionally warn if metadata hash mismatches).
5. On success, replace session in one assignment; increment `loadGeneration`.
6. Update status bar with snapshot file name (not full paths in hovers by default).

On failure: show one notification; **do not** clear the previous session.

## Data flow: hover

1. `HoverProvider` for `c` / `cpp` (scope TBD) receives position + cancellation token.
2. If no session or token cancelled → return undefined / empty.
3. Capture `generation` at start; abort before render if session changed.
4. `SourceIdentity`: token at position → definition site (file, line, column, name).
   - If in comment or string literal → no result.
   - If ambiguous static or unmatched file path → short markdown reason or omit.
5. `SymbolMatch`: find DWARF variable; require fixed address location for 0.1.0.
6. `ValueDecoder`: `memory.read(address, size)`; handle partial reads per field.
7. `HoverMarkdown`: title (name, type, address), value, optional pointee block, footer (snapshot name, provenance).
8. Return `Hover` that **augments** other providers where possible (do not replace clangd hovers entirely unless product decision says otherwise).

## Session model

Documented as a `@typedef` in `anki.firmlens-0.1.0/src/session.js` (see [code-documentation.md](./code-documentation.md)):

| Field | Role |
| --- | --- |
| `loadGeneration` | Incremented on each successful load |
| `snapshotLabel` | e.g. HEX basename for hovers |
| `hexPath`, `axfPath` | Absolute paths for current session |
| `memory` | `HexMemory` instance |
| `dwarf` | `DwarfIndex` instance |
| `metadata` | Optional sidecar; format may change without migration |

**Stale hovers:** pass `loadGeneration` into the hover pipeline; after any await, re-check before returning.

## Configuration (planned)

| Setting | Role |
| --- | --- |
| `firmlens.sourceRootRemap` | Map build-machine prefixes to local workspace roots |
| `firmlens.maxStructFields` | Cap fields shown in struct / pointee preview |
| `firmlens.maxReadBytes` | Cap bytes read for a single hover |
| `firmlens.provenance.strict` | When metadata missing, wording for “user-selected pairing” |

## Testing strategy

| Layer | Test style |
| --- | --- |
| `HexMemory` | Pure unit tests: checksums, linear/segment addressing, holes, conflicts, duplicates |
| `DwarfIndex` | Golden tests against checked-in ARM ELF fixtures; document DWARF version |
| `SourceIdentity` | Fixture C files: two statics, shadowed local, comments |
| `ValueDecoder` | Table-driven: endianness, signed, 64-bit, NULL ptr, partial struct |
| `HoverPipeline` | Integration with mocked `vscode` APIs or thin e2e in Extension Development Host |

Keep fixtures under `fixtures/` (synthetic only in git). Document how to regenerate in README when extension exists.

## Security and privacy

- Do not log snapshot or AXF **contents** to output channels by default.
- No telemetry unless explicitly added later with opt-in.
- Treat hover text as **untrusted display** — escape user-controlled strings from metadata files.

## Extension entry points (planned)

| Contribution | Notes |
| --- | --- |
| `package.json` commands | Load, Clear, optional “Show session” |
| Activation | On command + `onLanguage:c` (minimize idle cost) |
| `launch.json` (optional) | Extension Development Host → `anki.firmlens-0.1.0/`, no compile task |
| Install | Symlink `anki.firmlens-0.1.0/` → `~/.vscode/extensions` / `~/.cursor/extensions` |

See [plan.md](./plan.md) for build sequencing and [dev-setup.md](./dev-setup.md) for symlink paths.