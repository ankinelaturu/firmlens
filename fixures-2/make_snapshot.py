"""Make a synthetic post-initialization capture from the fixture's build HEX."""
from pathlib import Path
import struct

def record(address, kind, data=b""):
    body = bytes([len(data)]) + address.to_bytes(2, "big") + bytes([kind]) + data
    return ":" + (body + bytes([-sum(body) & 255])).hex().upper()

def patch(address, data):
    return [
        record(0, 4, (address >> 16).to_bytes(2, "big")),
        record(address & 65535, 0, data),
    ]

base = 0
memory = {}
for line in Path("build.hex").read_text().splitlines():
    raw = bytes.fromhex(line[1:])
    address = int.from_bytes(raw[1:3], "big")
    kind, data = raw[3], raw[4:-1]
    if kind in (2, 4):
        base = int.from_bytes(data, "big") << (4 if kind == 2 else 16)
    elif kind == 0:
        memory.update((base + address + offset, byte) for offset, byte in enumerate(data))

# Replace the captured ranges rather than appending overlapping HEX records.
for address, data in [(0x20000020, struct.pack("<II", 0x20001000, 7)),
                      (0x20001000, struct.pack("<II?3x", 1, 3, True))]:
    memory.update((address + offset, byte) for offset, byte in enumerate(data))

lines = []
addresses = iter(sorted(memory))
address = next(addresses, None)
while address is not None:
    start = address
    data = bytearray()
    while address is not None and address == start + len(data) and len(data) < 16 and address >> 16 == start >> 16:
        data.append(memory[address])
        address = next(addresses, None)
    lines.extend(patch(start, data))
lines.append(record(0, 1))
Path("snapshot.hex").write_text("\n".join(lines) + "\n")
