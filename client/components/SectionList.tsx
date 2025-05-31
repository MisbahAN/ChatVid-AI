"use client";

import React from "react";

type Section = {
  start: string; // backend gives "MM:SS" or "HH:MM:SS"
  end: string;
  summary: string;
};

type SectionListProps = {
  sections: Section[];
  onTimestampClick: (seconds: number) => void;
};

export default function SectionList({
  sections,
  onTimestampClick,
}: SectionListProps) {
  /**
   * Parse a "HH:MM:SS" or "MM:SS" timestamp into total seconds.
   * Examples:
   *   "00:00"   → 0
   *   "01:18"   → 78
   *   "1:02:05" → 3725
   */
  function parseTimestamp(ts: string): number {
    const parts = ts.split(":").map((part) => parseInt(part, 10));
    if (parts.some((n) => isNaN(n))) return NaN;

    if (parts.length === 2) {
      // [MM, SS]
      const [mm, ss] = parts;
      return mm * 60 + ss;
    } else if (parts.length === 3) {
      // [HH, MM, SS]
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

  // Convert each raw section.start ("MM:SS") → numeric seconds.
  // Then drop any sections where parsing failed.
  const validSections = sections
    .map((sec) => {
      const startSeconds = parseTimestamp(sec.start);
      return { startSeconds, summary: sec.summary };
    })
    .filter((sec) => !isNaN(sec.startSeconds));

  if (validSections.length === 0) {
    return <p>No sections available.</p>;
  }

  return (
    <ul className="space-y-2">
      {validSections.map((sec, idx) => (
        <li
          key={idx}
          className="cursor-pointer hover:bg-gray-200 p-2 rounded"
          onClick={() => onTimestampClick(sec.startSeconds)}
        >
          <span className="font-mono text-sm text-blue-600">
            {formatTime(sec.startSeconds)}
          </span>{" "}
          –{" "}
          <span className="text-sm">
            {sec.summary.length > 60
              ? sec.summary.substring(0, 60) + "..."
              : sec.summary}
          </span>
        </li>
      ))}
    </ul>
  );
}
