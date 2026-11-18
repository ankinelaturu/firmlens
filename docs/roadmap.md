# Roadmap (optional follow-ons)

**Unversioned ideas** — not scheduled, not tied to semver. Build [firmlens-idea.md](./firmlens-idea.md) first via [plan.md](./plan.md). When we add something, we do not preserve old behavior unless we choose to ([decisions.md](./decisions.md)).

## Visibility

- **Symbol browser** — Tree view of globals/statics in the loaded session; click to go to declaration.
- **Pin list** — User-pinned variables with last-read values; update on session reload.
- **Copy as markdown / JSON** — For tickets and Slack.

## Compare

- **Two-snapshot mode** — Load A and B; hover or pin view shows delta for scalar fields (same AXF).
- **Highlight changed bytes** — Optional gutter or minimap for a memory range (power-user).

## Richer types

- **Arrays** — Show first N elements for global arrays and buffer pointers.
- **Enums** — Map value to enumerator name when debug info allows.
- **Unions** — Show active member only when discriminant is known (often unavailable).

## Ecosystem

- **Metadata sidecar standard** — Document schema for in-house dump tools; template repo (breaking changes OK).
- **CI artifact** — HEX + metadata from HIL job; open in editor with matching AXF.

## Deeper debug info

- **Location lists** — Globals with relocating debug locations.
- **Stack snapshot** — Locals if capture includes stack window + frame pointer.

## Non-goals (unless direction changes)

- Live debugging, flashing, or RTOS awareness.
- Replacing vendor IDEs as primary build environment.
- Cloud sync of memory dumps by default.