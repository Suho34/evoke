import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema, NoteResponseSchema, safeParseNoteResponse } from "@/lib/schemas";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { parseSyllabus } from "@/lib/parse-syllabus";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateFingerprint, getCached, setCached } from "@/lib/cache";
import type { NoteResponse } from "@/lib/schemas";

export const maxDuration = 60;
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (unchanged)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${Math.ceil(rateLimit.reset / 1000)} seconds.`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.reset / 1000)) } }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

    const body = await request.json();
    const validation = GenerateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", issues: validation.error.issues.map(i => ({ path: i.path.join("."), message: i.message })) },
        { status: 400 }
      );
    }

    const { syllabus, level, depth } = validation.data;
    if (!syllabus?.trim()) {
      return NextResponse.json({ error: "Empty syllabus" }, { status: 400 });
    }

    // Cache check
    const fingerprint = generateFingerprint(syllabus, level, depth);
    const cached = getCached<NoteResponse>(fingerprint);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    // ─── Topic Extraction ────────────────────────────────────
    // Use the robust parser to get a clean list of topics
    const extractedTopics = parseSyllabus(syllabus);
    if (depth === "deep-dive" && extractedTopics.length > 5) {
      console.warn("Too many topics for 'Deep Dive', model performance may degrade.");
    }
    
    // ─── Build Prompts ───────────────────────────────────────
    const systemPrompt = buildSystemPrompt(level, depth);
    // Pass extracted topics if we found any, otherwise fallback to raw text
    const userPrompt = buildUserPrompt(syllabus, depth, extractedTopics);

    // ─── Use manual streaming + fallback parsing (more robust for free models) ───
    let rawResponse = "";
    let finalObject: NoteResponse | null = null;

    const result = streamText({
      model: openrouter("openrouter/free"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxRetries: 2,
      onChunk: ({ chunk }) => {
        // Accumulate raw text if we need to fallback
        if (chunk.type === "text-delta") {
          rawResponse += chunk.text;
        }
      },
      onFinish: async ({ text, finishReason }) => {
        if (finishReason === "stop") {
          // First try: model might have returned valid JSON directly
          try {
            const parsed = JSON.parse(text);
            const validated = NoteResponseSchema.parse(parsed);
            finalObject = validated;
            setCached(fingerprint, validated);
          } catch {
            // Fallback: use our safe parser that fixes common model errors
            const parsed = safeParseNoteResponse(text || rawResponse);
            if (parsed.success && parsed.data) {
              finalObject = parsed.data;
              setCached(fingerprint, parsed.data);
            } else {
              console.error("Failed to parse model output even with fallback", parsed.error);
            }
          }
        }
      },
    });

    // Return the stream immediately. The `onFinish` will cache asynchronously.
    return result.toTextStreamResponse({
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-Cache": "MISS",
      },
    });

  } catch (error) {
    console.error("/api/generate error:", error);
    return NextResponse.json(
      { error: "Generation failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}