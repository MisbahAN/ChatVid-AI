"use client";

type VideoPlayerProps = {
  videoId: string; // e.g. "KPD8C7c6P1w"
  startSec: number; // e.g. 83
};

export default function VideoPlayer({ videoId, startSec }: VideoPlayerProps) {
  // The `?autoplay=1` causes it to start playing automatically at startSec.
  // The `&enablejsapi=1` is optional (we're not using postMessage here).
  const src = `https://www.youtube.com/embed/${videoId}?start=${startSec}&autoplay=1&rel=0`;

  return (
    <iframe
      key={`${videoId}?start=${startSec}`} // force reload when startSec changes
      width="100%"
      height="100%"
      src={src}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
}
