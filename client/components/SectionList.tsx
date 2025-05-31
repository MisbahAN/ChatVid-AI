interface Section {
  start: string; // "MM:SS"
  end: string; // "MM:SS"
  summary: string;
}

interface SectionListProps {
  sections: Section[];
  loading: boolean;
  videoId: string; // We need videoId to build the hyperlink
}

export default function SectionList({
  sections,
  loading,
  videoId,
}: SectionListProps) {
  if (loading) {
    return <p>Loading summaries...</p>;
  }

  if (sections.length === 0) {
    return <p className="text-gray-600">No summaries found.</p>;
  }

  return (
    <ul className="space-y-2">
      {sections.map((sec, index) => {
        // Convert "MM:SS" to total seconds
        const [mins, secs] = sec.start.split(":");
        const totalSeconds = parseInt(mins, 10) * 60 + parseInt(secs, 10);

        // Build a YouTube URL with the timestamp (in seconds)
        const link = `https://www.youtube.com/watch?v=${videoId}&t=${totalSeconds}s`;

        return (
          <li key={index} className="p-3 border rounded bg-white shadow-sm">
            <p className="text-sm text-gray-600 mb-1">
              ⏱️ {sec.start} → {sec.end}
            </p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              {sec.summary}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
