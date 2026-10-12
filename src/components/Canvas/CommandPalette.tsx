"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTerraformStore } from "@/store/useTerraformStore";
import { Search, Command, Save, Download, Upload, Copy, Undo2, Redo2, Minimize2, Maximize2, Settings, Palette, Code, MousePointer, Hand, RotateCw, Box, Server, Database, HardDrive, Globe, Shield, Key, Layers as LayersIcon, Sparkles, HelpCircle, Trash2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

export default function CommandPalette() {
  const { nodes, selectNodes, clearSelection, deleteNodes, undo, redo, selectedNodeIds } = useDiagramStore();
  const { isEditorOpen, setEditorState, openConfig, toggleAwsComponents, toggleAiConsole } = useUIPanelStore();
  const { currentProjectName, saveCurrentProject, createNewProject } = useProjectStore();
  const { getAllAsString: getTerraform } = useTerraformStore();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCommands = useMemo((): CommandItem[] => {
    const cmds: CommandItem[] = [
      // File operations
      {
        id: "new-project",
        label: "New Project",
        description: "Create a new project",
        keywords: ["new", "create", "project", "file"],
        icon: <Plus className="h-4 w-4" />,
        shortcut: "Ctrl+N",
        category: "File",
        action: () => { createNewProject("Untitled Project"); setIsOpen(false); },
      },
      {
        id: "save-project",
        label: "Save Project",
        description: "Save current project to cloud and local",
        keywords: ["save", "sync", "cloud", "local"],
        icon: <Save className="h-4 w-4" />,
        shortcut: "Ctrl+S",
        category: "File",
        action: () => { saveCurrentProject("both"); setIsOpen(false); },
      },
      {
        id: "export-terraform",
        label: "Export Terraform (.tf)",
        description: "Download generated Terraform as .tf file",
        keywords: ["export", "terraform", "tf", "download", "hcl"],
        icon: <Download className="h-4 w-4" />,
        shortcut: "Ctrl+E",
        category: "File",
        action: () => {
          const tf = getTerraform();
          const blob = new Blob([tf], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${currentProjectName.replace(/\s+/g, "-").toLowerCase()}.tf`;
          a.click();
          URL.revokeObjectURL(url);
          setIsOpen(false);
        },
      },
      {
        id: "import-terraform",
        label: "Import Terraform",
        description: "Import Terraform HCL file to diagram",
        keywords: ["import", "terraform", "tf", "hcl", "upload"],
        icon: <Upload className="h-4 w-4" />,
        category: "File",
        action: () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".tf,.hcl,.txt";
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              await file.text();
              // TODO: Use terraform parser
              alert("Terraform import coming soon!");
            }
          };
          input.click();
          setIsOpen(false);
        },
      },
      {
        id: "copy-terraform",
        label: "Copy Terraform to Clipboard",
        description: "Copy generated Terraform to clipboard",
        keywords: ["copy", "terraform", "clipboard", "hcl"],
        icon: <Copy className="h-4 w-4" />,
        shortcut: "Ctrl+Shift+C",
        category: "File",
        action: () => {
          const tf = getTerraform();
          navigator.clipboard.writeText(tf);
          setIsOpen(false);
        },
      },

      // Edit operations
      {
        id: "undo",
        label: "Undo",
        description: "Undo last action",
        keywords: ["undo", "back", "reverse"],
        icon: <Undo2 className="h-4 w-4" />,
        shortcut: "Ctrl+Z",
        category: "Edit",
        action: () => { undo(); setIsOpen(false); },
      },
      {
        id: "redo",
        label: "Redo",
        description: "Redo last undone action",
        keywords: ["redo", "forward", "repeat"],
        icon: <Redo2 className="h-4 w-4" />,
        shortcut: "Ctrl+Shift+Z",
        category: "Edit",
        action: () => { redo(); setIsOpen(false); },
      },
      {
        id: "delete-selected",
        label: "Delete Selected",
        description: "Delete selected nodes",
        keywords: ["delete", "remove", "trash"],
        icon: <Trash2 className="h-4 w-4" />,
        shortcut: "Delete",
        category: "Edit",
        action: () => { deleteNodes(selectedNodeIds); setIsOpen(false); },
      },
      {
        id: "clear-selection",
        label: "Clear Selection",
        description: "Deselect all nodes",
        keywords: ["deselect", "clear", "selection"],
        icon: <Minimize2 className="h-4 w-4" />,
        shortcut: "Escape",
        category: "Edit",
        action: () => { clearSelection(); setIsOpen(false); },
      },
      {
        id: "select-all",
        label: "Select All Nodes",
        description: "Select all nodes on canvas",
        keywords: ["select", "all", "everything"],
        icon: <Maximize2 className="h-4 w-4" />,
        shortcut: "Ctrl+A",
        category: "Edit",
        action: () => { selectNodes(nodes.map(n => n.id)); setIsOpen(false); },
      },

      // View operations
      {
        id: "toggle-editor",
        label: "Toggle Terraform Editor",
        description: "Show/hide Terraform code panel",
        keywords: ["editor", "terraform", "code", "panel", "sidebar"],
        icon: <Code className="h-4 w-4" />,
        shortcut: "Ctrl+E",
        category: "View",
        action: () => { setEditorState(!isEditorOpen); setIsOpen(false); },
      },
      {
        id: "toggle-settings",
        label: "Toggle Settings Panel",
        description: "Show/hide node settings panel",
        keywords: ["settings", "properties", "config", "panel"],
        icon: <Settings className="h-4 w-4" />,
        shortcut: "Ctrl+,",
        category: "View",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "toggle-components",
        label: "Toggle AWS Components",
        description: "Show/hide AWS components palette",
        keywords: ["components", "aws", "palette", "nodes", "resources"],
        icon: <LayersIcon className="h-4 w-4" />,
        shortcut: "Ctrl+Shift+A",
        category: "View",
        action: () => { toggleAwsComponents(); setIsOpen(false); },
      },
      {
        id: "toggle-ai",
        label: "Toggle AI Console",
        description: "Show/hide AI architecture copilot",
        keywords: ["ai", "artificial intelligence", "copilot", "generate"],
        icon: <Sparkles className="h-4 w-4" />,
        shortcut: "Ctrl+Shift+I",
        category: "View",
        action: () => { toggleAiConsole(); setIsOpen(false); },
      },
      {
        id: "toggle-config",
        label: "Toggle Config Panel",
        description: "Show/hide configuration panel",
        keywords: ["config", "configuration", "options", "panel"],
        icon: <Palette className="h-4 w-4" />,
        category: "View",
        action: () => { openConfig(); setIsOpen(false); },
      },

      // Tools
      {
        id: "tool-select",
        label: "Select Tool",
        description: "Switch to select tool",
        keywords: ["select", "cursor", "pointer", "tool"],
        icon: <MousePointer className="h-4 w-4" />,
        shortcut: "V",
        category: "Tools",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "tool-hand",
        label: "Hand Tool (Pan)",
        description: "Switch to hand tool for panning",
        keywords: ["hand", "pan", "move", "tool", "grab"],
        icon: <Hand className="h-4 w-4" />,
        shortcut: "H",
        category: "Tools",
        action: () => { /* TODO */ setIsOpen(false); },
      },

      // Canvas operations
      {
        id: "center-canvas",
        label: "Center Canvas",
        description: "Reset view to center at 100% zoom",
        keywords: ["center", "reset", "view", "zoom", "home"],
        icon: <RotateCw className="h-4 w-4" />,
        shortcut: "Ctrl+0",
        category: "Canvas",
        action: () => { /* TODO: useReactFlow().setCenter() */ setIsOpen(false); },
      },
      {
        id: "zoom-in",
        label: "Zoom In",
        description: "Zoom in on canvas",
        keywords: ["zoom", "in", "bigger", "magnify"],
        icon: <Plus className="h-4 w-4" />,
        shortcut: "Ctrl++",
        category: "Canvas",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "zoom-out",
        label: "Zoom Out",
        description: "Zoom out on canvas",
        keywords: ["zoom", "out", "smaller", "shrink"],
        icon: <Minus className="h-4 w-4" />,
        shortcut: "Ctrl+-",
        category: "Canvas",
        action: () => { /* TODO */ setIsOpen(false); },
      },

      // Node creation
      {
        id: "add-vpc",
        label: "Add VPC",
        description: "Create a new VPC",
        keywords: ["add", "create", "vpc", "network", "vpc"],
        icon: <Globe className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-subnet",
        label: "Add Subnet",
        description: "Create a new subnet inside VPC",
        keywords: ["add", "create", "subnet", "network", "subnet"],
        icon: <Box className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-ec2",
        label: "Add EC2 Instance",
        description: "Create a new EC2 instance",
        keywords: ["add", "create", "ec2", "instance", "server", "compute"],
        icon: <Server className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-rds",
        label: "Add RDS Database",
        description: "Create a new RDS database",
        keywords: ["add", "create", "rds", "database", "db", "sql"],
        icon: <Database className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-s3",
        label: "Add S3 Bucket",
        description: "Create a new S3 bucket",
        keywords: ["add", "create", "s3", "bucket", "storage", "object"],
        icon: <HardDrive className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-ebs",
        label: "Add EBS Volume",
        description: "Create a new EBS volume",
        keywords: ["add", "create", "ebs", "volume", "block", "storage"],
        icon: <HardDrive className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-elb",
        label: "Add Load Balancer",
        description: "Create a new Application Load Balancer",
        keywords: ["add", "create", "elb", "alb", "load balancer", "network"],
        icon: <Globe className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-sg",
        label: "Add Security Group",
        description: "Create a new security group",
        keywords: ["add", "create", "security group", "sg", "firewall", "security"],
        icon: <Shield className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-iam",
        label: "Add IAM Role",
        description: "Create a new IAM role",
        keywords: ["add", "create", "iam", "role", "permission", "security"],
        icon: <Key className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "add-keypair",
        label: "Add Key Pair",
        description: "Create a new SSH key pair",
        keywords: ["add", "create", "key pair", "ssh", "key", "security"],
        icon: <Key className="h-4 w-4" />,
        category: "Add Node",
        action: () => { /* TODO */ setIsOpen(false); },
      },

      // Help
      {
        id: "shortcuts",
        label: "Show Keyboard Shortcuts",
        description: "Display all keyboard shortcuts",
        keywords: ["shortcuts", "hotkeys", "keys", "help", "keyboard"],
        icon: <HelpCircle className="h-4 w-4" />,
        shortcut: "Ctrl+/",
        category: "Help",
        action: () => { /* TODO */ setIsOpen(false); },
      },
      {
        id: "docs",
        label: "Open Documentation",
        description: "Open InfraFlow documentation",
        keywords: ["docs", "documentation", "help", "guide", "manual"],
        icon: <HelpCircle className="h-4 w-4" />,
        category: "Help",
        action: () => { window.open("https://github.com/infraflow/docs", "_blank"); setIsOpen(false); },
      },
    ];

    return cmds;
  }, [
    nodes,
    selectedNodeIds,
    isEditorOpen,
    currentProjectName,
    clearSelection,
    createNewProject,
    deleteNodes,
    getTerraform,
    openConfig,
    redo,
    saveCurrentProject,
    selectNodes,
    setEditorState,
    toggleAiConsole,
    toggleAwsComponents,
    undo,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(lowerQuery)) ||
      cmd.shortcut?.toLowerCase().includes(lowerQuery)
    );
  }, [allCommands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const getTotalCommands = useCallback(() => {
    let total = 0;
    for (const cat of Object.values(groupedCommands)) {
      total += cat.length;
    }
    return total;
  }, [groupedCommands]);

  const executeSelected = useCallback(() => {
    let index = 0;
    for (const cat of Object.values(groupedCommands)) {
      if (selectedIndex < index + cat.length) {
        const cmd = cat[selectedIndex - index];
        cmd.action();
        return;
      }
      index += cat.length;
    }
  }, [groupedCommands, selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setQuery("");
        setSelectedIndex(0);
      }

      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setQuery("");
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, getTotalCommands() - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          executeSelected();
          break;
        case "Tab":
          e.preventDefault();
          // Cycle through categories
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, executeSelected, getTotalCommands]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    setSelectedIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative z-10 w-full max-w-2xl bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <div className="p-4 border-b border-[#374151] bg-[#131316]">
          <div className="relative">
            <Command className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-[#1a1a22] px-2 py-0.5 rounded">
              {navigator.platform.includes("Mac") ? "���" : "Ctrl"} + K
            </kbd>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Type a command or search..."
              className="w-full pl-12 pr-20 py-3 bg-[#1a1a22] border border-[#374151] rounded-lg text-white text-lg placeholder:text-slate-500 outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No commands found for {"{query}"}</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  {category}
                  <span className="text-slate-600 bg-[#1a1a22] px-2 py-0.5 rounded text-[10px]">{cmds.length}</span>
                </h3>
                <div className="space-y-1">
                  {cmds.map((cmd, i) => {
                    const globalIndex = Object.values(groupedCommands)
                      .slice(0, Object.keys(groupedCommands).indexOf(category))
                      .reduce((sum, arr) => sum + arr.length, 0) + i;
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isSelected
                            ? "bg-blue-500/20 text-white"
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                        )}
                      >
                        {cmd.icon && <span className={cn("flex-shrink-0 h-5 w-5", isSelected ? "text-blue-400" : "text-slate-500")}>{cmd.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{cmd.label}</div>
                          <div className="text-xs text-slate-500 truncate">{cmd.description}</div>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="flex-shrink-0 px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-[#1a1a22] rounded">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#374151] bg-[#131316] flex items-center justify-between text-xs text-slate-500">
          <span>{filteredCommands.length} command(s) available</span>
          <span>{"���K"} Navigate • Enter Execute • Esc Close</span>
        </div>
      </div>
    </div>
  );
}