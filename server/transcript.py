# transcript.py

from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs


def fetch_transcript(video_url: str) -> list[dict]:
    """
    Extracts transcript segments (text + timestamps) from a YouTube video.
    Returns a list of dicts with keys: 'text', 'start', and 'duration'.
    
    Args:
        video_url (str): Full YouTube video URL.

    Returns:
        List[Dict]: Transcript segments, or empty list if failed.
    """
    
    # ───── Step 1: Parse the YouTube URL ─────
    # Example input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s"
    parsed_url = urlparse(video_url)

    # Example parsed result:
    # ParseResult(
    #   scheme='https',
    #   netloc='www.youtube.com',
    #   path='/watch',
    #   params='',
    #   query='v=dQw4w9WgXcQ&t=43s',
    #   fragment=''
    # )

    # ───── Step 2: Extract the video ID ─────
    video_id_list = parse_qs(parsed_url.query).get("v") # Converts query string to dictionary and Gets the 'v' parameter (video ID)
    
    if not video_id_list:
        raise ValueError("Invalid YouTube URL provided. 'v' parameter not found.")

    video_id = video_id_list[0]  # Extract the string from the list (e.g., 'dQw4w9WgXcQ')
    print("🎬 Fetching transcript for video ID:", video_id)

    # ───── Step 3: Fetch transcript from YouTube ─────
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript  # List of {'text', 'start', 'duration'}
    
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        return []
    


# ───── Optional Test Code ─────
# Uncomment below to test this file directly by running: python server/transcript.py

# test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # RICKROLL HAHAHA
# transcript = fetch_transcript(test_url)
# for segment in transcript[:5]:
#     print(segment)

# # OUTPUT:
# 🎬 Fetching transcript for video ID: dQw4w9WgXcQ
# {'text': '[♪♪♪]', 'start': 1.36, 'duration': 1.68}
# {'text': "♪ We're no strangers to love ♪", 'start': 18.64, 'duration': 3.24}
# {'text': '♪ You know the rules\nand so do I ♪', 'start': 22.64, 'duration': 4.32}
# {'text': "♪ A full commitment's\nwhat I'm thinking of ♪", 'start': 27.04, 'duration': 4.0}
# {'text': "♪ You wouldn't get this\nfrom any other guy ♪", 'start': 31.12, 'duration': 3.96}