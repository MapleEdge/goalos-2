"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { CreateGoalForm } from "@/components/dashboard/CreateGoalForm";

export function GoalPrompt() {
  const [inputValue, setInputValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setGoalTitle(trimmed);
    setShowModal(true);
  }

  function handleCreated() {
    setShowModal(false);
    setGoalTitle("");
    setInputValue("");
    window.location.reload();
  }

  function handleCancel() {
    setShowModal(false);
    setGoalTitle("");
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
          key={goalTitle}
          initialTitle={goalTitle}
          onCreated={handleCreated}
          onCancel={handleCancel}
        />
      </Modal>
    </>
  );
}
