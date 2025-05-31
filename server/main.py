# This is the main FastAPI app for the backend.
# It exposes routes to:
# - Fetch YouTube transcript
# - Get timestamped section summaries using Gemini
# - Answer natural language questions about a video
# - Perform visual semantic search on extracted frames



# 1. Imports
#    - fastapi, pydantic: API setup and request validation
#    - typing: For defining list-based request structures
#    - asyncio: Required for async visual search
#    - project modules: transcript, sectioning, gemini_utils, visual_search

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel



from transcript import fetch_transcript
from sectioning import get_sectioned_summary
from gemini_utils import answer_question
from visual_search import extract_frames, process_all_frames_async, semantic_search



# 2. App Initialization

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"] to be stricter
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class SectionsRequest(BaseModel):
    video_url: str
    api_key: str



# 3. Request Schemas
#    - TranscriptRequest: Only video URL
#    - QuestionRequest: Video URL + user question
#    - VisualSearchRequest: Video URL + visual search query

class TranscriptRequest(BaseModel):
    video_url: str

class QuestionRequest(BaseModel):
    video_url: str
    question: str

class VisualSearchRequest(BaseModel):
    video_url: str
    query: str



# 4. POST /transcript
#    - Fetches raw transcript from YouTube using youtube-transcript-api

@app.post("/transcript")
def get_transcript(req: TranscriptRequest):
    return fetch_transcript(req.video_url)



# 5. POST /sections
#    - Returns timestamped section summaries using Gemini

@app.post("/sections")
def get_sections(req: SectionsRequest):
    return get_sectioned_summary(req.video_url, req.api_key)




# 6. POST /question
#    - Answers user’s question based on the full transcript context

@app.post("/question")
def ask_question(req: QuestionRequest):
    transcript = fetch_transcript(req.video_url)
    return answer_question(transcript, req.question, req.video_url)



# 7. POST /visual-search
#    - Extracts video frames → describes and embeds them → returns closest match to user’s query

@app.post("/visual-search")
async def visual_search_route(req: VisualSearchRequest):
    extract_frames(req.video_url, interval=5)
    frames = await process_all_frames_async("frames")
    result = semantic_search(req.query, frames)
    return result
