import { describe, expect, it } from "vitest";

import { DEMO_LESSONS } from "@/data/demo-lessons";
import { scheduleActions } from "@/lib/lesson-timeline";

describe("scheduleActions", () => {
  it("schedules lesson visuals in order within the lesson duration", () => {
    const lesson = DEMO_LESSONS[0].lesson;
    const durationSeconds = 120;
    const scheduled = scheduleActions(lesson, durationSeconds);

    expect(scheduled.length).toBe(
      lesson.segments.reduce(
        (total, segment) => total + segment.visuals.length,
        0,
      ),
    );
    expect(scheduled.map(({ atSeconds }) => atSeconds)).toEqual(
      [...scheduled.map(({ atSeconds }) => atSeconds)].sort((a, b) => a - b),
    );
    expect(scheduled.every(({ atSeconds }) => atSeconds >= 0 && atSeconds <= durationSeconds)).toBe(true);
  });

  it("applies visual offsets relative to their segment start", () => {
    const lesson = DEMO_LESSONS[0].lesson;
    const scheduled = scheduleActions(lesson, 120);
    const delayedFirstSegmentAction = scheduled.find(
      ({ action }) => action.id === "segment-1-cue",
    );

    expect(delayedFirstSegmentAction?.atSeconds).toBe(7);
  });
});
