"use client";

import { useEffect, useState } from "react";
import { X, Command, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutAction {
  keys: string[];
  description: string;
  category: string;
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutAction[];
}

export default function ShortcutsHelpModal({ isOpen, onClose, shortcuts }: ShortcutsHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const isMac = navigator.platform.includes("Mac");

  const formatKey = (key: string) => {
    if (key === "���") return isMac ? "���" : "Ctrl";
    if (key === "���") return "Shift";
    if (key === "���") return isMac ? "���" : "Alt";
    if (key === "���") return "Enter";
    if (key === "Escape") return "Esc";
    if (key === " ") return "Space";
    if (key === "ArrowUp") return "���";
    if (key === "ArrowDown") return "���";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    return key;
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const filteredShortcuts = searchQuery
    ? (Object.fromEntries(
        Object.entries(groupedShortcuts)
          .map(([cat, items]) => [
            cat,
            items.filter(
              (s) =>
                s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
            ),
          ])
          .filter(([, items]) => items.length > 0)
      ) as Record<string, ShortcutAction[]>)
    : groupedShortcuts;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151] bg-[#131316]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Command className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-500">
                {shortcuts.length} shortcuts • Press{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1a1a22] border border-[#374151] rounded">
                  {isMac ? "���" : "Ctrl"} + K
                </kbd>{" "}
                for Command Palette
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#374151] bg-[#131316]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a22] border border-[#374151] rounded-lg text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(filteredShortcuts).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Search className="h-12 w-12 mb-4 opacity-30" />
              <p>No shortcuts found for {"{searchQuery}"}</p>
            </div>
          ) : (
            Object.entries(filteredShortcuts).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  {category}
                  <span className="text-slate-600 bg-[#1a1a22] px-2 py-0.5 rounded text-[10px]">
                    {items.length}
                  </span>
                </h3>
                <div className="space-y-1">
                  {items.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                      <span className="text-sm text-slate-300 flex-1 pr-4">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className={cn(
                              "px-2 py-1 text-[11px] font-mono font-medium rounded bg-[#131316] border border-[#374151] text-slate-300",
                              key.length > 2 && "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                            )}
                          >
                            {formatKey(key)}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#374151] bg-[#131316] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <kbd className="px-2 py-1 text-[10px] font-mono bg-[#1a1a22] border border-[#374151] rounded">
              {isMac ? "���" : "Ctrl"} + K
            </kbd>
            <span>Open Command Palette</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}