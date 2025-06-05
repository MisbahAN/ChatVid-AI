from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import asyncio
from fastapi.middleware.cors import CORSMiddleware

from transcript import fetch_transcript
from sectioning import get_sectioned_summary
from gemini_utils import answer_question
from visual_search import extract_frames, process_all_frames_async, semantic_search


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to your frontend’s origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptRequest(BaseModel):
    video_url: str


class SectionsRequest(BaseModel):
    video_url: str
    api_key: str  # Passed from frontend


class QuestionRequest(BaseModel):
    video_url: str
    question: str
    api_key: str  # Passed from frontend


class VisualSearchRequest(BaseModel):
    video_url: str
    query: str
    api_key: str  # Passed from frontend


@app.post("/transcript")
def get_transcript(req: TranscriptRequest):
    """
    Returns cached (or freshly fetched) transcript JSON.
    """
    return fetch_transcript(req.video_url)


@app.post("/sections")
def get_sections(req: SectionsRequest):
    """
    Returns timestamped section summaries from Gemini.
    Requires: video_url, api_key (from frontend).
    """
    return get_sectioned_summary(req.video_url, req.api_key)


@app.post("/question")
def ask_question(req: QuestionRequest):
    """
    Returns a natural‐language answer (with timestamp hyperlinks) from Gemini.
    Requires: video_url, question, api_key.
    """
    transcript = fetch_transcript(req.video_url)
    return answer_question(transcript, req.question, req.video_url, req.api_key)


@app.post("/visual-search")
async def visual_search_route(req: VisualSearchRequest):
    """
    1) Extract frames from the video.
    2) Run Gemini image analysis + embedding on each frame.
    3) Run cosine‐similarity search with the embedded query.
    Requires: video_url, query, api_key.
    """
    # 1) Extract one frame every 5s
    extract_frames(req.video_url, interval=5)

    # 2) Analyze & embed all frames asynchronously
    frames = await process_all_frames_async("frames", req.api_key)

    # 3) Perform semantic search
    result = semantic_search(req.query, frames, req.api_key)
    return result
