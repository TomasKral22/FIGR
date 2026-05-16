from pathlib import Path
import struct
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: png-to-ico.py <input.png> <output.ico>")
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    png_bytes = input_path.read_bytes()
    icon_dir = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack(
        "<BBBBHHII",
        0,
        0,
        0,
        0,
        1,
        32,
        len(png_bytes),
        6 + 16,
    )

    output_path.write_bytes(icon_dir + entry + png_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
