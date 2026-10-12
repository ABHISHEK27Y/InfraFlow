"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: () => void | Promise<void>;
  global?: boolean;
  preventDefault?: boolean;
}

export interface ShortcutCategory {
  id: string;
  label: string;
  shortcuts: KeyboardShortcut[];
}

const SPECIAL_KEYS: Record<string, string> = {
  " ": "Space",
  escape: "Esc",
  enter: "Enter",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Del",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  pageup: "PgUp",
  pagedown: "PgDn",
  home: "Home",
  end: "End",
  insert: "Ins",
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/^(meta|ctrl|control|shift|alt)$/, (m) => m === "control" ? "ctrl" : m);
}

function keysMatch(pressed: Set<string>, shortcutKeys: string[]): boolean {
  if (pressed.size !== shortcutKeys.length) return false;
  return shortcutKeys.every(k => pressed.has(normalizeKey(k)));
}

function formatKey(key: string): string {
  const normalized = normalizeKey(key);
  if (normalized === "meta") return "⌘";
  if (normalized === "ctrl") return "Ctrl";
  if (normalized === "shift") return "⇧";
  if (normalized === "alt") return "Alt";
  return SPECIAL_KEYS[normalized] || normalized.toUpperCase();
}

export function formatShortcut(keys: string[]): string {
  return keys.map(formatKey).join(" + ");
}

class ShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private categories: Map<string, ShortcutCategory> = new Map();
  private pressedKeys: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private enabled = true;

  register(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
    const cat = this.categories.get(shortcut.category);
    if (cat) {
      cat.shortcuts.push(shortcut);
    } else {
      this.categories.set(shortcut.category, {
        id: shortcut.category,
        label: shortcut.category,
        shortcuts: [shortcut],
      });
    }
    this.notify();
  }

  unregister(id: string) {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const cat = this.categories.get(shortcut.category);
      if (cat) {
        cat.shortcuts = cat.shortcuts.filter(s => s.id !== id);
      }
      this.shortcuts.delete(id);
      this.notify();
    }
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getCategories(): ShortcutCategory[] {
    return Array.from(this.categories.values()).filter(c => c.shortcuts.length > 0);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  handleKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (!e.metaKey && !e.ctrlKey) return;
    }

    const key = normalizeKey(e.key);
    this.pressedKeys.add(key);

    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.global) continue;
      if (keysMatch(this.pressedKeys, shortcut.keys)) {
        if (shortcut.preventDefault !== false) e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    const key = normalizeKey(e.key);
    this.pressedKeys.delete(key);
  }

  reset() {
    this.pressedKeys.clear();
  }
}

export const shortcutRegistry = new ShortcutRegistry();

if (typeof window !== "undefined") {
  window.addEventListener("keydown", e => shortcutRegistry.handleKeyDown(e));
  window.addEventListener("keyup", e => shortcutRegistry.handleKeyUp(e));
  window.addEventListener("blur", () => shortcutRegistry.reset());
}

export function useKeyboardShortcuts() {
  const [, forceUpdate] = useState(0);
  const categoriesRef = useRef(shortcutRegistry.getCategories());

  useEffect(() => {
    return shortcutRegistry.subscribe(() => {
      categoriesRef.current = shortcutRegistry.getCategories();
      forceUpdate(n => n + 1);
    });
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutRegistry.register(shortcut);
    return () => shortcutRegistry.unregister(shortcut.id);
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    shortcutRegistry.unregister(id);
  }, []);

  const getShortcutsList = useCallback(() => {
    return shortcutRegistry.getAll();
  }, []);

  const getCategories = useCallback(() => {
    return categoriesRef.current;
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    shortcutRegistry.setEnabled(enabled);
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    getShortcutsList,
    getCategories,
    setEnabled,
  };
}

export function createShortcut(
  id: string,
  keys: string[],
  description: string,
  category: string,
  action: () => void | Promise<void>,
  options: { global?: boolean; preventDefault?: boolean } = {}
): KeyboardShortcut {
  return { id, keys, description, category, action, ...options };
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  createShortcut("search", ["meta", "k"], "Open global search", "Navigation", () => {
    window.dispatchEvent(new CustomEvent("open-global-search"));
  }, { global: true }),
  createShortcut("shortcuts", ["meta", "shift", "k"], "Show keyboard shortcuts", "Navigation", () => {
    window.dispatchEvent(new CustomEvent("show-shortcuts"));
  }, { global: true }),
  createShortcut("new-project", ["meta", "n"], "New project", "File", () => {
    window.dispatchEvent(new CustomEvent("new-project"));
  }, { global: true }),
  createShortcut("save", ["meta", "s"], "Save project", "File", () => {
    window.dispatchEvent(new CustomEvent("save-project"));
  }, { global: true }),
  createShortcut("undo", ["meta", "z"], "Undo", "Edit", () => {
    window.dispatchEvent(new CustomEvent("undo"));
  }, { global: true }),
  createShortcut("redo", ["meta", "shift", "z"], "Redo", "Edit", () => {
    window.dispatchEvent(new CustomEvent("redo"));
  }, { global: true }),
  createShortcut("delete", ["delete"], "Delete selected", "Edit", () => {
    window.dispatchEvent(new CustomEvent("delete-selected"));
  }, { global: true }),
  createShortcut("duplicate", ["meta", "d"], "Duplicate selected", "Edit", () => {
    window.dispatchEvent(new CustomEvent("duplicate-selected"));
  }, { global: true }),
  createShortcut("select-all", ["meta", "a"], "Select all", "Edit", () => {
    window.dispatchEvent(new CustomEvent("select-all"));
  }, { global: true }),
  createShortcut("generate-terraform", ["meta", "g"], "Generate Terraform", "Terraform", () => {
    window.dispatchEvent(new CustomEvent("generate-terraform"));
  }, { global: true }),
  createShortcut("import-terraform", ["meta", "i"], "Import Terraform", "Terraform", () => {
    window.dispatchEvent(new CustomEvent("import-terraform"));
  }, { global: true }),
  createShortcut("drift-detection", ["meta", "shift", "d"], "Drift detection", "Analysis", () => {
    window.dispatchEvent(new CustomEvent("drift-detection"));
  }, { global: true }),
  createShortcut("cost-estimation", ["meta", "shift", "c"], "Cost estimation", "Analysis", () => {
    window.dispatchEvent(new CustomEvent("cost-estimation"));
  }, { global: true }),
  createShortcut("policy-validation", ["meta", "shift", "p"], "Policy validation", "Analysis", () => {
    window.dispatchEvent(new CustomEvent("policy-validation"));
  }, { global: true }),
  createShortcut("auto-layout", ["meta", "shift", "l"], "Auto layout", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("auto-layout"));
  }, { global: true }),
  createShortcut("zoom-in", ["meta", "="], "Zoom in", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("zoom-in"));
  }, { global: true }),
  createShortcut("zoom-out", ["meta", "-"], "Zoom out", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("zoom-out"));
  }, { global: true }),
  createShortcut("zoom-fit", ["meta", "0"], "Fit view", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("zoom-fit"));
  }, { global: true }),
  createShortcut("toggle-minimap", ["meta", "m"], "Toggle minimap", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("toggle-minimap"));
  }, { global: true }),
  createShortcut("toggle-sidebar", ["meta", "b"], "Toggle sidebar", "Canvas", () => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }, { global: true }),
  createShortcut("help", ["meta", "?"], "Show help", "Help", () => {
    window.dispatchEvent(new CustomEvent("show-help"));
  }, { global: true }),
];