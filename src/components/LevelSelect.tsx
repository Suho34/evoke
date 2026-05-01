"use client";

import { useEffect, useState } from "react";
import type { AcademicLevel } from "@/lib/schemas";

const LEVELS: { value: AcademicLevel; label: string; desc: string; icon: string }[] = [
  {
    value: "high-school",
    label: "High School Level",
    desc: "Simple language, intuitive explanations",
    icon: "🎒",
  },
  {
    value: "college",
    label: "College Level",
    desc: "Technical depth, standard textbook level",
    icon: "🎓",
  },
  {
    value: "postgraduate",
    label: "PG Level",
    desc: "Advanced analysis, research-oriented",
    icon: "🔬",
  },
];

interface LevelSelectProps {
  value: AcademicLevel;
  onChange: (level: AcademicLevel) => void;
}

export default function LevelSelect({ value, onChange }: LevelSelectProps) {
  return (
    <div className="level-select">
      <label className="field-label">Academic Level</label>
      <div className="level-options">
        {LEVELS.map((l) => (
          <label 
            key={l.value} 
            className={`level-option ${value === l.value ? "active" : ""}`}
          >
            <input
              type="radio"
              name="academic-level"
              value={l.value}
              checked={value === l.value}
              onChange={() => onChange(l.value)}
              className="sr-only"
            />
            <span className="level-icon">{l.icon}</span>
            <div className="level-info">
              <span className="level-label">{l.label}</span>
              <span className="level-desc">{l.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
