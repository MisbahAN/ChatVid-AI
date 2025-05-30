# 🎬 ChatVid AI

**ChatVid AI** — talk to your videos like they've got something to say. _(Because they do.)_

ChatVid AI is a multimodal, Gemini-powered video analysis system that lets you interact with YouTube videos like never before. Paste a link, ask questions, get timestamped breakdowns, and even search for visual content within the video — all using Google's Gemini API and multimodal RAG techniques.

## 🌟 Features

- 🔗 **Paste YouTube Link** – Upload any public YouTube URL
- 🧠 **Chat with the Video** – Ask questions like "What's happening at 1:23?" or "Summarize the ending"
- 🕓 **Timestamped Summaries** – Get structured section breakdowns with clickable timestamps
- 🔍 **Visual Search** – Ask queries like "Where's the red car?" and get frames + timestamps
- 🧠 **Gemini RAG + Embeddings** – Uses Gemini's multimodal capabilities for captioning, retrieval, and generation
- 🔐 **User-Passed API Key** – API key is provided by the user via the frontend for privacy and scalability

## ⚙️ Tech Stack

| Layer          | Tool / Library                                       |
| -------------- | ---------------------------------------------------- |
| **Backend**    | Python, FastAPI, youtube-transcript-api, Gemini SDK  |
| **Frontend**   | Next.js, TypeScript, Tailwind CSS                    |
| **LLM**        | Gemini API (text, image, video understanding)        |
| **Embeddings** | Gemini multimodal embedding API                      |
| **Retrieval**  | In-memory vector matching (cosine similarity, no DB) |
| **Proxy**      | Webshare rotating proxy (for YouTube transcript API) |

## 🛠 Project Structure

```
ChatVid-AI/
├── server/                # Python backend (FastAPI)
│   ├── main.py           # FastAPI routes and server setup
│   ├── transcript.py     # YouTube transcript extraction with proxy support
│   ├── gemini_utils.py   # Gemini API integration for chat and RAG
│   ├── sectioning.py     # Video section analysis and timestamp generation
│   ├── visual_search.py  # Frame extraction and visual content search
│   ├── frames/          # Temporary storage for video frames
│   └── .env             # (ignored) local Gemini key for testing
├── frontend/             # Next.js frontend (TypeScript + Tailwind)
│   ├── pages/           # Next.js pages
│   │   ├── index.tsx    # YouTube URL input + API key setup
│   │   └── chat.tsx     # Video player + chat interface
│   ├── components/      # React components
│   ├── public/          # Static assets
│   └── (Next.js setup)
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Gemini API key
- (Optional) Webshare proxy account for YouTube transcript API

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MisbahAN/ChatVid-AI.git
   cd ChatVid-AI
   ```

2. **Create and activate virtual environment**
   ```bash
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate

   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the server directory:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   ```

5. **Run the server**
   ```bash
   cd server
   uvicorn main:app --reload
   ```

## 🧠 How It Works

| Step                  | Tech / API used                                                 |
| --------------------- | --------------------------------------------------------------- |
| Transcript Extraction | youtube-transcript-api + WebshareProxyConfig                    |
| Section Breakdown     | Gemini's video understanding API                                |
| Chat with Video (RAG) | Gemini's text generation + cosine similarity on embedded chunks |
| Visual Search         | Gemini's frame embedding + cosine similarity                    |

### Backend Components

- **main.py**: FastAPI routes for video processing, chat, and visual search
- **transcript.py**: Handles YouTube video transcript extraction with proxy support
- **gemini_utils.py**: Manages Gemini API interactions for chat and RAG
- **sectioning.py**: Analyzes video content and generates timestamped sections
- **visual_search.py**: Extracts frames and performs visual content search

### Frontend Flow

1. **URL Input** (`/`):
   - YouTube URL input form
   - Gemini API key setup (stored in localStorage)
   - Redirects to chat page with video ID

2. **Chat Interface** (`/chat`):
   - Embedded YouTube player
   - Section summaries with timestamps
   - Chat input for video questions
   - Visual search input for frame queries

## 🗺️ Roadmap

### ✅ Phase 1: Backend (Completed)
- [x] Extract transcript from YouTube link
- [x] Generate Gemini-based section summaries with timestamps
- [x] Implement chat with video using RAG (retrieve + generate)
- [x] Visual scene search: embed frames and match with user text

### 🔜 Phase 2: Frontend (In Progress)
- [ ] Project Setup: Next.js + TypeScript + Tailwind CSS
- [ ] User Inputs: YouTube URL + Gemini API Key
- [ ] Video Display + Section Summaries
- [ ] Chat Interface (Transcript Q&A)
- [ ] Visual Search (Semantic Frame Search)

### 🧪 Future Enhancements
- [ ] Loading states and error handling
- [ ] Chat history persistence
- [ ] Speaker detection
- [ ] Frame thumbnails preview
- [ ] Upload local MP4 videos
- [ ] Export highlights / timestamps
- [ ] Cross-video multimodal search

## 🔒 API Keys & Limits

- Users must provide their own Gemini API key via the frontend
- YouTube transcript API calls may require residential rotating proxies due to IP bans — Webshare is integrated in transcript.py

## 👨‍💻 Author

**Misbah Ahmed Nauman**
- 🌐 [Portfolio](https://misbahan.com)
- 🛠️ Built during Headstarter SWE Residency Sprint 2
