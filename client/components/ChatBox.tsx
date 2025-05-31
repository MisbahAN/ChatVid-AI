"use client";

import { useState } from "react";
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
};

type ChatBoxProps = {
  videoUrl: string;
  sections: Section[]; // <-- Treat `start`/`end` as strings
  loadingSections: boolean;
  onTimestampClick: (start: number) => void;
};

export default function ChatBox({
  videoUrl,
  sections,
  loadingSections,
  onTimestampClick,
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
      (text.startsWith("“") && text.endsWith("”"))
    ) {
      text = text.slice(1, -1);
    }

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

    // Convert YouTube‐style <a href="…&t=XXs">TIMESTAMP</a>
    let idx = 0;
    const placeholders: Record<string, string> = {};
    const ytLinkRegex =
      /<a(?: [^>]*?)?href="(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?[^"]*?&t=(\d+)s?[^"]*)"[^>]*>([^<]+)<\/a>/g;
    text = text.replace(ytLinkRegex, (_match, secs: string) => {
      const totalSecs = parseInt(secs, 10);
      if (isNaN(totalSecs)) return "";
      const display = formatTimestamp(totalSecs);
      const key = `__PLACEHOLDER_${idx}__`;
      placeholders[
        key
      ] = `<a href="?start=${totalSecs}" class="text-blue-600 underline">${display}</a>`;
      idx += 1;
      return key;
    });

    // Convert plain‐text ranges “MM:SS–MM:SS”
    const rangeRegex =
      /(\d{1,2}:\d{2}(?::\d{2})?)(?:-{2}|-|\u2013)(\d{1,2}:\d{2}(?::\d{2})?)/g;
    text = text.replace(
      rangeRegex,
      (_match, startTs: string, endTs: string) => {
        const startSecs = parseTimestamp(startTs);
        const endSecs = parseTimestamp(endTs);
        const dispStart = formatTimestamp(startSecs);
        const dispEnd = isNaN(endSecs)
          ? escapeHtml(endTs)
          : formatTimestamp(endSecs);
        const key = `__PLACEHOLDER_${idx}__`;
        placeholders[
          key
        ] = `(<a href="?start=${startSecs}" class="text-blue-600 underline">${dispStart}</a>–${dispEnd})`;
        idx += 1;
        return key;
      }
    );

    // Convert single timestamps “MM:SS” or “HH:MM:SS”
    const singleRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
    text = text.replace(singleRegex, (_match, ts: string) => {
      // Skip if part of a range
      if (ts.includes("--") || ts.includes("–")) return ts;
      const secs = parseTimestamp(ts);
      if (isNaN(secs)) return escapeHtml(ts);
      const disp = formatTimestamp(secs);
      const key = `__PLACEHOLDER_${idx}__`;
      placeholders[
        key
      ] = `<a href="?start=${secs}" class="text-blue-600 underline">${disp}</a>`;
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

  // ─── Intercept clicks on <a href="?start=XX">…</a> to jump the video ─────────
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
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
    <div className="flex flex-col h-full">
      {/** ─── TOP 1/3: Sections ───────────────────────────────────────────── */}
      <div className="h-1/3 overflow-y-auto p-4 bg-gray-50 border-b border-gray-300">
        <h2 className="text-xl font-semibold mb-3">Sections</h2>
        {loadingSections ? (
          <p className="text-gray-500">Loading sections…</p>
        ) : (
          <SectionList
            // Pass each section’s `start` and `end` (strings) directly—no reformatting
            sections={sections}
            onTimestampClick={onTimestampClick}
          />
        )}
      </div>

      {/** ─── MIDDLE 1/3: Visual Search ──────────────────────────────────── */}
      <div className="h-1/3 overflow-y-auto p-4">
        <form onSubmit={handleVisualSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={visualQuery}
            onChange={(e) => setVisualQuery(e.target.value)}
            placeholder="Visual search: e.g. “red car”"
            className="flex-1 border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loadingVisual}
            className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition"
          >
            {loadingVisual ? "Searching…" : "Search"}
          </button>
        </form>

        {visualResult && (
          <div className="border p-3 rounded-lg bg-gray-50">
            <p className="font-semibold text-gray-800">Visual Search Result:</p>
            <p className="mt-1 text-gray-700">{visualResult.description}</p>
            <button
              onClick={() => onTimestampClick(visualResult.timestamp)}
              className="mt-2 text-blue-600 underline"
            >
              Jump to {formatTimestamp(visualResult.timestamp)}
            </button>
          </div>
        )}
      </div>

      {/** ─── BOTTOM 1/3: Normal Chat ────────────────────────────────────── */}
      <div className="h-1/3 flex flex-col p-4 overflow-y-auto">
        <form onSubmit={handleChatSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the video..."
            className="flex-1 border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loadingChat}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            {loadingChat ? "Sending…" : "Send"}
          </button>
        </form>

        {/** Chat history (no “No messages yet” text)—just blank if empty */}
        <div
          className="flex-1 overflow-y-auto space-y-4"
          onClick={handleLinkClick}
        >
          {history.map((qa, idx) => (
            <div key={idx} className="border p-3 rounded-lg bg-white">
              <p className="font-semibold text-gray-800">Q: {qa.question}</p>
              <div
                className="mt-1 text-gray-700"
                dangerouslySetInnerHTML={{ __html: qa.answer }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
