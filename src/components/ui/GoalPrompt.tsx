"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { CreateGoalForm } from "@/components/dashboard/CreateGoalForm";

interface ParsedGoal {
  title: string;
  description: string;
  targetDate: string;
  successCriteria: string;
}

const MONTH_MAP: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseGoalInput(input: string): ParsedGoal {
  const result: ParsedGoal = { title: "", description: "", targetDate: "", successCriteria: "" };

  // Split on period or semicolons to get clauses
  const parts = input.split(/(?<=[.;])\s+/).filter(Boolean);

  // Extract success criteria: look for "success means/is/when..." or "achieved when..."
  const successPatterns = [
    /success\s+(?:means|is|criteria|looks like|would be)[:\s]+(.+)/i,
    /achieved\s+(?:when|by|if)[:\s]+(.+)/i,
    /goal\s+is\s+met\s+(?:when|if)[:\s]+(.+)/i,
    /measured\s+by[:\s]+(.+)/i,
  ];

  const remainingParts: string[] = [];
  for (const part of parts) {
    let matched = false;
    for (const pattern of successPatterns) {
      const match = part.match(pattern);
      if (match) {
        result.successCriteria = match[1].trim().replace(/\.$/, "");
        matched = true;
        break;
      }
    }
    if (!matched) remainingParts.push(part);
  }

  // Rejoin remaining text for further parsing
  let text = remainingParts.join(" ");

  // Extract date: "by <month> <year>", "by <YYYY-MM-DD>", "before <month> <year>", "by end of <year>"
  const datePatterns = [
    // "by December 2025" or "before March 2026"
    /(?:by|before|until|due)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
    // "by 2025-12-01" or "by 2025/12/01"
    /(?:by|before|until|due)\s+(\d{4})[-/](\d{1,2})[-/](\d{1,2})/i,
    // "by end of 2025"
    /(?:by|before)\s+(?:the\s+)?end\s+of\s+(\d{4})/i,
    // "by Q1 2026"
    /(?:by|before)\s+Q([1-4])\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        const month = MONTH_MAP[match[1].toLowerCase()];
        const year = match[2];
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        result.targetDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      } else if (pattern === datePatterns[1]) {
        result.targetDate = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      } else if (pattern === datePatterns[2]) {
        result.targetDate = `${match[1]}-12-31`;
      } else if (pattern === datePatterns[3]) {
        const q = parseInt(match[1]);
        const year = match[2];
        const endMonth = q * 3;
        const lastDay = new Date(parseInt(year), endMonth, 0).getDate();
        result.targetDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
      text = text.replace(match[0], "").replace(/,\s*,/g, ",").trim();
      break;
    }
  }

  // Now split remaining text into title vs description
  // First sentence or clause (up to first comma, period, or dash separator) is the title
  // The rest is description
  const separatorMatch = text.match(/^([^,.\n]+?)(?:[,.]|\s+-\s+|\s+(?:by|through|via|need(?:ing)?|requiring|I need|I want|including)\s+)(.+)$/is);

  if (separatorMatch && separatorMatch[2].trim().length > 10) {
    result.title = separatorMatch[1].trim().replace(/[,.]$/, "");
    result.description = separatorMatch[2].trim().replace(/\.$/, "");
  } else {
    result.title = text.trim().replace(/\.$/, "");
  }

  return result;
}

export function GoalPrompt() {
  const [inputValue, setInputValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [parsed, setParsed] = useState<ParsedGoal>({ title: "", description: "", targetDate: "", successCriteria: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setParsed(parseGoalInput(trimmed));
    setShowModal(true);
  }

  function handleCreated() {
    setShowModal(false);
    setParsed({ title: "", description: "", targetDate: "", successCriteria: "" });
    setInputValue("");
    window.location.reload();
  }

  function handleCancel() {
    setShowModal(false);
    setParsed({ title: "", description: "", targetDate: "", successCriteria: "" });
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tell me your next goal..."
            className="w-[360px] rounded-full border border-zinc-300 bg-white/95 px-5 py-3 text-sm text-zinc-800 shadow-lg backdrop-blur-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-shadow hover:shadow-xl"
          />
          {inputValue.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-900 p-1.5 text-white hover:bg-zinc-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          )}
        </form>
      </div>

      <Modal
        open={showModal}
        onClose={handleCancel}
        title="Create New Goal"
      >
        <CreateGoalForm
          key={parsed.title + parsed.targetDate}
          initialTitle={parsed.title}
          initialDescription={parsed.description}
          initialTargetDate={parsed.targetDate}
          initialSuccessCriteria={parsed.successCriteria}
          onCreated={handleCreated}
          onCancel={handleCancel}
        />
      </Modal>
    </>
  );
}
