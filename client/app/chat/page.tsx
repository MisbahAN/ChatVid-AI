"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import ChatBox from "@/components/ChatBox";

type Section = {
  start: string;
  end: string;
  summary: string;
  error?: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoUrlParam = searchParams.get("videoUrl") || "";

  const [videoId, setVideoId] = useState<string | null>(null);
  const [currentStartSec, setCurrentStartSec] = useState<number>(0);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!videoUrlParam) {
      setVideoId(null);
      return;
    }
    try {
      const parsed = new URL(videoUrlParam);
      let id: string | null = null;
      if (parsed.hostname.includes("youtu.be")) {
        id = parsed.pathname.slice(1);
      } else if (
        parsed.hostname.includes("youtube.com") ||
        parsed.hostname.includes("www.youtube.com")
      ) {
        id = parsed.searchParams.get("v");
      }
      setVideoId(id);
    } catch {
      setVideoId(null);
    }
    setCurrentStartSec(0);
  }, [videoUrlParam]);

  useEffect(() => {
    async function fetchSections() {
      if (!videoUrlParam) return;
      setLoadingSections(true);
      setHasError(false);
      try {
        const geminiKey = localStorage.getItem("GEMINI_API_KEY") || "";
        const res = await fetch("http://localhost:8000/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_url: videoUrlParam,
            api_key: geminiKey,
          }),
        });
        if (!res.ok) {
          console.error("Failed to fetch sections:", await res.text());
          setSections([]);
          setHasError(true);
          return;
        }
        const data: Section[] = await res.json();
        
        if (data.length > 0 && data[0].error) {
          console.error("Backend error:", data[0].error);
          setSections([]);
          setHasError(true);
        } else {
          setSections(data);
          setHasError(false);
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
        setSections([]);
        setHasError(true);
      } finally {
        setLoadingSections(false);
      }
    }
    fetchSections();
  }, [videoUrlParam]);

  function handleTimestampClick(start: number) {
    setCurrentStartSec(start);
  }

  function handleGoHome() {
    router.push("/");
  }

  if (!videoUrlParam || !videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center pistachio-gradient">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-text">
            Invalid or missing video URL. Go back and enter a valid YouTube URL.
          </p>
          <button 
            onClick={handleGoHome}
            className="error-btn"
          >
            Go Home
          </button>
        </div>
        
        <style jsx>{`
          .pistachio-gradient {
            background: linear-gradient(135deg, #f5f7f0 0%, #e8f0e8 50%, #dde8d8 100%);
            position: relative;
            overflow: hidden;
          }

          .pistachio-gradient::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 20% 20%, rgba(147, 181, 156, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(160, 188, 165, 0.1) 0%, transparent 50%);
            pointer-events: none;
          }

          .error-container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(15px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 15px 35px rgba(134, 174, 146, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            animation: slideUp 0.6s ease-out;
          }

          @keyframes slideUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
          }

          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }

          .error-text {
            color: #2d5a3d;
            font-size: 18px;
            margin-bottom: 25px;
            line-height: 1.5;
          }

          .error-btn {
            background: linear-gradient(145deg, #6b9b76, #5a8a65);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(107, 155, 118, 0.3);
          }

          .error-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(107, 155, 118, 0.4);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {/* LEFT SIDE: Video player (2/3 width on md+, full width on sm) */}
      <div className="video-section">
        <VideoPlayer videoId={videoId} startSec={currentStartSec} />
      </div>

      {/** RIGHT SIDE: ChatBox with pistachio theme **/}
      <div className="chat-section">
        <ChatBox
          videoUrl={videoUrlParam}
          sections={sections}
          loadingSections={loadingSections}
          onTimestampClick={handleTimestampClick}
          hasError={hasError}
          onGoHome={handleGoHome}
        />
      </div>

      <style jsx>{`
        .chat-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #f5f7f0 0%, #e8f0e8 50%, #dde8d8 100%);
          position: relative;
          overflow: hidden;
        }

        .chat-layout::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, rgba(147, 181, 156, 0.05) 0%, transparent 50%),
                      radial-gradient(circle at 70% 70%, rgba(160, 188, 165, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .video-section {
          width: 100%;
          height: 50vh;
          background: #1a1a1a;
          border-radius: 0 0 20px 20px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 1;
        }

        .chat-section {
          width: 100%;
          flex: 1;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px 20px 0 0;
          margin-top: -20px;
          position: relative;
          z-index: 2;
          box-shadow: 0 -8px 25px rgba(134, 174, 146, 0.15);
        }

        @media (min-width: 768px) {
          .chat-layout {
            flex-direction: row;
          }

          .video-section {
            width: 66.666667%;
            height: 100vh;
            border-radius: 0 20px 20px 0;
            margin: 0;
          }

          .chat-section {
            width: 33.333333%;
            margin-top: 0;
            margin-left: -20px;
            border-radius: 20px 0 0 20px;
            box-shadow: -8px 0 25px rgba(134, 174, 146, 0.15);
          }
        }

        /* Smooth transitions for responsive changes */
        .video-section,
        .chat-section {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
