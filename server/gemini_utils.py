# This module contains helper utilities for working with Gemini and YouTube:
# - Formatting time
# - Generating timestamped YouTube links
# - Embedding hyperlinks in Gemini's output
# - Answering questions using the transcript via Gemini
# - Embedding images using Gemini multimodal embedding



# 1. Imports
#    - genai: Gemini API access
#    - dotenv + os: Load Gemini API key from environment
#    - re: Regex for timestamp hyperlinking

import google.generativeai as genai
from dotenv import load_dotenv
import os
import re



# 2. Load API Key and Configure Gemini

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))



# 3. Gemini Model Setup
#    - Uses multimodal model (supports text + image)

gemini_model = genai.GenerativeModel("gemini-1.5-pro")



# 4. format_time(seconds)
#    - Converts float seconds to mm:ss format

def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"



# 5. generate_timestamp_link(video_url, timestamp_str)
#    - Converts "mm:ss" timestamp into YouTube link with t= param

def generate_timestamp_link(video_url: str, timestamp_str: str) -> str:
    try:
        minutes, seconds = map(int, timestamp_str.split(":"))
        total_seconds = minutes * 60 + seconds
        return f"{video_url}&t={total_seconds}s"
    except Exception as e:
        print("❌ Error creating timestamp link:", e)
        return video_url



# 6. hyperlink_timestamps_in_text(answer, video_url)
#    - Finds all mm:ss timestamps in string and replaces them with YouTube hyperlinks

def hyperlink_timestamps_in_text(answer: str, video_url: str) -> str:
    pattern = r"\b(\d{2}):(\d{2})\b"

    def replacer(match):
        ts = match.group(0)
        link = generate_timestamp_link(video_url, ts)
        return f'<a href="{link}" target="_blank">{ts}</a>'

    return re.sub(pattern, replacer, answer)



# 7. answer_question(transcript, question, video_url)
#    - Builds context from transcript and asks Gemini to answer user query
#    - Hyperlinks timestamps in response

def answer_question(transcript: list[dict], question: str, video_url: str) -> str:
    context = ""
    for item in transcript:
        start_time = format_time(item["start"])
        context += f"[{start_time}] {item['text']}\n"

    prompt = f"""
        You are a helpful assistant answering questions about a YouTube video.
        Use only the transcript below. Try to include the timestamp of relevant parts in your answer.

        Transcript:
        {context}

        Question: {question}
        Answer:
    """

    response = gemini_model.generate_content(prompt)
    answer = response.text.strip()
    return hyperlink_timestamps_in_text(answer, video_url)



# 8. analyze_image(image_path, prompt)
#    - Sends image + prompt to Gemini and returns text response

def analyze_image(image_path: str, prompt: str) -> str:
    try:
        with open(image_path, "rb") as img_file:
            image_bytes = img_file.read()

        image_part = {
            "mime_type": "image/jpeg",
            "data": image_bytes
        }

        response = gemini_model.generate_content(
            contents=[
                {"role": "user", "parts": [image_part, {"text": prompt}]}
            ]
        )

        return response.text.strip()

    except Exception as e:
        print(f"❌ Error analyzing {image_path}: {e}")
        return None



# 9. Optional Test Block
#    - Lets you run this file directly to test transcript QA flow

# if __name__ == "__main__":
#     from transcript import fetch_transcript

#     url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
#     transcript = fetch_transcript(url)

#     if not transcript:
#         print("❗ No transcript found for this video. Try another one.")
#     else:
#         question = "How many times does he say the phrase 'Never gonna give you up' and what are the time stamps for each time?"
#         answer = answer_question(transcript, question, url)
#         print("\n🧠 Gemini Answer with Hyperlinks:\n")
#         print(answer)

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