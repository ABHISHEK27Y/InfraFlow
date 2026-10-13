"use client";

import React, { useState, useCallback } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { applyLayout, getLayoutAlgorithms, LayoutAlgorithm, LayoutOptions } from "@/lib/autoLayout";
import { LayoutGrid, GitBranch, Circle, Zap, X } from "lucide-react";

interface AutoLayoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutoLayoutPanel({ isOpen, onClose }: AutoLayoutPanelProps) {
  const { nodes, edges, setAllNodes } = useDiagramStore();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<LayoutAlgorithm>("force-directed");
  const [direction, setDirection] = useState<LayoutOptions["direction"]>("TB");
  const [spacingX, setSpacingX] = useState(250);
  const [spacingY, setSpacingY] = useState(150);
  const [radius, setRadius] = useState(300);
  const [iterations, setIterations] = useState(100);
  const [isApplying, setIsApplying] = useState(false);

  const algorithms = getLayoutAlgorithms();

  const handleApply = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsApplying(true);
    try {
      const options: LayoutOptions = {
        algorithm: selectedAlgorithm,
        direction,
        spacing: { x: spacingX, y: spacingY },
        radius,
        iterations,
      };

      const newNodes = applyLayout(nodes, edges, options);
      setAllNodes(newNodes);
    } catch (error) {
      console.error("Layout failed:", error);
    } finally {
      setIsApplying(false);
    }
  }, [nodes, edges, selectedAlgorithm, direction, spacingX, spacingY, radius, iterations, setAllNodes]);

  const showDirection = selectedAlgorithm === "hierarchical";
  const showSpacing = selectedAlgorithm === "grid" || selectedAlgorithm === "hierarchical";
  const showRadius = selectedAlgorithm === "radial";
  const showIterations = selectedAlgorithm === "force-directed";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md bg-[#131316] border border-[#374151] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex items-center justify-between p-4 border-b border-[#374151]">
          <CardTitle className="text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
            Auto Layout
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Algorithm Selector */}
          <div>
            <Label className="text-sm text-gray-300 mb-2 block">Layout Algorithm</Label>
            <Select value={selectedAlgorithm} onValueChange={(value) => setSelectedAlgorithm(value as LayoutAlgorithm)}>
              <SelectTrigger className="bg-[#1a1a22] border-[#374151] text-white">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent className="bg-[#131316] border-[#374151]">
                {algorithms.map((algo) => (
                  <SelectItem key={algo.value} value={algo.value}>
                    <div className="flex items-center gap-2">
                      {algo.value === "force-directed" && <Zap className="w-4 h-4 text-yellow-400" />}
                      {algo.value === "hierarchical" && <GitBranch className="w-4 h-4 text-green-400" />}
                      {algo.value === "grid" && <LayoutGrid className="w-4 h-4 text-blue-400" />}
                      {algo.value === "radial" && <Circle className="w-4 h-4 text-purple-400" />}
                      <div>
                        <p className="font-medium">{algo.label}</p>
                        <p className="text-xs text-gray-500">{algo.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction (Hierarchical only) */}
          {showDirection && (
            <div>
              <Label className="text-sm text-gray-300 mb-2 block">Direction</Label>
              <Select value={direction} onValueChange={(value) => setDirection(value as LayoutOptions["direction"])}>
                <SelectTrigger className="bg-[#1a1a22] border-[#374151] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#131316] border-[#374151]">
                  <SelectItem value="TB">Top to Bottom</SelectItem>
                  <SelectItem value="BT">Bottom to Top</SelectItem>
                  <SelectItem value="LR">Left to Right</SelectItem>
                  <SelectItem value="RL">Right to Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Spacing (Grid & Hierarchical) */}
          {showSpacing && (
            <div className="space-y-3">
              <Label className="text-sm text-gray-300">Horizontal Spacing: {spacingX}px</Label>
              <Slider
                value={[spacingX]}
                onValueChange={([v]) => setSpacingX(v)}
                min={100}
                max={500}
                step={25}
                className="h-2 bg-[#374151]"
              />
              <Label className="text-sm text-gray-300">Vertical Spacing: {spacingY}px</Label>
              <Slider
                value={[spacingY]}
                onValueChange={([v]) => setSpacingY(v)}
                min={100}
                max={500}
                step={25}
                className="h-2 bg-[#374151]"
              />
            </div>
          )}

          {/* Radius (Radial only) */}
          {showRadius && (
            <div>
              <Label className="text-sm text-gray-300 mb-2 block">Base Radius: {radius}px</Label>
              <Slider
                value={[radius]}
                onValueChange={([v]) => setRadius(v)}
                min={150}
                max={600}
                step={25}
                className="h-2 bg-[#374151]"
              />
            </div>
          )}

          {/* Iterations (Force-directed only) */}
          {showIterations && (
            <div>
              <Label className="text-sm text-gray-300 mb-2 block">Iterations: {iterations}</Label>
              <Slider
                value={[iterations]}
                onValueChange={([v]) => setIterations(v)}
                min={50}
                max={300}
                step={25}
                className="h-2 bg-[#374151]"
              />
            </div>
          )}

          <Separator className="border-[#374151]" />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || nodes.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isApplying ? "Applying..." : "Apply Layout"}
            </Button>
          </div>

          {nodes.length === 0 && (
            <p className="text-center text-gray-500 text-sm">
              No nodes on canvas to layout
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}