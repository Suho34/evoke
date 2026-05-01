# evoke — AI-Powered Study Notes

> Transform your syllabus into structured, exam-ready study notes with AI. Powered by Google Gemini.

## Features

- **Syllabus Parsing** — Supports numbered lists, bullet points, roman numerals, comma-delimited, markdown headers
- **9-Section Notes** — Definition, Key Points, Formulas, Diagrams, Examples, Common Mistakes, Exam Tips, Mnemonics, Practice Questions
- **Subject Personas** — Specialized prompts for DBMS, OS, CN, DSA, Maths
- **3 Depth Levels** — Quick Review, Standard, Deep Dive
- **Real-time Streaming** — Notes appear as they're generated
- **PDF Export** — Professional PDF with title page, topic sections, exam callout boxes
- **Multi-format Export** — PDF, Markdown, HTML
- **Rate Limiting** — 10 requests/minute per IP
- **Caching** — SHA-256 fingerprinting with LRU cache (7-day TTL)
- **PDF Upload** — Drag & drop PDF with text extraction

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url> evoke
cd evoke

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Gemini API key

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google Gemini API key |
| `SENTRY_DSN` | ❌ | Sentry error tracking DSN |
| `REDIS_URL` | ❌ | Redis URL for distributed caching |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # POST - Stream notes from Gemini
│   │   ├── export/route.ts     # POST - Export as PDF/MD/HTML
│   │   └── health/route.ts     # GET  - Health check
│   ├── globals.css             # Design system
│   ├── layout.tsx              # Root layout + fonts
│   ├── page.tsx                # Main app page
│   ├── error.tsx               # Error boundary
│   └── not-found.tsx           # 404 page
├── components/
│   ├── InputPanel.tsx          # Main input form
│   ├── PdfUpload.tsx           # PDF drag & drop
│   ├── SubjectSelect.tsx       # Subject selector
│   ├── DepthToggle.tsx         # Depth level toggle
│   ├── NoteCard.tsx            # Single topic card
│   ├── NoteViewer.tsx          # Notes container
│   ├── ExportButton.tsx        # Export controls
│   └── TopicSkeleton.tsx       # Loading skeleton
└── lib/
    ├── schemas.ts              # Zod validation schemas
    ├── parse-syllabus.ts       # Syllabus text parser
    ├── prompts.ts              # System + user prompts
    ├── generate-pdf.ts         # PDF generation (pdf-lib)
    ├── rate-limit.ts           # In-memory rate limiter
    └── cache.ts                # LRU cache with fingerprinting
```

## API Endpoints

### `GET /api/health`
Health check. Returns status, cache stats, API key presence.

### `POST /api/generate`
Generate structured notes from a syllabus.
```json
{
  "syllabus": "1. Normalization\n2. SQL Joins\n3. ER Diagrams",
  "subject": "DBMS",
  "depth": "standard"
}
```

### `POST /api/export`
Export notes as PDF, Markdown, or HTML.
```json
{
  "notes": [...],
  "format": "pdf",
  "subject": "DBMS",
  "title": "DBMS Study Notes"
}
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS
- **AI**: Google Gemini via `@ai-sdk/google`
- **Validation**: Zod
- **PDF**: pdf-lib
- **Analytics**: Vercel Analytics
- **Error Tracking**: Sentry (optional)

## License

MIT
