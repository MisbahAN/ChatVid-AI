import json
import os
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    CouldNotRetrieveTranscript,
)
from urllib.parse import urlparse, parse_qs

# Path to the single-cache file storing {"video_id": "...", "transcript": [...]}
CACHE_FILE = os.path.join(os.path.dirname(__file__), "transcript.json")


def fetch_transcript(video_url: str) -> list[dict]:
    """
    Fetches a YouTube transcript, but first checks a local cache file (transcript.json).
    If the cached video_id matches, returns that transcript. Otherwise, fetches fresh,
    overwrites transcript.json, and returns the result.
    """
    # 1) Parse out the video_id from the URL
    parsed_url = urlparse(video_url)
    video_id_list = parse_qs(parsed_url.query).get("v")
    if not video_id_list:
        raise ValueError("Invalid YouTube URL provided. 'v' parameter not found.")
    video_id = video_id_list[0]

    # 2) If cache exists and matches this video_id, return cached transcript
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("video_id") == video_id and isinstance(data.get("transcript"), list):
                print(f"🎬 Using cached transcript for video ID: {video_id}")
                return data["transcript"]
        except (json.JSONDecodeError, KeyError):
            pass  # If cache is corrupt or missing fields, ignore and fetch fresh

    # 3) Fetch fresh transcript from YouTube
    print("🎬 Fetching transcript for video ID:", video_id)
    transcript: list[dict] = []
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        if not transcript:
            print(f"❌ No transcript found for video ID: {video_id}")
            transcript = []
        elif len(transcript) > 1000:
            print(f"⚠️ Transcript is very long ({len(transcript)} segments). Consider chunking later.")
    except TranscriptsDisabled:
        print(f"❌ Transcripts are disabled for video ID: {video_id}")
    except NoTranscriptFound:
        print(f"❌ No transcript available for video ID: {video_id}")
    except CouldNotRetrieveTranscript:
        print(f"❌ Could not retrieve transcript for video ID: {video_id} (rate-limit or block?)")
    except Exception as e:
        if "no element found" in str(e):
            print(f"❌ No transcript or empty response from YouTube for video ID: {video_id}")
        else:
            print(f"Error fetching transcript for video ID {video_id}: {e}")

    # 4) Overwrite cache file with new transcript
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({"video_id": video_id, "transcript": transcript}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Failed to write transcript cache: {e}")

    return transcript
