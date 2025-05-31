"use client";
// ───────────────
// 1. “use client” means this file is a React component that runs in the browser (not on the Node server).

import { useState } from "react";
// ───────────────
// useState is a React Hook that lets us keep track of “local component state” (form values here).

import { useRouter } from "next/navigation";
// ───────────────────────────
// useRouter from Next.js App Router gives us a programmatic way to navigate (push to /chat).

export default function HomePage() {
  // State hooks to store the form’s input
  const [videoUrl, setVideoUrl] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const router = useRouter();

  // Called whenever the user clicks “Start Chatting”
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // ───────────────
    // Prevent page‐reload default so we can do a single‐page navigation.

    // Store Gemini API Key in localStorage (so /chat can read it)
    localStorage.setItem("GEMINI_API_KEY", geminiKey);

    // Navigate to /chat, passing the video URL as a query‐param
    router.push(`/chat?videoUrl=${encodeURIComponent(videoUrl)}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-semibold mb-4">
        Enter YouTube URL &amp; Gemini Key
      </h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        {/* Input for the YouTube URL */}
        <div>
          <label htmlFor="videoUrl" className="block font-medium">
            YouTube Video URL
          </label>
          <input
            type="url"
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="mt-1 w-full border border-gray-300 rounded p-2"
          />
        </div>

        {/* Input for the Gemini API Key */}
        <div>
          <label htmlFor="geminiKey" className="block font-medium">
            Gemini API Key
          </label>
          <input
            type="text"
            id="geminiKey"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="Paste your Gemini API key here"
            required
            className="mt-1 w-full border border-gray-300 rounded p-2"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Start Chatting
        </button>
      </form>
    </main>
  );
}
