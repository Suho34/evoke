"use client";

import { useEffect, useState } from "react";
import type { DepthLevel } from "@/lib/schemas";

const DEPTHS: { value: DepthLevel; label: string; desc: string; icon: string }[] = [
  {
    value: "quick-review",
    label: "Quick Review",
    desc: "Concise, exam-critical points",
    icon: "⚡",
  },
  {
    value: "standard",
    label: "Standard",
    desc: "Balanced depth with examples",
    icon: "📖",
  },
  {
    value: "deep-dive",
    label: "Deep Dive",
    desc: "Comprehensive, detailed coverage",
    icon: "🔬",
  },
];

interface DepthToggleProps {
  value: DepthLevel;
  onChange: (depth: DepthLevel) => void;
}

export default function DepthToggle({ value, onChange }: DepthToggleProps) {
  return (
    <div className="depth-toggle">
      <label className="field-label">Depth Level</label>
      <div className="depth-options">
        {DEPTHS.map((d) => (
          <label 
            key={d.value} 
            className={`depth-option ${value === d.value ? "active" : ""}`}
          >
            <input
              type="radio"
              name="depth-level"
              value={d.value}
              checked={value === d.value}
              onChange={() => onChange(d.value)}
              className="sr-only"
            />
            <span className="depth-icon">{d.icon}</span>
            <div className="depth-info">
              <span className="depth-label">{d.label}</span>
              <span className="depth-desc">{d.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
