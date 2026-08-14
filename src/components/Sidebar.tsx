"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Type,
  Square,
  Diamond,
  ArrowRight,
  Minus,
  Circle,
  Hand,
  Eraser,
  Palette,
  Server,
  PenTool,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useUIPanelStore } from "@/store/useUIPanelStore";
import AIConsole from "@/components/AIConsole";
import { awsComponents } from "@/data/aws.data";
import { nodeTypes } from "@/components/Canvas/nodeTypes";

const primaryTools = [
  { id: "select", name: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "hand", name: "Hand", icon: Hand, shortcut: "H" },
  { id: "text", name: "Text", icon: Type, shortcut: "T" },
  { id: "eraser", name: "Eraser", icon: Eraser, shortcut: "E" },
];

const whiteboardTools = [
  { id: "rectangle", name: "Rectangle", icon: Square, shortcut: "R" },
  { id: "rhombus", name: "Rhombus", icon: Diamond, shortcut: "D" },
  { id: "circle", name: "Circle", icon: Circle, shortcut: "O" },
  { id: "arrow", name: "Arrow", icon: ArrowRight, shortcut: "A" },
  { id: "line", name: "Line", icon: Minus, shortcut: "L" },
  { id: "color", name: "Color", icon: Palette, shortcut: "C" },
];

export default function Sidebar() {
  const { selectedTool, setSelectedTool } = useDiagramStore();
  const {
    isAiConsoleOpen,
    isAwsComponentsOpen,
    isWhiteboardOpen,
    awsOpenSections,
    toggleAiConsole,
    toggleAwsComponents,
    toggleWhiteboard,
    toggleAwsSection,
  } = useUIPanelStore();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <Card className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-2 shadow-lg border-none rounded-xl bg-[#232329] border border-white border-2xl">
        <div className="flex flex-col gap-1">
          {primaryTools.map((tool, index) => (
            <div key={tool.id}>
              <Button
                size="sm"
                className={`w-10 h-10 p-0 relative group rounded-md bg-transparent ${
                  selectedTool === tool.id
                    ? "bg-[#3B82F6] hover:bg-[#3B82F6]"
                    : "hover:bg-[#1E293B]"
                } text-white transition-colors hover:cursor-pointer`}
                onClick={() => setSelectedTool(tool.id)}
                title={`${tool.name} (${tool.shortcut})`}
              >
                <tool.icon className="w-4 h-4" />
                <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {tool.name} ({tool.shortcut})
                </div>
              </Button>
              {index === 1 && <Separator className="my-2" />}
            </div>
          ))}

          <Separator className="my-2" />

          {/* Whiteboard Button */}
          <Button
            size="sm"
            className={`w-10 h-10 p-0 relative group rounded-md bg-transparent ${
              isWhiteboardOpen ? "bg-[#8B5CF6] hover:bg-[#8B5CF6]" : "hover:bg-[#1E293B]"
            } text-white transition-colors hover:cursor-pointer`}
            onClick={toggleWhiteboard}
            title="Whiteboard Tools"
          >
            <PenTool className="w-4 h-4" />
            <ChevronRight
              className={`w-3 h-3 absolute -right-1 -top-1 transition-transform ${
                isWhiteboardOpen ? "rotate-90" : ""
              }`}
            />
            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Whiteboard Tools
            </div>
          </Button>

          {/* AWS Components Button */}
          <Button
            size="sm"
            className={`w-10 h-10 p-0 relative group rounded-md bg-transparent mt-1 ${
              isAwsComponentsOpen ? "bg-[#F59E0B] hover:bg-[#F59E0B]" : "hover:bg-[#1E293B]"
            } text-white transition-colors hover:cursor-pointer`}
            onClick={toggleAwsComponents}
            title="AWS Components"
          >
            <Server className="w-4 h-4" />
            <ChevronRight
              className={`w-3 h-3 absolute -right-1 -top-1 transition-transform ${
                isAwsComponentsOpen ? "rotate-90" : ""
              }`}
            />
            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              AWS Components
            </div>
          </Button>

          {/* AI Console Button */}
          <Button
            size="sm"
            className={`w-10 h-10 p-0 relative group rounded-md bg-transparent mt-1 ${
              isAiConsoleOpen ? "bg-[#10B981] hover:bg-[#10B981]" : "hover:bg-[#1E293B]"
            } text-white transition-colors hover:cursor-pointer`}
            onClick={toggleAiConsole}
            title="AI Prompt"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <ChevronRight
              className={`w-3 h-3 absolute -right-1 -top-1 transition-transform ${
                isAiConsoleOpen ? "rotate-90" : ""
              }`}
            />
            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              AI Prompt
            </div>
          </Button>
        </div>
      </Card>

      {/* Whiteboard Floating Panel */}
      {isWhiteboardOpen && (
        <Card className="fixed left-22 top-1/2 -translate-y-1/2 z-40 w-64 max-h-[85vh] overflow-y-auto bg-[#0c0d12]/95 backdrop-blur-md border border-[#232530] rounded-2xl py-4 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] scrollbar-none flex flex-col gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-600 rounded-t-2xl" />
          <div className="flex justify-between items-center border-b border-[#1b1c24] pb-2 mb-2">
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-purple-400" />
              Whiteboard Notes
            </span>
            <button
              onClick={toggleWhiteboard}
              className="text-gray-400 hover:text-white p-1 hover:bg-[#1b1c24] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {whiteboardTools.map((tool) => (
              <div
                key={tool.id}
                className={`rounded-md px-2 py-2.5 text-sm flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  selectedTool === tool.id
                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-300"
                    : "bg-[#16161b] hover:bg-[#1c1c21] border border-transparent text-gray-300"
                }`}
                onClick={() => setSelectedTool(tool.id)}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tool.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AWS Components Floating Panel */}
      {isAwsComponentsOpen && (
        <Card className="fixed left-22 top-1/2 -translate-y-1/2 z-40 w-80 max-h-[85vh] overflow-y-auto bg-[#0c0d12]/95 backdrop-blur-md border border-[#232530] rounded-2xl py-4 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] scrollbar-none flex flex-col gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-t-2xl" />
          <div className="flex justify-between items-center border-b border-[#1b1c24] pb-2 mb-2">
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <Server className="w-4 h-4 text-amber-400" />
              AWS Components
            </span>
            <button
              onClick={toggleAwsComponents}
              className="text-gray-400 hover:text-white p-1 hover:bg-[#1b1c24] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {awsComponents.map((section) => (
              <div key={section.title}>
                <div
                  onClick={() => toggleAwsSection(section.title)}
                  className="flex justify-between items-center text-sm text-gray-200 font-medium cursor-pointer px-2 py-1.5 hover:bg-[#1F2937] rounded-md transition-colors"
                >
                  <span>{section.title}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-[#1F2937] px-1.5 py-0.5 rounded-sm text-gray-400">
                      {section.items.filter((item) => item.id in nodeTypes).length}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${
                        awsOpenSections[section.title] ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {awsOpenSections[section.title] && (
                  <div className="mt-1 space-y-1.5 pl-2 border-l border-[#2e2e36] ml-2">
                    {section.items
                      .filter((item) => item.id in nodeTypes)
                      .map((item) => (
                      <div
                        key={item.name}
                        draggable
                        onDragStart={(event) => onDragStart(event, item.id)}
                        className={`rounded-md px-3 py-2.5 text-sm flex items-start gap-3 cursor-pointer transition-colors ${
                          selectedTool === item.id
                            ? "bg-amber-600/20 border border-amber-500/30"
                            : "bg-[#16161b] hover:bg-[#1c1c21] border border-transparent"
                        }`}
                        onClick={() => setSelectedTool(item.id)}
                      >
                        <item.icon className="w-5 h-5 mt-0.5 text-amber-400 shrink-0" />
                        <div className="flex flex-col">
                          <div className="text-gray-200 font-medium leading-none mb-1">{item.name}</div>
                          <div className="text-gray-500 text-xs leading-tight">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Console Floating Panel */}
      {isAiConsoleOpen && (
        <Card className="fixed left-22 top-1/2 -translate-y-1/2 z-40 w-85 max-h-[85vh] overflow-y-auto bg-[#0c0d12]/95 backdrop-blur-md border border-[#232530] rounded-2xl py-4 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] scrollbar-none flex flex-col gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-t-2xl" />

          <div className="flex justify-between items-start border-b border-[#1b1c24] pb-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-white font-bold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400/15" />
                <span>AI Architecture Copilot</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-normal">
                Describe your topology to generate live Terraform models.
              </p>
            </div>
            <button
              onClick={toggleAiConsole}
              className="text-gray-400 hover:text-white p-1 hover:bg-[#1b1c24] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AIConsole />
        </Card>
      )}
    </>
  );
}