# ── Base: official nerfstudio image (CUDA 11.8, Python 3.10) ────────────────
FROM ghcr.io/nerfstudio-project/nerfstudio:latest

# System deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r /workspace/requirements.txt

# Worker code
COPY handler.py /workspace/handler.py

WORKDIR /workspace

# RunPod entrypoint
CMD ["python", "-u", "handler.py"]
