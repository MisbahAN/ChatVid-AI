"use client";

import { useState } from "react";
import { postQuestion, postVisualSearch } from "@/lib/api";

type QA = {
  question: string;
  answer: string;
};

type VisualResult = {
  timestamp: number;
  description: string;
  score?: number;
};

type ChatBoxProps = {
  videoUrl: string;
  onTimestampClick: (start: number) => void;
};

export default function ChatBox({ videoUrl, onTimestampClick }: ChatBoxProps) {
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
  //  - Convert literal "\n" and actual newlines to <br/>
  //  - Convert **bold** or *bold* into <strong>bold</strong>
  //  - Convert YouTube-style <a href="...&t=XXs">TIMESTAMP</a> and plain "MM:SS"
  //    into blue, underlined <a href="?start=XX">MM:SS</a>
  function transformAnswer(raw: string): string {
    let text = raw;

    // 1. Unescape any \" → "
    text = text.replace(/\\"/g, '"');

    // 2. Strip surrounding quotes if present
    text = text.trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("“") && text.endsWith("”"))
    ) {
      text = text.slice(1, -1);
    }

    // 3. Convert literal "\n" (backslash-n) into a placeholder
    const NEWLINE_PLACEHOLDER = "__NEWLINE__";
    text = text.replace(/\\n/g, NEWLINE_PLACEHOLDER);
    // Also convert actual newlines to the same placeholder
    text = text.replace(/\r\n|\r|\n/g, NEWLINE_PLACEHOLDER);

    // 4. Convert **bold** or *bold* into a placeholder -> <strong>bold</strong>
    let boldIdx = 0;
    const boldPlaceholders: Record<string, string> = {};
    // Regex supports both **text** and *text*
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

    // 5. Convert YouTube-style <a href="...&t=XXs">TIMESTAMP</a> → placeholder
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

    // 6. Convert any plain-text range: "MM:SS--MM:SS" or "MM:SS–MM:SS"
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

    // 7. Convert single timestamps "HH:MM:SS" or "MM:SS" → placeholder
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

    // 8. Escape everything else, then restore placeholders and bold placeholders
    let escaped = "";
    const placeholderKeys = Object.keys(placeholders);
    const boldKeys = Object.keys(boldPlaceholders);
    if (placeholderKeys.length === 0 && boldKeys.length === 0) {
      escaped = escapeHtml(text);
    } else {
      // Wrap all placeholders so we don't escape them
      const allKeys = [...placeholderKeys, ...boldKeys];
      const combinedRegex = new RegExp(
        allKeys
          .map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
          .join("|"),
        "g"
      );
      const wrapped = text.replace(combinedRegex, (match) => `@@${match}@@`);
      escaped = escapeHtml(wrapped);

      // Restore timestamp anchors
      for (const key of placeholderKeys) {
        const wrappedKey = `@@${key}@@`;
        escaped = escaped.replace(
          new RegExp(wrappedKey, "g"),
          placeholders[key]
        );
      }

      // Restore bold tags
      for (const key of boldKeys) {
        const wrappedKey = `@@${key}@@`;
        escaped = escaped.replace(
          new RegExp(wrappedKey, "g"),
          boldPlaceholders[key]
        );
      }
    }

    // 9. Restore newline placeholders to <br/>
    escaped = escaped.replace(new RegExp(NEWLINE_PLACEHOLDER, "g"), "<br/>");

    return escaped;
  }

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
    <div className="p-4 border-t border-gray-300 space-y-6">
      {/* ─── Visual Search Form ───────────────────────────────────────────────── */}
      <form onSubmit={handleVisualSearch} className="flex gap-2 items-center">
        <input
          type="text"
          value={visualQuery}
          onChange={(e) => setVisualQuery(e.target.value)}
          placeholder="Visual search: e.g. “red car”"
          className="flex-1 border rounded p-2"
        />
        <button
          type="submit"
          disabled={loadingVisual}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          {loadingVisual ? "Searching…" : "Search"}
        </button>
      </form>

      {/* ─── Visual Search Result ─────────────────────────────────────────────── */}
      {visualResult && (
        <div className="border p-3 rounded bg-gray-50">
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

      {/* ─── Divider ───────────────────────────────────────────────────────────── */}
      <hr className="border-gray-300" />

      {/* ─── Chat Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleChatSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the video..."
          className="flex-1 border rounded p-2"
        />
        <button
          type="submit"
          disabled={loadingChat}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {loadingChat ? "Sending…" : "Send"}
        </button>
      </form>

      {/* ─── Chat History ──────────────────────────────────────────────────────── */}
      <div className="max-h-64 overflow-y-auto space-y-4">
        {history.map((qa, idx) => (
          <div key={idx} className="border p-3 rounded bg-white">
            <p className="font-semibold text-gray-800">Q: {qa.question}</p>
            <div
              className="mt-1 text-gray-700"
              onClick={handleLinkClick}
              dangerouslySetInnerHTML={{ __html: qa.answer }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
