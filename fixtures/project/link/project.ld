ENTRY(_start)

SECTIONS
{
    .text 0x08000000 : { *(.text*) }
    .board 0x20000008 : { KEEP(*(.board)) }
    .network 0x20000010 : { KEEP(*(.network)) }
    .pointer 0x20000020 : { KEEP(*(.pointer)) }
    .count 0x20000024 : { KEEP(*(.count)) }
    .storage 0x20000028 : { KEEP(*(.storage)) }
    .root 0x20001000 : { KEEP(*(.root)) }
}