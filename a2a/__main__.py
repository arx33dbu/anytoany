import sys
import os
import time
from pathlib import Path

# Support running directly as 'python a2a' or 'python a2a.py'
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from a2a.converter import convert_file
except ImportError:
    from converter import convert_file

def print_help():
    print("""any to any (a2a) - Universal CLI File Converter

Usage:
  python a2a "[filename]" [target_formats...]
  python a2a.py "[filename]" [target_formats...]

Examples:
  python a2a "video.mov" mp4, mp3
  python a2a "song.wav" mp3
  python a2a "document.docx" pdf, html
  python a2a "dataset.csv" json, xlsx, yaml
  python a2a "photo.png" jpg, webp, pdf

Options:
  -o, --output <dir>    Specify custom destination folder
  --fit-to-one-page     Fit document layout onto 1 page
  --print               Print document using system printer
  -h, --help            Show this help reference
""")

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'):
        print_help()
        sys.exit(0)

    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        print(f"Error: File not found: '{input_file}'", file=sys.stderr)
        sys.exit(1)

    # Collect flags and targets
    raw_args = sys.argv[2:]
    targets = []
    output_dir = None
    fit_to_one_page = False
    do_print = False

    i = 0
    while i < len(raw_args):
        arg = raw_args[i]
        if arg in ('-o', '--output') and i + 1 < len(raw_args):
            output_dir = raw_args[i + 1]
            i += 2
            continue
        elif arg == '--fit-to-one-page':
            fit_to_one_page = True
            i += 1
            continue
        elif arg == '--print':
            do_print = True
            i += 1
            continue
        else:
            # Handle comma separated or space separated formats like "mp4, mp3"
            parts = [p.strip().lstrip('.').lower() for p in arg.replace(',', ' ').split()]
            for p in parts:
                if p and not p.startswith('-'):
                    targets.append(p)
            i += 1

    if not targets:
        print("Error: No target format specified.", file=sys.stderr)
        print("Example: python a2a \"file.mp4\" mp4, mp3", file=sys.stderr)
        sys.exit(1)

    in_path = Path(input_file).resolve()
    print(f"\n-> any to any: converting '{in_path.name}' ({len(targets)} target{'s' if len(targets) > 1 else ''})")

    results = []
    for tgt in targets:
        t_start = time.perf_counter()
        try:
            out_target_path = None
            if output_dir:
                out_target_path = str(Path(output_dir) / f"{in_path.stem}.{tgt}")

            out_res = convert_file(str(in_path), tgt, out_target_path)
            elapsed = time.perf_counter() - t_start
            out_size = os.path.getsize(out_res)
            print(f"  [OK] .{tgt.upper()} -> {Path(out_res).name} ({format_size(out_size)}, {elapsed:.2f}s)")
            results.append(out_res)
        except Exception as e:
            print(f"  [ERROR] .{tgt.upper()} failed: {e}", file=sys.stderr)

    if do_print and results:
        print(f"  [PRINT] Sending {results[0]} to printer...")
        if sys.platform == 'win32':
            os.startfile(results[0], 'print')

    print("-> Done.\n")

def format_size(bytes_val: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024
    return f"{bytes_val:.1f} TB"

if __name__ == '__main__':
    main()
