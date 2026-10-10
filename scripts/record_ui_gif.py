#!/usr/bin/env python3
"""
k8s-distributed-storage-plane: UI Recording & Demo GIF Generator
Captures sequential frames of the live dashboard via headless Chrome and
compiles them into an optimized animated GIF using ffmpeg.
"""

import os
import subprocess
import time
import shutil

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML_PATH = os.path.join(REPO_ROOT, "client", "build", "index.html")
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")
GIF_OUTPUT = os.path.join(ASSETS_DIR, "dashboard-demo.gif")
TMP_DIR = "/tmp/dgx_ui_frames"

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FFMPEG_PATH = "/opt/homebrew/bin/ffmpeg"

def record_gif():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    if os.path.exists(TMP_DIR):
        shutil.rmtree(TMP_DIR)
    os.makedirs(TMP_DIR, exist_ok=True)

    # Time offsets in milliseconds to capture baseline, burst, and reconciliation
    time_offsets = [1500, 3000, 4800, 6200, 8000, 9500]

    print(f">> Capturing {len(time_offsets)} UI frames from {HTML_PATH}...")
    frame_files = []

    for idx, offset in enumerate(time_offsets):
        frame_name = f"frame_{idx:02d}.png"
        out_path = os.path.join(TMP_DIR, frame_name)
        cmd = [
            CHROME_PATH,
            "--headless=new",
            "--window-size=1380,920",
            f"--virtual-time-budget={offset}",
            f"--screenshot={out_path}",
            f"file://{HTML_PATH}"
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(out_path):
            frame_files.append(out_path)
            print(f"   [Frame {idx+1}/{len(time_offsets)}] Captured at virtual t={offset}ms ({os.path.getsize(out_path)} bytes)")
        else:
            print(f"   [Warning] Failed to capture frame at t={offset}ms")

    if not frame_files:
        raise RuntimeError("No frames were captured by headless Chrome.")

    print(f">> Compiling frames into animated GIF: {GIF_OUTPUT}...")
    # Generate high quality 2-pass palette GIF using ffmpeg
    palette_filter = "fps=1,scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer"
    ffmpeg_cmd = [
        FFMPEG_PATH,
        "-y",
        "-framerate", "1",
        "-i", os.path.join(TMP_DIR, "frame_%02d.png"),
        "-vf", palette_filter,
        GIF_OUTPUT
    ]
    subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(GIF_OUTPUT):
        size_kb = os.path.getsize(GIF_OUTPUT) / 1024
        print(f">> Successfully generated demo GIF: {GIF_OUTPUT} ({size_kb:.1f} KB)")
    else:
        raise RuntimeError("ffmpeg failed to output GIF.")

    # Cleanup temporary frame files
    shutil.rmtree(TMP_DIR, ignore_errors=True)

if __name__ == "__main__":
    record_gif()
