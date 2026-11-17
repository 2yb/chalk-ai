import { describe, expect, it } from "vitest";

import { DEMO_LESSONS } from "@/data/demo-lessons";
import { LessonSchema } from "@/schemas/lesson.schema";

describe("LessonSchema", () => {
  it("accepts the bundled demo lessons", () => {
    for (const demo of DEMO_LESSONS) {
      expect(LessonSchema.safeParse(demo.lesson).success).toBe(true);
    }
  });

  it("rejects lessons with duplicate visual IDs", () => {
    const lesson = structuredClone(DEMO_LESSONS[0].lesson);
    lesson.segments[1].visuals[0].id = lesson.segments[0].visuals[0].id;

    expect(LessonSchema.safeParse(lesson).success).toBe(false);
  });
});
