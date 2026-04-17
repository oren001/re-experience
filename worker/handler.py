"""
Re-Experience — Gaussian Splatting Worker
Runs on RunPod Serverless (nerfstudio base image)

Input:
  {
    "input": {
      "video_url": "https://...",   # presigned R2 URL to uploaded video
      "scene_name": "My Memory",
      "quality": "default"          # "default" | "high"
    }
  }

Output:
  {
    "ply_url": "https://...",       # presigned R2 URL to output .ply
    "scene_name": "My Memory",
    "splat_count": 1234567,
    "elapsed_seconds": 720
  }
"""

import runpod
import os
import time
import subprocess
import tempfile
import requests
from pathlib import Path

# ── Cloudflare Worker upload endpoint ───────────────────────────────────────
WORKER_URL    = os.environ.get("WORKER_URL", "https://re-experience-uploader.oren001.workers.dev")
WORKER_SECRET = os.environ.get("WORKER_SECRET", "08b7c1ff30ed2491b9763015f1bdf7b1901f29a25aba4d688c65bb7d1e0bccdd")

def upload_scene(ply_path: Path, key: str) -> str:
    """Upload .ply to R2 via Cloudflare Worker. Returns public URL."""
    with open(ply_path, "rb") as f:
        res = requests.post(
            f"{WORKER_URL}/upload-scene",
            data=f,
            headers={
                "X-Scene-Key":     key,
                "X-Worker-Secret": WORKER_SECRET,
                "Content-Type":    "application/octet-stream",
            },
            timeout=120,
        )
    res.raise_for_status()
    return res.json()["publicUrl"]

def run(cmd, **kwargs):
    """Run a shell command, stream output, raise on failure."""
    print(f"[run] {' '.join(cmd)}", flush=True)
    result = subprocess.run(cmd, text=True, capture_output=False, **kwargs)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed (exit {result.returncode}): {' '.join(cmd)}")
    return result

def handler(event):
    t0 = time.time()
    job_input  = event.get("input", {})
    video_url  = job_input.get("video_url")
    scene_name = job_input.get("scene_name", "scene")
    quality    = job_input.get("quality", "default")   # "default" | "high"

    if not video_url:
        return {"error": "video_url is required"}

    method = "splatfacto-big" if quality == "high" else "splatfacto"

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        video_path  = tmp / "input.mp4"
        frames_dir  = tmp / "frames"
        output_dir  = tmp / "output"
        export_dir  = tmp / "export"
        frames_dir.mkdir()
        output_dir.mkdir()
        export_dir.mkdir()

        # ── 1. Download video ────────────────────────────────────────────────
        print("[1/5] Downloading video…", flush=True)
        resp = requests.get(video_url, stream=True, timeout=120)
        resp.raise_for_status()
        with open(video_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"      Downloaded {video_path.stat().st_size / 1e6:.1f} MB", flush=True)

        # ── 2. Extract frames (1 fps keeps COLMAP tractable) ─────────────────
        print("[2/5] Extracting frames…", flush=True)
        run([
            "ffmpeg", "-y", "-i", str(video_path),
            "-vf", "fps=1,scale=1280:-2",
            "-q:v", "2",
            str(frames_dir / "%04d.jpg"),
        ])
        frame_count = len(list(frames_dir.glob("*.jpg")))
        print(f"      Extracted {frame_count} frames", flush=True)

        if frame_count < 10:
            return {"error": f"Too few frames extracted ({frame_count}). Video may be too short."}

        # ── 3. Run COLMAP via ns-process-data ───────────────────────────────
        print("[3/5] Running COLMAP (structure from motion)…", flush=True)
        run([
            "ns-process-data", "images",
            "--data",       str(frames_dir),
            "--output-dir", str(output_dir / "data"),
        ])

        # ── 4. Train Gaussian Splat ──────────────────────────────────────────
        print(f"[4/5] Training {method}…", flush=True)
        run([
            "ns-train", method,
            "--data",              str(output_dir / "data"),
            "--output-dir",        str(output_dir / "train"),
            "--experiment-name",   "scene",
            "--max-num-iterations","30000",
            "--pipeline.model.cull-alpha-thresh", "0.005",
        ])

        # Find the config yaml nerfstudio wrote
        configs = sorted((output_dir / "train" / "scene").rglob("config.yml"))
        if not configs:
            return {"error": "Training finished but no config.yml found"}
        config_path = configs[-1]

        # ── 5. Export .ply ───────────────────────────────────────────────────
        print("[5/5] Exporting .ply…", flush=True)
        run([
            "ns-export", "gaussian-splat",
            "--load-config", str(config_path),
            "--output-dir",  str(export_dir),
        ])

        ply_candidates = list(export_dir.rglob("*.ply"))
        if not ply_candidates:
            return {"error": "Export finished but no .ply found"}
        ply_path = ply_candidates[0]

        ply_size_mb = ply_path.stat().st_size / 1e6
        print(f"      .ply size: {ply_size_mb:.1f} MB", flush=True)

        # Count splats (each point = 1 gaussian; .ply header has element vertex N)
        splat_count = 0
        with open(ply_path, "rb") as f:
            for line in f:
                if line.startswith(b"element vertex"):
                    splat_count = int(line.split()[-1])
                    break
                if line.strip() == b"end_header":
                    break

        # ── Upload to R2 via Cloudflare Worker ──────────────────────────────
        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in scene_name)
        job_id    = event.get("id", "job")
        r2_key    = f"scenes/{job_id}/{safe_name}.ply"

        print(f"      Uploading to R2 → {r2_key}", flush=True)
        ply_url = upload_scene(ply_path, r2_key)
        elapsed = round(time.time() - t0)

        print(f"\n✅ Done in {elapsed}s — {splat_count:,} splats — {ply_url}", flush=True)
        return {
            "ply_url":        ply_url,
            "scene_name":     scene_name,
            "splat_count":    splat_count,
            "ply_size_mb":    round(ply_size_mb, 1),
            "elapsed_seconds": elapsed,
        }

runpod.serverless.start({"handler": handler})
