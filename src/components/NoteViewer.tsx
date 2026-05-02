"use client";

import type { TopicNote } from "@/lib/schemas";
import NoteCard from "./NoteCard";
import TopicSkeleton from "./TopicSkeleton";

interface NoteViewerProps {
  notes: TopicNote[];
  isStreaming: boolean;
  expectedTopics: number;
  error: string | null;
  onRetry: () => void;
  onUpdateNote?: (index: number, newNote: TopicNote) => void;
}

export default function NoteViewer({
  notes,
  isStreaming,
  expectedTopics,
  error,
  onRetry,
  onUpdateNote,
}: NoteViewerProps) {
  if (error) {
    return (
      <div className="note-viewer-error">
        <div className="error-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3>Generation Failed</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (!isStreaming && notes.length === 0) {
    return (
      <div className="note-viewer-empty">
        <div className="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h3>Ready to generate notes</h3>
        <p>Paste your syllabus or upload a PDF, then hit Generate</p>
      </div>
    );
  }

  const remainingSkeletons = isStreaming
    ? Math.max(1, expectedTopics - notes.length)
    : 0;

  return (
    <div className="note-viewer">
      {/* Progress header */}
      {(isStreaming || notes.length > 0) && (
        <div className="note-viewer-header">
          <div className="notes-count">
            <span className="count-num">{notes.length}</span>
            <span className="count-label">
              {isStreaming
                ? (expectedTopics > 0 ? `of ${expectedTopics} topics generating...` : `generating...`)
                : `topic${notes.length !== 1 ? "s" : ""} generated`}
            </span>
          </div>
          {isStreaming && (
            <div className="streaming-indicator">
              <div className="streaming-dot" />
              <span>Processing with Gemini</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {isStreaming && expectedTopics > 0 && (
        <div className="generation-progress">
          <div
            className="generation-progress-fill"
            style={{
              width: `${(notes.length / expectedTopics) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Notes */}
      <div className="notes-list">
        {notes.map((note, i) => (
          <NoteCard 
            key={`${note.topic}-${i}`} 
            topicNote={note} 
            index={i} 
            onUpdate={onUpdateNote}
          />
        ))}

        {/* Skeletons for remaining topics */}
        {Array.from({ length: Math.min(remainingSkeletons, 3) }).map((_, i) => (
          <TopicSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    </div>
  );
}
