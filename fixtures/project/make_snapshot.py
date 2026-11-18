"""Synthetic post-init capture for fixtures/project (Intel HEX)."""
from pathlib import Path
import struct
from collections import defaultdict

PREFIX = Path(__file__).resolve().parent

RECORD_BYTES = 16
MIN_BLOCK_BYTES = 256


def record(address, kind, data=b""):
    body = bytes([len(data)]) + address.to_bytes(2, "big") + bytes([kind]) + data
    return ":" + (body + bytes([-sum(body) & 255])).hex().upper()


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


def pad_runs(memory, min_len=MIN_BLOCK_BYTES):
    """Extend each contiguous run to at least min_len with 0xCC fill for realistic HEX blocks."""
    if not memory:
        return memory
    sorted_addrs = sorted(memory)
    i = 0
    while i < len(sorted_addrs):
        start = sorted_addrs[i]
        end = start
        j = i + 1
        while j < len(sorted_addrs) and sorted_addrs[j] == end + 1:
            end = sorted_addrs[j]
            j += 1
        run_len = end - start + 1
        if run_len < min_len:
            for off in range(run_len, min_len):
                memory[start + off] = 0xCC
        i = j
    return memory


def contiguous_runs(memory):
    """Yield (start_addr, bytearray) for each contiguous range in memory."""
    sorted_addrs = sorted(memory.keys())
    i = 0
    while i < len(sorted_addrs):
        start = sorted_addrs[i]
        data = bytearray([memory[start]])
        j = i + 1
        while j < len(sorted_addrs) and sorted_addrs[j] == start + len(data):
            data.append(memory[sorted_addrs[j]])
            j += 1
        yield start, data
        i = j


def emit_records_for_run(start, data):
    """One extended linear address + 16-byte data records under it."""
    lines = []
    base = (start >> 16) << 16
    lines.append(record(0, 4, (base >> 16).to_bytes(2, "big")))
    offset = 0
    while offset < len(data):
        chunk = data[offset : offset + RECORD_BYTES]
        rec_addr = (start + offset) & 0xFFFF
        lines.append(record(rec_addr, 0, chunk))
        offset += RECORD_BYTES
    return lines


def group_runs_by_linear_base(runs):
    """Merge adjacent runs on the same 64 KiB linear page into one emission block."""
    by_base = defaultdict(list)
    for start, data in runs:
        base = (start >> 16) << 16
        by_base[base].append((start, data))
    return by_base


def emit_grouped_hex(memory):
    """Emit standard Intel HEX: one type-04 per linear page, many data lines, ≥256 B runs."""
    runs = list(contiguous_runs(memory))
    by_base = group_runs_by_linear_base(runs)

    lines = []
    for base in sorted(by_base.keys()):
        lines.append(record(0, 4, (base >> 16).to_bytes(2, "big")))
        page_runs = sorted(by_base[base], key=lambda item: item[0])
        for start, data in page_runs:
            offset = 0
            while offset < len(data):
                chunk = data[offset : offset + RECORD_BYTES]
                rec_addr = (start + offset) & 0xFFFF
                lines.append(record(rec_addr, 0, chunk))
                offset += RECORD_BYTES
    lines.append(record(0, 1))
    return lines


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

    memory = pad_runs(memory, MIN_BLOCK_BYTES)
    lines = emit_grouped_hex(memory)
    (PREFIX / "snapshot.hex").write_text("\n".join(lines) + "\n")
    print(
        f"Wrote {PREFIX / 'snapshot.hex'} "
        f"({len(lines)} lines, {MIN_BLOCK_BYTES} B min contiguous blocks)"
    )


if __name__ == "__main__":
    main()