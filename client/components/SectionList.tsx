"use client";

import React from "react";

type Section = {
  start: string; // backend gives "MM:SS" or "HH:MM:SS"
  end: string;
  summary: string;
  error?: string; // Add error field for backend error messages
};

type SectionListProps = {
  sections: Section[];
  onTimestampClick: (seconds: number) => void;
  hasError?: boolean;
  onGoHome?: () => void;
};

export default function SectionList({
  sections,
  onTimestampClick,
  hasError,
  onGoHome,
}: SectionListProps) {
  /**
   * Parse a "HH:MM:SS" or "MM:SS" timestamp into total seconds.
   * Examples:
   *   "00:00"   → 0
   *   "01:18"   → 78
   *   "1:02:05" → 3725
   */
  function parseTimestamp(ts?: string): number {
    if (!ts || typeof ts !== "string") return NaN;

    const parts = ts.split(":").map((part) => parseInt(part, 10));
    if (parts.some((n) => isNaN(n))) return NaN;

    if (parts.length === 2) {
      const [mm, ss] = parts;
      return mm * 60 + ss;
    } else if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      return hh * 3600 + mm * 60 + ss;
    }

    return NaN;
  }

  /**
   * Format a number of seconds into "H:MM:SS" or "M:SS".
   * Examples:
   *   0    → "0:00"
   *   78   → "1:18"
   *   3725 → "1:02:05"
   */
  function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  // Check if there's an error in the sections
  if (hasError || (sections.length > 0 && sections[0].error)) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <div className="error-title">No Transcript Available</div>
          <p className="error-message">
            No transcript available for this video. Try another video.
          </p>
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="error-button"
            >
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12L21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 4L21 12L13 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Go Back to Home
            </button>
          )}
        </div>

        <style jsx>{`
          .error-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            height: 100%;
          }

          .error-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(220, 120, 120, 0.2);
            border-radius: 15px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(220, 120, 120, 0.15);
            transition: all 0.3s ease;
            animation: slideIn 0.5s ease-out;
            max-width: 300px;
          }

          @keyframes slideIn {
            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          .error-card:hover {
            box-shadow: 0 12px 35px rgba(220, 120, 120, 0.2);
            transform: translateY(-2px);
          }

          .error-icon {
            font-size: 36px;
            margin-bottom: 12px;
            animation: bounce 2s infinite;
          }

          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
            60% { transform: translateY(-4px); }
          }

          .error-title {
            color: #dc7878;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
          }

          .error-message {
            color: rgba(220, 120, 120, 0.8);
            font-size: 14px;
            line-height: 1.4;
            margin-bottom: 16px;
          }

          .error-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: linear-gradient(145deg, #dc7878, #c66565);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(220, 120, 120, 0.3);
            margin: 0 auto;
          }

          .error-button:hover {
            background: linear-gradient(145deg, #e68888, #dc7878);
            box-shadow: 0 6px 18px rgba(220, 120, 120, 0.4);
            transform: translateY(-1px);
          }

          .button-icon {
            width: 16px;
            height: 16px;
          }
        `}</style>
      </div>
    );
  }

  const validSections = sections
    .map((sec) => {
      const startSeconds = parseTimestamp(sec.start);
      return { startSeconds, summary: sec.summary };
    })
    .filter((sec) => !isNaN(sec.startSeconds));

  if (validSections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📹</div>
        <p className="empty-text">No sections available.</p>
        
        <style jsx>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            height: 100%;
          }

          .empty-icon {
            font-size: 32px;
            margin-bottom: 12px;
            opacity: 0.7;
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }

          .empty-text {
            color: rgba(45, 90, 61, 0.6);
            font-size: 14px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sections-wrapper">
      <ul className="sections-list">
        {validSections.map((sec, idx) => (
          <li
            key={idx}
            className="section-item"
            onClick={() => onTimestampClick(sec.startSeconds)}
          >
            <div className="timestamp-badge">
              <svg className="play-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
              </svg>
              {formatTime(sec.startSeconds)}
            </div>
            <div className="summary-text">
              {sec.summary.length > 60
                ? sec.summary.substring(0, 60) + "..."
                : sec.summary}
            </div>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .sections-wrapper {
          height: 100%;
          width: 100%;
        }

        .sections-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-item {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(107, 155, 118, 0.2);
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(134, 174, 146, 0.1);
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 10px;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.4s ease-out;
          animation-delay: calc(var(--index) * 0.1s);
          opacity: 0;
          animation-fill-mode: forwards;
        }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .section-item:nth-child(1) { --index: 0; }
        .section-item:nth-child(2) { --index: 1; }
        .section-item:nth-child(3) { --index: 2; }
        .section-item:nth-child(4) { --index: 3; }
        .section-item:nth-child(5) { --index: 4; }
        .section-item:nth-child(6) { --index: 5; }
        .section-item:nth-child(7) { --index: 6; }
        .section-item:nth-child(8) { --index: 7; }
        .section-item:nth-child(9) { --index: 8; }
        .section-item:nth-child(10) { --index: 9; }

        .section-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(107, 155, 118, 0.1), transparent);
          transition: left 0.5s;
        }

        .section-item:hover::before {
          left: 100%;
        }

        .section-item:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: #6b9b76;
          box-shadow: 0 6px 20px rgba(134, 174, 146, 0.2);
          transform: translateY(-2px) scale(1.01);
        }

        .section-item:active {
          transform: translateY(0) scale(0.99);
          box-shadow: 0 3px 12px rgba(134, 174, 146, 0.2);
        }

        .timestamp-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.15), rgba(90, 138, 101, 0.1));
          color: #2d5a3d;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(107, 155, 118, 0.2);
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .section-item:hover .timestamp-badge {
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.2), rgba(90, 138, 101, 0.15));
          border-color: #6b9b76;
          transform: scale(1.02);
        }

        .play-icon {
          width: 10px;
          height: 10px;
          opacity: 0.8;
          transition: all 0.3s ease;
        }

        .section-item:hover .play-icon {
          opacity: 1;
          transform: scale(1.1);
        }

        .summary-text {
          color: rgba(45, 90, 61, 0.85);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 500;
          transition: color 0.3s ease;
          flex: 1;
          min-width: 0;
        }

        .section-item:hover .summary-text {
          color: #2d5a3d;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .section-item {
            padding: 8px 10px;
            gap: 8px;
          }

          .timestamp-badge {
            font-size: 10px;
            padding: 3px 6px;
          }

          .summary-text {
            font-size: 11px;
          }

          .play-icon {
            width: 9px;
            height: 9px;
          }
        }
      `}</style>
    </div>
  );
}
