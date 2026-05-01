import { NextRequest, NextResponse } from "next/server";
import { ExportRequestSchema } from "@/lib/schemas";
import { generatePDF } from "@/lib/generate-pdf";
import type { TopicNote } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ExportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          issues: validation.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { notes, format, level, title } = validation.data;

    switch (format) {
      case "pdf": {
        const pdfBytes = await generatePDF(notes, level, title);
        return new NextResponse(Buffer.from(pdfBytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${slugify(title)}-notes.pdf"`,
            "Content-Length": String(pdfBytes.length),
          },
        });
      }

      case "md": {
        const markdown = generateMarkdown(notes, level, title);
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${slugify(title)}-notes.md"`,
          },
        });
      }

      case "html": {
        const html = generateHTML(notes, level, title);
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${slugify(title)}-notes.html"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }
  } catch (error) {
    console.error("[/api/export] Error:", error);
    return NextResponse.json(
      {
        error: "Export failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  "high-school": "High School",
  "college": "College / Undergraduate",
  "postgraduate": "Postgraduate",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateMarkdown(notes: TopicNote[], level: string, title: string): string {
  const lines: string[] = [];
  const levelLabel = LEVEL_LABELS[level] || level;
  lines.push(`# ${title}`);
  lines.push(`**Level:** ${levelLabel} | **Generated:** ${new Date().toLocaleDateString()} | **evoke — AI notes**\n`);
  lines.push("---\n");

  for (const { topic, notes: n } of notes) {
    lines.push(`## ${topic}\n`);

    lines.push(`### Definition`);
    lines.push(`${n.definition}\n`);

    if (n.keyPoints.length > 0) {
      lines.push(`### Key Points`);
      n.keyPoints.forEach((p) => lines.push(`- ${p}`));
      lines.push("");
    }

    if (n.formulas && n.formulas.length > 0) {
      lines.push(`### Formulas & Theorems`);
      n.formulas.forEach((f) => lines.push(`\`${f}\``));
      lines.push("");
    }

    if (n.diagrams) {
      lines.push(`### Diagrams`);
      lines.push(`${n.diagrams}\n`);
    }

    if (n.examples.length > 0) {
      lines.push(`### Examples`);
      n.examples.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
      lines.push("");
    }

    if (n.commonMistakes.length > 0) {
      lines.push(`### ⚠️ Common Mistakes`);
      n.commonMistakes.forEach((m) => lines.push(`- ${m}`));
      lines.push("");
    }

    if (n.examTips.length > 0) {
      lines.push(`### 📝 Exam Tips`);
      n.examTips.forEach((t) => lines.push(`> ${t}`));
      lines.push("");
    }

    if (n.mnemonics) {
      lines.push(`### 💡 Memory Aids`);
      lines.push(`${n.mnemonics}\n`);
    }

    if (n.practiceQuestions.length > 0) {
      lines.push(`### Practice Questions`);
      n.practiceQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
      lines.push("");
    }

    lines.push("---\n");
  }

  return lines.join("\n");
}

import fs from "fs";
import path from "path";

function generateHTML(notes: TopicNote[], level: string, title: string): string {
  const topicsHtml = notes
    .map(
      ({ topic, notes: n }) => `
    <article class="topic">
      <h2>${esc(topic)}</h2>
      <section><h3>Definition</h3><p>${esc(n.definition)}</p></section>
      ${n.keyPoints.length > 0 ? `<section><h3>Key Points</h3><ul>${n.keyPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></section>` : ""}
      ${n.formulas && n.formulas.length > 0 ? `<section><h3>Formulas</h3><ul>${n.formulas.map((f) => `<li><code>${esc(f)}</code></li>`).join("")}</ul></section>` : ""}
      ${n.diagrams ? `<section><h3>Diagrams</h3><p>${esc(n.diagrams)}</p></section>` : ""}
      ${n.examples.length > 0 ? `<section><h3>Examples</h3><ol>${n.examples.map((e) => `<li>${esc(e)}</li>`).join("")}</ol></section>` : ""}
      ${n.commonMistakes.length > 0 ? `<section class="mistakes"><h3>⚠️ Common Mistakes</h3><ul>${n.commonMistakes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></section>` : ""}
      ${n.examTips.length > 0 ? `<section class="exam-tips"><h3>📝 Exam Tips</h3><ul>${n.examTips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
      ${n.mnemonics ? `<section><h3>💡 Memory Aids</h3><p>${esc(n.mnemonics)}</p></section>` : ""}
      ${n.practiceQuestions.length > 0 ? `<section><h3>Practice Questions</h3><ol>${n.practiceQuestions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></section>` : ""}
    </article>`
    )
    .join("\n");

  const levelLabel = LEVEL_LABELS[level] || level;
  
  let logoSvg = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "evoke_notes_logo.svg");
    logoSvg = fs.readFileSync(logoPath, "utf8");
  } catch (err) {
    console.error("Failed to load logo SVG for HTML export", err);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — evoke notes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f7f4ef; color: #1c1a17; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px; }
    .logo-container svg { width: 48px; height: 48px; }
    .app-name { font-size: 32px; font-weight: bold; color: #c94f30; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #e0dcd6; text-align: center; }
    .topic { background: white; border: 1px solid #e0dcd6; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .topic h2 { font-size: 20px; color: #c94f30; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #c94f30; }
    h3 { font-size: 14px; color: #4a4640; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 8px; }
    p { line-height: 1.6; margin-bottom: 8px; }
    ul, ol { padding-left: 20px; margin-bottom: 8px; }
    li { line-height: 1.5; margin-bottom: 4px; }
    code { background: #f0ece6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .exam-tips { background: #faf6f1; border: 1px solid #d4a574; border-radius: 8px; padding: 16px; }
    .mistakes { background: #fdf7f5; border-left: 3px solid #c94f30; padding: 12px 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      ${logoSvg}
      <div class="app-name">evoke notes</div>
    </div>
    <h1>${esc(title)}</h1>
    <div class="meta">Level: ${esc(levelLabel)} · ${notes.length} topics · Generated ${new Date().toLocaleDateString()}</div>
  </div>
  ${topicsHtml}
</body>
</html>`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
