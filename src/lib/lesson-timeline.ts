import type { Lesson, WhiteboardAction } from "@/schemas/lesson.schema";

export type ScheduledAction = {
  atSeconds: number;
  action: WhiteboardAction;
};

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function scheduleActions(
  lesson: Lesson,
  durationSeconds: number,
): ScheduledAction[] {
  const wordCounts = lesson.segments.map((segment) =>
    Math.max(1, getWordCount(segment.narration)),
  );
  const totalWords = wordCounts.reduce((total, count) => total + count, 0);
  let segmentStart = 0;

  return lesson.segments.flatMap((segment, index) => {
    const segmentDuration = durationSeconds * (wordCounts[index] / totalWords);
    const scheduled = segment.visuals.map((action) => ({
      action,
      atSeconds: segmentStart + Math.min(segmentDuration, action.atMs / 1000),
    }));
    segmentStart += segmentDuration;
    return scheduled;
  });
}
