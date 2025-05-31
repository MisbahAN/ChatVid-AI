import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChatVid AI",
  description: "AI-powered video chat and analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* The browser will request /ChatVid-AI.ico from public/ */}
        <link rel="icon" href="/ChatVid-AI.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
