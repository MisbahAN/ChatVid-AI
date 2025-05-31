"use client";

import { useState } from "react";
import { postQuestion } from "@/lib/api";

type QA = {
  question: string;
  answer: string;
};

type ChatBoxProps = {
  videoUrl: string;
  onTimestampClick: (start: number) => void;
};

export default function ChatBox({ videoUrl, onTimestampClick }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);

  // Parse "HH:MM:SS" or "MM:SS" into total seconds
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

  // Format seconds into "M:SS"
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

  // Escape HTML entities
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Convert raw answer into HTML with local ?start= links in blue underline
  function transformAnswer(raw: string): string {
    let text = raw;

    // 1. Unescape any \" → "
    text = text.replace(/\\"/g, '"');

    // 2. Strip surrounding quotes if the entire text is wrapped in quotes
    text = text.trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("“") && text.endsWith("”"))
    ) {
      text = text.slice(1, -1);
    }

    // 3. Convert YouTube‐style <a href="…&t=XXs">…</a> into local mm:ss links
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

    // 4. Convert ranges "00:00:27--00:00:43" or "0:00:27–0:00:43" to "(0:27–0:43)"
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

    // 5. Convert single timestamps "HH:MM:SS" or "MM:SS" to "<a href="?start=XX">M:SS</a>"
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

    // 6. Escape remaining text, then restore placeholders
    let escaped = "";
    if (Object.keys(placeholders).length === 0) {
      escaped = escapeHtml(text);
    } else {
      const combined = text.replace(
        new RegExp(
          Object.keys(placeholders)
            .map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
            .join("|"),
          "g"
        ),
        (match) => `@@${match}@@`
      );
      escaped = escapeHtml(combined);
      for (const key in placeholders) {
        const placeholderKey = `@@${key}@@`;
        escaped = escaped.replace(
          new RegExp(placeholderKey, "g"),
          placeholders[key]
        );
      }
    }

    return escaped;
  }

  // New handleSend now takes event so Enter can submit
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
    setLoading(true);

    try {
      const res = await postQuestion(videoUrl, input, apiKey);
      const transformed = transformAnswer(res.answer);
      setHistory((prev) => [...prev, { question: input, answer: transformed }]);
      setInput("");
    } catch (err) {
      alert("Error getting response. Check console.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Intercept clicks on <a href="?start=XX">
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
    <div className="p-4 border-t border-gray-300 space-y-4">
      {/* Wrap input/button in a form so Enter works */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the video..."
          className="flex-1 border rounded p-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>

      {/* History */}
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
