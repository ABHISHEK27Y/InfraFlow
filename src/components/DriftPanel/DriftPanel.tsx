"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Filter,
  X,
  ShieldAlert,
  FileText,
  Settings,
  Wifi,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { detectDrift, generateDriftSummary, sortDriftResults, filterDriftBySeverity, DriftSummary, DriftDetectionOptions, DriftResult } from "@/lib/drift/engine";
import { DriftDetectionResult } from "@/lib/drift/types";
import { getProvider, listProviders, ProviderConfig } from "@/lib/drift/providers";

interface DriftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDriftResult?: (result: DriftDetectionResult | null) => void;
}

export default function DriftPanel({ isOpen, onClose, onDriftResult }: DriftPanelProps) {
  const { nodes, edges } = useDiagramStore();
  const [driftResults, setDriftResults] = useState<DriftResult[]>([]);
  const [summary, setSummary] = useState<DriftSummary | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("mock");
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({ provider: "mock" });
  const [showConfig, setShowConfig] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "warning" | "info">("all");
  const [filterType, setFilterType] = useState<"all" | "added" | "removed" | "modified">("all");
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const providers = listProviders();
  const currentProvider = getProvider(selectedProvider);

  // Build UGCP graph from current diagram state
  const buildUGCPGraph = useCallback(() => {
    const ugcpNodes = nodes.map((node) => {
      const nodeData = node.data as Record<string, unknown>;
      return {
        id: node.id,
        type: node.type ?? "unknown",
        parentId: node.parentId ?? null,
        position: { x: node.position.x, y: node.position.y },
        width: node.width ?? null,
        height: node.height ?? null,
        data: { ...nodeData },
        provenance: (nodeData.provenance as any) ?? null,
      };
    });

    const ugcpEdges = edges.map((edge) => {
      const edgeData = edge.data as Record<string, unknown> | undefined;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type ?? "connection",
        data: edgeData ? { ...edgeData } : {},
        provenance: edgeData?.provenance as any ?? null,
      };
    });

    return {
      projectId: "current",
      version: 1,
      updatedAt: Date.now(),
      nodes: ugcpNodes,
      edges: ugcpEdges,
      metadata: { name: "Current Diagram", description: "", tags: [] },
    };
  }, [nodes, edges]);

  const runDriftDetection = useCallback(async () => {
    if (!currentProvider) {
      setScanError("No provider selected");
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      // Validate provider config
      if (!currentProvider.validateConfig(providerConfig)) {
        throw new Error("Invalid provider configuration");
      }

      // Fetch deployed resources
      const deployedResources = await currentProvider.fetchResources(providerConfig);

      // Build diagram graph
      const diagramGraph = buildUGCPGraph();

      // Detect drift
      const options: DriftDetectionOptions = {
        diagramGraph,
        deployedResources,
        provider: selectedProvider,
        ignoreFields: ["tags", "tags_all", "arn", "id", "owner_id"],
        matchBy: "address",
      };

      const results = detectDrift(options);
      const sortedResults = sortDriftResults(results);
      const driftSummary = generateDriftSummary(sortedResults);

      const combinedResult: DriftDetectionResult = {
        timestamp: new Date().toISOString(),
        provider: selectedProvider,
        drifts: sortedResults,
        summary: driftSummary,
      };

      setDriftResults(sortedResults);
      setSummary(driftSummary);
      setLastScanTime(new Date());
      onDriftResult?.(combinedResult);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Failed to detect drift");
      console.error("Drift detection error:", error);
      onDriftResult?.(null);
    } finally {
      setIsScanning(false);
    }
  }, [currentProvider, providerConfig, selectedProvider, buildUGCPGraph, onDriftResult]);

  // Auto-run on open
  useEffect(() => {
    if (isOpen) {
      runDriftDetection();
    }
  }, [isOpen, runDriftDetection]);

  // Filter results
  const filteredResults = driftResults.filter((result) => {
    const severityMatch = filterSeverity === "all" || result.severity === filterSeverity;
    const typeMatch = filterType === "all" || result.driftType === filterType;
    return severityMatch && typeMatch;
  });

  const toggleExpand = (resourceId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-500/20 border-red-500/30";
      case "warning":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      case "info":
        return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      default:
        return "text-gray-400 bg-gray-500/20 border-gray-500/30";
    }
  };

  const getDriftTypeIcon = (type: string) => {
    switch (type) {
      case "added":
        return <FileText className="w-4 h-4 text-green-400" />;
      case "removed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "modified":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#374151] bg-[#131316]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-white font-semibold">Drift Detection</CardTitle>
              <CardDescription className="text-gray-400 text-sm">Compare diagram state with deployed infrastructure</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConfig(!showConfig)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Provider Config Panel */}
        {showConfig && (
          <div className="p-4 border-b border-[#374151] bg-[#131316] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Provider Configuration</h4>
              <Badge variant={currentProvider ? "default" : "secondary"} className={currentProvider ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>
                {currentProvider ? currentProvider.name : "None"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <span>Provider:</span>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="bg-[#1a1a22] border border-[#374151] rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {providers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              {currentProvider && currentProvider.getConfigSchema().fields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentProvider.getConfigSchema().fields.map((field) => (
                    <div key={field.name} className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">{field.label}</label>
                      {field.type === "select" ? (
                        <select
                          value={(providerConfig[field.name] as string) || ""}
                          onChange={(e) => setProviderConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          className="bg-[#1a1a22] border border-[#374151] rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "password" ? (
                        <input
                          type="password"
                          value={(providerConfig[field.name] as string) || ""}
                          onChange={(e) => setProviderConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.description}
                          className="bg-[#1a1a22] border border-[#374151] rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        />
                      ) : (
                        <input
                          type="text"
                          value={(providerConfig[field.name] as string) || ""}
                          onChange={(e) => setProviderConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.description}
                          className="bg-[#1a1a22] border border-[#374151] rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" onClick={runDriftDetection} disabled={isScanning}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning..." : "Run Scan"}
              </Button>
            </div>

            {scanError && (
              <div className="flex items-center gap-2 text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{scanError}</span>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="p-4 border-b border-[#374151] bg-[#131316]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Total Resources</p>
                <p className="text-2xl font-bold text-white">{summary.totalResources}</p>
              </div>
              <div className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Critical</p>
                <p className="text-2xl font-bold text-red-400">{summary.criticalCount}</p>
              </div>
              <div className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Warnings</p>
                <p className="text-2xl font-bold text-yellow-400">{summary.warningCount}</p>
              </div>
              <div className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Info</p>
                <p className="text-2xl font-bold text-blue-400">{summary.infoCount}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-2 bg-[#1a1a22] border border-[#374151] rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Added</p>
                <p className="text-lg font-bold text-green-400">{summary.addedCount}</p>
              </div>
              <div className="p-2 bg-[#1a1a22] border border-[#374151] rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Removed</p>
                <p className="text-lg font-bold text-red-400">{summary.removedCount}</p>
              </div>
              <div className="p-2 bg-[#1a1a22] border border-[#374151] rounded-lg text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Modified</p>
                <p className="text-lg font-bold text-yellow-400">{summary.modifiedCount}</p>
              </div>
            </div>
            {lastScanTime && (
              <p className="text-gray-500 text-xs mt-2 text-right">
                Last scanned: {lastScanTime.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-[#374151] bg-[#131316] flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Filters:</span>
          </div>
          <div className="flex items-center gap-1">
            {(["all", "critical", "warning", "info"] as const).map((severity) => (
              <Button
                key={severity}
                variant={filterSeverity === severity ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterSeverity(severity)}
                className={
                  severity === "critical"
                    ? "text-red-400 hover:bg-red-500/10"
                    : severity === "warning"
                    ? "text-yellow-400 hover:bg-yellow-500/10"
                    : severity === "info"
                    ? "text-blue-400 hover:bg-blue-500/10"
                    : ""
                }
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-l border-[#374151] pl-4 ml-2">
            {(["all", "added", "removed", "modified"] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(type)}
                className={
                  type === "added"
                    ? "text-green-400 hover:bg-green-500/10"
                    : type === "removed"
                    ? "text-red-400 hover:bg-red-500/10"
                    : type === "modified"
                    ? "text-yellow-400 hover:bg-yellow-500/10"
                    : ""
                }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={runDriftDetection} disabled={isScanning}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
            Rescan
          </Button>
        </div>

        {/* Results Tabs */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredResults.length === 0 && !isScanning && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Wifi className="w-16 h-16 text-green-400/50 mb-4" />
              <h3 className="text-white font-medium mb-2">No Drift Detected</h3>
              <p className="text-gray-400 text-sm">Your diagram matches the deployed infrastructure</p>
            </div>
          )}

          {filteredResults.length > 0 && (
            <Tabs defaultValue="all" className="flex-1 flex flex-col">
              <TabsList className="border-b border-[#374151] bg-[#131316] p-2">
                <TabsTrigger value="all" className="text-xs px-3 py-1.5">
                  All ({filteredResults.length})
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-xs px-3 py-1.5 text-red-400">
                  Critical ({filterDriftBySeverity(filteredResults, "critical").length})
                </TabsTrigger>
                <TabsTrigger value="warning" className="text-xs px-3 py-1.5 text-yellow-400">
                  Warning ({filterDriftBySeverity(filteredResults, "warning").length})
                </TabsTrigger>
                <TabsTrigger value="info" className="text-xs px-3 py-1.5 text-blue-400">
                  Info ({filterDriftBySeverity(filteredResults, "info").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {filteredResults.map((result) => {
                      const isExpanded = expandedResults.has(result.resourceId);
                      return (
                        <div
                          key={result.resourceId}
                          className={`bg-[#131316] border rounded-lg overflow-hidden transition-all ${
                            result.severity === "critical"
                              ? "border-red-500/30"
                              : result.severity === "warning"
                              ? "border-yellow-500/30"
                              : "border-blue-500/30"
                          }`}
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#1a1a22]"
                            onClick={() => toggleExpand(result.resourceId)}
                          >
                            <div className="flex items-center gap-3">
                              {getDriftTypeIcon(result.driftType)}
                              <div>
                                <p className="text-white font-medium">
                                  {result.resourceType}
                                  <span className="text-gray-400 font-normal ml-2">.{result.resourceName}</span>
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {result.provider} • {result.terraformAddress}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={getSeverityColor(result.severity)}
                              >
                                {result.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                                {result.driftType.toUpperCase()}
                              </Badge>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 border-t border-[#374151] space-y-2">
                              {result.changes.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-gray-400 text-sm font-medium">Changes:</p>
                                  {result.changes.map((change, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 p-2 bg-[#1a1a22] rounded-lg text-xs"
                                    >
                                      <span
                                        className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                                          change.changeType === "added"
                                            ? "bg-green-400"
                                            : change.changeType === "removed"
                                            ? "bg-red-400"
                                            : "bg-yellow-400"
                                        }`}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white font-mono text-xs truncate">{change.field}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                          {change.oldValue !== undefined && (
                                            <span className="text-red-400 font-mono">- {JSON.stringify(change.oldValue).slice(0, 100)}</span>
                                          )}
                                          {change.newValue !== undefined && (
                                            <span className="text-green-400 font-mono">+ {JSON.stringify(change.newValue).slice(0, 100)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">
                                  {result.driftType === "added"
                                    ? "Resource exists in diagram but not deployed"
                                    : result.driftType === "removed"
                                    ? "Resource exists in deployed infrastructure but not in diagram"
                                    : "No configuration changes detected"}
                                </p>
                              )}

                              {result.diagramNodeId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:bg-blue-500/10"
                                  onClick={() => {
                                    // Could navigate to node in diagram
                                    console.log("Navigate to node:", result.diagramNodeId);
                                  }}
                                >
                                  Locate in Diagram
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              {["critical", "warning", "info"].map((severity) => (
                <TabsContent key={severity} value={severity} className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-3">
                      {filterDriftBySeverity(filteredResults, severity as "critical" | "warning" | "info").map((result) => {
                        const isExpanded = expandedResults.has(result.resourceId);
                        return (
                          <div
                            key={result.resourceId}
                            className={`bg-[#131316] border rounded-lg overflow-hidden ${
                              severity === "critical"
                                ? "border-red-500/30"
                                : severity === "warning"
                                ? "border-yellow-500/30"
                                : "border-blue-500/30"
                            }`}
                          >
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#1a1a22]"
                              onClick={() => toggleExpand(result.resourceId)}
                            >
                              <div className="flex items-center gap-3">
                                {getDriftTypeIcon(result.driftType)}
                                <div>
                                  <p className="text-white font-medium">
                                    {result.resourceType}
                                    <span className="text-gray-400 font-normal ml-2">.{result.resourceName}</span>
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    {result.provider} • {result.terraformAddress}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className={getSeverityColor(result.severity)}
                                >
                                  {result.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                                  {result.driftType.toUpperCase()}
                                </Badge>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-3 border-t border-[#374151] space-y-2">
                                {result.changes.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-gray-400 text-sm font-medium">Changes:</p>
                                    {result.changes.map((change, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-3 p-2 bg-[#1a1a22] rounded-lg text-xs"
                                      >
                                        <span
                                          className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                                            change.changeType === "added"
                                              ? "bg-green-400"
                                              : change.changeType === "removed"
                                              ? "bg-red-400"
                                              : "bg-yellow-400"
                                          }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white font-mono text-xs truncate">{change.field}</p>
                                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                            {change.oldValue !== undefined && (
                                              <span className="text-red-400 font-mono">- {JSON.stringify(change.oldValue).slice(0, 100)}</span>
                                            )}
                                            {change.newValue !== undefined && (
                                              <span className="text-green-400 font-mono">+ {JSON.stringify(change.newValue).slice(0, 100)}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-sm">
                                    {result.driftType === "added"
                                      ? "Resource exists in diagram but not deployed"
                                      : result.driftType === "removed"
                                      ? "Resource exists in deployed infrastructure but not in diagram"
                                      : "No configuration changes detected"}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </div>
    </div>
  );
}