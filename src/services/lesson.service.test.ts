import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateGroqText, GroqApiError } from "@/lib/groq";
import {
  generateLesson,
  LessonGenerationUnavailableError,
} from "@/services/lesson.service";

vi.mock("@/lib/groq", () => ({
  generateGroqText: vi.fn(),
  GroqApiError: class GroqApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "GroqApiError";
    }
  },
}));

describe("generateLesson fallback", () => {
  beforeEach(() => {
    vi.mocked(generateGroqText).mockRejectedValue(
      new GroqApiError(0, "offline"),
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a matching demo lesson when generation is unavailable", async () => {
    const result = await generateLesson({
      topic: "Explain black holes to me",
      difficulty: "beginner",
    });

    expect(result.source).toBe("fallback");
    expect(result.lesson).toEqual(
      expect.objectContaining({ title: "How Black Holes Work" }),
    );
  });

  it("does not substitute an unrelated demo for an unmatched topic", async () => {
    await expect(
      generateLesson({
        topic: "How do volcanoes erupt?",
        difficulty: "beginner",
      }),
    ).rejects.toBeInstanceOf(LessonGenerationUnavailableError);
  });
});
