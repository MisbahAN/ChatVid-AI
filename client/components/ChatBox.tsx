"use client";

import React, { useState, useEffect } from "react";
import { postQuestion, postVisualSearch } from "@/lib/api";
import SectionList from "@/components/SectionList";

type QA = {
  question: string;
  answer: string;
};

type VisualResult = {
  timestamp: number;
  description: string;
  score?: number;
};

// Note: we now expect `start` and `end` as strings (e.g. "0:00", "2:43")
type Section = {
  start: string;
  end: string;
  summary: string;
  error?: string;
};

type ChatBoxProps = {
  videoUrl: string;
  sections: Section[]; // <-- Treat `start`/`end` as strings
  loadingSections: boolean;
  onTimestampClick: (start: number) => void;
  hasError?: boolean; // Add hasError prop
  onGoHome?: () => void; // Add onGoHome prop
};

export default function ChatBox({
  videoUrl,
  sections,
  loadingSections,
  onTimestampClick,
  hasError,
  onGoHome,
}: ChatBoxProps) {
  // ─── Chat State ──────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // ─── Visual Search State ─────────────────────────────────────────────────────
  const [visualQuery, setVisualQuery] = useState("");
  const [visualResult, setVisualResult] = useState<VisualResult | null>(null);
  const [loadingVisual, setLoadingVisual] = useState(false);

  // ─── Timestamp Parsing & Formatting ──────────────────────────────────────────
  function parseTimestamp(ts: string): number {
    const parts = ts.split(":").map((p) => parseInt(p, 10));
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

  function formatTimestamp(seconds: number): string {
    if (seconds < 0 || isNaN(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  // ─── HTML Escaping ────────────────────────────────────────────────────────────
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─── Transform Chat Answers ───────────────────────────────────────────────────
  function transformAnswer(raw: string): string {
    let text = raw;

    text = text.replace(/\\"/g, '"');
    text = text.trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith('"') && text.endsWith('"'))
    ) {
      text = text.slice(1, -1);
    }

    // Clean up existing HTML links first - extract the text and timestamps
    const existingLinkRegex = /<a[^>]*href="[^"]*[&?]t=(\d+)s?"[^>]*>([^<]+)<\/a>/g;
    text = text.replace(existingLinkRegex, (_match, secs: string, linkText: string) => {
      const totalSecs = parseInt(secs, 10);
      if (isNaN(totalSecs)) return linkText;
      return formatTimestamp(totalSecs);
    });

    const NEWLINE_PLACEHOLDER = "__NEWLINE__";
    text = text.replace(/\\n/g, NEWLINE_PLACEHOLDER);
    text = text.replace(/\r\n|\r|\n/g, NEWLINE_PLACEHOLDER);

    // Convert **bold** or *bold*
    let boldIdx = 0;
    const boldPlaceholders: Record<string, string> = {};
    const boldRegex = /(\*\*|\*)(.*?)\1/g;
    text = text.replace(
      boldRegex,
      (_match, _stars: string, content: string) => {
        const escapedContent = escapeHtml(content);
        const key = `__BOLD_${boldIdx}__`;
        boldPlaceholders[key] = `<strong>${escapedContent}</strong>`;
        boldIdx += 1;
        return key;
      }
    );

    // Convert timestamp ranges "MM:SS–MM:SS" or "MM:SS-MM:SS"
    let idx = 0;
    const placeholders: Record<string, string> = {};
    const rangeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[-–—]\s*)(\d{1,2}:\d{2}(?::\d{2})?)/g;
    text = text.replace(
      rangeRegex,
      (_match, startTs: string, endTs: string) => {
        const startSecs = parseTimestamp(startTs);
        const endSecs = parseTimestamp(endTs);
        const dispStart = formatTimestamp(startSecs);
        const dispEnd = isNaN(endSecs) ? escapeHtml(endTs) : formatTimestamp(endSecs);
        const key = `__PLACEHOLDER_${idx}__`;
        placeholders[key] = `<span class="timestamp-range">
          <button class="timestamp-link" onclick="handleTimestampClick(${startSecs})">
            ${dispStart}
          </button>
          –
          <button class="timestamp-link" onclick="handleTimestampClick(${endSecs})">
            ${dispEnd}
          </button>
        </span>`;
        idx += 1;
        return key;
      }
    );

    // Convert single timestamps "MM:SS" or "HH:MM:SS"
    const singleRegex = /(?<!\d)(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)/g;
    text = text.replace(singleRegex, (_match, ts: string) => {
      const secs = parseTimestamp(ts);
      if (isNaN(secs)) return escapeHtml(ts);
      const disp = formatTimestamp(secs);
      const key = `__PLACEHOLDER_${idx}__`;
      placeholders[key] = `<button class="timestamp-link" onclick="handleTimestampClick(${secs})">
        ${disp}
      </button>`;
      idx += 1;
      return key;
    });

    // Escape everything else, then restore placeholders
    let escaped = "";
    const placeholderKeys = Object.keys(placeholders);
    const boldKeys = Object.keys(boldPlaceholders);
    if (placeholderKeys.length === 0 && boldKeys.length === 0) {
      escaped = escapeHtml(text);
    } else {
      const allKeys = [...placeholderKeys, ...boldKeys];
      const combinedRegex = new RegExp(
        allKeys
          .map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
          .join("|"),
        "g"
      );
      const wrapped = text.replace(combinedRegex, (match) => `@@${match}@@`);
      escaped = escapeHtml(wrapped);

      for (const key of placeholderKeys) {
        const wrappedKey = `@@${key}@@`;
        escaped = escaped.replace(
          new RegExp(wrappedKey, "g"),
          placeholders[key]
        );
      }
      for (const key of boldKeys) {
        const wrappedKey = `@@${key}@@`;
        escaped = escaped.replace(
          new RegExp(wrappedKey, "g"),
          boldPlaceholders[key]
        );
      }
    }

    // Restore newline placeholders to <br/>
    escaped = escaped.replace(new RegExp(NEWLINE_PLACEHOLDER, "g"), "<br/>");

    return escaped;
  }

  // ─── Handle Visual Search Submission ───────────────────────────────────────
  const handleVisualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visualQuery.trim()) return;

    const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
    setLoadingVisual(true);
    setVisualResult(null);

    try {
      const res = await postVisualSearch(videoUrl, visualQuery, apiKey);
      setVisualResult(res);
      setVisualQuery("");
    } catch (err) {
      alert("Error getting visual search result. Check console.");
      console.error(err);
    } finally {
      setLoadingVisual(false);
    }
  };

  // ─── Handle Chat Submission (Enter or Send) ─────────────────────────────────
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
    setLoadingChat(true);

    try {
      const res = await postQuestion(videoUrl, input, apiKey);
      const transformed = transformAnswer(res.answer);
      setHistory((prev) => [...prev, { question: input, answer: transformed }]);
      setInput("");
    } catch (err) {
      alert("Error getting response. Check console.");
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  };

  // ─── Handle timestamp clicks from chat content ─────────────────────────────────
  const handleTimestampClick = (seconds: number) => {
    onTimestampClick(seconds);
  };

  // Make handleTimestampClick available globally for the inline onclick handlers
  useEffect(() => {
    (window as any).handleTimestampClick = handleTimestampClick;
    return () => {
      delete (window as any).handleTimestampClick;
    };
  }, [onTimestampClick]);

  // ─── Intercept clicks on timestamp buttons ─────────
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Handle timestamp button clicks
    if (target.classList.contains('timestamp-link') || target.closest('.timestamp-link')) {
      e.preventDefault();
      const button = target.classList.contains('timestamp-link') ? target : target.closest('.timestamp-link');
      const onclick = button?.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/handleTimestampClick\((\d+)\)/);
        if (match) {
          const seconds = parseInt(match[1], 10);
          onTimestampClick(seconds);
        }
      }
      return;
    }

    // Handle old-style anchor links (fallback)
    if (target.tagName === "A") {
      const href = (target as HTMLAnchorElement).getAttribute("href") || "";
      try {
        const url = new URL(href, window.location.href);
        const startParam = url.searchParams.get("start");
        if (startParam) {
          e.preventDefault();
          const seconds = parseInt(startParam, 10);
          if (!isNaN(seconds)) {
            onTimestampClick(seconds);
          }
        }
      } catch {
        // ignore invalid URLs
      }
    }
  };

  return (
    <div className="flex flex-col h-full pistachio-chatbox">
      {/** ─── TOP 1/3: Sections ───────────────────────────────────────────── */}
      <div className="section-panel">
        <h2 className="section-title">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Video Sections
        </h2>
        <div className="sections-content">
          {loadingSections ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Getting Sections...</p>
              <p className="loading-subtext">Analyzing video transcript</p>
            </div>
          ) : (
            <SectionList
              sections={sections}
              onTimestampClick={onTimestampClick}
              hasError={hasError}
              onGoHome={onGoHome}
            />
          )}
        </div>
      </div>

      {/** ─── MIDDLE 1/3: Visual Search ──────────────────────────────────── */}
      <div className="search-panel">
        <h2 className="panel-title">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Visual Search
        </h2>
        <form onSubmit={handleVisualSearch} className="search-form">
          <div className="input-group">
            <input
              type="text"
              value={visualQuery}
              onChange={(e) => setVisualQuery(e.target.value)}
              placeholder="Search for visual elements..."
              className="search-input"
            />
            <button
              type="submit"
              disabled={loadingVisual}
              className="search-btn"
            >
              {loadingVisual ? (
                <div className="btn-spinner"></div>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </form>

        <div className="search-results">
          {visualResult && (
            <div className="result-card">
              <div className="result-header">
                <svg className="result-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Visual Search Result
              </div>
              <p className="result-description">{visualResult.description}</p>
              <button
                onClick={() => onTimestampClick(visualResult.timestamp)}
                className="timestamp-btn"
              >
                {formatTimestamp(visualResult.timestamp)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/** ─── BOTTOM 1/3: Normal Chat ────────────────────────────────────── */}
      <div className="chat-panel">
        <h2 className="panel-title">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Chat Assistant
        </h2>
        <form onSubmit={handleChatSubmit} className="chat-form">
          <div className="input-group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the video..."
              className="chat-input"
            />
            <button
              type="submit"
              disabled={loadingChat}
              className="chat-btn"
            >
              {loadingChat ? (
                <div className="btn-spinner"></div>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </form>

        <div
          className="chat-history"
          onClick={handleLinkClick}
        >
          {history.map((qa, idx) => (
            <div key={idx} className="chat-message">
              <div className="question-bubble">
                <div className="bubble-header">
                  <svg className="message-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  You
                </div>
                <p className="question-text">{qa.question}</p>
              </div>
              <div className="answer-bubble">
                <div className="bubble-header">
                  <svg className="message-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2579 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01127 9.77251C4.28053 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Assistant
                </div>
                <div
                  className="answer-text"
                  dangerouslySetInnerHTML={{ __html: qa.answer }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .pistachio-chatbox {
          background: transparent;
          border-radius: 20px;
          overflow: hidden;
        }

        .section-panel,
        .search-panel,
        .chat-panel {
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(134, 174, 146, 0.2);
          transition: all 0.3s ease;
          position: relative;
          min-height: 0; /* Important for flex shrinking */
        }

        /* Fixed heights for each panel to ensure consistent 1/3 distribution */
        .section-panel {
          height: 33.333vh;
          background: linear-gradient(145deg, rgba(159, 181, 164, 0.1), rgba(134, 174, 146, 0.05));
          backdrop-filter: blur(10px);
        }

        .search-panel {
          height: 33.333vh;
          background: linear-gradient(145deg, rgba(147, 181, 156, 0.1), rgba(160, 188, 165, 0.05));
          backdrop-filter: blur(10px);
        }

        .chat-panel {
          height: 33.333vh;
          background: linear-gradient(145deg, rgba(134, 174, 146, 0.1), rgba(147, 181, 156, 0.05));
          backdrop-filter: blur(10px);
          border-bottom: none;
        }

        .section-title,
        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          color: #2d5a3d;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid rgba(45, 90, 61, 0.1);
          position: relative;
          flex-shrink: 0; /* Prevent title from shrinking */
        }

        .section-icon,
        .panel-icon {
          width: 18px;
          height: 18px;
          color: #6b9b76;
          transition: all 0.3s ease;
        }

        .section-title:hover .section-icon,
        .panel-title:hover .panel-icon {
          transform: scale(1.1) rotate(5deg);
          color: #5a8a65;
        }

        /* Sections content container with scrolling */
        .sections-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 155, 118, 0.3) transparent;
        }

        .sections-content::-webkit-scrollbar {
          width: 6px;
        }

        .sections-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sections-content::-webkit-scrollbar-thumb {
          background: rgba(107, 155, 118, 0.3);
          border-radius: 3px;
        }

        .sections-content::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 155, 118, 0.5);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          height: 100%;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(107, 155, 118, 0.2);
          border-top: 3px solid #6b9b76;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          color: #2d5a3d;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .loading-subtext {
          color: rgba(45, 90, 61, 0.7);
          font-size: 12px;
        }

        .search-form,
        .chat-form {
          margin-bottom: 12px;
          flex-shrink: 0;
        }

        .input-group {
          display: flex;
          gap: 8px;
          position: relative;
        }

        .search-input,
        .chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid rgba(107, 155, 118, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          color: #2d5a3d;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(134, 174, 146, 0.1);
        }

        .search-input::placeholder,
        .chat-input::placeholder {
          color: rgba(45, 90, 61, 0.5);
        }

        .search-input:focus,
        .chat-input:focus {
          border-color: #6b9b76;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 4px 15px rgba(107, 155, 118, 0.2),
            0 0 0 3px rgba(107, 155, 118, 0.1);
          transform: translateY(-1px);
        }

        .search-btn,
        .chat-btn {
          padding: 10px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(145deg, #6b9b76, #5a8a65);
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(107, 155, 118, 0.3);
          position: relative;
          overflow: hidden;
        }

        .search-btn:hover,
        .chat-btn:hover {
          background: linear-gradient(145deg, #7aab85, #6b9b76);
          box-shadow: 0 6px 20px rgba(107, 155, 118, 0.4);
          transform: translateY(-2px) scale(1.02);
        }

        .search-btn:active,
        .chat-btn:active {
          transform: translateY(0) scale(0.98);
        }

        .search-btn svg,
        .chat-btn svg {
          width: 16px;
          height: 16px;
        }

        .search-btn:disabled,
        .chat-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Search results container with scrolling */
        .search-results {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 155, 118, 0.3) transparent;
        }

        .search-results::-webkit-scrollbar {
          width: 6px;
        }

        .search-results::-webkit-scrollbar-track {
          background: transparent;
        }

        .search-results::-webkit-scrollbar-thumb {
          background: rgba(107, 155, 118, 0.3);
          border-radius: 3px;
        }

        .search-results::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 155, 118, 0.5);
        }

        .result-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(107, 155, 118, 0.2);
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 4px 15px rgba(134, 174, 146, 0.15);
          transition: all 0.3s ease;
          animation: slideIn 0.4s ease-out;
        }

        @keyframes slideIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .result-card:hover {
          box-shadow: 0 8px 25px rgba(134, 174, 146, 0.25);
          transform: translateY(-2px);
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #2d5a3d;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .result-icon {
          width: 14px;
          height: 14px;
          color: #6b9b76;
        }

        .result-description {
          color: rgba(45, 90, 61, 0.8);
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 10px;
        }

        .timestamp-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.15), rgba(90, 138, 101, 0.1));
          color: #2d5a3d;
          border: 1px solid rgba(107, 155, 118, 0.2);
          padding: 4px 8px;
          border-radius: 6px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          white-space: nowrap;
          margin: 0 2px;
        }

        .timestamp-btn:hover {
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.2), rgba(90, 138, 101, 0.15));
          border-color: #6b9b76;
          transform: translateY(-1px) scale(1.02);
        }

        /* New timestamp link styling for chat content */
        .timestamp-link {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.15), rgba(90, 138, 101, 0.1));
          color: #2d5a3d;
          border: 1px solid rgba(107, 155, 118, 0.2);
          padding: 3px 6px;
          border-radius: 5px;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          white-space: nowrap;
          margin: 0 1px;
        }

        .timestamp-link:hover {
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.2), rgba(90, 138, 101, 0.15));
          border-color: #6b9b76;
          transform: translateY(-1px) scale(1.02);
        }

        .timestamp-range {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 155, 118, 0.3) transparent;
        }

        .chat-history::-webkit-scrollbar {
          width: 6px;
        }

        .chat-history::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-history::-webkit-scrollbar-thumb {
          background: rgba(107, 155, 118, 0.3);
          border-radius: 3px;
        }

        .chat-history::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 155, 118, 0.5);
        }

        .chat-message {
          margin-bottom: 16px;
          animation: fadeInUp 0.4s ease-out;
        }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .question-bubble,
        .answer-bubble {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(107, 155, 118, 0.2);
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 6px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(134, 174, 146, 0.1);
        }

        .question-bubble {
          background: linear-gradient(145deg, rgba(107, 155, 118, 0.1), rgba(90, 138, 101, 0.05));
          border-color: rgba(107, 155, 118, 0.3);
        }

        .answer-bubble {
          border-color: rgba(134, 174, 146, 0.3);
        }

        .question-bubble:hover,
        .answer-bubble:hover {
          box-shadow: 0 4px 15px rgba(134, 174, 146, 0.2);
          transform: translateY(-1px);
        }

        .bubble-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 12px;
          color: #2d5a3d;
          margin-bottom: 6px;
          opacity: 0.9;
        }

        .message-icon {
          width: 14px;
          height: 14px;
          color: #6b9b76;
        }

        .question-text {
          color: #2d5a3d;
          font-size: 13px;
          line-height: 1.4;
          margin: 0;
        }

        .answer-text {
          color: rgba(45, 90, 61, 0.9);
          font-size: 13px;
          line-height: 1.5;
        }

        .answer-text a {
          color: #6b9b76;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(107, 155, 118, 0.3);
        }

        .answer-text a:hover {
          color: #5a8a65;
          border-bottom-color: #5a8a65;
          background: rgba(107, 155, 118, 0.1);
          padding: 2px 4px;
          border-radius: 4px;
        }

        .answer-text strong {
          color: #2d5a3d;
          font-weight: 600;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .section-panel,
          .search-panel,
          .chat-panel {
            padding: 12px 16px;
            height: auto;
            min-height: 200px;
            max-height: 300px;
          }

          .section-title,
          .panel-title {
            font-size: 15px;
            margin-bottom: 10px;
          }

          .search-input,
          .chat-input {
            font-size: 16px; /* Prevent zoom on iOS */
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}
