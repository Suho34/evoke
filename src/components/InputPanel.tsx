"use client";

import { useState, useCallback, useEffect } from "react";
import LevelSelect from "./LevelSelect";
import DepthToggle from "./DepthToggle";
import PdfUpload from "./PdfUpload";
import { parseSyllabus, estimateTokens } from "@/lib/parse-syllabus";
import type { AcademicLevel, DepthLevel } from "@/lib/schemas";

interface InputPanelProps {
  onGenerate: (syllabus: string, level: AcademicLevel, depth: DepthLevel) => void;
  isGenerating: boolean;
  onCancel?: () => void;
}

export default function InputPanel({
  onGenerate,
  isGenerating,
  onCancel,
}: InputPanelProps) {
  const [activeTab, setActiveTab] = useState<"text" | "pdf">("text");
  const [syllabus, setSyllabus] = useState("");
  const [level, setLevel] = useState<AcademicLevel>("college");
  const [depth, setDepth] = useState<DepthLevel>("standard");

  // Load preferences from localStorage
  useEffect(() => {
    const savedLevel = localStorage.getItem("evoke_level") as AcademicLevel;
    const savedDepth = localStorage.getItem("evoke_depth") as DepthLevel;
    if (savedLevel) setLevel(savedLevel);
    if (savedDepth) setDepth(savedDepth);
  }, []);

  const handleLevelChange = useCallback((l: AcademicLevel) => {
    setLevel(l);
    localStorage.setItem("evoke_level", l);
  }, []);

  const handleDepthChange = useCallback((d: DepthLevel) => {
    setDepth(d);
    localStorage.setItem("evoke_depth", d);
  }, []);

  const topics = syllabus.trim() ? parseSyllabus(syllabus) : [];
  const tokenCount = estimateTokens(syllabus);
  const charCount = syllabus.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (syllabus.trim().length < 5 || isGenerating) return;
    onGenerate(syllabus, level, depth);
  };

  const handlePdfText = useCallback((text: string) => {
    setSyllabus(text);
    setActiveTab("text");
  }, []);

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <h2 className="panel-title">
          <span className="title-accent">evoke</span> notes
        </h2>
        <p className="panel-subtitle">
          Transform your syllabus into exam-ready structured notes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {/* Tab switching */}
        <div className="input-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "text"}
            className={`input-tab ${activeTab === "text" ? "active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            Text Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pdf"}
            className={`input-tab ${activeTab === "pdf" ? "active" : ""}`}
            onClick={() => setActiveTab("pdf")}
          >
            PDF Upload
          </button>
        </div>

        {/* Tab content */}
        <div className="tab-content">
          {activeTab === "text" ? (
            <div className="text-input-wrapper">
              <textarea
                id="syllabus-input"
                className="syllabus-textarea"
                placeholder={`Paste your syllabus here...\n\nExamples:\n1. Normalization\n2. ER Diagrams\n3. SQL Joins\n4. Transaction Management\n5. Indexing & Hashing`}
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                rows={10}
                aria-label="Syllabus text input"
                disabled={isGenerating}
              />
              <div className="textarea-footer">
                <span className="char-count">
                  {charCount.toLocaleString()} chars · ~{tokenCount.toLocaleString()} tokens
                </span>
                {topics.length > 0 && (
                  <span className="topic-count">
                    Found <strong>{topics.length}</strong> topic{topics.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {tokenCount > 30000 && (
                <div className="token-warning" role="alert">
                  ⚠️ Large input detected. Consider splitting into smaller sections for best results.
                </div>
              )}
            </div>
          ) : (
            <PdfUpload onFileSelect={handlePdfText} />
          )}
        </div>

        {/* Topic preview */}
        {topics.length > 0 && (
          <div className="topic-preview">
            <div className="preview-header">
              <span className="preview-label">Topics detected:</span>
            </div>
            <div className="preview-tags">
              {topics.slice(0, 15).map((t, i) => (
                <span key={i} className="preview-tag">
                  {t}
                </span>
              ))}
              {topics.length > 15 && (
                <span className="preview-more">
                  +{topics.length - 15} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Level & Depth */}
        <div className="config-section">
          <LevelSelect value={level} onChange={handleLevelChange} />
          <DepthToggle value={depth} onChange={handleDepthChange} />
        </div>

        {/* Generate Button */}
        <div className="generate-section">
          {isGenerating ? (
            <button
              type="button"
              className="generate-btn cancelling"
              onClick={onCancel}
            >
              <span className="generate-spinner" />
              Cancel Generation
            </button>
          ) : (
            <button
              type="submit"
              className="generate-btn"
              disabled={syllabus.trim().length < 5}
            >
              Generate Study Notes
              {topics.length > 0 && (
                <span className="generate-count">{topics.length} topics</span>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
