import google.generativeai as genai
from dotenv import load_dotenv
import os
import re
import httpx
import base64

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

gemini_model = genai.GenerativeModel("gemini-1.5-pro")

def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"

def generate_timestamp_link(video_url: str, timestamp_str: str) -> str:
    try:
        minutes, seconds = map(int, timestamp_str.split(":"))
        total_seconds = minutes * 60 + seconds
        return f"{video_url}&t={total_seconds}s"
    except Exception as e:
        print("❌ Error creating timestamp link:", e)
        return video_url

def hyperlink_timestamps_in_text(answer: str, video_url: str) -> str:
    pattern = r"\b(\d{2}):(\d{2})\b"

    def replacer(match):
        ts = match.group(0)
        link = generate_timestamp_link(video_url, ts)
        return f'<a href="{link}" target="_blank">{ts}</a>'

    return re.sub(pattern, replacer, answer)

def answer_question(transcript: list[dict], question: str, video_url: str) -> str:
    if not transcript:
        return "⚠️ Sorry, this video has no transcript available. Try another video."

    def format_chunk(items):
        return "\n".join(f"[{format_time(i['start'])}] {i['text']}" for i in items)

    def chunk_transcript(transcript, max_chars=5000):
        chunks, current_chunk, current_len = [], [], 0

        for item in transcript:
            line = f"[{format_time(item['start'])}] {item['text']}\n"
            if current_len + len(line) > max_chars:
                chunks.append(current_chunk)
                current_chunk, current_len = [], 0
            current_chunk.append(item)
            current_len += len(line)

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    chunks = chunk_transcript(transcript)
    print(f"💬 Q&A split into {len(chunks)} chunk(s)")

    model = genai.GenerativeModel("gemini-1.5-pro")
    best_answer = ""
    most_timestamps = 0

    for i, chunk in enumerate(chunks):
        chunk_text = format_chunk(chunk)
        prompt = f"""
            You are a helpful assistant answering questions about a YouTube video.
            Use only the transcript below. Include timestamps in MM:SS format when relevant.

            Transcript:
            {chunk_text}

            Question: {question}
            Answer:
        """
        try:
            response = model.generate_content(prompt)
            answer = response.text.strip()
            timestamp_count = len(re.findall(r"\b\d{2}:\d{2}\b", answer))

            if timestamp_count > most_timestamps:
                best_answer = answer
                most_timestamps = timestamp_count

        except Exception as e:
            print(f"⚠️ Error answering chunk {i}: {e}")

    return hyperlink_timestamps_in_text(best_answer or "Sorry, I couldn't find a good answer.", video_url)

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
