#!/usr/bin/env bash
# Regenerate fixtures/generated/*.hex, *.map, *.axf (optional toolchain).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GEN="$ROOT/fixtures/generated"
CC="${ARM_GCC:-arm-none-eabi-gcc}"
CLANG="${CLANG:-clang}"

mkdir -p "$GEN"

# Always refresh Intel HEX snapshots (no compiler required).
cp "$ROOT/fixtures/hex/demo_mf_root.hex" "$GEN/demo_mf_root.hex"
cp "$ROOT/fixtures/hex/demo_mf_root_partial.hex" "$GEN/demo_mf_root_partial.hex"

# Synthetic map (reference for optional address corroboration).
cp "$ROOT/fixtures/map/demo_mf_root.map" "$GEN/demo_mf_root.map"

SRC="$ROOT/fixtures/c/demo_mf_root_sections.c"

if command -v "$CC" >/dev/null 2>&1; then
  echo "Building AXF with $CC"
  "$CC" -g -O0 -mcpu=cortex-m3 -c "$SRC" -o "$GEN/demo_mf_root.o"
  "$CC" -nostdlib -T "$ROOT/fixtures/link/demo_mf_root.ld" \
    "$GEN/demo_mf_root.o" -o "$GEN/demo_mf_root.axf"
  rm -f "$GEN/demo_mf_root.o"
elif "$CLANG" --target=armv7m-none-eabi -g -O0 -c "$SRC" -o "$GEN/demo_mf_root.o" 2>/dev/null; then
  echo "arm-none-eabi-gcc not found; writing unlinked ELF object as demo_mf_root.axf"
  echo "Install arm-none-eabi-gcc and re-run for linked addresses in DWARF."
  cp "$GEN/demo_mf_root.o" "$GEN/demo_mf_root.axf"
  rm -f "$GEN/demo_mf_root.o"
else
  echo "No suitable compiler; keeping committed demo_mf_root.axf if present."
fi

echo "Fixtures in $GEN"