#!/bin/sh
set -eu
cd "$(dirname "$0")"
ROOT="$PWD"
PREFIX="${DEBUG_PREFIX:-/fixture}"

if command -v ld.lld >/dev/null 2>&1; then
  LD="$(command -v ld.lld)"
elif [ -x /opt/homebrew/opt/lld/bin/ld.lld ]; then
  LD=/opt/homebrew/opt/lld/bin/ld.lld
else
  echo "ld.lld required (brew install lld)" >&2
  exit 1
fi

OBJCOPY=""
if command -v llvm-objcopy >/dev/null 2>&1; then
  OBJCOPY=llvm-objcopy
elif [ -x /opt/homebrew/opt/llvm/bin/llvm-objcopy ]; then
  OBJCOPY=/opt/homebrew/opt/llvm/bin/llvm-objcopy
else
  echo "llvm-objcopy required" >&2
  exit 1
fi

CFLAGS="-target i386-unknown-linux-gnu -std=c11 -O0 -g -gdwarf-4 -ffreestanding -fno-pie -fno-asynchronous-unwind-tables -fdebug-prefix-map=$ROOT=$PREFIX"
clang $CFLAGS -c firmware.c -o firmware.o
"$LD" -m elf_i386 -T fixture.ld -Map firmware.map firmware.o -o firmware.axf
"$OBJCOPY" -O ihex firmware.axf build.hex
python3 make_snapshot.py
rm -f firmware.o