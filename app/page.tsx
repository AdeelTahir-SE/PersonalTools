"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center border border-card-border bg-card-bg hover:bg-card-border transition-colors cursor-pointer"
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

const tools = [
  {
    name: "Grid Crop",
    description: "Crop images using a grid overlay and export sections.",
    href: "/grid-crop",
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
    name: "Icon Extract",
    description: "Automatically detect and extract individual icons from an image.",
    href: "/icon-extract",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="5" width="12" height="12" rx="2" />
        <circle cx="29" cy="11" r="6" />
        <path d="M5 35 L11 24 L17 35 Z" />
        <rect x="23" y="23" width="12" height="12" rx="6" strokeDasharray="3 3" />
      </svg>
    ),
  },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const filtered = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 bg-background">
      <div className="w-full max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight mr-6 shrink-0">All Tools</h1>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-input-bg border border-input-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted"
              />
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Tool Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tool) => (
            <Link key={tool.name} href={tool.href}>
              <div className="rounded-xl border border-card-border bg-card-bg p-6 transition-all hover:shadow-md hover:border-foreground/20 cursor-pointer">
                <div className="mb-3 text-foreground">{tool.icon}</div>
                <h3 className="text-lg font-semibold mb-1">{tool.name}</h3>
                <p className="text-sm text-muted">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-20 text-muted">No tools found matching &quot;{search}&quot;</p>
        )}
      </div>
    </div>
  );
}
