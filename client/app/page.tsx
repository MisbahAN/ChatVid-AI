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

  // Called whenever the user clicks “ChatVid AI”
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* 147×147 image centered above the form */}
      <img
        src="/ChatVid-AI.jpg"
        alt="ChatVid AI Logo"
        width={147}
        height={147}
        className="mb-6"
      />

      <div className="wrapper">
        <div className="flip-card__inner">
          <div className="flip-card__front">
            <div className="title">Enter Details</div>
            <form className="flip-card__form" onSubmit={handleSubmit}>
              <input
                className="flip-card__input"
                name="videoUrl"
                placeholder="YouTube Link"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
              />
              <input
                className="flip-card__input"
                name="geminiKey"
                placeholder="Gemini API Key"
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                required
              />
              <button className="flip-card__btn" type="submit">
                ChatVid AI
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ───────────────
          CSS for the “wrapper” + “flip‐card” styling.
          We’ve removed all toggle/sign‐up logic, and set the form’s bg to #B2D8CE.
      ─────────────── */}
      <style jsx>{`
        /* From Uiverse.io by andrew-demchenk0, trimmed down */
        .wrapper {
          /* Center the card */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .flip-card__inner {
          width: 300px;
          height: 350px;
          position: relative;
          background-color: transparent;
          perspective: 1000px;
          text-align: center;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }

        .flip-card__front {
          padding: 20px;
          position: absolute;
          display: flex;
          flex-direction: column;
          justify-content: center;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          background: #b2d8ce; /* Grey background */
          gap: 20px;
          border-radius: 5px;
          border: 2px solid var(--main-color, #323232);
          box-shadow: 4px 4px var(--main-color, #323232);
        }

        .flip-card__form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .title {
          margin: 20px 0;
          font-size: 25px;
          font-weight: 900;
          text-align: center;
          color: var(--main-color, #323232);
        }

        .flip-card__input {
          width: 250px;
          height: 40px;
          border-radius: 5px;
          border: 2px solid var(--main-color, #323232);
          background-color: var(--bg-color, #fff);
          box-shadow: 4px 4px var(--main-color, #323232);
          font-size: 15px;
          font-weight: 600;
          color: var(--font-color, #323232);
          padding: 5px 10px;
          outline: none;
        }

        .flip-card__input::placeholder {
          color: var(--font-color-sub, #666);
          opacity: 0.8;
        }

        .flip-card__input:focus {
          border: 2px solid var(--input-focus, #2d8cf0);
        }

        .flip-card__btn {
          margin: 20px 0;
          width: 120px;
          height: 40px;
          border-radius: 5px;
          border: 2px solid var(--main-color, #323232);
          background-color: var(--bg-color, #fff);
          box-shadow: 4px 4px var(--main-color, #323232);
          font-size: 17px;
          font-weight: 600;
          color: var(--font-color, #323232);
          cursor: pointer;
          transition: box-shadow 0.1s, transform 0.1s;
        }

        .flip-card__btn:active {
          box-shadow: 0px 0px var(--main-color, #323232);
          transform: translate(3px, 3px);
        }
      `}</style>
    </main>
  );
}
