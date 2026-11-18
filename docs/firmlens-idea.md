# Cursor build specification — Firmware Snapshot Hover

Build a desktop VS Code / Cursor extension that shows saved firmware values when I hover over a C variable.

**Implementation notes (repo policy):** JavaScript only under `anki.firmlens-0.1.0/`, **no build steps**, install by copying or symlinking that folder into the editor extensions directory, **JSDoc** for code API docs, **no semver releases or backward compatibility** when changing formats — see [dev-setup.md](./dev-setup.md), [code-documentation.md](./code-documentation.md), [decisions.md](./decisions.md). The original spec mentioned TypeScript and compile tasks; that is superseded for this repository.

## User workflow

1. Run **Firmware Snapshot: Load Snapshot** and select an Intel HEX memory snapshot and the exact matching Keil AXF containing ELF/DWARF debug information.
2. Open the matching C source. Hover over a supported global or static variable at its declaration or a reference.
3. Show the value at capture time, the variable type and storage address, and the snapshot name. For a pointer, show its stored address and preview the pointee when its type and captured bytes are available.
4. Provide **Firmware Snapshot: Clear Snapshot**. A failed or cancelled load preserves the last successful session. Switch sessions atomically and ignore stale hover results.

Keep the tool offline and read-only. Use synthetic C firmware and snapshots in all public fixtures and demos. Never log or transmit input bytes or automatically attach to a debugger.

## End-to-end example

Given a 32-bit little-endian build, the AXF locates the pointer variable `mf_root` at `0x20000020`. The snapshot stores `00 10 00 20` there, so its value is `0x20001000`. The pointer's declared target type has this compiler-reported layout:

| Field | Type | Byte offset | Size |
| --- | --- | ---: | ---: |
| id | uint32_t | 0 | 4 |
| file_count | uint32_t | 4 | 4 |
| initialized | bool | 8 | 1 |

With captured bytes `01 00 00 00 03 00 00 00 01` at the pointee, show `id = 1`, `file_count = 3`, and `initialized = true`. A compiler may report a 12-byte struct including tail padding. Read each field at its recorded offset and display its value. Padding is unnecessary for this preview. With only the first eight bytes present, show the two integers and mark the Boolean as unavailable. For a direct struct variable, use the variable's storage address directly. For a null pointer, show NULL and skip the pointee read.

## Implementation plan

### 1. Decode the HEX into sparse memory

Validate Intel HEX syntax, byte counts, checksums, and EOF. Support data records and extended segment and linear addressing. Validate other supported record types and keep start-address records separate from memory bytes. Reject conflicting overlaps and allow identical duplicates. Keep gaps explicit and allow reads across adjacent records. Report invalid or out-of-range addresses and impose reasonable input size limits. Never fill gaps with zero. Index data once at load time.

For merged images, display values as **from selected image** unless optional capture-range metadata proves that all bytes for the displayed field came from the runtime dump. A build ID or AXF hash in optional metadata can detect a mismatch. Without such metadata, show that pairing is user-selected. A matching name alone proves neither provenance nor build identity.

### 2. Index the AXF once

First prove that the reader handles a representative Keil AXF. Use a maintained ELF/DWARF reader or a local helper backed by a maintained library. If using a helper, document setup on Windows, invoke it with an executable and argument array without a shell, and validate its output. Keep file parsing off the hover path.

Extract variable name, declaration file and line, scope, fixed storage address when available, and type references. Resolve typedef and qualifier chains. Extract endianness and target address size, plus base-type encoding, byte size, pointer target, and struct member offsets. Follow specification references where needed to tie declarations to definitions. Preserve the runtime address recorded by debug information. If the exported snapshot uses a different address space, require an explicit verified mapping.

Start with fixed-address globals and file statics. Accept supported fixed-address DWARF locations. Mark location lists, registers, stack-relative locations, optimized-out variables, incomplete types, bitfields, and unsupported expressions as unavailable. Add support later only with representative fixtures. The optional map can corroborate section and symbol addresses. DWARF supplies field layout and types.

### 3. Resolve source identity

Use a C-aware definition lookup or source index to associate the hovered identifier with its declaration, then match the declaration to the debug index. Account for build-machine paths by offering explicit source-root remapping. Handle duplicate file statics and local shadowing. If identity is ambiguous or the current source cannot be matched, show a short reason or omit the value. Avoid name-only lookup that could display a different variable's value. Suppress results in comments and string literals.

### 4. Decode typed values and render hover

Register a C hover provider that works alongside existing editor hovers. Initially support integer and Boolean globals, typed pointers, and one level of ordinary struct members. Respect signedness, type size, field offsets, and target endianness. Use exact integer decoding for 64-bit fields. Treat pointers as target addresses. Dereference at most once, cap the number of displayed fields and bytes read, and handle recursive types without walking chains. Show unavailable fields individually if bytes or layout are missing. Escape hover content and show plain values without executing data-driven commands.

Keep parsing, symbol resolution, typed decoding, and VS Code presentation separate enough to test independently. A hover must use the loaded index and perform bounded reads. Honor cancellation and avoid repeated error notifications.

## Build order and acceptance

1. Implement sparse HEX parsing and tests for checksums, addressing, holes, and conflicting overlaps.
2. Verify AXF extraction against a small debug build with a scalar, two same-named file statics in different files, a shadowing local, and a pointer to a padded struct.
3. Demonstrate scalar hover with the matching AXF and synthetic snapshot. Verify the two statics resolve separately and the shadowing local never shows the global value.
4. Demonstrate the pointer example, partial pointee, null pointer, and direct struct. Test signed integers and a 64-bit value. Verify capture provenance labeling and a known build mismatch.
5. Document exact build, test, F5, and fixture-generation steps. State the AXF/DWARF variants actually exercised and any unverified variants. If Keil is unavailable during implementation, use a documented ARM ELF/DWARF fixture and leave real Keil AXF verification explicit.

Deliver the working extension, synthetic demo inputs or reproducible generators, focused tests, and README. Begin by describing the proposed reader and how you will verify the first scalar hover, then implement the complete scope above.
