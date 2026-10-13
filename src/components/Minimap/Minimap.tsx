"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import { useViewportStore } from "@/store/useViewportStore";

interface MinimapProps {
  className?: string;
}

const MINIMAP_WIDTH = 240;
const MINIMAP_HEIGHT = 160;
const PADDING = 20;

export default function Minimap({ className = "" }: MinimapProps) {
  const { nodes, edges } = useDiagramStore();
  const { isMinimapOpen, setMinimapState } = useUIPanelStore();
  const { viewport } = useViewportStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    viewportStartX: number;
    viewportStartY: number;
  }>({ isDragging: false, startX: 0, startY: 0, viewportStartX: 0, viewportStartY: 0 });

  // Calculate bounds of all nodes
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: MINIMAP_WIDTH, maxY: MINIMAP_HEIGHT };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + (node.width || 180));
      maxY = Math.max(maxY, node.position.y + (node.height || 100));
    });

    return { minX, minY, maxX, maxY };
  }, [nodes]);

  // Calculate transform to fit diagram in minimap
  const transform = useMemo(() => {
    const diagramWidth = bounds.maxX - bounds.minX;
    const diagramHeight = bounds.maxY - bounds.minY;

    const scaleX = (MINIMAP_WIDTH - PADDING * 2) / (diagramWidth || 1);
    const scaleY = (MINIMAP_HEIGHT - PADDING * 2) / (diagramHeight || 1);
    const fitScale = Math.min(scaleX, scaleY, 1);

    const offsetX = PADDING - bounds.minX * fitScale;
    const offsetY = PADDING - bounds.minY * fitScale;

    return { scale: fitScale, offsetX, offsetY };
  }, [bounds]);

  // Convert canvas coordinates to diagram coordinates
  const canvasToDiagram = (cx: number, cy: number) => {
    return {
      x: (cx - transform.offsetX) / transform.scale,
      y: (cy - transform.offsetY) / transform.scale,
    };
  };

  // Convert diagram coordinates to canvas coordinates
  const diagramToCanvas = (dx: number, dy: number) => {
    return {
      x: dx * transform.scale + transform.offsetX,
      y: dy * transform.scale + transform.offsetY,
    };
  };

  // Draw minimap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    canvas.style.width = `${MINIMAP_WIDTH}px`;
    canvas.style.height = `${MINIMAP_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Background
    ctx.fillStyle = "#0b0c0e";
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Grid pattern
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 0.5;
    const gridSize = 20 * transform.scale;
    for (let x = transform.offsetX % gridSize; x < MINIMAP_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MINIMAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = transform.offsetY % gridSize; y < MINIMAP_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MINIMAP_WIDTH, y);
      ctx.stroke();
    }

    // Draw edges
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) return;

      const sx = source.position.x + (source.width || 180) / 2;
      const sy = source.position.y + (source.height || 100) / 2;
      const tx = target.position.x + (target.width || 180) / 2;
      const ty = target.position.y + (target.height || 100) / 2;

      const { x: scx, y: scy } = diagramToCanvas(sx, sy);
      const { x: tcx, y: tcy } = diagramToCanvas(tx, ty);

      ctx.beginPath();
      ctx.moveTo(scx, scy);
      ctx.lineTo(tcx, tcy);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      const { x, y } = diagramToCanvas(node.position.x, node.position.y);
      const w = (node.width || 180) * transform.scale;
      const h = (node.height || 100) * transform.scale;

      // Node background
      const isSelected = node.selected;
      ctx.fillStyle = isSelected ? "#3b82f6" : node.dragging ? "#22c55e" : "#1e1e24";
      ctx.strokeStyle = isSelected ? "#60a5fa" : "#374151";
      ctx.lineWidth = isSelected ? 2 : 1;

      // Rounded rect
      const radius = 4 * transform.scale;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(w, 1), Math.max(h, 1), radius);
      ctx.fill();
      ctx.stroke();

      // Node type indicator (small dot)
      const typeColors: Record<string, string> = {
        vpc: "#8b5cf6",
        subnet: "#06b6d4",
        ec2: "#f97316",
        rds: "#10b981",
        elb: "#ec4899",
        "security-group": "#ef4444",
        s3: "#f59e0b",
        lambda: "#ff6b6b",
        generic: "#6b7280",
      };
      const nodeType = node.type ?? "generic";
      ctx.fillStyle = typeColors[nodeType] || "#6b7280";
      ctx.beginPath();
      ctx.arc(x + 4 * transform.scale, y + 4 * transform.scale, Math.max(2 * transform.scale, 1), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw viewport rectangle
    const { x: vx, y: vy } = diagramToCanvas(viewport.x / viewport.zoom, viewport.y / viewport.zoom);
    const vw = (MINIMAP_WIDTH / viewport.zoom) * transform.scale;
    const vh = (MINIMAP_HEIGHT / viewport.zoom) * transform.scale;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.setLineDash([]);

    // Viewport fill
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(vx, vy, vw, vh);
  }, [nodes, edges, transform, viewport]);

  // Handle mouse down on minimap
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Check if clicking on viewport (using React Flow viewport coordinates)
    const { x: vx, y: vy } = diagramToCanvas(viewport.x / viewport.zoom, viewport.y / viewport.zoom);
    const vw = (MINIMAP_WIDTH / viewport.zoom) * transform.scale;
    const vh = (MINIMAP_HEIGHT / viewport.zoom) * transform.scale;

    const isOnViewport = cx >= vx && cx <= vx + vw && cy >= vy && cy <= vy + vh;

    if (isOnViewport) {
      setDragState({
        isDragging: true,
        startX: cx,
        startY: cy,
        viewportStartX: viewport.x,
        viewportStartY: viewport.y,
      });
    } else {
      // Click to pan - center viewport on click
      const diagramPos = canvasToDiagram(cx, cy);
      // Use React Flow's setViewport via the store
      const newViewport = {
        x: diagramPos.x * viewport.zoom - MINIMAP_WIDTH / 2,
        y: diagramPos.y * viewport.zoom - MINIMAP_HEIGHT / 2,
        zoom: viewport.zoom,
      };
      useViewportStore.getState().setViewport(newViewport);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const diagramDx = dx / transform.scale;
    const diagramDy = dy / transform.scale;

    const newViewport = {
      x: dragState.viewportStartX - diagramDx * viewport.zoom,
      y: dragState.viewportStartY - diagramDy * viewport.zoom,
      zoom: viewport.zoom,
    };
    useViewportStore.getState().setViewport(newViewport);
  };

  const handleMouseUp = () => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  };

  if (!isMinimapOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[1000] bg-[#131316] border border-[#374151] rounded-lg shadow-xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center justify-between p-2 border-b border-[#374151] bg-[#1a1a22]">
        <span className="text-xs font-medium text-gray-300">Overview</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            onClick={() => setMinimapState(false)}
            className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition"
            title="Close minimap"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onMouseDown={handleMouseDown}
        style={{ cursor: "grab", touchAction: "none" }}
        className="block"
      />
    </div>
  );
}