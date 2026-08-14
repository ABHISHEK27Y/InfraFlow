"use client";

import { useDiagramStore } from "@/store/useDiagramStore";
import { memo, useState } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
import MultiDirectionHandles from "@/components/nodes/shared/MultiDirectionHandles";
import { FaTrash } from "react-icons/fa6";
import { useShowNodeActions } from "@/utils/useShowNodeActions";

function CircleNode({ id, selected, width, height, data }: NodeProps) {
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

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={60}
        keepAspectRatio
        lineClassName="border-blue-500"
        handleClassName="bg-blue-500 border border-white"
        onResizeEnd={(e, { width, height }) => {
          useDiagramStore
            .getState()
            .updateNodeDimensions(id, width, height);
        }}
      />

      <MultiDirectionHandles className="!bg-blue-500 !w-2 !h-2" />

      <div
        onClick={handleShapeClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative border rounded-full shadow transition-all duration-200 flex items-center justify-center ${currentColor}`}
        style={{
          width: w,
          height: h,
        }}
      >
        <textarea
          value={(data as { label?: string })?.label || ""}
          onChange={handleTextChange}
          placeholder="Type..."
          className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden text-center text-sm font-semibold text-white p-4 flex items-center justify-center rounded-full"
          style={{
            lineHeight: `${h - 32}px`, // approximate vertical centering
          }}
        />
        {showActions && (
          <div className="absolute -top-1 -right-1 flex items-center gap-1 z-50 pointer-events-auto">
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
      </div>
    </>
  );
}

export default memo(CircleNode);
