"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTerraformResourceStore } from "@/store/useTerraformResourceStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MousePointer,
  GitBranch,
  FileText,
  Settings,
  Shield,
  DollarSign,
  Layers,
  ChevronRight,
  Keyboard,
  X,
  Zap,
  ExternalLink,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: "nodes" | "edges" | "resources" | "projects" | "actions" | "settings";
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
}

const CATEGORIES = [
  { key: "nodes", label: "Nodes", icon: MousePointer, color: "text-blue-400" },
  { key: "edges", label: "Connections", icon: GitBranch, color: "text-green-400" },
  { key: "resources", label: "Resources", icon: FileText, color: "text-purple-400" },
  { key: "projects", label: "Projects", icon: Layers, color: "text-orange-400" },
  { key: "actions", label: "Actions", icon: Zap, color: "text-yellow-400" },
  { key: "settings", label: "Settings", icon: Settings, color: "text-gray-400" },
] as const;

export default function GlobalSearch() {
  const { nodes, edges } = useDiagramStore();
  const { setEditorState, openConfig } = useUIPanelStore();
  const { projectsList, currentProjectId, loadProject, createNewProject } = useProjectStore();
  const { resources } = useTerraformResourceStore();
  const { registerShortcut, getShortcutsList } = useKeyboardShortcuts();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getFilteredResults = useCallback((): SearchResult[] => {
    const results: SearchResult[] = [];
    const q = query.toLowerCase().trim();

    // If no query, show recent actions and shortcuts
    if (!q) {
      // Recent projects
      projectsList.slice(0, 3).forEach((project) => {
        results.push({
          id: `project-${project.id}`,
          title: project.name,
          description: project.id === currentProjectId ? "Current project" : `Last updated ${new Date(project.updatedAt).toLocaleDateString()}`,
          category: "projects",
          icon: <Layers className="w-4 h-4 text-orange-400" />,
          keywords: [project.name.toLowerCase()],
          action: () => loadProject(project.id),
        });
      });

      // Quick actions
      results.push(
        {
          id: "action-new-project",
          title: "New Project",
          description: "Create a new infrastructure project",
          category: "actions",
          icon: <Zap className="w-4 h-4 text-yellow-400" />,
          keywords: ["new", "create", "project"],
          action: () => createNewProject("New Project"),
        },
        {
          id: "action-terraform",
          title: "Generate Terraform",
          description: "Open Terraform editor and generate code",
          category: "actions",
          icon: <FileText className="w-4 h-4 text-blue-400" />,
          keywords: ["terraform", "generate", "code", "export"],
          action: () => setEditorState(true),
        },
        {
          id: "action-import",
          title: "Import Terraform",
          description: "Import .tf/.hcl files to diagram",
          category: "actions",
          icon: <ExternalLink className="w-4 h-4 text-green-400" />,
          keywords: ["import", "terraform", "hcl", "tf"],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-terraform-import"));
          },
        },
        {
          id: "action-drift",
          title: "Drift Detection",
          description: "Compare diagram with deployed infrastructure",
          category: "actions",
          icon: <Shield className="w-4 h-4 text-red-400" />,
          keywords: ["drift", "detect", "compare", "deployed"],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-drift-detection"));
          },
        },
        {
          id: "action-cost",
          title: "Cost Estimation",
          description: "View infrastructure cost estimates",
          category: "actions",
          icon: <DollarSign className="w-4 h-4 text-green-400" />,
          keywords: ["cost", "estimate", "pricing", "infracost"],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-cost-panel"));
          },
        },
        {
          id: "action-policy",
          title: "Policy Validation",
          description: "Check compliance and best practices",
          category: "actions",
          icon: <Shield className="w-4 h-4 text-purple-400" />,
          keywords: ["policy", "validate", "compliance", "security"],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-policy-panel"));
          },
        }
      );

      // Settings shortcuts
      results.push(
        {
          id: "settings-resources",
          title: "Resource Library",
          description: "Browse and add AWS resources",
          category: "settings",
          icon: <Settings className="w-4 h-4 text-gray-400" />,
          keywords: ["resources", "library", "aws", "components"],
          action: () => openConfig(),
        },
        {
          id: "settings-projects",
          title: "Project Manager",
          description: "Manage your projects",
          category: "settings",
          icon: <Layers className="w-4 h-4 text-gray-400" />,
          keywords: ["projects", "manage", "list"],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-project-manager"));
          },
        }
      );

      return results;
    }

    // Search nodes
    nodes.forEach((node) => {
      const data = node.data as Record<string, unknown>;
      const name = (data?.Name as string) || node.id;
      const type = node.type || "unknown";
      const searchText = `${name} ${type}`.toLowerCase();

      if (searchText.includes(q)) {
        results.push({
          id: `node-${node.id}`,
          title: name,
          description: `${type} node`,
          category: "nodes",
          icon: <MousePointer className="w-4 h-4 text-blue-400" />,
          keywords: [name.toLowerCase(), type.toLowerCase()],
          action: () => {
            window.dispatchEvent(new CustomEvent("select-node", { detail: { nodeId: node.id } }));
          },
        });
      }
    });

    // Search edges
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      const sourceData = source?.data as Record<string, unknown> | undefined;
      const targetData = target?.data as Record<string, unknown> | undefined;
      const sourceName = (sourceData?.Name as string) || edge.source;
      const targetName = (targetData?.Name as string) || edge.target;
      const searchText = `${sourceName} ${targetName} ${edge.type || ""}`.toLowerCase();

      if (searchText.includes(q)) {
        results.push({
          id: `edge-${edge.id}`,
          title: `${sourceName} → ${targetName}`,
          description: `Connection (${edge.type || "default"})`,
          category: "edges",
          icon: <GitBranch className="w-4 h-4 text-green-400" />,
          keywords: [sourceName.toLowerCase(), targetName.toLowerCase()],
          action: () => {
            window.dispatchEvent(new CustomEvent("select-edge", { detail: { edgeId: edge.id } }));
          },
        });
      }
    });

    // Search resources
    resources.forEach((resource) => {
      const name = resource.id;
      const type = resource.type;
      const searchText = `${name} ${type}`.toLowerCase();

      if (searchText.includes(q)) {
        results.push({
          id: `resource-${resource.id}`,
          title: name,
          description: `${type} resource`,
          category: "resources",
          icon: <FileText className="w-4 h-4 text-purple-400" />,
          keywords: [name.toLowerCase(), type.toLowerCase()],
          action: () => {
            window.dispatchEvent(new CustomEvent("open-resource-settings", { detail: { resourceId: resource.id } }));
          },
        });
      }
    });

    // Search projects
    projectsList.forEach((project) => {
      if (project.name.toLowerCase().includes(q)) {
        results.push({
          id: `project-${project.id}`,
          title: project.name,
          description: project.id === currentProjectId ? "Current project" : `Last updated ${new Date(project.updatedAt).toLocaleDateString()}`,
          category: "projects",
          icon: <Layers className="w-4 h-4 text-orange-400" />,
          keywords: [project.name.toLowerCase()],
          action: () => loadProject(project.id),
        });
      }
    });

    // Search actions
    const actions = [
      { id: "action-new-project", title: "New Project", desc: "Create a new infrastructure project", keywords: ["new", "create", "project"], cat: "actions" as const, icon: <Zap className="w-4 h-4 text-yellow-400" />, action: () => createNewProject("New Project") },
      { id: "action-terraform", title: "Generate Terraform", desc: "Open Terraform editor and generate code", keywords: ["terraform", "generate", "code", "export"], cat: "actions" as const, icon: <FileText className="w-4 h-4 text-blue-400" />, action: () => setEditorState(true) },
      { id: "action-import", title: "Import Terraform", desc: "Import .tf/.hcl files to diagram", keywords: ["import", "terraform", "hcl", "tf"], cat: "actions" as const, icon: <ExternalLink className="w-4 h-4 text-green-400" />, action: () => window.dispatchEvent(new CustomEvent("open-terraform-import")) },
      { id: "action-drift", title: "Drift Detection", desc: "Compare diagram with deployed infrastructure", keywords: ["drift", "detect", "compare", "deployed"], cat: "actions" as const, icon: <Shield className="w-4 h-4 text-red-400" />, action: () => window.dispatchEvent(new CustomEvent("open-drift-detection")) },
      { id: "action-cost", title: "Cost Estimation", desc: "View infrastructure cost estimates", keywords: ["cost", "estimate", "pricing", "infracost"], cat: "actions" as const, icon: <DollarSign className="w-4 h-4 text-green-400" />, action: () => window.dispatchEvent(new CustomEvent("open-cost-panel")) },
      { id: "action-policy", title: "Policy Validation", desc: "Check compliance and best practices", keywords: ["policy", "validate", "compliance", "security"], cat: "actions" as const, icon: <Shield className="w-4 h-4 text-purple-400" />, action: () => window.dispatchEvent(new CustomEvent("open-policy-panel")) },
    ];

    actions.forEach((a) => {
      if (a.keywords.some((k) => k.includes(q)) || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)) {
        results.push({
          id: a.id,
          title: a.title,
          description: a.desc,
          category: a.cat,
          icon: a.icon,
          keywords: a.keywords,
          action: a.action,
        });
      }
    });

    // Search settings
    const settings = [
      { id: "settings-resources", title: "Resource Library", desc: "Browse and add AWS resources", keywords: ["resources", "library", "aws", "components"], cat: "settings" as const, icon: <Settings className="w-4 h-4 text-gray-400" />, action: () => openConfig() },
      { id: "settings-projects", title: "Project Manager", desc: "Manage your projects", keywords: ["projects", "manage", "list"], cat: "settings" as const, icon: <Layers className="w-4 h-4 text-gray-400" />, action: () => window.dispatchEvent(new CustomEvent("open-project-manager")) },
    ];

    settings.forEach((s) => {
      if (s.keywords.some((k) => k.includes(q)) || s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)) {
        results.push({
          id: s.id,
          title: s.title,
          description: s.desc,
          category: s.cat,
          icon: s.icon,
          keywords: s.keywords,
          action: s.action,
        });
      }
    });

    return results;
  }, [query, nodes, edges, resources, projectsList, currentProjectId, setEditorState, openConfig, loadProject, createNewProject]);

  // Register global Cmd+K shortcut
  useEffect(() => {
    const cleanup = registerShortcut({
      id: "global-search-open",
      keys: ["meta", "k"],
      description: "Open global search",
      category: "Navigation",
      action: () => {
        setIsOpen(true);
        setQuery("");
        setSelectedIndex(0);
      },
      global: true,
      preventDefault: true,
    });

    return cleanup;
  }, [registerShortcut]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const results = getFilteredResults();
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const result = results[selectedIndex];
        if (result) {
          result.action();
          close();
        }
      } else if (e.key === "?" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, showShortcuts, getFilteredResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const results = getFilteredResults();
  const selectedResult = results[selectedIndex];

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 px-4" ref={containerRef}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-2xl animate-in fade-in slide-in-from-top-4 duration-150">
        {/* Search Input */}
        <Card className="bg-[#131316] border border-[#374151] shadow-2xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search nodes, resources, actions... (⌘K to open, ? for shortcuts)"
                className="flex-1 bg-transparent border-none text-white text-lg placeholder-gray-500 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="px-2 py-1 text-xs bg-[#1a1a22] border border-[#374151] rounded text-gray-400 font-mono">
                ⌘K
              </kbd>
              <button
                onClick={close}
                className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="mt-2 bg-[#131316] border border-[#374151] shadow-2xl overflow-hidden max-h-[60vh]">
            <ScrollArea className="p-2">
              <div className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const catResults = groupedResults[cat.key];
                  if (!catResults || catResults.length === 0) return null;

                  const Icon = cat.icon;
                  return (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {cat.label} ({catResults.length})
                        </span>
                      </div>
                      {catResults.map((result) => {
                        const isSelected = result.id === selectedResult?.id;
                        const globalIdx = results.indexOf(result);
                        return (
                          <button
                            key={result.id}
                            onClick={() => {
                              result.action();
                              close();
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? "bg-blue-500/20 text-white"
                                : "hover:bg-[#1a1a22] text-gray-300"
                            }`}
                          >
                            <span className="flex-shrink-0">{result.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.title}</p>
                              <p className="text-xs text-gray-500 truncate">{result.description}</p>
                            </div>
                            {isSelected && (
                              <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        )}

        {results.length === 0 && query && (
          <Card className="mt-2 bg-[#131316] border border-[#374151] shadow-2xl">
            <CardContent className="p-6 text-center">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
            </CardContent>
          </Card>
        )}

        {/* Shortcuts Help Footer */}
        {!showShortcuts && (
          <div className="mt-3 text-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowShortcuts(true);
              }}
              className="text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center gap-1"
            >
              <Keyboard className="w-3 h-3" />
              Press <kbd className="px-1.5 py-0.5 bg-[#1a1a22] border border-[#374151] rounded text-xs">&#8984;?</kbd> for keyboard shortcuts
            </button>
          </div>
        )}

        {showShortcuts && (
          <Card className="mt-2 bg-[#131316] border border-[#374151] shadow-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {getShortcutsList().map((shortcut) => (
                    <div
                      key={shortcut.keys.join("+")}
                      className="flex items-center justify-between py-1 px-2 hover:bg-[#1a1a22] rounded"
                    >
                      <span className="text-gray-300 text-sm">{shortcut.description}</span>
                      <span className="flex items-center gap-1 text-gray-500 text-xs font-mono">
                        {shortcut.keys.map((k, i) => (
                          <React.Fragment key={i}>
                            <kbd className="px-1.5 py-0.5 bg-[#1a1a22] border border-[#374151] rounded">
                              {k === "meta" ? "⌘" : k === "ctrl" ? "Ctrl" : k === "shift" ? "⇧" : k.toUpperCase()}
                            </kbd>
                            {i < shortcut.keys.length - 1 && <span className="text-gray-600">+</span>}
                          </React.Fragment>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}