
import { z } from "zod";

const common = {
  id: z.string(),
  atMs: z.number().nonnegative(),
};

const TextAction = z.object({
  ...common,
  type: z.enum(["text"]),
  content: z.string(),
  x: z.number(),
  y: z.number(),
});

const RectangleAction = z.object({
  ...common,
  type: z.enum(["rectangle"]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string(),
});

const CircleAction = z.object({
  ...common,
  type: z.enum(["circle"]),
  x: z.number(),
  y: z.number(),
  radius: z.number().positive(),
  label: z.string(),
});

const ArrowAction = z.object({
  ...common,
  type: z.enum(["arrow"]),
  from: z.object({
    x: z.number(),
    y: z.number(),
  }),
  to: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const WhiteboardActionSchema =
  z.discriminatedUnion("type", [
    TextAction,
    RectangleAction,
    CircleAction,
    ArrowAction,
  ]);

const GeneratedSegmentSchema = z.object({
  id: z.string(),
  heading: z.string(),
  narration: z.string(),
  visualType: z.enum(["text", "rectangle", "circle", "arrow"]),
  visualCue: z.string(),
});

export type GeneratedLessonSegment = z.infer<typeof GeneratedSegmentSchema>;

const GeneratedSegmentsSchema = z.object({
  segment1: GeneratedSegmentSchema,
  segment2: GeneratedSegmentSchema,
  segment3: GeneratedSegmentSchema,
  segment4: GeneratedSegmentSchema,
  segment5: GeneratedSegmentSchema,
  segment6: GeneratedSegmentSchema,
});

export const GroqLessonResponseSchema = z.object({
  title: z.string(),
  topic: z.string(),
  introduction: z.string(),
  estimatedDurationSeconds: z.number(),
  learningObjectives: z.array(z.string()),
  segments: GeneratedSegmentsSchema,
});

const LessonOutputSchema = z.object({
  title: z.string(),
  topic: z.string(),
  introduction: z.string(),
  estimatedDurationSeconds: z.number().positive(),
  learningObjectives: z.array(z.string()).min(2),
  segments: z.array(
    z.object({
      id: z.string(),
      heading: z.string(),
      narration: z.string().min(10),
      visuals: z.array(WhiteboardActionSchema).min(1),
    })
  ).min(6).max(8),
});

export const LessonSchema = LessonOutputSchema.superRefine((lesson, ctx) => {
  const ids = new Set<string>();

  lesson.segments.forEach((segment, index) => {
    segment.visuals.forEach((visual) => {
      if (ids.has(visual.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate visual ID: ${visual.id}`,
          path: ["segments", index, "visuals"],
        });
      }

      ids.add(visual.id);

      if (
        "x" in visual &&
        (visual.x < 0 || visual.x > 1000)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "X coordinate is outside the whiteboard",
        });
      }

      if (
        "y" in visual &&
        (visual.y < 0 || visual.y > 600)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Y coordinate is outside the whiteboard",
        });
      }
    });
  });
});

export type Lesson = z.infer<typeof LessonSchema>;
export type WhiteboardAction = z.infer<
  typeof WhiteboardActionSchema
>;
