"use client";

import dynamic from "next/dynamic";

// Dynamically import only the YouTube version of ReactPlayer (no SSR)
const ReactPlayer = dynamic(() => import("react-player/youtube"), {
  ssr: false,
});

interface VideoPlayerProps {
  videoId: string;
}

export default function VideoPlayer({ videoId }: VideoPlayerProps) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <ReactPlayer url={videoUrl} controls width="100%" />
    </div>
  );
}
