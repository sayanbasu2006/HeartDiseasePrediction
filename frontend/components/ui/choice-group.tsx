"use client";

import type { Ref } from "react";
import { Check } from "lucide-react";
import type { ClinicalOption } from "@/lib/api";

type Props = {
  name: string;
  label: string;
  value: number | undefined;
  options: ClinicalOption[];
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: number) => void;
  onBlur: () => void;
};

/** Real radio inputs preserve native arrow-key navigation and form semantics. */
export function ChoiceGroup({
  name,
  label,
  value,
  options,
  describedBy,
  inputRef,
  onChange,
  onBlur,
}: Props) {
  return (
    <div
      className="choice-group"
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
    >
      {options.map((option, index) => (
        <label
          key={option.value}
          className={`choice-option ${value === option.value ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            onBlur={onBlur}
            ref={index === 0 ? inputRef : undefined}
          />
          <span className="choice-indicator" aria-hidden="true">
            <Check size={12} strokeWidth={2.8} />
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
