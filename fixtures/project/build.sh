#!/bin/sh
set -eu
cd "$(dirname "$0")"
ROOT="$PWD"
GEN="$(cd ../generated && pwd)"
PREFIX="${DEBUG_PREFIX:-/fixture/project}"

if command -v ld.lld >/dev/null 2>&1; then
  LD="$(command -v ld.lld)"
elif [ -x /opt/homebrew/opt/lld/bin/ld.lld ]; then
  LD=/opt/homebrew/opt/lld/bin/ld.lld
else
  LD=ld.lld
fi

CC="${CC:-clang}"
OBJCOPY=""
if command -v llvm-objcopy >/dev/null 2>&1; then
  OBJCOPY=llvm-objcopy
elif [ -x /opt/homebrew/opt/llvm/bin/llvm-objcopy ]; then
  OBJCOPY=/opt/homebrew/opt/llvm/bin/llvm-objcopy
elif command -v objcopy >/dev/null 2>&1; then
  OBJCOPY=objcopy
fi

CFLAGS="-target i386-unknown-linux-gnu -std=c11 -O0 -g -gdwarf-4 -ffreestanding -fno-pie"
CFLAGS="$CFLAGS -fno-asynchronous-unwind-tables -fdebug-prefix-map=$ROOT=$PREFIX"

OBJS=""
for src in src/*.c; do
  obj="${src%.c}.o"
  "$CC" $CFLAGS -I include -c "$src" -o "$obj"
  OBJS="$OBJS $obj"
done

"$LD" -m elf_i386 -T link/project.ld -Map firmware.map $OBJS -o firmware.axf

if [ -n "$OBJCOPY" ]; then
  "$OBJCOPY" -O ihex firmware.axf build.hex
else
  echo "warning: no objcopy/llvm-objcopy; skipping build.hex (install llvm for HEX generation)"
fi

if [ -f build.hex ]; then
  python3 make_snapshot.py
else
  echo "warning: snapshot.hex not regenerated (no build.hex)"
fi

cp -f firmware.axf "$GEN/project.axf"
cp -f firmware.map "$GEN/project.map"
if [ -f build.hex ]; then
  cp -f build.hex "$GEN/project_build.hex"
fi
if [ -f snapshot.hex ]; then
  cp -f snapshot.hex "$GEN/project_snapshot.hex"
  cp -f snapshot.hex "$GEN/demo_mf_root.hex"
fi
cp -f firmware.axf "$GEN/demo_mf_root.axf"
cp -f firmware.map "$GEN/demo_mf_root.map"
cp -f ../hex/demo_mf_root_partial.hex "$GEN/demo_mf_root_partial.hex"

rm -f src/*.o
if [ -f build.hex ]; then
  rm -f build.hex snapshot.hex
fi
rm -f firmware.axf firmware.map

echo "Generated linked project in $GEN (project.axf + project_snapshot.hex)"