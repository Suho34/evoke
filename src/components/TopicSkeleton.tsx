"use client";

export default function TopicSkeleton() {
  return (
    <div className="note-card skeleton" aria-busy="true" aria-label="Loading notes">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-badge" />
      </div>
      <div className="skeleton-body">
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-partial" />
        <div className="skeleton-spacer" />
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-partial-sm" />
        <div className="skeleton-spacer" />
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-full" />
        <div className="skeleton-line skeleton-partial" />
      </div>
    </div>
  );
}
