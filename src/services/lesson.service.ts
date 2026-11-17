
import { generateGroqText, GroqApiError } from "@/lib/groq";
import { getDemoLessonForTopic } from "@/data/demo-lessons";
import { createVisualActions } from "@/lib/lesson-visuals";
import { z } from "zod";
import {
  GroqLessonResponseSchema,
  LessonSchema,
  type Lesson,
} from "@/schemas/lesson.schema";

interface GenerateLessonInput {
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface LessonCacheEntry {
  lesson: Lesson;
  expiresAt: number;
}

export interface LessonGenerationResult {
  lesson: Lesson;
  source: "generated" | "cached" | "fallback";
}

export class LessonGenerationUnavailableError extends Error {
  constructor() {
    super("AI lesson generation is temporarily unavailable for this topic.");
    this.name = "LessonGenerationUnavailableError";
  }
}

const LESSON_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_LESSONS = 50;
const lessonCache = new Map<string, LessonCacheEntry>();

function getCacheKey(input: GenerateLessonInput) {
  const normalizedTopic = input.topic.trim().replace(/\s+/g, " ").toLowerCase();
  return `${input.difficulty}:${normalizedTopic}`;
}

function getCachedLesson(key: string) {
  const cached = lessonCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    lessonCache.delete(key);
    return null;
  }
  return cached.lesson;
}

function cacheLesson(key: string, lesson: Lesson) {
  const now = Date.now();
  for (const [cachedKey, cached] of lessonCache) {
    if (cached.expiresAt <= now) lessonCache.delete(cachedKey);
  }

  while (lessonCache.size >= MAX_CACHED_LESSONS) {
    const oldestKey = lessonCache.keys().next().value;
    if (oldestKey === undefined) break;
    lessonCache.delete(oldestKey);
  }

  lessonCache.set(key, { lesson, expiresAt: now + LESSON_CACHE_TTL_MS });
}

function canUseDemoFallback(error: unknown) {
  return (
    error instanceof GroqApiError ||
    error instanceof z.ZodError ||
    error instanceof SyntaxError ||
    (error instanceof Error &&
      (error.message === "GROQ_API_KEY is missing" ||
        error.message === "Groq returned an empty response."))
  );
}

async function generateGroqLesson(
  input: GenerateLessonInput
): Promise<Lesson> {
  const prompt = `
You are an expert teacher creating a visual lesson. Teach the topic in an
approximately 2-minute lesson and output one compact JSON object only.

TOPIC: ${input.topic}
DIFFICULTY: ${input.difficulty}

The object must contain title, topic, introduction, estimatedDurationSeconds,
learningObjectives (at least 2), and segments.
segments is an object containing ALL six keys: segment1, segment2, segment3,
segment4, segment5, and segment6. Never omit or combine a segment.
Each segment contains id, heading, narration, visualType (text, rectangle,
circle, or arrow), and visualCue (2-5 words). Keep each narration between 38
and 45 words. Use six distinct concepts that build on one another. Do not
include coordinates, atMs, or drawing geometry; the application creates those.
Explain the subject accurately.

Do not use Markdown, HTML, SVG, JavaScript, or extra properties. Return valid
JSON only. Numbers must be numbers, not strings.
`;

  const request = (instructions: string) =>
    generateGroqText([{ role: "user", content: instructions }], true);
  const parseResponse = (response: string) => {
    const generated = GroqLessonResponseSchema.parse(JSON.parse(response));
    return LessonSchema.parse({
      ...generated,
      segments: Object.values(generated.segments).map((segment, index) => ({
        id: segment.id,
        heading: segment.heading,
        narration: segment.narration,
        visuals: createVisualActions(segment, index),
      })),
    });
  };

  let response: string;
  let usedRetry = false;
  try {
    response = await request(prompt);
  } catch (error) {
    if (
      !(error instanceof GroqApiError) ||
      error.status !== 400 ||
      (!error.message.includes("Failed to generate JSON") &&
        !error.message.includes("Failed to validate JSON"))
    ) {
      throw error;
    }

    usedRetry = true;
    response = await request(
      `${prompt}\nReturn all six named segment keys, each with a short narration and one visual.`,
    );
  }

  try {
    return parseResponse(response);
  } catch (error) {
    if (!(error instanceof z.ZodError) && !(error instanceof SyntaxError)) {
      throw error;
    }
    if (usedRetry) throw error;

    const validationIssue =
      error instanceof z.ZodError
        ? error.issues
            .slice(0, 6)
            .map((issue) => `${issue.path.join(".") || "lesson"}: ${issue.message}`)
            .join("; ")
        : "The response was not valid JSON.";
    const retryResponse = await request(
      `${prompt}\n\nYour prior response failed validation: ${validationIssue}\nPrior response: ${response}\nReturn a complete corrected lesson with all six segment keys. Do not omit segment2, segment3, segment4, segment5, or segment6.`,
    );
    return parseResponse(retryResponse);
  }
}

export async function generateLesson(
  input: GenerateLessonInput,
): Promise<LessonGenerationResult> {
  const cacheKey = getCacheKey(input);
  const cachedLesson = getCachedLesson(cacheKey);
  if (cachedLesson) {
    return { lesson: cachedLesson, source: "cached" };
  }

  try {
    const lesson = await generateGroqLesson(input);
    cacheLesson(cacheKey, lesson);
    return { lesson, source: "generated" };
  } catch (error) {
    if (!canUseDemoFallback(error)) throw error;

    console.warn(
      "AI lesson generation failed; serving a preloaded demo lesson.",
      error instanceof GroqApiError
        ? `Groq status ${error.status}`
        : error instanceof z.ZodError
          ? "AI response validation failed"
          : error instanceof SyntaxError
            ? "AI response was not valid JSON"
            : "AI service is unavailable",
    );
    const fallbackLesson = getDemoLessonForTopic(input.topic);
    if (!fallbackLesson) throw new LessonGenerationUnavailableError();

    return { lesson: LessonSchema.parse(fallbackLesson), source: "fallback" };
  }
}
