/**
 * parseSyllabus — Robust syllabus text parser
 *
 * Supports:
 *  - Numbered lists (1. 2. 3.)
 *  - Roman numerals (I. II. III. IV.)
 *  - Lettered lists (a. b. c. / A) B) C))
 *  - Markdown headers (## Topic)
 *  - Bullet points (•, *, -)
 *  - Comma-delimited topics
 *  - Newline-separated topics
 *  - Mixed formats
 */
export function parseSyllabus(raw: string): string[] {
  if (!raw || typeof raw !== "string") return [];

  const text = raw.trim();
  if (text.length === 0) return [];

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const topics: string[] = [];

  for (const line of lines) {
    // Skip markdown headers that are section labels (e.g., "## Unit 1")
    const headerMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headerMatch) {
      const content = headerMatch[1].trim();
      // Skip generic headers like "Syllabus", "Unit 1", "Module 2"
      if (/^(syllabus|unit|module|chapter|section|part)\s*\d*/i.test(content)) {
        continue;
      }
      topics.push(content);
      continue;
    }

    // Numbered list: "1. Topic" or "1) Topic" or "1: Topic"
    const numberedMatch = line.match(/^\d+[\.\)\:]\s*(.+)/);
    if (numberedMatch) {
      topics.push(numberedMatch[1].trim());
      continue;
    }

    // Roman numerals: "I. Topic", "IV) Topic"
    const romanMatch = line.match(
      /^(I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XI{0,3}|XIV|XV)[\.\)\:]\s*(.+)/i
    );
    if (romanMatch) {
      topics.push(romanMatch[2].trim());
      continue;
    }

    // Lettered list: "a. Topic" or "A) Topic"
    const letterMatch = line.match(/^[a-zA-Z][\.\)]\s*(.+)/);
    if (letterMatch) {
      // Make sure it's a single letter and not a word
      const letterPart = line.match(/^([a-zA-Z])[\.\)]/);
      if (letterPart && letterPart[1].length === 1) {
        topics.push(letterMatch[1].trim());
        continue;
      }
    }

    // Bullet points: "• Topic", "* Topic", "- Topic", "→ Topic"
    const bulletMatch = line.match(/^[•\*\-→▸▹►]\s+(.+)/);
    if (bulletMatch) {
      topics.push(bulletMatch[1].trim());
      continue;
    }

    // Check for comma-delimited topics on a single line
    if (line.includes(",") && !line.includes(".") && line.split(",").length >= 3) {
      const commaParts = line
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 1);
      if (commaParts.length >= 3) {
        topics.push(...commaParts);
        continue;
      }
    }

    // Semicolon-delimited
    if (line.includes(";") && line.split(";").length >= 3) {
      const semiParts = line
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 1);
      if (semiParts.length >= 3) {
        topics.push(...semiParts);
        continue;
      }
    }

    // Fallback: treat non-empty line as a topic if it's meaningful (>3 chars) and looks like a title (<100 chars)
    if (line.length > 3 && line.length < 100) {
      // Skip lines that look like administrative metadata or instructions
      const isBoilerplate = /^(total|marks|hours|credits|references|textbook|prerequisite|assignment|homework|exam|grade|policy|attendance|instructor|office|contact|email|website|deadline|submission|late|academic|integrity|disability|support|resources|schedule|weekly|calendar|meeting|classroom|zoom|link)/i.test(line);
      
      if (isBoilerplate) {
        continue;
      }
      topics.push(line);
    }
  }

  // Deduplicate, clean, and filter out absurdly long "topics"
  const seen = new Set<string>();
  return topics.filter((topic) => {
    if (topic.length > 100) return false; // Prevent paragraphs from becoming topics
    const key = topic.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Estimate token count for a string (rough approximation)
 * ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
