# FirmLens documentation

**FirmLens** (`anki.firmlens`) is a VS Code / Cursor extension that shows **captured firmware memory values** when you hover over C variables, using a matching **Intel HEX snapshot** and **AXF (ELF/DWARF)** debug build.

| Document | Purpose |
| --- | --- |
| [firmlens-idea.md](./firmlens-idea.md) | Product spec, acceptance criteria, and build order (source of truth) |
| [architecture.md](./architecture.md) | Layers, data flow, session model, VS Code integration |
| [plan.md](./plan.md) | Implementation sequencing (phases, not releases) |
| [tasks.md](./tasks.md) | Checklist backlog aligned to phases |
| [decisions.md](./decisions.md) | Open and settled technical decisions |
| [dev-setup.md](./dev-setup.md) | **JS, no build**, `anki.firmlens-0.1.0/` folder, symlink install |
| [code-documentation.md](./code-documentation.md) | JSDoc standards for all implementation code |
| [roadmap.md](./roadmap.md) | Optional follow-ons (non-commitments, unversioned) |

## Engineering constraints

- **JavaScript** in `anki.firmlens-0.1.0/` — no compile step before the editor loads the extension.
- **Install** by symlinking `anki.firmlens-0.1.0/` into VS Code / Cursor `extensions` directories ([dev-setup.md](./dev-setup.md)).
- **No versioned releases or backward compatibility** — implement [firmlens-idea.md](./firmlens-idea.md); change formats freely and update JSDoc + docs together.
- **API docs** live on the code via JSDoc ([code-documentation.md](./code-documentation.md)).

## Product principles

- **Offline and read-only** — no network, no debugger attach, no flashing.
- **Correctness over coverage** — if symbol identity is ambiguous, show a short reason or omit; never guess from name alone.
- **Sparse memory** — HEX gaps are not zero-filled; missing bytes mark fields unavailable.
- **Synthetic public fixtures** — demos and tests use reproducible fake firmware; never ship customer dumps.

## Quick orientation

```text
Load HEX + AXF  →  Session (indexed memory + DWARF)  →  Hover on C symbol  →  Typed markdown
```

Start implementation from [plan.md](./plan.md) phase 0, then [tasks.md](./tasks.md). Wire the extension per [dev-setup.md](./dev-setup.md).