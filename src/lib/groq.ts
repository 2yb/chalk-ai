export type GroqMessage = {
  role: "system" | "user";
  content: string;
};

interface GroqCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
}

export class GroqApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GroqApiError";
  }
}

export async function generateGroqText(
  messages: GroqMessage[],
  jsonMode = false,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing");
  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        messages,
        ...(jsonMode
          ? {
              response_format: { type: "json_object" },
              max_completion_tokens: 4096,
              ...(model.startsWith("openai/gpt-oss-")
                ? { reasoning_effort: "low" }
                : {}),
            }
          : {}),
      }),
    });
  } catch (error) {
    throw new GroqApiError(
      0,
      error instanceof Error ? `Could not connect to Groq: ${error.message}` : "Could not connect to Groq.",
    );
  }

  let result: GroqCompletionResponse;
  try {
    result = (await response.json()) as GroqCompletionResponse;
  } catch {
    throw new GroqApiError(response.status, "Groq returned an unreadable response.");
  }

  if (!response.ok) {
    throw new GroqApiError(
      response.status,
      result.error?.message ?? "Groq rejected the request.",
    );
  }

  const text = result.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}
