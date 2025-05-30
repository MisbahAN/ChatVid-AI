# This module contains helper utilities for working with Gemini and YouTube:
# - Formatting time
# - Generating timestamped YouTube links
# - Embedding hyperlinks in Gemini's output
# - Answering questions using the transcript via Gemini



# 1. Imports & Configuration
#    - genai: Gemini API
#    - dotenv + os: for securely loading the API key
#    - re: regular expressions for timestamp parsing

import google.generativeai as genai
from dotenv import load_dotenv
import os
import re

# Load and configure Gemini API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize Gemini model
model = genai.GenerativeModel("gemini-1.5-pro")



# 2. format_time(seconds)
#    - Converts float seconds to "mm:ss" string format

def format_time(seconds: float) -> str:
    """Helper to turn seconds into mm:ss format."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"



# 3. generate_timestamp_link(video_url, timestamp_str)
#    - Converts "mm:ss" string into a YouTube time-linked URL

def generate_timestamp_link(video_url: str, timestamp_str: str) -> str:
    """
    Converts a timestamp string like '02:15' to a YouTube URL with time parameter.

    Args:
        video_url (str): Original YouTube URL
        timestamp_str (str): Timestamp in "mm:ss" format

    Returns:
        str: YouTube URL with t= query param
    """
    try:
        minutes, seconds = map(int, timestamp_str.split(":"))
        total_seconds = minutes * 60 + seconds
        return f"{video_url}&t={total_seconds}s"
    except Exception as e:
        print("❌ Error creating timestamp link:", e)
        return video_url  # Fallback to plain link



# 4. hyperlink_timestamps_in_text(answer, video_url)
#    - Finds all "mm:ss" timestamps and turns them into clickable links

def hyperlink_timestamps_in_text(answer: str, video_url: str) -> str:
    """
    Converts all mm:ss timestamps in a string to YouTube hyperlinks.

    Args:
        answer (str): Text answer containing timestamps
        video_url (str): Original YouTube URL

    Returns:
        str: Answer with HTML <a> tags around timestamps
    """
    pattern = r"\b(\d{2}):(\d{2})\b"  # Matches strings like "02:33"

    def replacer(match):
        ts = match.group(0)
        link = generate_timestamp_link(video_url, ts)
        return f'<a href="{link}" target="_blank">{ts}</a>'

    return re.sub(pattern, replacer, answer)



# 5. answer_question(transcript, question, video_url)
#    - Builds a Gemini prompt from transcript
#    - Sends question and receives a timestamped answer
#    - Converts timestamps to hyperlinks

def answer_question(transcript: list[dict], question: str, video_url: str) -> str:
    """
    Uses Gemini to answer a user's question based on the video transcript.

    Args:
        transcript (list[dict]): List of transcript segments with 'text', 'start', 'duration'
        question (str): User's natural language question
        video_url (str): YouTube video URL to embed timestamps in the answer

    Returns:
        str: Gemini's answer with timestamp hyperlinks
    """

    # ─── Step 1: Format transcript as readable context ───
    context = ""
    for item in transcript:
        start_time = format_time(item["start"])
        context += f"[{start_time}] {item['text']}\n"

    # ─── Step 2: Build prompt with question ───
    prompt = f"""
        You are a helpful assistant answering questions about a YouTube video.
        Use only the transcript below. Try to include the timestamp of relevant parts in your answer.

        Transcript:
        {context}

        Question: {question}
        Answer:
    """

    # ─── Step 3: Query Gemini ───
    response = model.generate_content(prompt)
    answer = response.text.strip()

    return hyperlink_timestamps_in_text(answer, video_url)



# 6. Optional test block
#    - Lets you run this file directly to test question answering

if __name__ == "__main__":
    from transcript import fetch_transcript

    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    transcript = fetch_transcript(url)

    if not transcript:
        print("❗ No transcript found for this video. Try another one.")
    else:
        question = "How many times does he say the phrase 'Never gonna give you up' and what are the time stamps for each time?"
        answer = answer_question(transcript, question, url)
        print("\n🧠 Gemini Answer with Hyperlinks:\n")
        print(answer)

# Sample output:
# 🎬 Fetching transcript for video ID: dQw4w9WgXcQ

# 🧠 Gemini Answer with Hyperlinks:

# He says "Never gonna give you up" six times in the video:

# 1. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s" target="_blank">00:43</a>]
# 2. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=85s" target="_blank">01:25</a>]
# 3. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=102s" target="_blank">01:42</a>]
# 4. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=161s" target="_blank">02:41</a>]
# 5. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=178s" target="_blank">02:58</a>]
# 6. [<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=195s" target="_blank">03:15</a>]