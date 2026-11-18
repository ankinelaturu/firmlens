# Snapshot metadata (optional JSON)

Unversioned schema — breaking changes are OK per [decisions.md](./decisions.md).

Load prompts for an optional file alongside HEX/AXF. Example: [fixures-2/metadata.example.json](../fixures-2/metadata.example.json).

## Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `buildId` | string | Shown in hover footer |
| `axfSha256` | string | Compared to loaded AXF; mismatch → warning (non-blocking) |
| `captureRanges` | `{ start, end }[]` | Inclusive addresses. When every byte read for a hover lies in a range, provenance reads **from capture metadata** |

Without metadata, hovers show **user-selected pairing**.

## Capture tool contract

Dump tools may emit this JSON next to the HEX. Address values are **uint32** physical/runtime addresses as used in the HEX (same space as DWARF for the tested `fixures-2` fixture).