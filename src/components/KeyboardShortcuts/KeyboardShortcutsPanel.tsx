"use client";

import React, { useEffect, useState } from "react";
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from "@/lib/keyboardShortcuts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, X, Keyboard } from "lucide-react";

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  const { getCategories } = useKeyboardShortcuts();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    DEFAULT_SHORTCUTS.forEach(s => shortcutRegistry.register(s));
    return () => DEFAULT_SHORTCUTS.forEach(s => shortcutRegistry.unregister(s.id));
  }, []);

  const categories = getCategories();
  const filteredCategories = categories.map(cat => ({
    ...cat,
    shortcuts: cat.shortcuts.filter(s =>
      s.description.toLowerCase().includes(filter.toLowerCase()) ||
      s.keys.some(k => k.toLowerCase().includes(filter.toLowerCase())) ||
      s.category.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter(cat => cat.shortcuts.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl max-h-[80vh] bg-[#131316] border border-[#374151] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <CardHeader className="flex items-center justify-between p-4 border-b border-[#374151] flex-shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            Keyboard Shortcuts
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </CardHeader>

        <div className="p-4 border-b border-[#374151] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a22] border border-[#374151] rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <CardContent className="p-4 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1 border-[#374151]" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                      {cat.label}
                    </span>
                    <Separator className="flex-1 border-[#374151]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cat.shortcuts.map(shortcut => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-[#1a1a22] border border-[#374151] rounded-lg hover:border-blue-500/50 transition"
                      >
                        <span className="text-sm text-gray-300">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <React.Fragment key={i}>
                              <kbd className="px-2 py-0.5 bg-[#0b0c0e] border border-[#374151] rounded text-xs font-mono text-gray-200 min-w-[28px] text-center">
                                {key === "meta" ? "⌘" : key === "ctrl" ? "Ctrl" : key === "shift" ? "⇧" : key === "alt" ? "Alt" : key.toUpperCase()}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-gray-600 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No shortcuts match your filter
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

import { shortcutRegistry } from "@/lib/keyboardShortcuts";