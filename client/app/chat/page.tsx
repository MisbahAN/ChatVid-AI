"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import SectionList from "@/components/SectionList";

type Section = {
  start: number;
  end: number;
  summary: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const videoUrlParam = searchParams.get("videoUrl") || "";

  // State for the parsed video ID (e.g. "KPD8C7c6P1w")
  const [videoId, setVideoId] = useState<string | null>(null);

  // When you click a timestamp, we set this to that second
  const [currentStartSec, setCurrentStartSec] = useState<number>(0);

  // Array of { start, end, summary }
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Extract the video ID from the full YouTube URL
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
    setCurrentStartSec(0); // reset to 0 when URL changes
  }, [videoUrlParam]);

  // Fetch sections from FastAPI (/sections expects { video_url, api_key })
  useEffect(() => {
    async function fetchSections() {
      if (!videoUrlParam) return;
      setLoadingSections(true);
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
          return;
        }
        const data: Section[] = await res.json();
        setSections(data);
      } catch (err) {
        console.error("Error fetching sections:", err);
        setSections([]);
      } finally {
        setLoadingSections(false);
      }
    }
    fetchSections();
  }, [videoUrlParam]);

  // Handler for clicking a timestamp
  function handleTimestampClick(start: number) {
    setCurrentStartSec(start);
  }

  if (!videoUrlParam || !videoId) {
    return (
      <div className="p-4">
        <p className="text-red-600">
          Invalid or missing video URL. Go back and enter a valid YouTube URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left column: iframe player */}
      <div className="md:w-2/3 w-full h-[360px] md:h-auto bg-black">
        <VideoPlayer videoId={videoId} startSec={currentStartSec} />
      </div>

      {/* Right column: Section list */}
      <div className="md:w-1/3 w-full overflow-y-auto border-l border-gray-300 p-4">
        <h2 className="text-xl font-semibold mb-2">Sections</h2>
        {loadingSections ? (
          <p>Loading sections…</p>
        ) : (
          <SectionList
            sections={sections}
            onTimestampClick={handleTimestampClick}
          />
        )}
      </div>
    </div>
  );
}
