# any to any (a2a)

Universal format converter and print studio with document layout scaling and a companion Python CLI.

---

## 1. Web Application

Built with React, TypeScript, and Tailwind CSS. All conversions and print layout transformations execute client-side.

### Capabilities
- **Documents**: `DOCX`, `PDF`, `MD`, `HTML`, `TXT`, `RTF`, `EPUB`
- **Spreadsheets & Data**: `XLSX`, `XLS`, `CSV`, `TSV`, `JSON`, `YAML`, `XML`, `SQL`
- **Images**: `PNG`, `JPG`, `WEBP`, `GIF`, `BMP`, `SVG`, `ICO`, `TIFF`
- **Audio**: `MP3`, `WAV`, `OGG`, `AAC`, `M4A`, `FLAC`, `WEBM`
- **Video**: `MP4`, `WEBM`, `MOV`, `MKV`, `AVI` (transcoding, audio track extraction, animated GIF generation, frame snapshots)

### Print Studio & Fit to One Page
- **Fit to One Page (Length-wise)**: Condenses multi-page / multi-section documents onto a single physical page.
- **WYSIWYG Sheet Preview**: Visual representation with physical paper aspect ratios and millimeter dimensions (`A4`, `Letter`, `Legal`, `Tabloid`, `A3`, `A5`).
- **N-Up Multi-Page**: 1-up, 2-up (side-by-side), 4-up (2×2 grid).
- **Ink Saver**: Full color, Grayscale, or High-Contrast B&W.
- **Execution**: Sends directly to the system print dialog or saves a calibrated print-ready PDF.

### Built-in Editor
- **Document / Text**: Markdown / HTML editor with live formatting, word & character counts, and Find & Replace.
- **Image**: Rotation, flip horizontal/vertical, brightness, contrast, grayscale, color inversion, and text watermarking.
- **Media**: Audio & video trimmer with scrub bar, start/end bounds, playback speed (0.5x–2.0x), and volume multiplier.

### Quick Start
```bash
npm install
npm run dev
```

---

## 2. Python CLI (`a2a`)

Use the CLI tool to convert any file directly from your terminal:

```bash
# Convert a video into both MP4 and MP3 audio:
python a2a "video.mov" mp4, mp3

# Extract MP3 audio from a video:
python a2a "recording.mp4" mp3

# Convert an image into JPG, WebP, and PDF:
python a2a "graphic.png" jpg, webp, pdf

# Convert a spreadsheet into JSON and YAML:
python a2a "financials.csv" json, yaml

# Convert a Markdown file to HTML:
python a2a "document.md" html
```

Both `python a2a` and `python a2a.py` are supported interchangeably.

### CLI Options
- `-o, --output <dir>`: Output files to a custom destination directory.
- `--print`: Automatically send the converted output to the system printer.
- `--fit-to-one-page`: Compress output document to a single page.
