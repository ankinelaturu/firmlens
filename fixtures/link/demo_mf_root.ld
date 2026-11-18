/* Place mf_root at 0x20000020 and demo_direct at 0x20000030 (example RAM layout). */
MEMORY {
  RAM (rwx) : ORIGIN = 0x20000000, LENGTH = 64K
}

SECTIONS {
  .data.mf_root 0x20000020 : { KEEP(*(.data.mf_root*)) } > RAM
  .data.demo_direct 0x20000030 : { KEEP(*(.data.demo_direct*)) } > RAM
  /DISCARD/ : { *(*) }
}