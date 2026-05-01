"use client";

import { useState } from "react";
import type { TopicNote } from "@/lib/schemas";

interface NoteCardProps {
  topicNote: TopicNote;
  index: number;
  onUpdate?: (index: number, newNote: TopicNote) => void;
  onRegenerate?: (index: number, topic: string) => void;
  isRegenerating?: boolean;
}

export default function NoteCard({ 
  topicNote, 
  index, 
  onUpdate, 
  onRegenerate, 
  isRegenerating 
}: NoteCardProps) {
  const { topic, notes } = topicNote;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["definition", "keyPoints", "examTips"])
  );
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(index, { ...topicNote, notes: editedNotes });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedNotes(notes);
    setIsEditing(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(
      new Set([
        "definition",
        "keyPoints",
        "formulas",
        "diagrams",
        "examples",
        "commonMistakes",
        "examTips",
        "mnemonics",
        "practiceQuestions",
      ])
    );
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const copyTopic = async () => {
    const text = formatTopicAsText(topicNote);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNoteChange = (field: keyof typeof notes, value: any) => {
    setEditedNotes((prev) => ({ ...prev, [field]: value }));
  };

  const renderEditableText = (field: keyof typeof notes, value: string | null | undefined) => (
    <textarea
      className="edit-textarea"
      value={value || ""}
      onChange={(e) => handleNoteChange(field, e.target.value)}
      rows={3}
      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", minHeight: "80px", fontFamily: "inherit", resize: "vertical" }}
    />
  );

  const renderEditableList = (field: keyof typeof notes, items: string[] | undefined) => (
    <textarea
      className="edit-textarea"
      value={(items || []).join("\n")}
      onChange={(e) => handleNoteChange(field, e.target.value.split("\n"))}
      rows={Math.max(3, (items || []).length + 1)}
      placeholder="Enter items separated by newlines"
      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", minHeight: "100px", fontFamily: "inherit", resize: "vertical", lineHeight: "1.5" }}
    />
  );

  const sections = [
    { key: "definition", label: "Definition", icon: "📝", content: isEditing ? renderEditableText("definition", editedNotes.definition) : renderText(notes.definition) },
    { key: "keyPoints", label: "Key Points", icon: "🎯", content: isEditing ? renderEditableList("keyPoints", editedNotes.keyPoints) : renderList(notes.keyPoints) },
    { key: "formulas", label: "Formulas", icon: "🔢", content: isEditing ? renderEditableList("formulas", editedNotes.formulas) : (notes.formulas && notes.formulas.length > 0 ? renderCode(notes.formulas) : null) },
    { key: "diagrams", label: "Diagrams", icon: "📊", content: isEditing ? renderEditableText("diagrams", editedNotes.diagrams) : (notes.diagrams ? renderText(notes.diagrams) : null) },
    { key: "examples", label: "Examples", icon: "💡", content: isEditing ? renderEditableList("examples", editedNotes.examples) : renderList(notes.examples) },
    { key: "commonMistakes", label: "Common Mistakes", icon: "⚠️", content: isEditing ? renderEditableList("commonMistakes", editedNotes.commonMistakes) : renderList(notes.commonMistakes) },
    { key: "examTips", label: "Exam Tips", icon: "📋", content: isEditing ? renderEditableList("examTips", editedNotes.examTips) : renderList(notes.examTips) },
    { key: "mnemonics", label: "Memory Aids", icon: "🧠", content: isEditing ? renderEditableText("mnemonics", editedNotes.mnemonics) : (notes.mnemonics ? renderText(notes.mnemonics) : null) },
    { key: "practiceQuestions", label: "Practice Questions", icon: "❓", content: isEditing ? renderEditableList("practiceQuestions", editedNotes.practiceQuestions) : renderNumberedList(notes.practiceQuestions) },
  ].filter((s) => isEditing || s.content !== null);


  return (
    <article
      className="note-card"
      id={`topic-${index}`}
    >
      <div className="note-card-header">
        <div className="note-card-title-row">
          <span className="topic-number">Topic {index + 1}</span>
          <h3 className="note-card-title">{topic}</h3>
        </div>
        <div className="note-card-actions">
          {isEditing ? (
            <>
              <button className="action-btn" onClick={handleSave} title="Save changes">✓</button>
              <button className="action-btn" onClick={handleCancelEdit} title="Cancel">✕</button>
            </>
          ) : (
            <button className="action-btn" onClick={() => setIsEditing(true)} title="Edit topic">✎</button>
          )}
          {onRegenerate && (
            <button 
              className="action-btn" 
              onClick={() => onRegenerate(index, topic)} 
              title="Regenerate this topic"
              disabled={isRegenerating}
            >
              {isRegenerating ? "..." : "↻"}
            </button>
          )}
          <button
            className={`action-btn feedback-btn ${feedback === "up" ? "active-up" : ""}`}
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            title="Helpful"
            aria-label="Mark as helpful"
          >
            ↑
          </button>
          <button
            className={`action-btn feedback-btn ${feedback === "down" ? "active-down" : ""}`}
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            title="Not helpful"
            aria-label="Mark as not helpful"
          >
            ↓
          </button>
          <button
            className={`action-btn copy-btn ${copied ? "copied" : ""}`}
            onClick={copyTopic}
            title="Copy this topic"
            aria-label="Copy topic to clipboard"
          >
            {copied ? "✓" : "❐"}
          </button>
        </div>
      </div>

      <div className="note-sections">
        {sections.map((section) => (
          <div
            key={section.key}
            className={`note-section ${expandedSections.has(section.key) ? "expanded" : ""}`}
          >
            <button
              className="section-toggle"
              onClick={() => toggleSection(section.key)}
              aria-expanded={expandedSections.has(section.key)}
              aria-controls={`section-${index}-${section.key}`}
            >
              <span className="section-label">{section.label}</span>
              <span className="section-chevron">
                {expandedSections.has(section.key) ? "−" : "+"}
              </span>
            </button>
            {expandedSections.has(section.key) && (
              <div
                className="section-content"
                id={`section-${index}-${section.key}`}
              >
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

// ─── Render Helpers ────────────────────────────────────────────────

function renderText(text: string) {
  return <p className="section-text">{text}</p>;
}

function renderList(items: string[]) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="section-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function renderNumberedList(items: string[]) {
  if (!items || items.length === 0) return null;
  return (
    <ol className="section-list numbered">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function renderCode(items: string[]) {
  return (
    <div className="formula-list">
      {items.map((item, i) => (
        <code key={i} className="formula-item">
          {item}
        </code>
      ))}
    </div>
  );
}

function formatTopicAsText(topicNote: TopicNote): string {
  const { topic, notes: n } = topicNote;
  const lines: string[] = [`## ${topic}\n`];

  lines.push(`**Definition:** ${n.definition}\n`);

  if (n.keyPoints.length > 0) {
    lines.push("**Key Points:**");
    n.keyPoints.forEach((p) => lines.push(`• ${p}`));
    lines.push("");
  }

  if (n.formulas && n.formulas.length > 0) {
    lines.push("**Formulas:**");
    n.formulas.forEach((f) => lines.push(`  ${f}`));
    lines.push("");
  }

  if (n.diagrams) {
    lines.push(`**Diagrams:** ${n.diagrams}\n`);
  }

  if (n.examples.length > 0) {
    lines.push("**Examples:**");
    n.examples.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
    lines.push("");
  }

  if (n.commonMistakes.length > 0) {
    lines.push("**Common Mistakes:**");
    n.commonMistakes.forEach((m) => lines.push(`⚠ ${m}`));
    lines.push("");
  }

  if (n.examTips.length > 0) {
    lines.push("**Exam Tips:**");
    n.examTips.forEach((t) => lines.push(`→ ${t}`));
    lines.push("");
  }

  if (n.mnemonics) {
    lines.push(`**Memory Aid:** ${n.mnemonics}\n`);
  }

  if (n.practiceQuestions.length > 0) {
    lines.push("**Practice Questions:**");
    n.practiceQuestions.forEach((q, i) => lines.push(`Q${i + 1}. ${q}`));
  }

  return lines.join("\n");
}
