"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FolderOpen,
  Save,
  Trash2,
  Cloud,
  CloudOff,
  CloudUpload,
  Download,
  Edit2,
  RefreshCw,
  X,
  FileCode,
  Layers,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTerraformStore } from "@/store/useTerraformStore";
import { useTerraformResourceStore } from "@/store/useTerraformResourceStore";
import { exportCurrentProject } from "@/utils/terraformExport";

export default function ProjectManager() {
  const {
    projectsList,
    currentProjectId,
    currentProjectName,
    isInitialized,
    isSyncing,
    syncError,
    syncMode,
    init,
    createNewProject,
    loadProject,
    saveCurrentProject,
    renameCurrentProject,
    deleteProject,
    setSyncMode,
  } = useProjectStore();

  const { setProjectMeta } = useDiagramStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renameProjectName, setRenameProjectName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createNewProject(newProjectName.trim());
      setShowCreateModal(false);
      setNewProjectName("");
    }
  };

  const handleRenameProject = () => {
    if (renameProjectName.trim() && currentProjectId) {
      renameCurrentProject(renameProjectName.trim());
      setShowRenameModal(false);
      setRenameProjectName("");
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id, "both");
    setDeleteConfirmId(null);
  };

  const handleExportTerraform = () => {
    exportCurrentProject({ format: "single", includeProvider: true, includeVariables: true, includeOutputs: true });
  };

  const handleExportTerraformModule = () => {
    exportCurrentProject({ format: "module", includeProvider: true, includeVariables: true, includeOutputs: true });
  };

  const handleExportJSON = () => {
    const nodes = useDiagramStore.getState().nodes;
    const edges = useDiagramStore.getState().edges;
    const terraformBlocks = useTerraformStore.getState().terraformBlocks;
    const resources = useTerraformResourceStore.getState().resources;

    const exportData = {
      project: {
        id: currentProjectId,
        name: currentProjectName,
        nodes,
        edges,
        resources,
        terraformBlocks,
        exportedAt: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProjectName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.project) {
          // Create new project from import
          const newId = createNewProject(data.project.name + " (Imported)");
          useDiagramStore.getState().setNodesAndEdges(data.project.nodes || [], data.project.edges || []);
          useTerraformStore.getState().setBlocks(data.project.terraformBlocks || {});
          useTerraformResourceStore.getState().setResources(data.project.resources || []);
          setProjectMeta(newId, data.project.name + " (Imported)");
        }
      } catch (err) {
        console.error("Failed to import project:", err);
        alert("Invalid project file");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const getSyncModeLabel = () => {
    switch (syncMode) {
      case "cloud":
        return "Cloud with local backup";
      case "hybrid":
        return "Hybrid (Local + Cloud)";
      default:
        return "Local Only";
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 p-0 rounded-lg bg-[#232329] border border-white/10 hover:border-blue-500/50 transition-colors"
        title="Project Manager"
      >
        <FolderOpen className="w-5 h-5 text-white" />
      </Button>

      {/* Project Panel */}
      {isOpen && (
        <Card
          className="fixed right-16 top-1/2 -translate-y-1/2 z-50 w-80 max-h-[80vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl"
        >
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#374151]">
            <CardTitle className="text-white font-semibold">Projects</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 p-4 border-b border-[#374151]">
              <div className="flex gap-2">
                <Button onClick={() => { setShowCreateModal(true); setNewProjectName(""); }} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
                <Button onClick={() => saveCurrentProject()} disabled={isSyncing} className="flex-1">
                  <Save className="w-4 h-4 mr-2" /> {isSyncing ? "Saving..." : "Save"}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportTerraform} className="flex-1">
                  <FileCode className="w-4 h-4 mr-2" /> Export .tf
                </Button>
                <Button variant="outline" onClick={handleExportTerraformModule} className="flex-1">
                  <Layers className="w-4 h-4 mr-2" /> Export Module
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportJSON} className="flex-1">
                  <Download className="w-4 h-4 mr-2" /> Export JSON
                </Button>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-file"
                />
                <label htmlFor="import-file" className="w-full">
  <Button variant="outline" className="w-full">
    <CloudUpload className="w-4 h-4 mr-2" /> Import JSON
  </Button>
</label>
              </div>

              <Separator />

              {/* Sync Mode Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400 uppercase tracking-wider">Sync Mode</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["local", "hybrid", "cloud"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={syncMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSyncMode(mode)}
                      className="text-xs py-1.5"
                    >
                      {mode === "local" && <CloudOff className="w-3 h-3 mr-1" />}
                      {mode === "hybrid" && <CloudUpload className="w-3 h-3 mr-1" />}
                      {mode === "cloud" && <Cloud className="w-3 h-3 mr-1" />}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">Current: {getSyncModeLabel()}</p>
              </div>

              {isSyncing && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing with cloud...
                </div>
              )}
              {syncError && <p role="alert" className="text-xs text-red-400">Cloud sync: {syncError}</p>}
            </div>

            {/* Projects List */}
            <ScrollArea className="h-[50vh] p-4">
              <div className="space-y-2">
                {projectsList.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No projects yet</p>
                    <p className="text-xs">Click &quot;New Project&quot; to start</p>
                  </div>
                ) : (
                  projectsList.map((project) => {
                    const isCurrent = project.id === currentProjectId;
                    return (
                      <div
                        key={project.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isCurrent
                            ? "bg-blue-500/20 border border-blue-500/50"
                            : "bg-[#1a1a22] border border-[#374151] hover:border-blue-500/30"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm truncate ${isCurrent ? "text-blue-300" : "text-white"}`}>
                              {project.name}
                            </span>
                            {isCurrent && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Last saved: {new Date(project.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-white"
                            onClick={() => loadProject(project.id)}
                            title="Load Project"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-blue-400"
                              onClick={async () => {
                                await loadProject(project.id);
                                setRenameProjectName(project.name);
                                setShowRenameModal(true);
                              }}
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-400"
                            onClick={() => setDeleteConfirmId(project.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-[400px] bg-[#1a1a22] border border-[#374151]">
            <CardHeader>
              <CardTitle className="text-white">Create New Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-project-name" className="text-gray-300">
                  Project Name
                </Label>
                <Input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My AWS Architecture"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rename Project Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-[400px] bg-[#1a1a22] border border-[#374151]">
            <CardHeader>
              <CardTitle className="text-white">Rename Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rename-project-name" className="text-gray-300">
                  New Name
                </Label>
                <Input
                  id="rename-project-name"
                  value={renameProjectName}
                  onChange={(e) => setRenameProjectName(e.target.value)}
                  placeholder="New project name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRenameProject()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRenameModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRenameProject} disabled={!renameProjectName.trim()}>
                  Rename
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-[400px] bg-[#1a1a22] border border-[#374151]">
            <CardHeader>
              <CardTitle className="text-white">Delete Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteProject(deleteConfirmId)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
