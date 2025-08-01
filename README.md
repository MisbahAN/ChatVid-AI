<p align="center">
  <img src="client/public/ChatVid-AI.ico" alt="ChatVid AI Logo" width="80" />
</p>

# ChatVid AI

ChatVid AI is a multimodal, Gemini-powered video analysis system that lets you interact with YouTube videos like never before. Paste a link, ask questions, get timestamped breakdowns, and even search for visual content within the video — all using Google's Gemini API and multimodal RAG techniques.

## 📺 Watch Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=sXbELuNLJMM" target="_blank">
    <img src="https://img.youtube.com/vi/sXbELuNLJMM/0.jpg" alt="Watch Demo" width="560"/>
  </a>
</p>

## 🌟 Features

- 🔗 **Paste YouTube Link** – Upload any public YouTube URL
- 🧠 **Chat with the Video** – Ask questions like "What's happening at 1:23?" or "Summarize the ending"
- 🕓 **Timestamped Summaries** – Get structured section breakdowns with clickable timestamps
- 🔍 **Visual Search** – Ask queries like "Where's the red car?" and get frames + timestamps
- 🧠 **Gemini RAG + Embeddings** – Uses Gemini's multimodal capabilities for captioning, retrieval, and generation
- 🔐 **User-Passed API Key** – API key is provided by the user via the frontend for privacy and scalability
- 🎨 **Elegant Pistachio Theme** – Beautiful, modern UI with smooth animations, glassmorphism effects, and responsive design

## ⚙️ Tech Stack

| Layer          | Tool / Library                                       |
| -------------- | ---------------------------------------------------- |
| **Backend**    | Python, FastAPI, youtube-transcript-api, Gemini SDK  |
| **Frontend**   | Next.js, TypeScript, Tailwind CSS, Custom CSS       |
| **UI/UX**      | Pistachio theme, Glassmorphism, Smooth animations    |
| **LLM**        | Gemini API (text, image, video understanding)        |
| **Embeddings** | Gemini multimodal embedding API                      |
| **Retrieval**  | In-memory vector matching (cosine similarity, no DB) |

## 🛠 Project Structure

```
ChatVid-AI/
├── server/                   # Python backend (FastAPI)
│   ├── main.py               # FastAPI routes and server setup
│   ├── transcript.py         # YouTube transcript extraction
│   ├── gemini_utils.py       # Gemini API integration for chat, embeddings, and RAG functionality
│   ├── sectioning.py         # Video section analysis and timestamp generation
│   ├── visual_search.py      # Frame extraction and visual content search
│   └── frames/               # Temporary storage for video frames
├── client/                   # Next.js frontend (TypeScript + Tailwind)
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout with metadata and global styles
│   │   ├── page.tsx          # Home page with pistachio theme: YouTube URL + API Key input
│   │   └── chat/             # Chat interface route
│   │       └── page.tsx      # Video player + multi-panel chat interface with pistachio theme
│   ├── components/           # Reusable React components
│   │   ├── ChatBox.tsx       # Multi-panel chat interface with pistachio theme, visual search, and animations
│   │   ├── SectionList.tsx   # Timestamped video sections with hover effects and inline styling
│   │   ├── VideoPlayer.tsx   # YouTube player component
│   ├── lib/                  # Utility functions and API clients
│   ├── public/               # Static assets (logos, architecture diagrams)
│   ├── styles/               # Global styles with pistachio theme variables and custom effects
│   ├── next-env.d.ts         # TypeScript environment declaration file
│   ├── next.config.js        # Next.js configuration
│   ├── package-lock.json     # Dependency lock file
│   ├── package.json          # Frontend dependencies and scripts
│   ├── postcss.config.js     # PostCSS configuration
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   └── tsconfig.json         # TypeScript configuration
├── .gitignore                # Git ignore rules
├── requirements.txt          # Python dependencies
└── README.md                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- Gemini API key

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
   source venv/Scripts/activate
   ```

3. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   cd server
   ```

4. **Run the backend server**
   ```bash
   # Make sure you're in the server directory
   uvicorn main:app --reload --port 8000
   ```
   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Install Node.js dependencies**

   ```bash
   # Navigate to the client directory
   cd client

   # Install dependencies. Ensure that the necessary configuration files (next-env.d.ts, next.config.js, postcss.config.js, tailwind.config.ts, tsconfig.json) are present in the 'client' directory from the repository clone. The 'npm install' command reads the package.json file, installs the required packages, and generates the package-lock.json file.
   npm install
   ```

2. **Run the frontend development server**
   ```bash
   # Make sure you're in the client directory
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`

### File Structure and Responsibilities

#### Backend Files (`/server`)

- `main.py`: FastAPI application setup, route definitions, and API endpoints
- `transcript.py`: Handles YouTube video transcript extraction
- `gemini_utils.py`: Gemini API integration for chat, embeddings, and RAG functionality
- `sectioning.py`: Video content analysis and timestamped section generation
- `visual_search.py`: Frame extraction and visual content search implementation
- `frames/`: Temporary storage directory for extracted video frames

#### Frontend Files (`/client`)

- `app/`: Next.js 13+ app directory containing page components and layouts
  - `layout.tsx`: Root layout with metadata and global styles
  - `page.tsx`: Home page with YouTube URL and API key input
  - `chat/page.tsx`: Video player and chat interface
- `components/`: Reusable React components
  - `ChatBox.tsx`: Multi-panel chat interface with pistachio theme, visual search, Q&A chat, and smooth animations
  - `SectionList.tsx`: Displays timestamped video sections with hover effects and inline timestamp styling
  - `VideoPlayer.tsx`: YouTube player component
- `lib/`: Utility functions and API clients for backend communication
- `public/`: Static assets including logos and architecture diagrams
- `styles/`: Global styles with pistachio theme variables, glassmorphism effects, and custom scrollbars
- Configuration files:
  - `next-env.d.ts`: TypeScript environment declaration file
  - `next.config.js`: Next.js configuration
  - `package-lock.json`: Dependency lock file
  - `package.json`: Frontend dependencies and scripts
  - `postcss.config.js`: PostCSS configuration
  - `tailwind.config.ts`: Tailwind CSS configuration
  - `tsconfig.json`: TypeScript configuration

## 🧠 How It Works

| Step                  | Tech / API used                                  |
| --------------------- | ------------------------------------------------ |
| Transcript Extraction | youtube-transcript-api                           |
| Section Breakdown     | Gemini (text generation on transcript)           |
| Chat with Video (RAG) | Gemini (text generation with transcript context) |
| Visual Search         | Gemini's frame embedding + cosine similarity     |

### Backend Components

- **main.py**: FastAPI routes for video processing, chat, and visual search
- **transcript.py**: Handles YouTube video transcript extraction
- **gemini_utils.py**: Manages Gemini API interactions for chat, embeddings, and RAG functionality
- **sectioning.py**: Analyzes video content and generates timestamped sections
- **visual_search.py**: Extracts frames and performs visual content search

### Frontend Flow

1. **URL Input** (`/`):

   - Elegant pistachio-themed YouTube URL input form with glassmorphism effects
   - Gemini API key setup with floating animations (stored in localStorage)
   - Smooth transitions and hover effects
   - Redirects to chat page with video ID

2. **Chat Interface** (`/chat`):
   - Embedded YouTube player with responsive design
   - Three-panel layout with pistachio gradient backgrounds
   - Section summaries with animated timestamps and hover effects
   - Chat input for video questions with smooth interactions
   - Visual search input for frame queries with elegant styling

## 🗺️ Roadmap

### ✅ Phase 1: Backend (Completed)

- [x] Extract transcript from YouTube link
- [x] Generate Gemini-based section summaries with timestamps
- [x] Implement chat with video using RAG (retrieve + generate)
- [x] Visual scene search: embed frames and match with user text

### ✅ Phase 2: Frontend (Completed)

- [x] Project Setup: Next.js + TypeScript + Tailwind CSS
- [x] User Inputs: YouTube URL + Gemini API Key
- [x] Video Display + Section Summaries
- [x] Chat Interface (Transcript Q&A)
- [x] Visual Search (Semantic Frame Search)

### 🧪 Future Enhancements

- [x] Crazy good UI Design (Pistachio theme with glassmorphism completed)
- [ ] Deploy on vercel to misbahan.com
- [ ] Loading states and error handling
- [ ] Chat history persistence
- [ ] Speaker detection
- [ ] Frame thumbnails preview
- [ ] Upload local MP4 videos
- [ ] Export highlights / timestamps
- [ ] Cross-video multimodal search

## 👨‍💻 Author

**Misbah Ahmed Nauman**

- 🌐 [Portfolio](https://misbahan.com)
- 🛠️ Built during Headstarter SWE Residency Sprint 2
