"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

interface Tool {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  available: boolean;
}

const tools: Tool[] = [
  {
    name: "Grid Crop",
    description: "Crop images using a grid overlay and export sections.",
    href: "/grid-crop",
    available: true,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="32" height="32" rx="2" />
        <line x1="4" y1="15" x2="36" y2="15" />
        <line x1="4" y1="26" x2="36" y2="26" />
        <line x1="15" y1="4" x2="15" y2="36" />
        <line x1="26" y1="4" x2="26" y2="36" />
      </svg>
    ),
  },
  {
    name: "Calculator",
    description: "Perform quick calculations effortlessly.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="28" height="32" rx="3" />
        <rect x="10" y="8" width="20" height="8" rx="1" />
        <circle cx="14" cy="22" r="1.5" fill="currentColor" />
        <circle cx="20" cy="22" r="1.5" fill="currentColor" />
        <circle cx="26" cy="22" r="1.5" fill="currentColor" />
        <circle cx="14" cy="28" r="1.5" fill="currentColor" />
        <circle cx="20" cy="28" r="1.5" fill="currentColor" />
        <circle cx="26" cy="28" r="1.5" fill="currentColor" />
        <circle cx="14" cy="34" r="1.5" fill="currentColor" />
        <circle cx="20" cy="34" r="1.5" fill="currentColor" />
        <circle cx="26" cy="34" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Note",
    description: "Write and organize your thoughts.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="4" width="24" height="32" rx="2" />
        <line x1="13" y1="12" x2="27" y2="12" />
        <line x1="13" y1="18" x2="27" y2="18" />
        <line x1="13" y1="24" x2="22" y2="24" />
      </svg>
    ),
  },
  {
    name: "Calendar",
    description: "View dates and manage your schedule.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="8" width="32" height="28" rx="3" />
        <line x1="4" y1="16" x2="36" y2="16" />
        <line x1="13" y1="4" x2="13" y2="12" />
        <line x1="27" y1="4" x2="27" y2="12" />
        <rect x="10" y="20" width="4" height="4" rx="0.5" fill="currentColor" />
        <rect x="18" y="20" width="4" height="4" rx="0.5" fill="currentColor" />
        <rect x="26" y="20" width="4" height="4" rx="0.5" fill="currentColor" />
        <rect x="10" y="28" width="4" height="4" rx="0.5" fill="currentColor" />
        <rect x="18" y="28" width="4" height="4" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Alarm",
    description: "Set alarms and never miss important things.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <circle cx="20" cy="22" r="13" />
        <line x1="20" y1="22" x2="20" y2="14" />
        <line x1="20" y1="22" x2="26" y2="22" />
        <line x1="10" y1="6" x2="6" y2="10" />
        <line x1="30" y1="6" x2="34" y2="10" />
        <line x1="18" y1="36" x2="14" y2="38" />
        <line x1="22" y1="36" x2="26" y2="38" />
      </svg>
    ),
  },
  {
    name: "Stopwatch",
    description: "Measure time with precision using stopwatch.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <circle cx="20" cy="23" r="13" />
        <line x1="20" y1="23" x2="20" y2="15" />
        <line x1="20" y1="6" x2="20" y2="10" />
        <line x1="16" y1="6" x2="24" y2="6" />
        <line x1="30" y1="13" x2="33" y2="10" />
      </svg>
    ),
  },
  {
    name: "Timer",
    description: "Set countdown timers for your tasks.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <circle cx="20" cy="22" r="14" />
        <path d="M20 12 L20 22 L28 22" />
        <line x1="20" y1="4" x2="20" y2="8" />
      </svg>
    ),
  },
  {
    name: "World Clock",
    description: "Check time across different time zones.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <circle cx="20" cy="20" r="15" />
        <ellipse cx="20" cy="20" rx="8" ry="15" />
        <line x1="5" y1="20" x2="35" y2="20" />
        <path d="M7 12 Q20 15 33 12" />
        <path d="M7 28 Q20 25 33 28" />
      </svg>
    ),
  },
  {
    name: "Unit Converter",
    description: "Convert between various units easily.",
    href: "#",
    available: false,
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <path d="M8 32 L32 8" />
        <path d="M8 32 L8 24" />
        <path d="M8 32 L16 32" />
        <path d="M32 8 L32 16" />
        <path d="M32 8 L24 8" />
        <line x1="14" y1="26" x2="14" y2="22" />
        <line x1="20" y1="20" x2="20" y2="16" />
        <line x1="26" y1="14" x2="26" y2="10" />
      </svg>
    ),
  },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 bg-background">
      <div className="w-full max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">All Tools</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-full bg-input-bg border border-input-border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted"
              />
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Tool Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => {
            const card = (
              <div
                className={`rounded-xl border border-card-border bg-card-bg p-6 transition-all ${
                  tool.available
                    ? "hover:shadow-md hover:border-foreground/20 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="mb-3 text-foreground">{tool.icon}</div>
                <h3 className="text-lg font-semibold mb-1">{tool.name}</h3>
                <p className="text-sm text-muted">{tool.description}</p>
                {!tool.available && (
                  <span className="inline-block mt-2 text-xs text-muted bg-background px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>
            );

            return tool.available ? (
              <Link key={tool.name} href={tool.href}>
                {card}
              </Link>
            ) : (
              <div key={tool.name}>{card}</div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-lg">No tools found matching &quot;{search}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
