# This script takes a YouTube video transcript and sends it to Gemini
# to generate timestamped section summaries. The output includes:
# - start & end times
# - short section summaries
# - clickable timestamp links

# 1. Imports & Configuration
#    - genai: Gemini API
#    - generate_timestamp_link: adds clickable timestamp to section
import google.generativeai as genai
from gemini_utils import generate_timestamp_link

# 2. format_time(seconds)
#    - Converts float seconds to MM:SS string format
def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"

# 3. get_sectioned_summary(transcript, video_url, api_key)
#    - Prompts Gemini to return section summaries with timestamps
#    - Adds YouTube timestamp links using start times
def get_sectioned_summary(video_url: str, api_key: str):
    from transcript import fetch_transcript  # keep import here to avoid circular import issues
    transcript = fetch_transcript(video_url)

    genai.configure(api_key=api_key)  # ✅ dynamically configure Gemini with user key

    combined_text = ""
    print(f"🔎 Prompting Gemini for section summaries... ({len(transcript)} segments)")

    for item in transcript:
        start_time = format_time(item["start"])
        combined_text += f"[{start_time}] {item['text']}\n"

    if len(combined_text) > 25000:
        print("⚠️ Transcript is very long. Consider splitting into smaller chunks later.")

    prompt = f"""
        SYSTEM INSTRUCTION:
        You are a helpful assistant that chunks YouTube video transcripts into useful summaries.
        Always follow the user's format and constraints exactly.
        Prefer longer coherent sections over frequent short ones.
        Do not return more sections than what is explicitly allowed.
        Avoid creating short fragments unless the topic changes.

        USER REQUEST:
        Break this video transcript into meaningful sections.

        Each section should have:
        - a start time
        - an end time
        - a 3–6 word summary of what’s going on

        Constraints:
        - Return about 3–5 sections for a 10-minute video
        - Return about 15–20 for a 1-hour video
        - Sections should be around 1–3 minutes each
        - Don’t create sections shorter than 30 seconds unless absolutely needed

        Use this format:
        [
        {{"start": "00:00", "end": "01:15", "summary": "Intro and purpose of video"}},
        ...
        ]

        Transcript:
        {combined_text}
    """

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)

    try:
        cleaned_output = response.text.replace("```json", "").replace("```", "").strip()
        parsed_sections = eval(cleaned_output)

        for section in parsed_sections:
            section["link"] = generate_timestamp_link(video_url, section["start"])

        return parsed_sections

    except Exception as e:
        print("Error parsing Gemini output:", e)
        print("Raw response:", response.text)
        return []



# 4. Optional test block
#    - Allows you to run this file standalone to test Gemini summarization

# if __name__ == "__main__":
#     from transcript import fetch_transcript

#     url = "https://www.youtube.com/watch?v=LxvErFkBXPk"
#     transcript = fetch_transcript(url)

#     print("✅ Transcript fetched?", bool(transcript))
#     print("📄 Length:", len(transcript))
#     if transcript:
#         print("🧪 First segment:", transcript[0])

#     if not transcript:
#         print("❗ No transcript found for this video. Try another one.")
#     else:
#         sections = get_sectioned_summary(transcript, url)
#         for sec in sections:
#             print(sec)

# OUTPUT:
# 🎬 Fetching transcript for video ID: LxvErFkBXPk
# ✅ Transcript fetched? True
# 📄 Length: 209
# 🧪 First segment: {'text': '[MUSIC PLAYING]', 'start': 0.0, 'duration': 2.79}
# 🔎 Prompting Gemini for section summaries... (209 segments)
# {'start': '00:00', 'end': '01:18', 'summary': 'Gemini 2.5 Pro introduction', 'link': 'https://www.youtube.com/watch?v=LxvErFkBXPk&t=0s'}
# {'start': '01:18', 'end': '03:33', 'summary': 'New AI Platform and Features', 'link': 'https://www.youtube.com/watch?v=LxvErFkBXPk&t=78s'}
# {'start': '03:33', 'end': '05:22', 'summary': 'Gemini Flash, Diffusion and Search', 'link': 'https://www.youtube.com/watch?v=LxvErFkBXPk&t=213s'}
# {'start': '05:22', 'end': '07:44', 'summary': 'AI Mode in Search and Shopping', 'link': 'https://www.youtube.com/watch?v=LxvErFkBXPk&t=322s'}
# {'start': '07:44', 'end': '09:56', 'summary': 'SynthID, Flow, Android XR, Closing', 'link': 'https://www.youtube.com/watch?v=LxvErFkBXPk&t=464s'}