import { z } from "zod";

// ─── Note Section Schema (Enhanced) ─────────────────────────────────
export const NoteSectionSchema = z.object({
  definition: z
    .string()
    .min(5, "Definition must be at least 5 characters")
    .max(2000, "Definition too long")
    .describe("Clear, concise definition of the topic"),

  keyPoints: z
    .array(z.string().min(1, "Key point cannot be empty"))
    .min(1, "At least one key point required")
    .max(15, "Maximum 15 key points")
    .describe("Key points to remember for exams"),

  formulas: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Relevant formulas, equations, or theorems (empty array if none)"),

  diagrams: z
    .union([z.string().min(1), z.null()])
    .optional()
    .default(null)
    .describe("Text description of important diagrams (null if none)"),

  examples: z
    .array(z.string().min(3, "Each example must be at least 3 characters"))
    .min(1, "At least one example required")
    .max(10, "Maximum 10 examples")
    .describe("Worked examples or real-world applications"),

  commonMistakes: z
    .array(z.string().min(3, "Each mistake explanation must be at least 3 characters"))
    .min(1, "At least one common mistake required")
    .max(10, "Maximum 10 mistakes")
    .describe("Common mistakes students make on this topic"),

  examTips: z
    .array(z.string().min(3, "Each tip must be at least 3 characters"))
    .min(1, "At least one exam tip required")
    .max(10, "Maximum 10 tips")
    .describe("Specific tips for answering exam questions on this topic"),

  mnemonics: z
    .union([z.string().min(1), z.null()])
    .optional()
    .default(null)
    .describe("Memory aids (null if none)"),

  practiceQuestions: z
    .array(z.string().min(5, "Each practice question must be at least 5 characters"))
    .min(1, "At least one practice question required")
    .max(15, "Maximum 15 questions")
    .describe("Practice questions for self-testing"),
});

export type NoteSection = z.infer<typeof NoteSectionSchema>;

// ─── Single Topic Note ─────────────────────────────────────────────
export const TopicNoteSchema = z.object({
  topic: z
    .string()
    .min(1, "Topic name cannot be empty")
    .max(200, "Topic name too long")
    .describe("The topic name"),
  notes: NoteSectionSchema,
});

export type TopicNote = z.infer<typeof TopicNoteSchema>;

// ─── Full AI Response (before extraction) ──────────────────────────
export const NoteResponseSchema = z.object({
  topics: z
    .array(TopicNoteSchema)
    .min(1, "At least one topic required")
    .max(50, "Too many topics (max 50)"),
});

export type NoteResponse = z.infer<typeof NoteResponseSchema>;

// ─── Request Schemas (unchanged but with refinements) ──────────────
export const DepthLevelSchema = z.enum(["quick-review", "standard", "deep-dive"]);
export type DepthLevel = z.infer<typeof DepthLevelSchema>;

export const AcademicLevelSchema = z.enum(["high-school", "college", "postgraduate"]);
export type AcademicLevel = z.infer<typeof AcademicLevelSchema>;

export const GenerateRequestSchema = z.object({
  syllabus: z
    .string()
    .min(5, "Syllabus must be at least 5 characters")
    .max(50000, "Syllabus is too long (max 50,000 characters)"),
  level: AcademicLevelSchema.default("college"),
  depth: DepthLevelSchema.default("standard"),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ─── Export Schemas ────────────────────────────────────────────────
export const ExportFormatSchema = z.enum(["pdf", "md", "html"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportRequestSchema = z.object({
  notes: z.array(TopicNoteSchema),
  format: ExportFormatSchema.default("pdf"),
  level: z.string().default("college"),
  title: z.string().min(1).max(100).default("Study Notes"),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// ─── Helper: Safe Parse with Auto‑Repair ───────────────────────────
/**
 * Attempts to parse raw AI output into a valid NoteResponse.
 * Handles common model errors (extra text, missing fields, wrong types).
 */
export function safeParseNoteResponse(raw: string): { success: boolean; data?: NoteResponse; error?: string } {
  // 1. Clean markdown and extra text
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Extract first complete JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return { success: false, error: "No JSON object found in response" };
  }
  let jsonStr = cleaned.substring(firstBrace, lastBrace + 1);

  // 3. Fix trailing commas (common in model outputs)
  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  // 4. Try parsing with Zod, with fallback repairs
  try {
    const parsed = JSON.parse(jsonStr);
    // Ensure required fields exist, add defaults for missing optional fields
    const withDefaults = {
      topics: (parsed.topics || []).map((topic: any) => ({
        topic: topic.topic || "Untitled",
        notes: {
          definition: topic.notes?.definition || "No definition provided.",
          keyPoints: topic.notes?.keyPoints || ["Key point missing"],
          formulas: topic.notes?.formulas ?? [],
          diagrams: topic.notes?.diagrams ?? null,
          examples: topic.notes?.examples || ["Example missing"],
          commonMistakes: topic.notes?.commonMistakes || ["Common mistake missing"],
          examTips: topic.notes?.examTips || ["Exam tip missing"],
          mnemonics: topic.notes?.mnemonics ?? null,
          practiceQuestions: topic.notes?.practiceQuestions || ["Practice question missing"],
        },
      })),
    };
    const validated = NoteResponseSchema.parse(withDefaults);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: `Validation failed: ${err.issues.map(e => e.message).join("; ")}` };
    }
    return { success: false, error: `JSON parse error: ${(err as Error).message}` };
  }
}

// ─── Optional: Depth‑specific array length validator ───────────────
export function validateDepthConstraints(notes: NoteSection, depth: DepthLevel): string[] {
  const errors: string[] = [];
  const lengths = {
    quickReview: { keyPoints: [3, 3], examples: [1, 1], commonMistakes: [1, 1], examTips: [1, 1], practiceQuestions: [1, 1] },
    standard: { keyPoints: [4, 6], examples: [2, 2], commonMistakes: [2, 3], examTips: [2, 3], practiceQuestions: [3, 3] },
    deepDive: { keyPoints: [6, 10], examples: [3, 4], commonMistakes: [4, 6], examTips: [4, 6], practiceQuestions: [5, 6] },
  };
  const rules = lengths[depth === "quick-review" ? "quickReview" : depth === "standard" ? "standard" : "deepDive"];

  if (notes.keyPoints.length < rules.keyPoints[0] || notes.keyPoints.length > rules.keyPoints[1]) {
    errors.push(`keyPoints: expected ${rules.keyPoints[0]}-${rules.keyPoints[1]}, got ${notes.keyPoints.length}`);
  }
  if (notes.examples.length !== rules.examples[0]) {
    errors.push(`examples: expected ${rules.examples[0]}, got ${notes.examples.length}`);
  }
  if (notes.commonMistakes.length < rules.commonMistakes[0] || notes.commonMistakes.length > rules.commonMistakes[1]) {
    errors.push(`commonMistakes: expected ${rules.commonMistakes[0]}-${rules.commonMistakes[1]}, got ${notes.commonMistakes.length}`);
  }
  if (notes.examTips.length < rules.examTips[0] || notes.examTips.length > rules.examTips[1]) {
    errors.push(`examTips: expected ${rules.examTips[0]}-${rules.examTips[1]}, got ${notes.examTips.length}`);
  }
  if (notes.practiceQuestions.length !== rules.practiceQuestions[0]) {
    errors.push(`practiceQuestions: expected ${rules.practiceQuestions[0]}, got ${notes.practiceQuestions.length}`);
  }
  return errors;
}