import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateGroqText, GroqApiError } from "@/lib/groq";

const RequestSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  lesson: z.object({
    title: z.string().max(200),
    introduction: z.string().max(2000),
    segments: z.array(
      z.object({
        heading: z.string().max(200),
        narration: z.string().max(4000),
      }),
    ).min(1).max(12),
  }),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(1000),
    }),
  ).min(1).max(12),
});

export async function POST(request: NextRequest) {
  try {
    const input = RequestSchema.parse(await request.json());
    const answer = await generateGroqText([
      {
        role: "system",
        content: "You are a friendly, accurate tutor. Answer clearly and concisely. Use the lesson context and conversation. If a detail is not in the lesson, answer from reliable general knowledge. Do not generate code unless the student asks for it.",
      },
      {
        role: "user",
        content: `Topic: ${input.topic}

LESSON CONTEXT:
${JSON.stringify(input.lesson)}

CONVERSATION:
${input.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n")}`,
      },
    ]);

    return NextResponse.json({ success: true, data: { answer } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const apiKey = process.env.GROQ_API_KEY;
    const safeMessage = apiKey ? message.replaceAll(apiKey, "[redacted]") : message;
    console.error(
      "Follow-up answer error:",
      safeMessage,
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Please send a valid question about this lesson." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "GROQ_API_KEY is missing") {
      return NextResponse.json(
        { success: false, error: "AI tutor is not configured. Add GROQ_API_KEY to the server environment." },
        { status: 503 },
      );
    }

    if (error instanceof GroqApiError && error.status === 429) {
      return NextResponse.json(
        { success: false, error: "Groq free-plan limit reached. Try again later." },
        { status: 429 },
      );
    }

    if (error instanceof GroqApiError && (error.status === 401 || error.status === 403)) {
      return NextResponse.json(
        { success: false, error: "Groq rejected the API key. Check GROQ_API_KEY and its account access." },
        { status: 502 },
      );
    }

    if (error instanceof GroqApiError && error.status === 404) {
      return NextResponse.json(
        { success: false, error: "The configured Groq model is unavailable. Check GROQ_MODEL and your account's model access." },
        { status: 502 },
      );
    }

    if (error instanceof GroqApiError && error.status === 400) {
      return NextResponse.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === "development"
              ? `Groq rejected the tutor request: ${safeMessage}`
              : "Groq rejected the tutor request. Check the model and request configuration.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: false, error: "The tutor could not answer right now. Please try again." },
      { status: 502 },
    );
  }
}
