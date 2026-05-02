import type { DepthLevel, AcademicLevel } from "./schemas";

// ─── Academic Level Configurations ─────────────────────────────────
const LEVEL_CONFIG: Record<AcademicLevel, { label: string; persona: string }> = {
  "high-school": {
    label: "High School",
    persona: `You are a patient, encouraging high school teacher. Use simple language, relatable analogies, and everyday examples. Avoid jargon — if you must use a technical term, immediately explain it in plain words. Assume the student is encountering this topic for the first time. Focus on building intuition and foundational understanding. Use short sentences.`,
  },
  college: {
    label: "College / Undergraduate",
    persona: `You are a university professor teaching undergraduates. Use proper technical terminology and assume familiarity with prerequisites. Provide rigorous explanations with formal definitions. Reference standard textbook approaches. Include both conceptual understanding and practical applications. Balance theory with implementation details.`,
  },
  postgraduate: {
    label: "Postgraduate / Graduate",
    persona: `You are a research-oriented graduate professor. Provide advanced, nuanced explanations that go beyond textbook coverage. Discuss edge cases, trade-offs, research implications, and connections to other fields. Reference seminal papers and advanced techniques. Assume strong foundational knowledge. Include complexity analysis, proof sketches, and advanced optimizations where relevant.`,
  },
};

// ─── Depth Configurations (now using structural length, not word budgets) ───
const DEPTH_CONFIG: Record<DepthLevel, { label: string; instructions: string }> = {
  "quick-review": {
    label: "Quick Review",
    instructions: `CRITICAL: Flashcard‑level brevity. Total per topic under 150 words.

Length rules (strict):
- definition: 1 sentence (max 20 words)
- keyPoints: EXACTLY 3 bullet points, each a short phrase (5‑10 words) — no full sentences
- formulas: 1 row only (or [] if none)
- diagrams: null (skip)
- examples: 1 short sentence
- commonMistakes: 1 short sentence
- examTips: 1 short sentence
- mnemonics: one short mnemonic or null
- practiceQuestions: 1 very short question

Do not exceed these lengths. Think exam cram sheet.`,
  },
  standard: {
    label: "Standard",
    instructions: `Balanced study notes for exam preparation.

Length rules (strict):
- definition: 2‑3 sentences
- keyPoints: 4‑6 points, each 1‑2 sentences
- formulas: all relevant formulas, with brief variable explanations (max 2 sentences per formula)
- diagrams: text description of one diagram (2‑3 sentences) or null if none
- examples: 2 examples, each with 2‑3 sentences of step‑by‑step reasoning
- commonMistakes: 2‑3 mistakes, 1 sentence each
- examTips: 2‑3 specific tips, 1 sentence each
- mnemonics: one if known (short), else null
- practiceQuestions: 3 questions (recall, understanding, application)

Total per topic: approx 250‑400 words.`,
  },
  "deep-dive": {
    label: "Deep Dive",
    instructions: `Comprehensive mastery notes, like a mini‑textbook chapter.

Length rules (strict):
- definition: 4‑6 sentences (include intuition, historical note, significance)
- keyPoints: 6‑10 points, each a paragraph of 3‑4 sentences (cover edge cases, derivations)
- formulas: all formulas with full derivation context, variable explanations, boundary conditions
- diagrams: detailed text descriptions of 2‑3 diagrams (3‑4 sentences each)
- examples: 3‑4 examples, each with 4‑5 sentences (progress from basic to advanced)
- commonMistakes: 4‑6 mistakes, each explained in 1‑2 sentences
- examTips: 4‑6 detailed strategies, 1‑2 sentences each
- mnemonics: include multiple if useful (short)
- practiceQuestions: 5‑6 questions (recall, analysis, challenge)

Total per topic: 600‑1000 words.`,
  },
};

// ─── Shared JSON format example (one‑shot learning) ─────────────────
const JSON_EXAMPLE = `{
  "topics": [
    {
      "topic": "Newton's First Law",
      "notes": {
        "definition": "An object at rest stays at rest, and an object in motion stays in motion with constant velocity unless acted by an external net force.",
        "keyPoints": ["Inertia is resistance to change in motion", "Net force = 0 implies constant velocity", "Applies in inertial frames only"],
        "formulas": ["∑F = 0 ⇔ a = 0"],
        "diagrams": "Box on a frictionless floor: forces cancel, velocity constant.",
        "examples": ["A book on a table stays at rest because normal force cancels gravity."],
        "commonMistakes": ["Thinking constant velocity requires a force – it doesn't."],
        "examTips": ["Always identify whether net force is truly zero before applying."],
        "mnemonics": "No force, no change of course.",
        "practiceQuestions": ["A puck slides on ice. Why does it eventually stop? (Answer: small friction, not lack of force)"]
      }
    }
  ]
}`;

// ─── Field empty/null rules ────────────────────────────────────────
const FIELD_RULES = `
- "formulas": Use [] (empty array) if the topic has no mathematical/scientific formulas.
- "diagrams": Use null if no meaningful diagram can be described. Otherwise a string.
- "mnemonics": Use null if no known mnemonic exists. Otherwise a short string.
- "examples", "commonMistakes", "examTips", "practiceQuestions": Always arrays (even if only one item).`;

// ─── Build System Prompt (enhanced) ────────────────────────────────
export function buildSystemPrompt(level: AcademicLevel, depth: DepthLevel): string {
  const levelConfig = LEVEL_CONFIG[level];
  const depthConfig = DEPTH_CONFIG[depth];

  return `${levelConfig.persona}

## Your Task
Generate structured study notes for ${levelConfig.label}-level exam preparation.

## DEPTH LEVEL: ${depthConfig.label}
${depthConfig.instructions}

## Output Format
You MUST output a valid JSON object with a "topics" array. Each element has:
- "topic": string (the exact topic name)
- "notes": object with exactly these 9 fields:
  1. "definition": string
  2. "keyPoints": array of strings
  3. "formulas": array of strings (or [] if none)
  4. "diagrams": string or null
  5. "examples": array of strings
  6. "commonMistakes": array of strings
  7. "examTips": array of strings
  8. "mnemonics": string or null
  9. "practiceQuestions": array of strings

${FIELD_RULES}

## Required JSON Example (follow this exactly)
${JSON_EXAMPLE}

## Critical Rules
- ACCURACY: Never fabricate information. If unsure, state uncertainty.
- JSON ONLY: Do not include any text before or after the JSON. No markdown wrappers like \`\`\`json.
- MATCH ACADEMIC LEVEL: Use appropriate terminology for ${levelConfig.label}.
- COMPLETE COVERAGE: You MUST generate notes for every single topic provided or identified. Do not truncate the list for any reason.
- IGNORE ADMINISTRATIVE CONTENT: Strictly skip and ignore all non-academic content including grading policies, attendance requirements, instructor contact info, deadlines, and campus policies.

Remember: The example shows the structure. Your output must be parseable by JSON.parse().`;
}

// ─── Build User Prompt (enhanced) ──────────────────────────────────
export function buildUserPrompt(syllabusText: string, depth: DepthLevel, extractedTopics: string[] = []): string {
  const depthConfig = DEPTH_CONFIG[depth];
  
  if (extractedTopics.length > 0) {
    return `I have extracted the following ${extractedTopics.length} academic topics from the syllabus:
${extractedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Your Task:
Generate ${depthConfig.label}-level study notes for EACH of these ${extractedTopics.length} topics. 
Do not skip any topic. If you are running out of space, prioritize completing all topics with slightly shorter content rather than skipping them.

Return the result in the JSON format specified in the system prompt.
Now generate the JSON:`;
  }

  return `Generate ${depthConfig.label}-level study notes based on the syllabus below.

=== SYLLABUS ===
${syllabusText}
================

Instructions:
1. Extract ALL valid academic topics. Do not miss any.
2. For each topic, produce the JSON structure described in the system prompt.
3. Follow the depth level length rules strictly (${depthConfig.label}).
4. If the syllabus contains no academic content, return { "topics": [] }.

Now generate the JSON:`;
}

// ─── Optional: JSON repair helper (for free models that add extra text) ──
export function extractAndFixJSON(raw: string): any {
  // Remove markdown code blocks
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  // Find first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found");
  }
  let jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
  // Attempt to fix trailing commas (common model error)
  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON parsing failed: ${message}\nRaw: ${raw.substring(0, 200)}`);
  }
}