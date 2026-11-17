
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLesson } from "@/services/lesson.service";
import { GroqApiError } from "@/lib/groq";

const RequestSchema = z.object({
  topic: z.string().trim().min(3).max(200),
  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced",
  ]).default("beginner"),
});

function getSafeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const apiKey = process.env.GROQ_API_KEY;
  return (apiKey ? message.replaceAll(apiKey, "[redacted]") : message).slice(0, 500);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Please send a valid JSON lesson request." },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a topic of 3 to 200 characters and a valid lesson level." },
      { status: 400 }
    );
  }

  try {
    const result = await generateLesson(parsed.data);
    return NextResponse.json({
      success: true,
      data: result.lesson,
      source: result.source,
    });
  } catch (error) {
    const detail = getSafeErrorMessage(error);
    console.error("Generate lesson error:", detail);

    if (error instanceof z.ZodError) {
      const issues = error.issues
        .slice(0, 6)
        .map((issue) => `${issue.path.join(".") || "lesson"}: ${issue.message}`)
        .join("; ");
      return NextResponse.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === "development"
              ? `The AI lesson did not match the expected format: ${issues}`
              : "The AI returned a lesson in an unexpected format. Please try again.",
        },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message === "GROQ_API_KEY is missing") {
      return NextResponse.json(
        {
          success: false,
          error: "AI tutor is not configured. Add GROQ_API_KEY to the server environment.",
        },
        { status: 503 }
      );
    }

    if (error instanceof GroqApiError && error.status === 429) {
      return NextResponse.json(
        { success: false, error: "Groq free-plan limit reached. Try again later." },
        { status: 429 }
      );
    }

    if (error instanceof GroqApiError && (error.status === 401 || error.status === 403)) {
      return NextResponse.json(
        { success: false, error: "Groq rejected the API key. Check GROQ_API_KEY and its account access." },
        { status: 502 }
      );
    }

    if (error instanceof GroqApiError && error.status === 404) {
      return NextResponse.json(
        { success: false, error: "The configured Groq model is unavailable. Check GROQ_MODEL and your account's model access." },
        { status: 502 }
      );
    }

    if (error instanceof GroqApiError && error.status === 400) {
      return NextResponse.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === "development"
              ? `Groq rejected the lesson request: ${detail}`
              : "Groq rejected the lesson request. Check the model and request configuration.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? `Lesson generation failed: ${detail}`
            : "Lesson generation failed",
      },
      { status: 502 }
    );
  }
}
