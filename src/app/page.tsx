import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evoke | AI Study Companion",
  description: "Transform your syllabuses and PDFs into perfectly structured, comprehensive study notes in seconds.",
};

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="header-brand">
          <h1 className="brand-name">
            ev<span className="brand-accent">o</span>ke
          </h1>
          <span className="brand-tag">AI study companion</span>
        </div>
        <div className="flex gap-4">
          <Link href="/notes" className="cta-button secondary">
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-hero">
        <h2 className="hero-title">
          Master any subject.<br />
          <span className="title-accent">In seconds.</span>
        </h2>
        <p className="hero-subtitle">
          Transform your syllabuses, lecture topics, and PDFs into perfectly structured, comprehensive study notes powered by advanced AI.
        </p>
        <Link href="/notes" className="cta-button">
          Start Studying Now <span>→</span>
        </Link>
      </main>

      {/* Features Section */}
      <section className="features-section">
        <h3 className="section-title">Designed for deep learning</h3>

        <div className="bento-grid">
          {/* Feature 1 - High prominence */}
          <div className="bento-card">
            <div className="bento-icon">📄</div>
            <h4 className="bento-title">Smart PDF Parsing</h4>
            <p className="bento-desc">
              Upload your course materials directly. Evoke extracts the text locally in your browser and automatically generates comprehensive notes based on the document's structure.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bento-card">
            <div className="bento-icon">🧩</div>
            <h4 className="bento-title">Structured Output</h4>
            <p className="bento-desc">
              Every topic is broken down into clear definitions, key points, formulas, common mistakes, and exam tips.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bento-card">
            <div className="bento-icon">🔄</div>
            <h4 className="bento-title">Granular Regeneration</h4>
            <p className="bento-desc">
              Not happy with a specific topic? Edit notes inline or regenerate individual sections instantly without waiting for the whole document to process.
            </p>
          </div>

          {/* Feature 4 - Local first */}
          <div className="bento-card">
            <div className="bento-icon">📥</div>
            <h4 className="bento-title">Export & Persist</h4>
            <p className="bento-desc">
              Your notes are automatically saved to your browser's local storage. When you're ready, export them to beautiful PDFs, HTML, or Markdown files.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Evoke. Built for students.</p>
      </footer>
    </div>
  );
}
