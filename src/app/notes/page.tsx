"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import InputPanel from "@/components/InputPanel";
import NoteViewer from "@/components/NoteViewer";
import ExportButton from "@/components/ExportButton";
import { parseSyllabus } from "@/lib/parse-syllabus";
import type { AcademicLevel, DepthLevel, TopicNote } from "@/lib/schemas";

export default function Home() {
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedTopics, setExpectedTopics] = useState(0);
  const [currentLevel, setCurrentLevel] = useState("college");
  const [currentTitle, setCurrentTitle] = useState("Study Notes");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("evoke_notes");
      if (savedNotes) setNotes(JSON.parse(savedNotes));

      const savedExpected = localStorage.getItem("evoke_expectedTopics");
      if (savedExpected) setExpectedTopics(parseInt(savedExpected, 10));

      const savedTitle = localStorage.getItem("evoke_title");
      if (savedTitle) setCurrentTitle(savedTitle);

      const savedLevel = localStorage.getItem("evoke_level");
      if (savedLevel) setCurrentLevel(savedLevel);
    } catch (e) {
      console.error("Failed to load state from local storage", e);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("evoke_notes", JSON.stringify(notes));
      localStorage.setItem("evoke_expectedTopics", expectedTopics.toString());
      localStorage.setItem("evoke_title", currentTitle);
      localStorage.setItem("evoke_level", currentLevel);
    }
  }, [notes, expectedTopics, currentTitle, currentLevel]);


  const handleGenerate = useCallback(
    async (syllabus: string, level: AcademicLevel, depth: DepthLevel) => {
      // Reset state
      setNotes([]);
      setError(null);
      setIsStreaming(true);
      setCurrentLevel(level);

      const topics = parseSyllabus(syllabus);
      setExpectedTopics(topics.length);
      setCurrentTitle(`Study Notes`);

      // Create abort controller for cancel support
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syllabus, level, depth }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || `Generation failed (${response.status})`
          );
        }

        // Check if this is a cached response (non-streaming JSON)
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data.topics) {
            setNotes(data.topics);
            setIsStreaming(false);
            return;
          }
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Try to parse the streaming JSON
          // The AI SDK streams partial JSON objects
          try {
            // Find the last valid JSON in the buffer
            const parsed = tryParseStreamedJSON(buffer);
            if (parsed?.topics && Array.isArray(parsed.topics)) {
              // Filter valid topics (ones that have at least a topic name and definition)
              const validTopics = parsed.topics.filter(
                (t: TopicNote) =>
                  t &&
                  t.topic &&
                  t.notes &&
                  t.notes.definition
              );
              if (validTopics.length > 0) {
                setNotes(validTopics);
              }
            }
          } catch {
            // Partial JSON — continue accumulating
          }
        }

        // Final parse
        try {
          const final = tryParseStreamedJSON(buffer);
          if (final?.topics) {
            setNotes(
              final.topics.filter(
                (t: TopicNote) => t && t.topic && t.notes && t.notes.definition
              )
            );
          }
        } catch {
          // Already have partial notes from streaming
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled
          setError(null);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred"
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setNotes([]);
  }, []);

  const handleClearNotes = useCallback(() => {
    setNotes([]);
    setExpectedTopics(0);
    localStorage.removeItem("evoke_notes");
    localStorage.removeItem("evoke_expectedTopics");
    localStorage.removeItem("evoke_title");
    localStorage.removeItem("evoke_level");
  }, []);

  const handleUpdateNote = useCallback((index: number, newNote: TopicNote) => {
    setNotes((prev) => {
      const updated = [...prev];
      updated[index] = newNote;
      return updated;
    });
  }, []);

  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const handleRegenerateSingle = useCallback(
    async (index: number, targetTopic: string) => {
      if (!targetTopic) return;

      const safeTarget = targetTopic.length < 5 ? `Topic: ${targetTopic}` : targetTopic;

      setRegeneratingIndex(index);
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syllabus: safeTarget, level: currentLevel, depth: "deep-dive" }),
        });

        if (!response.ok) throw new Error("Regeneration failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let rawContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);
          for (const line of lines) {
            const match = line.match(/^0:"(.*)"$/);
            if (match) {
              rawContent += match[1];
            }
          }
        }

        if (rawContent) {
          try {
            const jsonStr = JSON.parse(`"${rawContent}"`);
            const final = JSON.parse(repairJSON(jsonStr)); // using repairJSON just in case
            if (final?.topics && final.topics.length > 0) {
              const newNote = final.topics[0];
              setNotes((prev) => {
                const updated = [...prev];
                if (updated[index]) {
                  updated[index] = { ...updated[index], notes: newNote.notes };
                }
                return updated;
              });
            }
          } catch (e) {
            console.error("Failed to parse regenerated note", e);
          }
        }
      } catch (err) {
        console.error("Regeneration error:", err);
        alert("Failed to regenerate topic. Please try again.");
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [currentLevel]
  );

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <main className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <h1 className="brand-name">
            ev<span className="brand-accent">o</span>ke
          </h1>
          <span className="brand-tag">AI study companion</span>
        </div>
        <div className="header-actions">
          {notes.length > 0 && (
            <div className="header-actions">
              <button
                className="clear-btn"
                onClick={() => setShowClearConfirm(true)}
                disabled={isStreaming}
                title="Clear saved notes"
              >
                <span>🗑️</span>
                <span>Clear Notes</span>
              </button>
              <ExportButton
                notes={notes}
                level={currentLevel}
                title={currentTitle}
                disabled={isStreaming}
              />
            </div>
          )}
        </div>

        {/* ─── Clear Confirmation Modal ─── */}
        {showClearConfirm && (
          <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">⚠️</div>
              <h3 className="modal-title">Clear all notes?</h3>
              <p className="modal-desc">
                This will permanently delete all your generated study notes for this session. This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn danger"
                  onClick={() => {
                    handleClearNotes();
                    setShowClearConfirm(false);
                  }}
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="app-content">
        <aside className="input-side">
          <InputPanel
            onGenerate={handleGenerate}
            isGenerating={isStreaming}
            onCancel={handleCancel}
          />
        </aside>

        <section className="output-side">
          <NoteViewer
            notes={notes}
            isStreaming={isStreaming}
            expectedTopics={expectedTopics}
            error={error}
            onRetry={handleRetry}
            onUpdateNote={handleUpdateNote}
            onRegenerateNote={handleRegenerateSingle}
            regeneratingIndex={regeneratingIndex}
          />
        </section>
      </div>
    </main>
  );
}

/**
 * Try to parse the AI SDK's streamed text format.
 * The stream contains lines like:
 * 0:"..." (text delta)
 * e:{...} (finish event)
 * We need to accumulate the text deltas and parse the final JSON.
 */
function tryParseStreamedJSON(buffer: string): { topics: TopicNote[] } | null {
  // AI SDK streamObject sends lines in format: `0:"chunk"\n`
  // We need to extract all the text chunks and combine them
  const lines = buffer.split("\n").filter(Boolean);
  let rawContent = "";

  for (const line of lines) {
    // Match the AI SDK text stream format: 0:"text content"
    const match = line.match(/^0:"(.*)"$/);
    if (match) {
      rawContent += match[1];
    }
  }

  let jsonStr = "";
  if (rawContent) {
    try {
      jsonStr = JSON.parse(`"${rawContent}"`);
    } catch {
      // If parsing fails (e.g., partial chunk ending in an escape sequence),
      // we return null and wait for the next chunk to complete it.
      return null;
    }
  }

  if (!jsonStr) {
    // Try direct JSON parse (for cached responses)
    try {
      return JSON.parse(buffer);
    } catch {
      return null;
    }
  }

  // Try to parse the accumulated JSON
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to repair partial JSON by closing open brackets
    const repaired = repairJSON(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

/**
 * Attempt to repair incomplete JSON by closing open structures
 */
function repairJSON(json: string): string {
  let result = json.trim();

  // Count open brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of result) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (char === "[") openBrackets++;
    if (char === "]") openBrackets--;
  }

  // If we're in a string, close it
  if (inString) result += '"';

  // Remove trailing comma
  result = result.replace(/,\s*$/, "");

  // Close open brackets
  for (let i = 0; i < openBrackets; i++) result += "]";
  for (let i = 0; i < openBraces; i++) result += "}";

  return result;
}
