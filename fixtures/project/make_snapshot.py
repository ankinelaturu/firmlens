"""Synthetic post-init capture for fixtures/project (Intel HEX)."""
from pathlib import Path
import struct

PREFIX = Path(__file__).resolve().parent


def record(address, kind, data=b""):
    body = bytes([len(data)]) + address.to_bytes(2, "big") + bytes([kind]) + data
    return ":" + (body + bytes([-sum(body) & 255])).hex().upper()


def patch(address, data):
    return [
        record(0, 4, (address >> 16).to_bytes(2, "big")),
        record(address & 65535, 0, data),
    ]


def load_build_hex(path):
    base = 0
    memory = {}
    for line in path.read_text().splitlines():
        if not line.startswith(":"):
            continue
        raw = bytes.fromhex(line[1:])
        address = int.from_bytes(raw[1:3], "big")
        kind, data = raw[3], raw[4:-1]
        if kind in (2, 4):
            base = int.from_bytes(data, "big") << (4 if kind == 2 else 16)
        elif kind == 0:
            memory.update((base + address + offset, byte) for offset, byte in enumerate(data))
    return memory


def main():
    build_hex = PREFIX / "build.hex"
    memory = load_build_hex(build_hex)

    patches = [
        (0x20000008, struct.pack("<HHI", 248, 3310, 99)),
        (0x20000010, struct.pack("<III?", 1005, 42, 1, True) + b"\x00\x00\x00"),
        (0x20000020, struct.pack("<I", 0x20001000)),
        (0x20000024, struct.pack("<I", 7)),
        (0x20000028, struct.pack("<IIII", 4, 2, 16, 0)),
        (0x20001000, struct.pack("<II?3x", 1, 3, True)),
    ]
    for address, data in patches:
        memory.update((address + offset, byte) for offset, byte in enumerate(data))

    lines = []
    addresses = iter(sorted(memory))
    address = next(addresses, None)
    while address is not None:
        start = address
        data = bytearray()
        while (
            address is not None
            and address == start + len(data)
            and len(data) < 16
            and address >> 16 == start >> 16
        ):
            data.append(memory[address])
            address = next(addresses, None)
        lines.extend(patch(start, data))
    lines.append(record(0, 1))
    (PREFIX / "snapshot.hex").write_text("\n".join(lines) + "\n")
    print("Wrote", PREFIX / "snapshot.hex")


if __name__ == "__main__":
    main()