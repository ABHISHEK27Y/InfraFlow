"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResourceName } from "@/utils/types/resource";

const nodeTypeLabels: Record<string, string> = {
  vpc: "VPC",
  subnet: "Subnet",
  ec2: "EC2 Instance",
  rds: "RDS Database",
  lambda: "Lambda Function",
  elb: "Load Balancer",
  s3: "S3 Bucket",
  ebs: "EBS Volume",
  securitygroup: "Security Group",
  iam: "IAM Role",
  keypair: "Key Pair",
  instanceprofile: "Instance Profile",
  ec2ebs: "EBS Attachment",
  elbec2: "ALB Target Attachment",
};

function getSearchableText(node: any): string {
  const name = getResourceName(node.data);
  const parts = [
    name,
    node.data?.TagName,
    node.data?.BucketName,
    node.data?.id,
    node.id,
    nodeTypeLabels[node.type],
  ].filter(Boolean);
  return parts.join(" ").toLowerCase();
}

export default function CanvasSearch() {
  const { nodes, selectNodes, selectedNodeIds } = useDiagramStore();
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  const availableTypes = useMemo(() => {
    const types = new Set(nodes.map((n) => n.type));
    return Array.from(types).sort();
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesQuery = query === "" || getSearchableText(node).includes(query.toLowerCase());
      const matchesType = selectedType === "all" || node.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [nodes, query, selectedType]);

  const handleSelectFirst = useCallback(() => {
    if (filteredNodes.length > 0) {
      selectNodes([filteredNodes[0].id]);
    }
  }, [filteredNodes, selectNodes]);

  useEffect(() => {
    if (query && filteredNodes.length > 0 && selectedNodeIds.length === 0) {
      handleSelectFirst();
    }
  }, [query, filteredNodes, selectedNodeIds, handleSelectFirst]);

  const clearSearch = () => {
    setQuery("");
    setSelectedType("all");
    setIsOpen(false);
  };

  const resultCount = filteredNodes.length;
  const totalCount = nodes.length;

  return (
    <div className="absolute top-4 left-24 z-20 max-w-[calc(100vw-7rem)]">
      <div className="relative">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-[#0f1219] border border-slate-700 rounded-lg overflow-hidden shadow-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              placeholder="Search nodes... (name, type, ID)"
              className="w-[250px] pl-10 pr-8 py-2 bg-transparent border-none outline-none text-white text-sm placeholder:text-slate-500"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 bg-slate-800/50 border-l border-slate-700 text-slate-300 text-sm hover:bg-slate-700/50 transition-colors",
                selectedType !== "all" && "text-blue-400"
              )}
              aria-label="Filter by type"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{selectedType === "all" ? "All Types" : nodeTypeLabels[selectedType] || selectedType}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] bg-[#1a1a22] border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                <button
                  onClick={() => {
                    setSelectedType("all");
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    selectedType === "all" && "bg-blue-500/20 text-blue-300"
                  )}
                >
                  All Types ({totalCount})
                </button>
                <hr className="border-slate-700 my-1" />
                {availableTypes.map((type) => {
                  if (!type) return null;
                  const count = nodes.filter((n) => n.type === type).length;
                  const label = nodeTypeLabels[type] || type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-slate-700/50",
                        selectedType === type && "bg-blue-500/20 text-blue-300"
                      )}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {(query || selectedType !== "all") && (
          <div className="absolute top-full left-0 mt-2 px-3 py-1.5 bg-[#0f1219] border border-slate-700 rounded-lg text-xs text-slate-400 shadow-lg whitespace-nowrap">
            {resultCount} of {totalCount} nodes match
            {resultCount > 0 && (
              <button
                onClick={handleSelectFirst}
                className="ml-2 text-blue-400 hover:underline"
              >
                Select First
              </button>
            )}
            <button
              onClick={clearSearch}
              className="ml-2 text-slate-500 hover:text-white"
              aria-label="Clear search and filters"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
