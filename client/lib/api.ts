// File: client/lib/api.ts

/**
 * Send a user question to the backend /question endpoint.
 * Expects JSON response: { answer: string }
 */
export async function postQuestion(
  videoUrl: string,
  question: string,
  apiKey: string
): Promise<{ answer: string }> {
  const res = await fetch("http://localhost:8000/question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: videoUrl,
      question,
      api_key: apiKey,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get answer");
  }
  const text = await res.text();
  return { answer: text };
}

/**
 * Send a visual‐search query (e.g. "red car") to the backend /visual-search endpoint.
 * Expects JSON response: { timestamp: number, description: string, score?: number }
 */
export async function postVisualSearch(
  videoUrl: string,
  query: string,
  apiKey: string
): Promise<{ timestamp: number; description: string; score?: number }> {
  const res = await fetch("http://localhost:8000/visual-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: videoUrl,
      query,
      api_key: apiKey,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get visual search result");
  }
  return res.json();
}
