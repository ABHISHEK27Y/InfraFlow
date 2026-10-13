"use client";

import { useEffect, useCallback } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useTerraformStore } from "@/store/useTerraformStore";
import { shortcutRegistry, KeyboardShortcut } from "@/lib/keyboardShortcuts";

export function useKeyboardShortcuts() {
  const {
    nodes,
    edges,
    selectedNodeIds,
    selectNodes,
    clearSelection,
    deleteNodes,
    undo,
    redo,
    history,
    historyIndex,
    setNodes,
    setEdges,
    addNode,
    addEdge,
    updateNodePosition,
  } = useDiagramStore();

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutRegistry.register(shortcut);
    return () => shortcutRegistry.unregister(shortcut.id);
  }, []);
  const { isEditorOpen, setEditorState, isAwsComponentsOpen, toggleAwsComponents, isAiConsoleOpen, toggleAiConsole, openConfig } = useUIPanelStore();
  const { currentProjectName, saveCurrentProject, createNewProject, projectsList } = useProjectStore();
  const { getAllAsString: getTerraform } = useTerraformStore();

  // Helper functions (defined before useEffect to avoid temporal dead zone)
  const centerCanvas = useCallback(() => {
    // This would need access to React Flow instance
    // window.dispatchEvent(new CustomEvent("center-canvas"));
    console.log("Center canvas - needs React Flow ref");
  }, []);

  const zoomCanvas = useCallback((factor: number) => {
    // window.dispatchEvent(new CustomEvent("zoom-canvas", { detail: factor }));
    console.log("Zoom canvas - needs React Flow ref", factor);
  }, []);

  const nudgeSelectedNodes = useCallback((dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) return;

    const state = useDiagramStore.getState();
    const allNodes = state.nodes;

    allNodes.forEach(node => {
      if (selectedNodeIds.includes(node.id)) {
        updateNodePosition(node.id, node.position.x + dx, node.position.y + dy);
      }
    });
  }, [selectedNodeIds, updateNodePosition]);

  const duplicateSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    const state = useDiagramStore.getState();
    const allEdges = state.edges;

    const selectedNodes = state.nodes.filter(n => selectedNodeIds.includes(n.id));
    const idMap: Record<string, string> = {};

    // Create duplicates
    const newNodes = selectedNodes.map((node, index) => {
      const newId = `${node.id}-copy-${Date.now()}-${index}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 30, y: node.position.y + 30 },
        data: { ...node.data, name: `${String((node.data as Record<string, unknown>).name || "Node")} Copy` } as unknown as typeof node.data,
        selected: false,
      };
    });

    // Add nodes one by one using addNode
    newNodes.forEach(node => addNode(node));

    // Create edges between duplicates
    const newEdges = allEdges
      .filter(e => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target))
      .map((edge, index) => ({
        ...edge,
        id: `${edge.id}-copy-${Date.now()}-${index}`,
        source: idMap[edge.source]!,
        target: idMap[edge.target]!,
      }));

    // Add edges one by one using addEdge
    newEdges.forEach(edge => addEdge(edge));

    selectNodes(newNodes.map(n => n.id));
  }, [selectedNodeIds, addNode, addEdge, selectNodes]);

  const groupSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length < 2) return;
    // Group functionality requires React Flow group nodes which aren't fully implemented yet
    console.log("Group selected nodes - feature coming soon");
  }, [selectedNodeIds]);

  const exportTerraform = useCallback(() => {
    const tf = getTerraform();
    const blob = new Blob([tf], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProjectName.replace(/\s+/g, "-").toLowerCase() || "infraflow"}.tf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentProjectName, getTerraform]);

  const copyTerraformToClipboard = useCallback(() => {
    const tf = getTerraform();
    navigator.clipboard.writeText(tf).then(() => {
      // Could show toast notification
      console.log("Terraform copied to clipboard");
    });
  }, [getTerraform]);

  // Mac detection
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  // This hook sets up global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Allow Escape to close modals even in inputs
        if (e.key !== "Escape") return;
      }

      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // Helper to check key combos
      const match = (key: string, requireMod = true, requireShift = false, requireAlt = false) => {
        if (requireMod && !modifier) return false;
        if (requireShift && !shift) return false;
        if (requireAlt && !alt) return false;
        return e.key.toLowerCase() === key.toLowerCase();
      };

      // ===== File Operations =====
      if (match("n")) { // Ctrl+N - New Project
        e.preventDefault();
        createNewProject("Untitled Project");
        return;
      }

      if (match("s")) { // Ctrl+S - Save Project
        e.preventDefault();
        saveCurrentProject("both");
        return;
      }

      if (match("e", true, true)) { // Ctrl+Shift+E - Export Terraform
        e.preventDefault();
        exportTerraform();
        return;
      }

      if (match("c", true, true)) { // Ctrl+Shift+C - Copy Terraform
        e.preventDefault();
        copyTerraformToClipboard();
        return;
      }

      if (match("o", true, true)) { // Ctrl+Shift+O - Open/Import Project
        e.preventDefault();
        // Trigger file input for import - handled by Command Palette
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.ugcp";
        input.onchange = async (ev) => {
          const file = (ev.target as HTMLInputElement).files?.[0];
          if (file) {
            await file.text();
            try {
              // importProject(JSON.parse((ev.target as HTMLInputElement).files?.[0]?.text() || ""));
              alert("Import project via Command Palette");
            } catch {
              alert("Invalid project file");
            }
          }
        };
        input.click();
        return;
      }

      // ===== Edit Operations =====
      if (match("z") && !shift) { // Ctrl+Z - Undo
        e.preventDefault();
        if (historyIndex > 0) undo();
        return;
      }

      if (match("z", true, true) || match("y")) { // Ctrl+Shift+Z or Ctrl+Y - Redo
        e.preventDefault();
        if (historyIndex < history.length - 1) redo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") { // Delete/Backspace - Delete selected
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          deleteNodes(selectedNodeIds);
        }
        return;
      }

      if (e.key === "Escape") { // Escape - Clear selection / Close modals
        clearSelection();
        // Close any open modals - handled by individual components
        return;
      }

      if (match("a") && selectedNodeIds.length < nodes.length) { // Ctrl+A - Select all
        e.preventDefault();
        selectNodes(nodes.map(n => n.id));
        return;
      }

      if (match("d") && selectedNodeIds.length > 0) { // Ctrl+D - Duplicate selected
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }

      if (match("g", true, true) && selectedNodeIds.length > 1) { // Ctrl+Shift+G - Group selected
        e.preventDefault();
        groupSelectedNodes();
        return;
      }

      // ===== View Operations =====
      if (match("e") && !shift) { // Ctrl+E - Toggle Editor
        e.preventDefault();
        setEditorState(!isEditorOpen);
        return;
      }

      if (match(",")) { // Ctrl+, - Settings
        e.preventDefault();
        openConfig();
        return;
      }

      if (match("a", true, true)) { // Ctrl+Shift+A - Toggle AWS Components
        e.preventDefault();
        toggleAwsComponents();
        return;
      }

      if (match("i", true, true)) { // Ctrl+Shift+I - Toggle AI Console
        e.preventDefault();
        toggleAiConsole();
        return;
      }

      if (match("/")) { // Ctrl+/ - Show Shortcuts Help
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
        return;
      }

      // ===== Tools =====
      if (e.key === "v" && !modifier) { // V - Select tool
        // Handled by React Flow
        return;
      }

      if (e.key === "h" && !modifier) { // H - Hand tool
        // Handled by React Flow (Space + drag)
        return;
      }

      // ===== Canvas Navigation =====
      if (match("0")) { // Ctrl+0 - Center canvas
        e.preventDefault();
        centerCanvas();
        return;
      }

      if (match("=") || match("+")) { // Ctrl++ - Zoom in
        e.preventDefault();
        zoomCanvas(1.2);
        return;
      }

      if (match("-") && !shift) { // Ctrl+- - Zoom out
        e.preventDefault();
        zoomCanvas(0.833);
        return;
      }

      // Arrow keys for nudging selected nodes (when not editing)
      if (!modifier && !shift && !alt) {
        const nudgeAmount = 10;
        let dx = 0, dy = 0;
        switch (e.key) {
          case "ArrowLeft": dx = -nudgeAmount; break;
          case "ArrowRight": dx = nudgeAmount; break;
          case "ArrowUp": dy = -nudgeAmount; break;
          case "ArrowDown": dy = nudgeAmount; break;
        }
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          nudgeSelectedNodes(dx, dy);
        }
      }

      // Shift + Arrow for larger nudge
      if (shift && !modifier && !alt) {
        const nudgeAmount = 1;
        let dx = 0, dy = 0;
        switch (e.key) {
          case "ArrowLeft": dx = -nudgeAmount; break;
          case "ArrowRight": dx = nudgeAmount; break;
          case "ArrowUp": dy = -nudgeAmount; break;
          case "ArrowDown": dy = nudgeAmount; break;
        }
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          nudgeSelectedNodes(dx, dy);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    nodes,
    edges,
    selectedNodeIds,
    history,
    historyIndex,
    isEditorOpen,
    isAwsComponentsOpen,
    isAiConsoleOpen,
    currentProjectName,
    projectsList,
    isMac,
    // Actions (stable references from stores)
    selectNodes,
    clearSelection,
    deleteNodes,
    undo,
    redo,
    setNodes,
    setEdges,
    addNode,
    setEditorState,
    toggleAwsComponents,
    toggleAiConsole,
    openConfig,
    saveCurrentProject,
    createNewProject,
    getTerraform,
    // Helper functions
    centerCanvas,
    copyTerraformToClipboard,
    duplicateSelectedNodes,
    exportTerraform,
    groupSelectedNodes,
    nudgeSelectedNodes,
    zoomCanvas,
  ]);

  // Return list of shortcuts for help modal - delegates to new registry
  const getShortcutsList = useCallback(() => {
    return shortcutRegistry.getAll().map(s => ({
      keys: s.keys,
      description: s.description,
      category: s.category,
      action: s.action,
    }));
  }, []);

  return { getShortcutsList, registerShortcut };
}