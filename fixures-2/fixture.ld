ENTRY(_start)
SECTIONS
{
  .text 0x08000000 : { *(.text*) }
  .pointer 0x20000020 : { KEEP(*(.pointer)) }
  .count 0x20000024 : { KEEP(*(.count)) }
  .root 0x20001000 : { KEEP(*(.root)) }
}
