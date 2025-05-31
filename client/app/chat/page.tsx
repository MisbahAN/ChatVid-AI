"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import VideoPlayer from "@/components/VideoPlayer";
import SectionList from "@/components/SectionList";

interface Section {
  start: string; // "MM:SS"
  end: string; // "MM:SS"
  summary: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("video");
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = localStorage.getItem("GEMINI_API_KEY");
    if (!apiKey || !videoId) {
      alert("Missing Gemini API Key or Video ID. Redirecting to home.");
      router.push("/");
      return;
    }

    const fetchSections = async () => {
      try {
        const response = await axios.post("http://localhost:8000/sections", {
          video_url: videoUrl,
          api_key: apiKey,
        });
        setSections(response.data); // Expecting array of { start, end, summary }
      } catch (error) {
        console.error("Error fetching sections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [videoId, router, videoUrl]);

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-center">
        🎬 Chat with Video
      </h1>

      {/* Embedded YouTube Player */}
      {videoId && <VideoPlayer videoId={videoId} />}

      {/* Section Summaries as Hyperlinks */}
      <div className="max-w-3xl mx-auto mt-6">
        <h2 className="text-xl font-semibold mb-2">📌 Sections</h2>
        <SectionList sections={sections} loading={loading} videoId={videoId} />
      </div>

      {/* Placeholder for future Chat & Visual Search */}
      <div className="max-w-3xl mx-auto mt-10">
        <div className="bg-yellow-100 p-4 rounded text-yellow-900">
          ✨ Chat and Visual Search coming next!
        </div>
      </div>
    </main>
  );
}
