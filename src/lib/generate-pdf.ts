import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { TopicNote } from "./schemas";

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 14;
const SECTION_GAP = 8;
const FOOTER_HEIGHT = 30;

// ─── Single function: sanitize + wrap with line breaks & long‑word breaking ───
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  // 1. Normalize line endings
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove unsupported characters (keep newlines)
  cleaned = cleaned
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");

  // 3. Collapse multiple spaces/tabs, but keep newlines
  cleaned = cleaned.replace(/[ \t]+/g, " ").replace(/ +(\n)/g, "$1").replace(/(\n) +/g, "$1").trim();

  const lines: string[] = [];
  const paragraphs = cleaned.split(/\n/);

  for (const para of paragraphs) {
    if (para.trim() === "") {
      lines.push(""); // preserve empty lines as paragraph gaps
      continue;
    }
    const words = para.trim().split(/\s+/);
    let current = "";
    for (let word of words) {
      // Break extra‑long words (URLs, long codes)
      while (font.widthOfTextAtSize(word, fontSize) > maxWidth && word.length > 0) {
        if (current) {
          lines.push(current);
          current = "";
        }
        const ratio = maxWidth / font.widthOfTextAtSize(word, fontSize);
        const splitAt = Math.max(1, Math.floor(word.length * ratio) - 2);
        const part = word.slice(0, splitAt);
        lines.push(part);
        word = word.slice(splitAt);
      }
      if (!word) continue;

      const testLine = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = testLine;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// ─── Simple sanitize for one‑line strings (topic titles, etc.) ─────────────
function sanitizeForTitle(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Rest of the code (unchanged except drawWrappedText uses new wrapText) ──
interface PDFContext {
  doc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  monoFont: PDFFont;
  pageNum: number;
  currentY: number;
  currentPage: PDFPage;
  level: string;
}

const LEVEL_LABELS: Record<string, string> = {
  "high-school": "High School",
  "college": "College / Undergraduate",
  "postgraduate": "Postgraduate",
};

function addFooter(ctx: PDFContext) {
  const { currentPage, font, pageNum, level } = ctx;
  const label = LEVEL_LABELS[level] || level;
  currentPage.drawText(`evoke — AI notes | Level: ${label}`, {
    x: MARGIN,
    y: FOOTER_HEIGHT - 10,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  currentPage.drawText(`Page ${pageNum}`, {
    x: PAGE_WIDTH - MARGIN - 40,
    y: FOOTER_HEIGHT - 10,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  currentPage.drawLine({
    start: { x: MARGIN, y: FOOTER_HEIGHT },
    end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
}

function newPage(ctx: PDFContext): PDFPage {
  if (ctx.pageNum > 0) {
    addFooter(ctx);
  }
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pageNum++;
  ctx.currentPage = page;
  ctx.currentY = PAGE_HEIGHT - MARGIN;
  return page;
}

function ensureSpace(ctx: PDFContext, needed: number) {
  if (ctx.currentY - needed < FOOTER_HEIGHT + MARGIN) {
    newPage(ctx);
  }
}

function drawWrappedText(
  ctx: PDFContext,
  text: string,
  fontSize: number,
  font: PDFFont,
  color = rgb(0.15, 0.15, 0.15),
  indent = 0
) {
  const lines = wrapText(text, font, fontSize, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.currentPage.drawText(line, {
      x: MARGIN + indent,
      y: ctx.currentY,
      size: fontSize,
      font,
      color,
    });
    ctx.currentY -= LINE_HEIGHT;
  }
}

function drawSectionTitle(ctx: PDFContext, title: string) {
  ensureSpace(ctx, LINE_HEIGHT + SECTION_GAP);
  ctx.currentY -= SECTION_GAP;
  ctx.currentPage.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: ctx.currentY,
    size: 9,
    font: ctx.boldFont,
    color: rgb(0.45, 0.26, 0.15),
  });
  ctx.currentY -= LINE_HEIGHT;
}

function drawBulletList(ctx: PDFContext, items: string[], fontSize = 10) {
  for (const item of items) {
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.currentPage.drawText("•", {
      x: MARGIN + 8,
      y: ctx.currentY,
      size: fontSize,
      font: ctx.font,
      color: rgb(0.6, 0.35, 0.2),
    });
    drawWrappedText(ctx, item, fontSize, ctx.font, rgb(0.2, 0.2, 0.2), 20);
  }
}

function drawExamBox(ctx: PDFContext, tips: string[]) {
  const boxHeight = tips.length * LINE_HEIGHT + 24;
  ensureSpace(ctx, boxHeight + 10);

  ctx.currentPage.drawRectangle({
    x: MARGIN,
    y: ctx.currentY - boxHeight + LINE_HEIGHT,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: rgb(0.97, 0.95, 0.92),
    borderColor: rgb(0.78, 0.49, 0.3),
    borderWidth: 1,
  });

  ctx.currentPage.drawText(">> EXAM TIPS", {
    x: MARGIN + 10,
    y: ctx.currentY,
    size: 9,
    font: ctx.boldFont,
    color: rgb(0.6, 0.3, 0.1),
  });
  ctx.currentY -= LINE_HEIGHT + 4;

  for (const tip of tips) {
    drawWrappedText(ctx, `> ${tip}`, 9, ctx.font, rgb(0.3, 0.2, 0.1), 10);
  }
  ctx.currentY -= 6;
}

export async function generatePDF(
  notes: TopicNote[],
  level: string,
  title: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await doc.embedFont(StandardFonts.Courier);

  const ctx: PDFContext = {
    doc,
    font,
    boldFont,
    monoFont,
    pageNum: 0,
    currentY: 0,
    currentPage: null as unknown as PDFPage,
    level,
  };

  // Title page
  const titlePage = newPage(ctx);
  const centerX = PAGE_WIDTH / 2;

  try {
    const logoPath = path.join(process.cwd(), "public", "evoke_notes_logo.svg");
    const svgBuffer = fs.readFileSync(logoPath);
    const pngBuffer = await sharp(svgBuffer).png().toBuffer();
    const logoImage = await doc.embedPng(pngBuffer);
    const dims = logoImage.scaleToFit(240, 240);
    titlePage.drawImage(logoImage, {
      x: centerX - dims.width / 2,
      y: PAGE_HEIGHT - 220,
      width: dims.width,
      height: dims.height,
    });
  } catch (err) {
    console.error("Failed to embed logo", err);
    titlePage.drawText("evoke", {
      x: centerX - boldFont.widthOfTextAtSize("evoke", 48) / 2,
      y: PAGE_HEIGHT - 200,
      size: 48,
      font: boldFont,
      color: rgb(0.78, 0.31, 0.19),
    });
    titlePage.drawText("AI-Powered Study Notes", {
      x: centerX - font.widthOfTextAtSize("AI-Powered Study Notes", 14) / 2,
      y: PAGE_HEIGHT - 235,
      size: 14,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const titleLines = wrapText(title, boldFont, 24, CONTENT_WIDTH);
  let titleY = PAGE_HEIGHT - 320;
  for (const line of titleLines) {
    titlePage.drawText(line, {
      x: centerX - boldFont.widthOfTextAtSize(line, 24) / 2,
      y: titleY,
      size: 24,
      font: boldFont,
      color: rgb(0.11, 0.1, 0.09),
    });
    titleY -= 32;
  }

  const levelLabel = LEVEL_LABELS[level] || level;
  titlePage.drawText(`Level: ${levelLabel}`, {
    x: centerX - font.widthOfTextAtSize(`Level: ${levelLabel}`, 12) / 2,
    y: titleY - 20,
    size: 12,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const statsText = `${notes.length} topics - Generated ${new Date().toLocaleDateString()}`;
  titlePage.drawText(statsText, {
    x: centerX - font.widthOfTextAtSize(statsText, 10) / 2,
    y: titleY - 45,
    size: 10,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  titlePage.drawLine({
    start: { x: centerX - 80, y: titleY - 65 },
    end: { x: centerX + 80, y: titleY - 65 },
    thickness: 1,
    color: rgb(0.78, 0.31, 0.19),
  });

  addFooter(ctx);

  // Topic pages
  for (const topicNote of notes) {
    newPage(ctx);
    const { topic, notes: n } = topicNote;

    const sanitizedTopic = sanitizeForTitle(topic);
    ctx.currentPage.drawText(sanitizedTopic, {
      x: MARGIN,
      y: ctx.currentY,
      size: 18,
      font: boldFont,
      color: rgb(0.11, 0.1, 0.09),
    });
    ctx.currentY -= 8;

    ctx.currentPage.drawLine({
      start: { x: MARGIN, y: ctx.currentY },
      end: { x: MARGIN + Math.min(boldFont.widthOfTextAtSize(sanitizedTopic, 18), CONTENT_WIDTH), y: ctx.currentY },
      thickness: 2,
      color: rgb(0.78, 0.31, 0.19),
    });
    ctx.currentY -= LINE_HEIGHT + 4;

    drawSectionTitle(ctx, "Definition");
    drawWrappedText(ctx, n.definition, 10, font);

    if (n.keyPoints.length) {
      drawSectionTitle(ctx, "Key Points");
      drawBulletList(ctx, n.keyPoints);
    }

    if (n.formulas && n.formulas.length) {
      drawSectionTitle(ctx, "Formulas & Theorems");
      for (const formula of n.formulas) {
        drawWrappedText(ctx, formula, 9, monoFont, rgb(0.2, 0.35, 0.5), 8);
      }
    }

    if (n.diagrams) {
      drawSectionTitle(ctx, "Diagrams & Visual Aids");
      drawWrappedText(ctx, n.diagrams, 10, font, rgb(0.3, 0.3, 0.3));
    }

    if (n.examples.length) {
      drawSectionTitle(ctx, "Examples");
      for (let i = 0; i < n.examples.length; i++) {
        drawWrappedText(ctx, `Example ${i + 1}: ${n.examples[i]}`, 10, font, rgb(0.15, 0.35, 0.25), 4);
        ctx.currentY -= 4;
      }
    }

    if (n.commonMistakes.length) {
      drawSectionTitle(ctx, "Common Mistakes");
      drawBulletList(ctx, n.commonMistakes, 9);
    }

    if (n.examTips.length) {
      drawExamBox(ctx, n.examTips);
    }

    if (n.mnemonics) {
      drawSectionTitle(ctx, "Memory Aids");
      drawWrappedText(ctx, `* ${n.mnemonics}`, 10, font, rgb(0.4, 0.25, 0.1));
    }

    if (n.practiceQuestions.length) {
      drawSectionTitle(ctx, "Practice Questions");
      for (let i = 0; i < n.practiceQuestions.length; i++) {
        drawWrappedText(ctx, `Q${i + 1}. ${n.practiceQuestions[i]}`, 10, font, rgb(0.2, 0.2, 0.4), 4);
        ctx.currentY -= 2;
      }
    }

    addFooter(ctx);
  }

  return doc.save();
}