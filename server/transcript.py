from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript
from urllib.parse import urlparse, parse_qs

def fetch_transcript(video_url: str) -> list[dict]:
    parsed_url = urlparse(video_url)
    video_id_list = parse_qs(parsed_url.query).get("v")
    
    if not video_id_list:
        raise ValueError("Invalid YouTube URL provided. 'v' parameter not found.")
    
    video_id = video_id_list[0]
    print("🎬 Fetching transcript for video ID:", video_id)

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)

        if not transcript or len(transcript) == 0:
            print(f"❌ No transcript found for video ID: {video_id}")
            return []

        if len(transcript) > 1000:
            print(f"⚠️ Transcript is very long ({len(transcript)} segments). Consider chunking later.")

        return transcript

    except TranscriptsDisabled:
        print(f"❌ Transcripts are disabled for video ID: {video_id}")
    except NoTranscriptFound:
        print(f"❌ No transcript available for video ID: {video_id}")
    except CouldNotRetrieveTranscript:
        print(f"❌ Could not retrieve transcript for video ID: {video_id} (possible rate-limit or block)")
    except Exception as e:
        if "no element found" in str(e):
            print(f"❌ No transcript or empty response from YouTube for video ID: {video_id}")
        else:
            print(f"Error fetching transcript for video ID {video_id}: {e}")

    return []