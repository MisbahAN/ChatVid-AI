# sectioning.py

import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load Gemini API key from .env file
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Helper: Convert seconds to mm:ss format
def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}" # format minutes and secs to 2-digit form

# Main function to get sectioned summary from transcript
def get_sectioned_summary(transcript: list[dict]) -> list[dict]:
    """
    Uses Gemini to break the transcript into timestamped sections with summaries.

    Args:
        transcript (list[dict]): List of transcript segments with 'text', 'start', 'duration'

    Returns:
        list[dict]: List of sections with 'start', 'end', 'summary'
    """

    # Step 1: Build readable input for Gemini
    combined_text = ""
    for item in transcript:
        start_time = format_time(item["start"])
        combined_text += f"[{start_time}] {item['text']}\n"

    # Step 2: Gemini Prompt
    prompt = f"""
        You are a helpful assistant. Break this video transcript into useful sections.
        Each section should have:
        - a start time
        - an end time
        - a one-sentence summary

        Use this format:
        [
        {{"start": "00:00", "end": "01:15", "summary": "Intro and purpose of video"}},
        ...
        ]

        Transcript:
        {combined_text}
"""

    # Step 3: Ask Gemini
    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)

    try:
        # Remove code block fences like ```json ... ```
        cleaned_output = response.text.replace("```json", "").replace("```", "").strip()
        return eval(cleaned_output)
    except Exception as e:
        print("Error parsing Gemini output:", e)
        print("Raw response:", response.text)
        return []



# ───── Optional Test Code ─────
# Uncomment below to test this file directly by running: python server/sectioning.py

# if __name__ == "__main__":
#     from transcript import fetch_transcript

#     url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
#     transcript = fetch_transcript(url)

#     if not transcript:
#         print("❗ No transcript found for this video. Try another one.")
#     else:
#         sections = get_sectioned_summary(transcript)
#         for sec in sections:
#             print(sec)

# # OUTPUT:
# 🎬 Fetching transcript for video ID: dQw4w9WgXcQ
# {'start': '00:00', 'end': '01:15', 'summary': 'The singer sets the stage, acknowledging a long-standing relationship and expressing a desire for full commitment.'}
# {'start': '01:16', 'end': '01:58', 'summary': "The singer reiterates their feelings and emphasizes their commitment with the 'never gonna' promises."}
# {'start': '01:59', 'end': '02:15', 'summary': "A bridge section emphasizes the 'never gonna give you up' lyric."}
# {'start': '02:16', 'end': '02:31', 'summary': 'The singer recaps the established relationship and the unspoken feelings between them.'}
# {'start': '02:32', 'end': '03:28', 'summary': "The singer restates their feelings and reinforces their commitment with a final series of 'never gonna' promises."}