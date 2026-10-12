"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  FileText,
  Loader2,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { getPolicyEngine } from "@/lib/policy/engine";
import { PolicyEvaluationResult } from "@/lib/policy/types";
import { getAllPolicyRules, allPolicySets } from "@/lib/policy/builtin-policies";

export default function PolicyPanel() {
  const { nodes } = useDiagramStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<PolicyEvaluationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set());
  const [enabledRuleIds, setEnabledRuleIds] = useState<Set<string>>(new Set(
    getAllPolicyRules().map(r => r.id)
  ));

  const categories = ["all", "security", "cost", "best-practice", "compliance", "reliability"];

  const convertNodesToResources = useCallback(() => {
    return nodes.map((node) => ({
      id: node.id,
      name: (node.data as Record<string, unknown>)?.name as string || node.id,
      type: node.type || "unknown",
      data: node.data as Record<string, unknown>,
      provider: "aws",
    }));
  }, [nodes]);

  const runEvaluation = useCallback(async () => {
    setIsEvaluating(true);
    try {
      const resources = convertNodesToResources();
      const engine = getPolicyEngine({
        policySets: allPolicySets.filter(ps =>
          ps.rules.some(r => enabledRuleIds.has(r.id))
        ),
      });
      const evaluationResult = await engine.evaluate(resources);
      setResult(evaluationResult);
    } catch (error) {
      console.error("Policy evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  }, [convertNodesToResources, enabledRuleIds]);

  useEffect(() => {
    if (isOpen && nodes.length > 0) {
      runEvaluation();
    }
  }, [isOpen, nodes.length, runEvaluation]);

  const toggleViolation = (violationId: string) => {
    setExpandedViolations((prev) => {
      const next = new Set(prev);
      if (next.has(violationId)) {
        next.delete(violationId);
      } else {
        next.add(violationId);
      }
      return next;
    });
  };

  const toggleRule = (ruleId: string) => {
    setEnabledRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const getFilteredViolations = () => {
    if (!result) return [];
    return result.violations.filter((v) => {
      const categoryMatch = selectedCategory === "all" || v.category === selectedCategory;
      const searchMatch = !searchQuery ||
        v.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.ruleName.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "info": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "info": return <Info className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const errors = result?.summary.errors || 0;
  const warnings = result?.summary.warnings || 0;
  const info = result?.summary.info || 0;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 p-0 rounded-xl bg-[#232329] border border-white/10 hover:border-blue-500/50 transition-colors shadow-lg"
        title="Policy Validation"
      >
        <Shield className="w-6 h-6 text-white" />
        {(errors > 0 || warnings > 0) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {errors > 0 ? "!" : "���"}
          </span>
        )}
      </Button>
    );
  }

  const filteredViolations = getFilteredViolations();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card
        className="w-96 max-h-[80vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl flex flex-col"
      >
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#374151]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-white font-semibold">Policy Validation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {showSettings ? (
          <CardContent className="p-4 space-y-4 flex-1 overflow-auto">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium">Enabled Rules</label>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {allPolicySets.map((policySet) => (
                    <div key={policySet.id} className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{policySet.name}</p>
                      {policySet.rules.map((rule) => (
                        <label key={rule.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={enabledRuleIds.has(rule.id)}
                            onChange={() => toggleRule(rule.id)}
                            className="w-4 h-4 rounded border-gray-600 bg-[#1a1a22] text-blue-500 focus:ring-blue-500"
                          />
                          <span className="truncate">{rule.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{rule.severity}</Badge>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowSettings(false)}
              className="w-full"
            >
              <ChevronUp className="w-4 h-4 mr-2" /> Back to Results
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0 flex-1 overflow-hidden">
            {!result && !isEvaluating && (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-white font-medium mb-2">No Policy Evaluation Run</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Add resources to your diagram and run policy validation to check for compliance issues.
                </p>
                <Button onClick={runEvaluation} disabled={nodes.length === 0} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" /> Run Validation
                </Button>
              </div>
            )}

            {isEvaluating && (
              <div className="p-6 text-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400 dark:text-gray-400">Evaluating policies...</p>
              </div>
            )}

            {result && !isEvaluating && (
              <div className="flex flex-col h-full">
                {/* Summary Bar */}
                <div className="grid grid-cols-4 gap-2 p-4 border-b border-[#374151] bg-[#131316]">
                  <div className="text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Errors</p>
                    <p className="text-2xl font-bold text-red-400">{errors}</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-400">{warnings}</p>
                  </div>
                  <div className="text-center p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wide">Info</p>
                    <p className="text-2xl font-bold text-blue-400">{info}</p>
                  </div>
                  <div className="text-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs font-medium text-green-400 uppercase tracking-wide">Status</p>
                    <p className="text-2xl font-bold text-green-400">{result.passed ? "PASS" : "FAIL"}</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-[#374151] bg-[#131316] space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search violations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#1a1a22] border border-[#374151] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={selectedCategory === cat ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : ""}
                      >
                        {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Violations List */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {filteredViolations.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-white font-medium mb-2">No Violations Found</h3>
                        <p className="text-gray-400 text-sm">
                          {searchQuery || selectedCategory !== "all"
                            ? "Try adjusting your filters"
                            : "All policies passed!"}
                        </p>
                      </div>
                    ) : (
                      filteredViolations.map((violation, index) => {
                        const isExpanded = expandedViolations.has(`${violation.ruleId}-${violation.resourceId}-${index}`);
                        return (
                          <div
                            key={`${violation.ruleId}-${violation.resourceId}-${index}`}
                            className={`bg-[#1a1a22] border rounded-lg p-3 transition-all ${getSeverityColor(violation.severity)}`}
                          >
                            <div className="flex items-start gap-3">
                              {getSeverityIcon(violation.severity)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-white truncate">{violation.ruleName}</span>
                                    <Badge variant="outline" className="text-xs">{violation.severity.toUpperCase()}</Badge>
                                    <Badge variant="outline" className="text-xs">{violation.category}</Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleViolation(`${violation.ruleId}-${violation.resourceId}-${index}`)}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </div>
                                <p className="text-gray-300 text-sm mt-1">{violation.message}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {violation.resourceType}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {violation.resourceId}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2">
                                {violation.remediation && (
                                  <div className="p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-xs text-gray-400 font-medium mb-1">Remediation:</p>
                                    <p className="text-sm text-gray-300">{violation.remediation}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>Rule ID: {violation.ruleId}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Action Bar */}
                <div className="p-4 border-t border-[#374151] bg-[#131316] flex gap-2">
                  <Button variant="outline" size="sm" onClick={runEvaluation} disabled={isEvaluating} className="flex-1">
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Re-evaluating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-run
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="flex-1">
                    <Settings className="w-4 h-4 mr-2" /> Rules
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}