"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Trash2, Folder, Check, FileText, ShieldAlert, Map, GitBranch, Keyboard, Sparkles, Users, Download, Terminal, Wrench, Grid } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";

export default function Header({
  onGenerateTerraform,
  onShowCanvas,
  onToggleConfigPanel,
  onImportTerraform,
  onDriftDetection,
  onAutoLayout,
  onShortcuts,
  onAIAssistant,
  onCollaboration,
  onExport,
  onPipeline,
  onRemediation,
  onTemplateMarketplace,
}: {
  onGenerateTerraform?: () => void;
  onShowCanvas?: () => void;
  onToggleConfigPanel?: () => void;
  onImportTerraform?: () => void;
  onDriftDetection?: () => void;
  onAutoLayout?: () => void;
  onShortcuts?: () => void;
  onAIAssistant?: () => void;
  onCollaboration?: () => void;
  onExport?: () => void;
  onPipeline?: () => void;
  onRemediation?: () => void;
  onTemplateMarketplace?: () => void;
}) {
  const {
    currentProjectId,
    currentProjectName,
    projectsList,
    createNewProject,
    loadProject,
    renameCurrentProject,
    deleteProject,
  } = useProjectStore();

  const { isMinimapOpen, toggleMinimap } = useUIPanelStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentProjectName);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync editedName when store name changes
  useEffect(() => {
    setEditedName(currentProjectName);
  }, [currentProjectName]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameSave = () => {
    setIsEditingName(false);
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== currentProjectName) {
      renameCurrentProject(trimmed);
    } else {
      setEditedName(currentProjectName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditedName(currentProjectName);
    }
  };

  const handleNewProject = () => {
    createNewProject("New Project");
    setIsDropdownOpen(false);
  };

  return (
    <header className="relative w-full px-4 py-3 border-b border-[#222228] bg-[#232329] text-white flex flex-wrap items-center gap-3 shadow-md z-[1100]">
      {/* Brand & Project Selector */}
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link href="/" className="text-xl font-bold tracking-tight hover:text-blue-400 transition">
          InfraFlow
        </Link>
        
        <div className="h-6 w-[1px] bg-neutral-700" />

        {/* Project Selector / Editor */}
        <div className="relative flex items-center gap-1" ref={dropdownRef}>
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-neutral-800 border border-blue-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none w-48 font-medium"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="hover:bg-neutral-800/80 rounded px-2 py-1 text-sm font-medium transition max-w-[180px] truncate text-neutral-200 hover:text-white"
              title="Click to rename project"
            >
              {currentProjectName}
            </button>
          )}

          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
            title="Switch project"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Custom Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-[#1e1e24] border border-[#2e2e36] rounded-md shadow-2xl z-[1200] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
                  My Projects
                </span>
                <button
                  onClick={handleNewProject}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-1.5 py-0.5 rounded hover:bg-blue-500/10 transition"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto p-1 py-1.5 space-y-0.5 scrollbar-thin">
                {projectsList.map((project) => {
                  const isActive = project.id === currentProjectId;
                  return (
                    <div
                      key={project.id}
                      className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-blue-600/20 text-blue-300"
                          : "hover:bg-neutral-800/70 text-neutral-300 hover:text-white"
                      }`}
                    >
                      <button
                        onClick={() => {
                          loadProject(project.id);
                          setIsDropdownOpen(false);
                        }}
                        className="flex-1 text-left truncate flex items-center gap-2"
                        title={project.name}
                      >
                        <Folder className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-neutral-400"}`} />
                        <span className="truncate">{project.name}</span>
                      </button>

                      {isActive && <Check className="h-3.5 w-3.5 text-blue-400 mr-1.5 shrink-0" />}

                      {projectsList.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete project "${project.name}"?`)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-red-400 transition shrink-0"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav Links & Action Buttons */}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
        <nav className="flex items-center gap-4 text-sm text-neutral-300 font-medium">
          <button type="button" onClick={onShowCanvas} className="hover:text-white transition">
            Canvas
          </button>
          <button type="button" onClick={onGenerateTerraform} className="hover:text-white transition">
            Editor
          </button>
          <Link href="https://github.com/ABHISHEK27Y/InfraFlow#readme" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
            Docs
          </Link>
        </nav>

        <div className="h-5 w-[1px] bg-neutral-700 hidden sm:block" />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onGenerateTerraform && (
            <Button
              onClick={onGenerateTerraform}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition"
            >
              Generate Terraform
            </Button>
          )}
          {onToggleConfigPanel && (
            <Button
              onClick={onToggleConfigPanel}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition"
            >
              Resources
            </Button>
          )}
          {onImportTerraform && (
            <Button
              onClick={onImportTerraform}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Import Terraform
            </Button>
          )}
          {onAIAssistant && (
            <Button
              onClick={onAIAssistant}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </Button>
          )}
          {onExport && (
            <Button
              onClick={onExport}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-4 text-sm hover:bg-neutral-800 [&::-webkit-details-marker]:hidden">
              More tools <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full mt-2 grid w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] gap-2 overflow-y-auto rounded-lg border border-neutral-700 bg-[#232329] p-3 shadow-2xl" onClick={(event) => event.currentTarget.parentElement?.removeAttribute("open")}>
          {onDriftDetection && (
            <Button
              onClick={onDriftDetection}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              Drift Detection
            </Button>
          )}
          {onAutoLayout && (
            <Button
              onClick={onAutoLayout}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <GitBranch className="h-4 w-4" />
              Auto Layout
            </Button>
          )}
          {onShortcuts && (
            <Button
              onClick={onShortcuts}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4" />
              Shortcuts
            </Button>
          )}
          {onCollaboration && (
            <Button
              onClick={onCollaboration}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Collaborate
            </Button>
          )}
          {onPipeline && (
            <Button
              onClick={onPipeline}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Terminal className="h-4 w-4" />
              CI/CD
            </Button>
          )}
          {onRemediation && (
            <Button
              onClick={onRemediation}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Remediation
            </Button>
          )}
          {onTemplateMarketplace && (
            <Button
              onClick={onTemplateMarketplace}
              variant="outline"
              className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            >
              <Grid className="h-4 w-4" />
              Templates
            </Button>
          )}
          <Button
            onClick={toggleMinimap}
            variant={isMinimapOpen ? "default" : "outline"}
            className="text-sm px-4 py-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:text-white transition flex items-center gap-2"
            title="Toggle Minimap"
          >
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Minimap</span>
          </Button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
