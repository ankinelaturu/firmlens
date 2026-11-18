#!/usr/bin/env bash
# Regenerate fixtures/generated from the multi-file project (linked ELF + HEX).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/fixtures/project/build.sh"