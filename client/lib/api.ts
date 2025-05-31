// File: client/lib/api.ts

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

  // Read the raw text (HTML string) that the /question endpoint returns
  const text = await res.text();
  return { answer: text };
}
