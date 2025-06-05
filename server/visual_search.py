import os
import cv2
import numpy as np
from pathlib import Path
from datetime import timedelta
import subprocess
import shutil
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
import asyncio
import httpx

from gemini_utils import async_analyze_image


def download_video(video_url: str, output_path: str) -> str:
    """
    Uses yt-dlp to download best video+audio, merges into temp_video.mp4 under output_path.
    """
    output_file = os.path.join(output_path, "temp_video.mp4")
    command = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
        "--merge-output-format", "mp4",
        "-o",
        output_file,
        video_url,
    ]
    print("⬇️ Downloading video with yt-dlp and merging streams...")
    subprocess.run(command, check=True)
    return output_file


def extract_frames(video_url: str, interval: int = 5) -> list[dict]:
    """
    1) Deletes any existing 'frames' folder, recreates it.
    2) Downloads the YouTube video as temp_video.mp4.
    3) Extracts one frame every `interval` seconds, resizes to 320×180, saves under 'frames'.
    4) Returns a list of {timestamp: "HH:MM:SS", seconds: int, image_path: str}.
    """
    frames_dir = Path(__file__).parent / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True, exist_ok=True)

    video_path = download_video(video_url, str(Path(__file__).parent))

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


async def process_all_frames_async(
    frame_dir: str = None,
    api_key: str = None
) -> list[dict]:
    """
    1) Configures Gemini with api_key.
    2) For every JPG in 'frame_dir', calls async_analyze_image(..., api_key) to get a description.
    3) Embeds that description via Gemini's embed API.
    4) Returns a list of {timestamp: int, description: str, embedding: [float,...]}.
    """
    if api_key is None:
        raise ValueError("API key is required for frame analysis.")

    # 1) Configure Gemini for embedding
    genai.configure(api_key=api_key)

    if frame_dir is None:
        frame_dir = str(Path(__file__).parent / "frames")

    print(f"🚀 Starting async frame analysis in {frame_dir}...")

    results = []
    frame_files = sorted(Path(frame_dir).glob("*.jpg"))

    async with httpx.AsyncClient(timeout=60) as client:
        # Kick off all Gemini image‐analysis calls in parallel
        tasks = [
            async_analyze_image(str(frame), client, api_key)
            for frame in frame_files
        ]

        descriptions = await asyncio.gather(*tasks)

        for frame_file, desc in zip(frame_files, descriptions):
            timestamp_sec = int(frame_file.stem.split("_")[-1])

            try:
                resp = genai.embed_content(
                    model="models/embedding-001",
                    content=desc,
                    task_type="RETRIEVAL_QUERY"
                )
                embedding = resp["embedding"]
            except Exception as e:
                print(f"❌ Failed to embed description at {frame_file.name}: {e}")
                embedding = None

            results.append({
                "timestamp": timestamp_sec,
                "description": desc,
                "embedding": embedding
            })

    print("✅ Async frame analysis complete.")
    return results


def semantic_search(
    query: str,
    frames: list[dict],
    api_key: str
) -> dict:
    """
    1) Configures Gemini with api_key.
    2) Embeds the text query.
    3) Computes cosine similarity vs. each frame's embedding.
    4) Returns {timestamp, score, description} for the best match.
    """
    if api_key is None:
        raise ValueError("API key is required for semantic search.")

    genai.configure(api_key=api_key)
    print(f"🔍 Searching for: {query}")

    try:
        q_resp = genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="RETRIEVAL_QUERY"
        )
        query_embed = q_resp["embedding"]
    except Exception as e:
        print(f"❌ Error embedding query: {e}")
        return {}

    best_frame = None
    best_score = -1

    for frame in frames:
        emb = frame.get("embedding")
        if emb is not None:
            score = cosine_similarity([query_embed], [emb])[0][0]
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
