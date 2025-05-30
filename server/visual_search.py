# This module handles visual search by:
# - Downloading a YouTube video
# - Extracting frames every N seconds
# - Analyzing each frame using Gemini multimodal API
# - Embedding frame descriptions
# - Performing semantic search using cosine similarity



# 1. Imports
#    - os, shutil, subprocess: filesystem and shell utilities
#    - cv2: OpenCV for video frame extraction
#    - numpy: needed for cosine similarity
#    - Path, timedelta: for saving files and handling timestamps
#    - gemini_utils: async Gemini image analysis
#    - sklearn: cosine similarity metric
#    - genai, dotenv, asyncio, httpx: Gemini config + async HTTP requests

import os
import cv2
import numpy as np
from pathlib import Path
from datetime import timedelta
import subprocess
from gemini_utils import async_analyze_image
import shutil
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio
import httpx



# 2. Load API Key and Configure Gemini

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))



# 3. download_video(video_url, output_path)
#    - Uses yt-dlp to download and merge best quality streams
#    - Saves as temp_video.mp4 in given directory

def download_video(video_url: str, output_path: str) -> str:
    output_file = os.path.join(output_path, "temp_video.mp4")
    command = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
        "--merge-output-format", "mp4",
        "-o", output_file,
        video_url,
    ]
    print("⬇️ Downloading video with yt-dlp and merging streams...")
    subprocess.run(command, check=True)
    return output_file



# 4. extract_frames(video_url, interval)
#    - Extracts one frame every `interval` seconds
#    - Resizes frame to 320x180
#    - Saves frame metadata with timestamp and path

def extract_frames(video_url: str, interval: int = 5) -> list[dict]:
    frames_dir = Path("server/frames")
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True, exist_ok=True)

    video_path = download_video(video_url, "server")
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = int(total_frames // fps)

    print(f"🎮 Extracting frames every {interval}s from video ({duration}s)...")

    results = []
    for t in range(0, duration, interval):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        success, frame = cap.read()
        if success:
            timestamp = str(timedelta(seconds=t))[:-3]
            frame_filename = f"frame_{t}.jpg"
            frame_path = frames_dir / frame_filename

            resized_frame = cv2.resize(frame, (320, 180))
            cv2.imwrite(str(frame_path), resized_frame)

            results.append({
                "timestamp": timestamp,
                "seconds": t,
                "image_path": str(frame_path)
            })

    cap.release()
    os.remove(video_path)

    print(f"✅ Extracted {len(results)} frames.")
    return results



# 5. process_all_frames_async(frame_dir)
#    - Asynchronously analyzes frames using Gemini multimodal API
#    - Embeds each description and appends timestamp, description, and embedding
#    - Replaces original frame-by-frame processor and embedding step

async def process_all_frames_async(frame_dir: str):
    print("🚀 Starting async frame analysis...")

    results = []
    frame_files = sorted(Path(frame_dir).glob("*.jpg"))

    async with httpx.AsyncClient(timeout=60) as client:
        tasks = [
            async_analyze_image(str(frame), client)
            for frame in frame_files
        ]

        descriptions = await asyncio.gather(*tasks)

        for frame_file, desc in zip(frame_files, descriptions):
            timestamp_sec = int(frame_file.stem.split("_")[-1])

            try:
                response = genai.embed_content(
                    model="models/embedding-001",
                    content=desc,
                    task_type="RETRIEVAL_QUERY"
                )
                embedding = response["embedding"]
            except Exception as e:
                print(f"❌ Failed to embed description at frame {frame_file.name}: {e}")
                embedding = None

            results.append({
                "timestamp": timestamp_sec,
                "description": desc,
                "embedding": embedding
            })

    print("✅ Async frame analysis complete.")
    return results



# 6. semantic_search(query, frames)
#    - Embeds the query
#    - Compares it to all frame embeddings using cosine similarity
#    - Returns best match with timestamp, score, and description

def semantic_search(query: str, frames: list[dict]) -> dict:
    print(f"🔍 Searching for: {query}")
    try:
        query_embed = genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="RETRIEVAL_QUERY"
        )["embedding"]
    except Exception as e:
        print(f"❌ Error embedding query: {e}")
        return {}

    best_frame = None
    best_score = -1

    for frame in frames:
        if frame.get("embedding"):
            score = cosine_similarity(
                [query_embed], [frame["embedding"]]
            )[0][0]

            if score > best_score:
                best_score = score
                best_frame = frame

    if best_frame:
        return {
            "timestamp": best_frame["timestamp"],
            "score": best_score,
            "description": best_frame["description"]
        }
    else:
        return {}



# 7. Optional Test Block
#    - Tests full pipeline: YouTube video ➝ Extract frames ➝ Async analyze + embed ➝ Semantic search

# if __name__ == "__main__":
#     import sys
#
#     url = "https://www.youtube.com/watch?v=6Xf858oNEak"
#
#     # Step 1: Extract frames every 5 seconds
#     extract_frames(url, interval=5)
#
#     # Step 2: Run async frame analysis
#     async def run_pipeline():
#         frames = await process_all_frames_async("server/frames")
#         result = semantic_search("When is the frosting being put on the cake?", frames)
#
#         print("\n📍 Best Match:")
#         print(result)
#
#     # Run the async pipeline
#     asyncio.run(run_pipeline())
