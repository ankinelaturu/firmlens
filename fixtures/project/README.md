# Multi-file synthetic firmware

Portable **i386 linked ELF + DWARF 4** (same technique as `fixures-2/`). Produces outputs in `fixtures/generated/`.

## Layout

| Source | Globals / role |
| --- | --- |
| `src/storage.c` | `mf_root`, `g_root`, `g_storage_ring` |
| `src/board.c` | `g_board`, `g_retry_count` |
| `src/network.c` | `g_network` |
| `src/hub.c` | `g_network_hub` (struct with pointer/array members), `g_adc_samples[]`, `g_peer_stats` |
| `src/main.c` | `_start`, local shadows `retry_count` |
| `src/diag_module_a.c` / `b.c` | File-static `diag_sample_count` (distinct symbols) |

## Build

```bash
./fixtures/project/build.sh
```

Requires `gcc` and `ld` with `-m32` (macOS/Linux).

## FirmLens

1. Load `fixtures/generated/project_snapshot.hex` + `project.axf`.
2. Open sources under `fixtures/project/src/` (language **C**).
3. `firmlens.sourceRootRemap`: `{ "from": "/fixture/project", "to": "<repo>/fixtures/project" }`.
4. Optional `project.map`.

Hover `mf_root` in `storage.c`, `g_network` in `network.c`, `mf_root->file_count` in `main.c`,
`g_adc_samples` / `g_network_hub.active` / `g_network_hub.peers[0].stats` in `hub.c`.