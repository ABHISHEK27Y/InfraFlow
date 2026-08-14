"use client";

import { useDiagramStore } from "@/store/useDiagramStore";
import { memo, useState } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
import MultiDirectionHandles from "@/components/nodes/shared/MultiDirectionHandles";
import { FaTrash } from "react-icons/fa6";
import { useShowNodeActions } from "@/utils/useShowNodeActions";

function RhombusNode({ id, selected, width, height, data }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const showActions = useShowNodeActions(selected, hovered);
  const w = width || 100;
  const h = height || 100;

  const colors = [
    "bg-[#020817]/75 border-slate-700",
    "bg-blue-900/50 border-blue-500",
    "bg-emerald-900/50 border-emerald-500",
    "bg-amber-900/50 border-amber-500",
    "bg-rose-900/50 border-rose-500",
    "bg-purple-900/50 border-purple-500",
  ];
  const colorIndex = (data as { colorIndex?: number })?.colorIndex || 0;
  const currentColor = colors[colorIndex % colors.length];

  const handleShapeClick = (e: React.MouseEvent) => {
    if (useDiagramStore.getState().selectedTool === "color") {
      e.stopPropagation();
      useDiagramStore.getState().updateNodeData(id, { colorIndex: colorIndex + 1 });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    useDiagramStore.getState().updateNodeData(id, { label: e.target.value });
  };
  const size = Math.max(w, h);
  
  // Calculate the rotated square size to fit within container
  // For a 45° rotated square, the diagonal becomes the width/height of container
  // So rotated square side = container_size / √2
  const rotatedSize = size / Math.sqrt(2);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={100}
        keepAspectRatio={true} // This maintains square aspect ratio
        lineClassName="border-blue-500"
        handleClassName="bg-blue-500 border border-white"
        onResizeEnd={(e, { width, height }) => {
          const newSize = Math.max(width, height);
          useDiagramStore
            .getState()
            .updateNodeDimensions(id, newSize, newSize);
        }}
      />
      
      <MultiDirectionHandles className="!bg-blue-500 !w-2 !h-2" />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative"
        style={{ 
          width: size, 
          height: size,
        }}
      >
        {showActions && (
          <div className="absolute -top-3 -right-3 flex items-center gap-1 z-50 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                useDiagramStore
                  .getState()
                  .triggerDeleteConfirmation(id, "Are you sure you want to delete this shape?");
              }}
              className="bg-slate-900 hover:bg-red-950/80 border border-slate-700 hover:border-red-900/50 rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-400 cursor-pointer"
              title="Delete Shape"
            >
              <FaTrash className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        
        {/* Rhombus shape - rotated square that fits within container */}
        <div
          onClick={handleShapeClick}
          className={`absolute top-1/2 left-1/2 flex items-center justify-center shadow transition-colors border ${currentColor}`}
          style={{
            width: rotatedSize,
            height: rotatedSize,
            transform: "translate(-50%, -50%) rotate(45deg)",
            transformOrigin: "center",
          }}
        >
          {/* Text rotated back to be readable */}
          <div 
            className="text-center"
            style={{ 
              transform: "rotate(-45deg)",
              width: rotatedSize * 0.9,
              height: rotatedSize * 0.9,
            }}
          >
            <textarea
              value={(data as { label?: string })?.label || ""}
              onChange={handleTextChange}
              placeholder="Type..."
              className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden text-center text-sm font-semibold text-white p-1"
              style={{
                lineHeight: `${rotatedSize * 0.9 - 8}px`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(RhombusNode);