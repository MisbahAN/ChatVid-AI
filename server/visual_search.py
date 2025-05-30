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
#    - Path, timedelta: paths and timestamps
#    - analyze_image: from gemini_utils
#    - genai, dotenv: for Gemini embeddings
#    - sklearn: cosine similarity metric

import os
import cv2
import numpy as np
from pathlib import Path
from datetime import timedelta
import subprocess
from gemini_utils import analyze_image
import shutil
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from dotenv import load_dotenv



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



# 5. process_all_frames(frame_metadata, prompt)
#    - Analyzes each frame using Gemini multimodal API
#    - Adds 'analysis' field to each frame dict

def process_all_frames(frame_metadata: list[dict], prompt: str) -> list[dict]:
    print("🔢 Processing all frames using Gemini...")

    for frame in frame_metadata:
        try:
            analysis = analyze_image(frame["image_path"], prompt)
            frame["analysis"] = analysis
        except Exception as e:
            print(f"❌ Error processing {frame['image_path']}: {e}")
            frame["analysis"] = None

    print("✅ Finished processing all frames.")
    return frame_metadata



# 6. embed_frame_descriptions(frame_metadata)
#    - Uses Gemini text embedding model to embed each frame's description
#    - Adds 'embedding' field to each frame

def embed_frame_descriptions(frame_metadata: list[dict]) -> list[dict]:
    print("🔡 Embedding frame descriptions...")
    for frame in frame_metadata:
        analysis = frame.get("analysis", "")
        if analysis:
            try:
                response = genai.embed_content(
                    model="models/embedding-001",
                    content=analysis,
                    task_type="RETRIEVAL_QUERY"
                )
                frame["embedding"] = response["embedding"]
            except Exception as e:
                print(f"❌ Failed to embed description at {frame['timestamp']}: {e}")
                frame["embedding"] = None
        else:
            frame["embedding"] = None
    return frame_metadata



# 7. semantic_search(query, frames)
#    - Embeds the query text
#    - Computes cosine similarity to each frame embedding
#    - Returns the best-matching frame (with score and analysis)

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
            "analysis": best_frame["analysis"]
        }
    else:
        return {}



# 8. Optional Test Block
#    - Tests full pipeline: frame extraction → image analysis → embedding → semantic search

if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=B5FMk3MLTDI"
    frames = extract_frames(url, interval=5)
    frames = process_all_frames(frames, prompt="Describe the scene in this frame as clearly and thoroughly as possible.")
    frames = embed_frame_descriptions(frames)

    result = semantic_search("When is the volcanic moon shown?", frames)

    print("\n📍 Best Match:")
    print(result)
