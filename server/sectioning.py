import google.generativeai as genai
from gemini_utils import generate_timestamp_link


def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"


def get_sectioned_summary(video_url: str, api_key: str):
    """
    1) Fetch transcript (cached via transcript.py).
    2) Configure Gemini with the provided api_key.
    3) Chunk transcript lines and prompt Gemini for section summaries.
    4) Return a list of {start, end, summary, link} dictionaries.
    """
    from transcript import fetch_transcript

    transcript = fetch_transcript(video_url)
    print(f"DEBUG: Transcript length in /sections: {len(transcript)}")
    print(f"DEBUG: First 2 segments: {transcript[:2]}")

    if not transcript:
        print("❌ No transcript found. Skipping Gemini sectioning.")
        return [{"error": "No transcript available for this video."}]

    # 1) Configure Gemini with the key from frontend
    genai.configure(api_key=api_key)
    print(f"🔎 Prompting Gemini for section summaries... ({len(transcript)} segments)")

    # Build lines like "[00:10] Some text"
    lines = [f"[{format_time(item['start'])}] {item['text']}" for item in transcript]

    def chunk_lines(lines, max_chars=7000):
        chunks, current_chunk = [], []
        current_len = 0
        for line in lines:
            if current_len + len(line) > max_chars:
                chunks.append("\n".join(current_chunk))
                current_chunk, current_len = [], 0
            current_chunk.append(line)
            current_len += len(line)
        if current_chunk:
            chunks.append("\n".join(current_chunk))
        return chunks

    text_chunks = chunk_lines(lines)
    print(f"🧠 Splitting transcript into {len(text_chunks)} chunk(s) for Gemini")

    model = genai.GenerativeModel("gemini-1.5-pro")
    all_sections = []

    for i, chunk in enumerate(text_chunks):
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
        - Prioritize logical and thematic boundaries when splitting the transcript (e.g., new topic, question, or segment).
        - Avoid over‐segmenting long videos; prefer fewer, more meaningful sections.
        - For a 10‐minute video, return around 3–5 sections.
        - For a 30‐minute video, return around 6–10 sections.
        - For a 1‐hour video, return around 8–15 sections.
        - For a 2‐hour video, return around 10–18 sections.
        - Typical section length should be 3–6 minutes, but allow longer if the topic continues.
        - Do not create sections shorter than 1 minute, unless there's a clear transition.

        Use this format:
        [
        {{"start": "00:00", "end": "01:15", "summary": "Intro and purpose of video"}},
        ...
        ]

        Transcript:
        {chunk}
        """
        try:
            response = model.generate_content(prompt)
            cleaned = response.text.replace("```json", "").replace("```", "").strip()
            parsed = eval(cleaned)  # Expecting a Python‐parsable list of dicts
            all_sections.extend(parsed)
        except Exception as e:
            print(f"❌ Gemini error on chunk {i}: {e}")
            print("Raw response:", getattr(response, "text", "<no response>"))
            continue

    # Attach clickable timestamp link to each section
    for section in all_sections:
        section["link"] = generate_timestamp_link(video_url, section["start"])

    return all_sections
