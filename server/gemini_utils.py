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
#    - httpx: Async HTTP client for async Gemini calls
#    - base64: Image encoding for inline data

import google.generativeai as genai
from dotenv import load_dotenv
import os
import re
import httpx
import base64



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



# 8. async_analyze_image(frame_path, client)
#    - Sends image + prompt to Gemini via POST request
#    - Uses Gemini's v1beta API for async image analysis
#    - Returns text description from response

async def async_analyze_image(frame_path: str, client: httpx.AsyncClient) -> str:
    with open(frame_path, "rb") as img_file:
        image_data = base64.b64encode(img_file.read()).decode("utf-8")

    response = await client.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        params={"key": os.getenv("GEMINI_API_KEY")},
        json={
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": image_data
                            }
                        },
                        {"text": "Describe this frame briefly."}
                    ]
                }
            ]
        },
        headers={"Content-Type": "application/json"}
    )

    if response.status_code != 200:
        print(f"⚠️ Error analyzing frame {frame_path}: {response.text}")
        return "Error"

    result = response.json()
    try:
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except:
        print(f"❌ Failed to parse Gemini response: {result}")
        return "Error"



# 9. Optional Test Block
#    - Lets you run this file directly to test transcript QA flow

# if __name__ == "__main__":
#     from transcript import fetch_transcript
#
#     url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
#     transcript = fetch_transcript(url)
#
#     if not transcript:
#         print("❗ No transcript found for this video. Try another one.")
#     else:
#         question = "How many times does he say the phrase 'Never gonna give you up' and what are the time stamps for each time?"
#         answer = answer_question(transcript, question, url)
#         print("\n🧠 Gemini Answer with Hyperlinks:\n")
#         print(answer)

# Sample output:
