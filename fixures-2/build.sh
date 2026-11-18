#!/bin/sh
set -eu
cd "$(dirname "$0")"
gcc -m32 -std=c11 -O0 -g -gdwarf-4 -ffreestanding -fno-pie -fno-asynchronous-unwind-tables -fdebug-prefix-map="$PWD"=/fixture -c firmware.c -o firmware.o
ld -m elf_i386 -T fixture.ld -Map firmware.map firmware.o -o firmware.axf
objcopy -O ihex firmware.axf build.hex
python3 make_snapshot.py
rm firmware.o
