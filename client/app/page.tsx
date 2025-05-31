"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save the Gemini key in localStorage for later use
    localStorage.setItem("GEMINI_API_KEY", apiKey);

    // Extract the 11-character YouTube video ID via regex
    const match = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const videoId = match?.[1];
    if (videoId) {
      router.push(`/chat?video=${videoId}`);
    } else {
      alert(
        "Invalid YouTube URL. Please enter a full URL like https://www.youtube.com/watch?v=VIDEO_ID"
      );
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Chat with a YouTube Video
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <input
          type="text"
          placeholder="🔗 Enter YouTube Video URL"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          required
        />

        <input
          type="password"
          placeholder="🔐 Enter Gemini API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          🚀 Start Chat
        </button>
      </form>
    </main>
  );
}
