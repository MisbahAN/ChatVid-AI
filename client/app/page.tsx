"use client";
// ───────────────
// 1. "use client" means this file is a React component that runs in the browser (not on the Node server).

import { useState } from "react";
// ───────────────
// useState is a React Hook that lets us keep track of "local component state" (form values here).

import { useRouter } from "next/navigation";
// ───────────────────────────
// useRouter from Next.js App Router gives us a programmatic way to navigate (push to /chat).

export default function HomePage() {
  // State hooks to store the form's input
  const [videoUrl, setVideoUrl] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const router = useRouter();

  // Called whenever the user clicks "ChatVid AI"
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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 pistachio-gradient">
      {/* 147×147 image centered above the form */}
      <div className="logo-container">
        <img
          src="/ChatVid-AI.jpg"
          alt="ChatVid AI Logo"
          width={147}
          height={147}
          className="logo-image"
        />
      </div>

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
                <span>ChatVid AI</span>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.75 6.75L19.25 12L13.75 17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="5.75 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ───────────────
          Enhanced CSS with pistachio theme, smooth animations, and elegant design
      ─────────────── */}
      <style jsx>{`
        .pistachio-gradient {
          background: linear-gradient(135deg, #f5f7f0 0%, #e8f0e8 50%, #dde8d8 100%);
          min-height: 100vh;
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
                      radial-gradient(circle at 80% 80%, rgba(160, 188, 165, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 70%, rgba(134, 174, 146, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        .logo-container {
          animation: logoFloat 3s ease-in-out infinite;
          margin-bottom: 2rem;
          position: relative;
        }

        .logo-image {
          border-radius: 50%;
          box-shadow: 0 10px 30px rgba(134, 174, 146, 0.3);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .logo-image:hover {
          transform: scale(1.05) rotate(5deg);
          box-shadow: 0 15px 40px rgba(134, 174, 146, 0.4);
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(-5px) rotate(-1deg); }
        }

        .wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
        }

        .flip-card__inner {
          width: 340px;
          height: 400px;
          position: relative;
          background-color: transparent;
          text-align: center;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          animation: cardEntry 0.8s ease-out;
        }

        @keyframes cardEntry {
          0% { 
            opacity: 0; 
            transform: translateY(50px) rotateX(-20deg); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) rotateX(0); 
          }
        }

        .flip-card__front {
          padding: 30px 25px;
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          background: linear-gradient(145deg, #9fb5a4, #a0bca5);
          gap: 25px;
          border-radius: 20px;
          border: none;
          box-shadow: 
            0 15px 35px rgba(134, 174, 146, 0.3),
            0 5px 15px rgba(134, 174, 146, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .flip-card__front:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 25px 50px rgba(134, 174, 146, 0.4),
            0 10px 25px rgba(134, 174, 146, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .flip-card__form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .title {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          color: #2d5a3d;
          text-shadow: 0 2px 4px rgba(255, 255, 255, 0.3);
          letter-spacing: -0.5px;
          position: relative;
        }

        .title::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, transparent, #2d5a3d, transparent);
          border-radius: 2px;
        }

        .flip-card__input {
          width: 280px;
          height: 50px;
          border-radius: 15px;
          border: 2px solid rgba(45, 90, 61, 0.2);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          box-shadow: 
            0 4px 15px rgba(134, 174, 146, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          font-size: 16px;
          font-weight: 500;
          color: #2d5a3d;
          padding: 0 20px;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .flip-card__input::placeholder {
          color: rgba(45, 90, 61, 0.6);
          transition: all 0.3s ease;
        }

        .flip-card__input:focus {
          border: 2px solid #6b9b76;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 8px 25px rgba(107, 155, 118, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 0 0 4px rgba(107, 155, 118, 0.1);
          transform: translateY(-2px);
        }

        .flip-card__input:focus::placeholder {
          color: rgba(45, 90, 61, 0.4);
          transform: translateY(-2px);
        }

        .flip-card__btn {
          margin: 15px 0 0 0;
          width: 160px;
          height: 50px;
          border-radius: 15px;
          border: none;
          background: linear-gradient(145deg, #6b9b76, #5a8a65);
          box-shadow: 
            0 6px 20px rgba(107, 155, 118, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          font-size: 16px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .flip-card__btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .flip-card__btn:hover::before {
          left: 100%;
        }

        .flip-card__btn:hover {
          background: linear-gradient(145deg, #7aab85, #6b9b76);
          box-shadow: 
            0 10px 30px rgba(107, 155, 118, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transform: translateY(-3px) scale(1.02);
        }

        .flip-card__btn:active {
          transform: translateY(-1px) scale(0.98);
          box-shadow: 
            0 4px 15px rgba(107, 155, 118, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-icon {
          width: 18px;
          height: 18px;
          opacity: 0.9;
          transition: all 0.3s ease;
        }

        .flip-card__btn:hover .btn-icon {
          opacity: 1;
          transform: translateX(2px);
        }

        /* Responsive design */
        @media (max-width: 640px) {
          .flip-card__inner {
            width: 300px;
            height: 380px;
          }
          
          .flip-card__input {
            width: 240px;
          }
          
          .title {
            font-size: 24px;
          }
        }

        /* Loading animation for smooth transitions */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .flip-card__btn:disabled {
          animation: pulse 2s infinite;
          pointer-events: none;
        }
      `}</style>
    </main>
  );
}
