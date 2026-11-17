import type {
  GeneratedLessonSegment,
  WhiteboardAction,
} from "@/schemas/lesson.schema";

export function createVisualActions(
  segment: GeneratedLessonSegment,
  index: number,
): WhiteboardAction[] {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = 50 + column * 310;
  const y = 145 + row * 235;
  const baseId = `segment-${index + 1}`;
  const rawHeading = segment.heading.trim();
  const heading =
    rawHeading.length > 27 ? `${rawHeading.slice(0, 27).trimEnd()}...` : rawHeading;
  const cue = segment.visualCue.trim().slice(0, 48) || heading;
  const headingAction: WhiteboardAction = {
    type: "text",
    id: `${baseId}-heading`,
    content: heading,
    x,
    y: y - 28,
    atMs: 0,
  };

  if (segment.visualType === "text") {
    return [
      headingAction,
      {
        type: "text",
        id: `${baseId}-cue`,
        content: cue,
        x,
        y: y + 52,
        atMs: 7000,
      },
    ];
  }

  if (segment.visualType === "rectangle") {
    return [
      headingAction,
      {
        type: "rectangle",
        id: `${baseId}-shape`,
        x,
        y,
        width: 250,
        height: 100,
        label: cue,
        atMs: 0,
      },
    ];
  }

  if (segment.visualType === "circle") {
    return [
      headingAction,
      {
        type: "circle",
        id: `${baseId}-shape`,
        x: x + 125,
        y: y + 50,
        radius: 48,
        label: cue,
        atMs: 0,
      },
    ];
  }

  return [
    headingAction,
    {
      type: "arrow",
      id: `${baseId}-shape`,
      from: { x: x + 10, y: y + 50 },
      to: { x: x + 240, y: y + 50 },
      atMs: 0,
    },
    {
      type: "text",
      id: `${baseId}-cue`,
      content: cue,
      x,
      y: y + 105,
      atMs: 7000,
    },
  ];
}
