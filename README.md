# 🎬 ChatVid AI

**ChatVid AI** — talk to your videos like they've got something to say. *(Because they do.)*

ChatVid AI is a multimodal, Gemini-powered video analysis system that lets you interact with YouTube videos like never before. Paste a link, ask questions, get timestamped breakdowns, and even search for visual content within the video — all using Google's Gemini API and multimodal RAG techniques.

## 🌟 Features

- 🔗 **Paste YouTube Link** – Upload any public YouTube URL
- 🧠 **Chat with the Video** – Ask questions like "What's happening at 1:23?" or "Summarize the ending"
- 🕓 **Timestamped Summaries** – Get structured section breakdowns with clickable timestamps
- 🔍 **Visual Search** – Ask queries like "Where's the red car?" and get frames + timestamps
- 🧠 **Gemini RAG + Embeddings** – Uses Gemini's multimodal capabilities for captioning, retrieval, and generation
- 🔐 **User-Passed API Key** – API key is provided by the user via the frontend for privacy and scalability

## ⚙️ Tech Stack

| Layer          | Tool / Library                                         |
|----------------|--------------------------------------------------------|
| **Backend**    | Python, FastAPI, youtube-transcript-api, Gemini SDK   |
| **LLM**        | Gemini API (text, image, video understanding)          |
| **Embeddings** | Gemini multimodal embedding API                        |
| **Retrieval**  | In-memory vector matching (cosine similarity, no DB)   |
| **Proxy**      | Webshare rotating proxy (for YouTube transcript API)   |

## 🛠 Project Structure

```
ChatVid-AI/
├── server/                 # Python backend (FastAPI)
│   ├── main.py            # FastAPI application entry point
│   ├── transcript.py      # YouTube transcript extraction
│   ├── gemini_utils.py    # Gemini prompt logic for chat, RAG, visual search
│   ├── sectioning.py      # Timestamp-based summaries
│   ├── visual_search.py   # Visual content query logic (WIP)
│   ├── requirements.txt   # Python dependencies
│   └── .env              # (ignored) local Gemini key for testing
├── frontend/              # (later)
│   ├── pages/            # Next.js pages
│   ├── components/       # React components
│   ├── public/          # Static assets
│   └── (Next.js setup)
├── .gitignore            # Git ignore rules for Python
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
   cd ChatVid-AI/server
   ```

2. **Create and activate virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
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
   uvicorn main:app --reload
   ```

## 🧠 How It Works

| Step | Tech / API used |
|------|-----------------|
| Transcript Extraction | youtube-transcript-api + WebshareProxyConfig |
| Section Breakdown | Gemini's video understanding API |
| Chat with Video (RAG) | Gemini's text generation + cosine similarity on embedded chunks |
| Visual Search | Gemini's frame embedding + cosine similarity (planned) |

## 🗺️ Roadmap

### ✅ Phase 1: Backend (Current)
- [ ] Extract transcript from YouTube link
- [ ] Generate Gemini-based section summaries with timestamps
- [ ] Implement chat with video using RAG (retrieve + generate)
- [ ] Visual scene search: embed frames and match with user text

### 🔜 Phase 2: Frontend (Coming Soon)
- [ ] Simple web interface for video interaction
- [ ] Embed YouTube player
- [ ] Show timestamped sections + summaries
- [ ] Chat interface with answer + linked timestamp
- [ ] Visual content query input + frame results

### 🧪 Future Plans
- [ ] Upload local MP4 videos
- [ ] Add speaker detection (e.g., "Speaker A", "Speaker B")
- [ ] Save and display past chats per session
- [ ] Export highlights / timestamps
- [ ] Cross-video multimodal search

## 🔒 API Keys & Limits

- Users must provide their own Gemini API key via the frontend
- YouTube transcript API calls may require residential rotating proxies due to IP bans — Webshare is integrated in transcript.py

## 👨‍💻 Author

**Misbah Ahmed Nauman**
- 🌐 [Portfolio](https://misbahan.com)
- 🛠️ Built during Headstarter SWE Residency Sprint 2