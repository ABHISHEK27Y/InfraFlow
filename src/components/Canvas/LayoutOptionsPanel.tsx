"use client";

import { useState } from "react";
import { X, Layout, RefreshCw, Maximize2 } from "lucide-react";
import { useAutoLayout, radialLayout, forceDirectedLayout } from "@/hooks/useAutoLayout";
import { useDiagramStore } from "@/store/useDiagramStore";

interface LayoutOptionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LayoutOptionsPanel({ isOpen, onClose }: LayoutOptionsPanelProps) {
  const { layout, layoutSelected } = useAutoLayout();
  const { nodes, edges, setAllNodes } = useDiagramStore();
  const [selectedLayout, setSelectedLayout] = useState<"dagre" | "radial" | "force">("dagre");
  const [direction, setDirection] = useState<"TB" | "BT" | "LR" | "RL">("TB");
  const [rankSep, setRankSep] = useState(100);
  const [nodeSep, setNodeSep] = useState(80);
  const [align, setAlign] = useState<"UL" | "UR" | "DL" | "DR">("UL");
  const [applyToSelected, setApplyToSelected] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      if (selectedLayout === "dagre") {
        if (applyToSelected) {
          layoutSelected({ direction, rankSep, nodeSep, align });
        } else {
          layout({ direction, rankSep, nodeSep, align });
        }
      } else if (selectedLayout === "radial") {
        const newNodes = radialLayout(nodes, edges, 0, 0, 250);
        setAllNodes(newNodes);
      } else if (selectedLayout === "force") {
        const newNodes = forceDirectedLayout(nodes, edges, 150);
        setAllNodes(newNodes);
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Auto Layout
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Layout Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Layout Algorithm
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "dagre", label: "Hierarchical", icon: Maximize2, desc: "Top-down/left-right tree" },
                { id: "radial", label: "Radial", icon: Layout, desc: "Circular from center" },
                { id: "force", label: "Force-Directed", icon: RefreshCw, desc: "Physics-based spacing" },
              ].map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setSelectedLayout(id as "dagre" | "radial" | "force")}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    selectedLayout === id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${
                    selectedLayout === id
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-500"
                  }`} />
                  <span className="block text-sm font-medium text-center">
                    {label}
                  </span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dagre Options */}
          {selectedLayout === "dagre" && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Hierarchical Options
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "TB", label: "Top → Bottom", icon: "���" },
                    { value: "BT", label: "Bottom → Top", icon: "���" },
                    { value: "LR", label: "Left → Right", icon: "→" },
                    { value: "RL", label: "Right → Left", icon: "←" },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setDirection(value as "TB" | "BT" | "LR" | "RL")}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        direction === value
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">{icon}</span>
                        <span>{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rank Separation: {rankSep}px
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={rankSep}
                  onChange={(e) => setRankSep(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none accent-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Node Separation: {nodeSep}px
                </label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={nodeSep}
                  onChange={(e) => setNodeSep(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none accent-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alignment
                </label>
                <div className="flex gap-2">
                  {["UL", "UR", "DL", "DR"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAlign(a as "UL" | "UR" | "DL" | "DR")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        align === a
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Apply to selection */}
          {nodes.some((n) => n.selected) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToSelected}
                onChange={(e) => setApplyToSelected(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Apply only to selected nodes ({nodes.filter((n) => n.selected).length} selected)
              </span>
            </label>
          )}

          {/* Preview/Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Preview:</strong> {nodes.length} nodes, {edges.length} edges
              {applyToSelected && nodes.some((n) => n.selected)
                ? ` · ${nodes.filter((n) => n.selected).length} selected`
                : ""}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || nodes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? "Applying..." : "Apply Layout"}
          </button>
        </div>
      </div>
    </div>
  );
}