"use client";

import { useState, useEffect } from "react";
import type { TopicNote, ExportFormat } from "@/lib/schemas";

interface ExportButtonProps {
  notes: TopicNote[];
  level: string;
  title: string;
  disabled?: boolean;
}

export default function ExportButton({
  notes,
  level,
  title,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (disabled) {
      setShowMenu(false);
    }
  }, [disabled]);

  const handleExport = async (format: ExportFormat) => {
    setShowMenu(false);
    setIsExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, format, level, title }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const ext = format === "pdf" ? "pdf" : format === "md" ? "md" : "html";
      a.href = url;
      a.download = `${slugify(title)}-notes.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyAllAsMarkdown = async () => {
    const markdown = notes
      .map((n) => {
        const lines = [`## ${n.topic}\n`, `${n.notes.definition}\n`];
        if (n.notes.keyPoints.length > 0) {
          lines.push("**Key Points:**");
          n.notes.keyPoints.forEach((p) => lines.push(`- ${p}`));
          lines.push("");
        }
        if (n.notes.examTips.length > 0) {
          lines.push("**Exam Tips:**");
          n.notes.examTips.forEach((t) => lines.push(`> ${t}`));
          lines.push("");
        }
        return lines.join("\n");
      })
      .join("\n---\n\n");

    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="export-container">
      <div className="export-buttons">
        <button
          className="export-btn primary"
          onClick={() => handleExport("pdf")}
          disabled={disabled || isExporting || notes.length === 0}
          title="Download as PDF"
        >
          {isExporting ? (
            <>
              <span className="export-spinner" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Download PDF</span>
            </>
          )}
        </button>

        <div className="export-dropdown">
          <button
            className="export-btn secondary"
            onClick={() => setShowMenu(!showMenu)}
            disabled={disabled || isExporting || notes.length === 0}
            aria-label="More export options"
            aria-haspopup="true"
            aria-expanded={showMenu}
            title="More formats"
          >
            {showMenu ? "✕" : "▾"}
          </button>
          
          {showMenu && (
            <div className="export-menu" role="menu">
              <div style={{ padding: "4px 12px 8px", fontSize: "10px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "bold" }}>
                Export Formats
              </div>
              <button
                className="export-menu-item"
                onClick={() => handleExport("md")}
                role="menuitem"
              >
                📝 Markdown (.md)
              </button>
              <button
                className="export-menu-item"
                onClick={() => handleExport("html")}
                role="menuitem"
              >
                🌐 HTML Page (.html)
              </button>
              <div className="menu-divider" />
              <button
                className="export-menu-item"
                onClick={copyAllAsMarkdown}
                role="menuitem"
                style={{ color: copied ? "var(--green)" : "var(--text)" }}
              >
                {copied ? "✓ Copied to clipboard" : "📋 Copy all as Markdown"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
