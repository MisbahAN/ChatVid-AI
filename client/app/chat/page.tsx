"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import SectionList from "@/components/SectionList";
import ChatBox from "@/components/ChatBox";

type Section = {
  start: number;
  end: number;
  summary: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const videoUrlParam = searchParams.get("videoUrl") || "";

  const [videoId, setVideoId] = useState<string | null>(null);
  const [currentStartSec, setCurrentStartSec] = useState<number>(0);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

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
      {/* Left side: Video */}
      <div className="md:w-2/3 w-full h-[50vh] md:h-screen bg-black">
        <VideoPlayer videoId={videoId} startSec={currentStartSec} />
      </div>

      {/* Right side: Sections + Chat */}
      <div className="md:w-1/3 w-full flex flex-col border-l border-gray-300">
        {/* Sections adjusts height to its content, chat fills the rest */}
        <div className="overflow-y-auto p-4 bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Sections</h2>
          {loadingSections ? (
            <p className="text-gray-500">Loading sections…</p>
          ) : (
            <SectionList
              sections={sections}
              onTimestampClick={handleTimestampClick}
            />
          )}
        </div>

        {/* ChatBox fills remaining vertical space */}
        <div className="flex-1 overflow-y-auto border-t border-gray-300 bg-white">
          <ChatBox
            videoUrl={videoUrlParam}
            onTimestampClick={handleTimestampClick}
          />
        </div>
      </div>
    </div>
  );
}
