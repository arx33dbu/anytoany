import os
import sys
import subprocess
import json
import csv
from pathlib import Path

# Try importing optional helper libraries
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'tif'}
MEDIA_EXTENSIONS = {'mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'wmv', 'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'}
DATA_EXTENSIONS = {'csv', 'tsv', 'json', 'yaml', 'yml', 'xlsx', 'xls', 'sql'}
DOC_EXTENSIONS = {'txt', 'md', 'html', 'pdf', 'docx', 'rtf'}


def run_ffmpeg(args: list[str]) -> bool:
    try:
        cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + args
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            return False
        return True
    except FileNotFoundError:
        return False


def convert_file(input_path: str, target_ext: str, output_path: str = None) -> str:
    """
    Converts input_path to target_ext.
    Returns the created output path.
    """
    in_file = Path(input_path).resolve()
    if not in_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    target_ext = target_ext.lower().lstrip('.')
    source_ext = in_file.suffix.lower().lstrip('.')

    if not output_path:
        out_file = in_file.with_suffix(f".{target_ext}")
    else:
        out_file = Path(output_path).resolve()

    # Avoid writing into itself
    if in_file == out_file:
        out_file = in_file.with_stem(f"{in_file.stem}_converted").with_suffix(f".{target_ext}")

    out_file.parent.mkdir(parents=True, exist_ok=True)

    # 1. AUDIO & VIDEO CONVERSIONS (using ffmpeg)
    if source_ext in MEDIA_EXTENSIONS or target_ext in MEDIA_EXTENSIONS:
        # Video to GIF
        if target_ext == 'gif':
            args = ['-i', str(in_file), '-vf', 'fps=12,scale=480:-1:flags=lanczos', str(out_file)]
            if run_ffmpeg(args):
                return str(out_file)

        # Video to Audio (e.g. mp4 -> mp3)
        if target_ext in {'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'}:
            if target_ext == 'mp3':
                args = ['-i', str(in_file), '-vn', '-c:a', 'libmp3lame', '-q:a', '2', str(out_file)]
            elif target_ext == 'wav':
                args = ['-i', str(in_file), '-vn', '-c:a', 'pcm_s16le', str(out_file)]
            elif target_ext == 'ogg':
                args = ['-i', str(in_file), '-vn', '-c:a', 'libvorbis', str(out_file)]
            else:
                args = ['-i', str(in_file), '-vn', str(out_file)]
            if run_ffmpeg(args):
                return str(out_file)

        # Video frame snapshot (e.g. mp4 -> png / jpg)
        if target_ext in IMAGE_EXTENSIONS:
            args = ['-ss', '00:00:01', '-i', str(in_file), '-vframes', '1', str(out_file)]
            if run_ffmpeg(args):
                return str(out_file)

        # Video to Video or Audio to Audio transcoding
        args = ['-i', str(in_file), str(out_file)]
        if run_ffmpeg(args):
            return str(out_file)

    # 2. IMAGE CONVERSIONS (using PIL)
    if source_ext in IMAGE_EXTENSIONS:
        if HAS_PIL:
            with Image.open(in_file) as img:
                # Handle RGB conversion for formats not supporting RGBA (e.g. JPEG)
                if target_ext in {'jpg', 'jpeg'} and img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    rgb_img.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
                    rgb_img.save(out_file, 'JPEG', quality=95)
                    return str(out_file)
                elif target_ext == 'pdf':
                    rgb_img = img.convert('RGB')
                    rgb_img.save(out_file, 'PDF', resolution=100.0)
                    return str(out_file)
                elif target_ext == 'ico':
                    img.save(out_file, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
                    return str(out_file)
                else:
                    save_format = target_ext.upper()
                    if save_format == 'JPG':
                        save_format = 'JPEG'
                    img.save(out_file, format=save_format)
                    return str(out_file)

    # 3. TABULAR DATA CONVERSIONS (pandas / csv / json)
    if source_ext in DATA_EXTENSIONS or target_ext in DATA_EXTENSIONS:
        if HAS_PANDAS:
            df = None
            if source_ext == 'csv':
                df = pd.read_csv(in_file)
            elif source_ext == 'tsv':
                df = pd.read_csv(in_file, sep='\t')
            elif source_ext == 'json':
                df = pd.read_json(in_file)
            elif source_ext in {'xlsx', 'xls'}:
                df = pd.read_excel(in_file)

            if df is not None:
                if target_ext == 'csv':
                    df.to_csv(out_file, index=False)
                    return str(out_file)
                elif target_ext == 'tsv':
                    df.to_csv(out_file, sep='\t', index=False)
                    return str(out_file)
                elif target_ext == 'json':
                    df.to_json(out_file, orient='records', indent=2)
                    return str(out_file)
                elif target_ext == 'xlsx':
                    df.to_excel(out_file, index=False)
                    return str(out_file)
                elif target_ext == 'html':
                    df.to_html(out_file, index=False)
                    return str(out_file)
                elif target_ext in {'yaml', 'yml'} and HAS_YAML:
                    records = df.to_dict(orient='records')
                    with open(out_file, 'w', encoding='utf-8') as yf:
                        yaml.dump(records, yf, default_flow_style=False)
                    return str(out_file)

    # 4. DOCUMENTS & TEXT CONVERSIONS
    if source_ext in {'md', 'markdown'} and target_ext == 'html':
        content = in_file.read_text(encoding='utf-8')
        try:
            import markdown_it
            md = markdown_it.MarkdownIt()
            html = md.render(content)
        except ImportError:
            html = f"<html><body><pre>{content}</pre></body></html>"
        out_file.write_text(html, encoding='utf-8')
        return str(out_file)

    if target_ext == 'txt':
        content = in_file.read_text(encoding='utf-8', errors='ignore')
        out_file.write_text(content, encoding='utf-8')
        return str(out_file)

    # Fallback to copy/direct write if formats match or text
    raw = in_file.read_bytes()
    out_file.write_bytes(raw)
    return str(out_file)
