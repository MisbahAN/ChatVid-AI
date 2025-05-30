# This script extracts the transcript from a YouTube video URL by:
# 1. Parsing the video ID from the given URL
# 2. Fetching the auto-generated transcript using youtube-transcript-api
# 3. Returning the transcript as a list of text + timestamp segments



# 1. Imports
#    - youtube_transcript_api: fetches YouTube transcript via video ID
#    - urllib.parse: extracts query parameters like video ID from URL

from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs



# 2. fetch_transcript(video_url)
#    - Extracts video ID from full YouTube URL
#    - Fetches the transcript via API
#    - Returns list of dicts: {text, start, duration}

def fetch_transcript(video_url: str) -> list[dict]:
    """
    Extracts transcript segments (text + timestamps) from a YouTube video.
    Returns a list of dicts with keys: 'text', 'start', and 'duration'.

    Args:
        video_url (str): Full YouTube video URL

    Returns:
        List[Dict]: Transcript segments, or empty list if failed
    """

    # ─── Step 1: Parse the YouTube URL ───
    # Example input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s"
    parsed_url = urlparse(video_url)

    # ─── Step 2: Extract the video ID ───
    video_id_list = parse_qs(parsed_url.query).get("v")  # Extracts the 'v' parameter (video ID) as a list

    if not video_id_list:
        raise ValueError("Invalid YouTube URL provided. 'v' parameter not found.")

    video_id = video_id_list[0]  # Get video ID from list (e.g., 'dQw4w9WgXcQ')
    print("🎬 Fetching transcript for video ID:", video_id)

    # ─── Step 3: Fetch transcript using API ───
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript  # Returns list of {text, start, duration}

    except Exception as e:
        print(f"Error fetching transcript: {e}")
        return []



# 3. Optional test block
#    - Allows you to run this file standalone to test transcript fetching

# if __name__ == "__main__":
#     test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # RICKROLL 🤡
#     transcript = fetch_transcript(test_url)
#     for segment in transcript[:5]:
#         print(segment)

# 🎬 Fetching transcript for video ID: dQw4w9WgXcQ
# {'text': '[♪♪♪]', 'start': 1.36, 'duration': 1.68}
# {'text': "♪ We're no strangers to love ♪", 'start': 18.64, 'duration': 3.24}
# {'text': '♪ You know the rules\nand so do I ♪', 'start': 22.64, 'duration': 4.32}
# {'text': "♪ A full commitment's\nwhat I'm thinking of ♪", 'start': 27.04, 'duration': 4.0}
# {'text': "♪ You wouldn't get this\nfrom any other guy ♪", 'start': 31.12, 'duration': 3.96}