import MultiDirectionHandles from "@/components/nodes/shared/MultiDirectionHandles";
import { Lock } from "lucide-react";
import openSettings from "@/utils/openSettings";
import { FaGear, FaTrash } from "react-icons/fa6";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useState } from "react";
import { AnyNodeProps } from "@/utils/types/resource";
import { useShowNodeActions } from "@/utils/useShowNodeActions";

type IAMNodeData = {
  Name?: string;
};

export default function IAMNode({ data, selected, id }: AnyNodeProps<IAMNodeData>) {
  const [hovered, setHovered] = useState(false);
  const showActions = useShowNodeActions(selected, hovered);

  return (
    <div
      className={`w-44 relative rounded-md bg-[#0b0f19] text-white border transition-all duration-150 border-l-4 border-l-purple-500
        ${
          selected
            ? "border-indigo-500 shadow-md"
            : "border-slate-800 hover:border-slate-700"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MultiDirectionHandles />

      {showActions && (
        <div className="absolute -top-2.5 right-1.5 flex items-center gap-1 z-50 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSettings(id, "node");
            }}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            title="Edit IAM Settings"
          >
            <FaGear className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              useDiagramStore
                .getState()
                .triggerDeleteConfirmation(id, "Are you sure you want to delete this IAM Role?");
            }}
            className="bg-slate-900 hover:bg-red-950/80 border border-slate-700 hover:border-red-900/50 rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-400 cursor-pointer"
            title="Delete IAM Role"
          >
            <FaTrash className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      <div className="p-2.5 flex items-center gap-2">
        <Lock className="w-4 h-4 text-purple-500 flex-shrink-0" />
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="font-semibold text-[12px] text-slate-100 truncate" title={data.Name || "IAM Role"}>
            {data.Name || "IAM Role"}
          </span>
        </div>
      </div>
    </div>
  );
}
