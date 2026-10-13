"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Label,
} from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Download, FileCode, Settings, X, Check, AlertTriangle, Shield, RefreshCw, Terminal, Play, Pause, Square, RotateCcw } from "lucide-react";
import { createRemediationPlan, RemediationPlan, RemediationAction, filterAutoFixableActions, filterApprovalRequiredActions, applyRemediation, generateRemediationScript, getRemediationStats } from "@/lib/drift/remediation";
import { DriftDetectionResult } from "@/lib/drift/types";
import { toast } from "sonner";

interface RemediationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  driftResult: DriftDetectionResult | null;
}

export function RemediationPanel({ isOpen, onClose, driftResult }: RemediationPanelProps) {
  const [remediationPlan, setRemediationPlan] = useState<RemediationPlan | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyOutput, setApplyOutput] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "auto" | "approval">("all");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  // Generate plan when drift result changes
  useEffect(() => {
    if (driftResult && !remediationPlan) {
      generatePlan();
    }
  }, [driftResult]);

  const generatePlan = () => {
    if (!driftResult) return;
    setIsGenerating(true);
    try {
      const plan = createRemediationPlan(driftResult.drifts);
      setRemediationPlan(plan);
      // Auto-select auto-fixable actions
      const autoActions = filterAutoFixableActions(plan);
      setSelectedActions(autoActions.map(a => a.id));
      toast.success(`Generated remediation plan with ${plan.summary.total} actions`);
    } catch (error) {
      console.error("Plan generation failed:", error);
      toast.error("Failed to generate remediation plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleActionToggle = (actionId: string) => {
    setSelectedActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleSelectAll = () => {
    if (!remediationPlan) return;
    const allIds = remediationPlan.actions.map(a => a.id);
    setSelectedActions(selectedActions.length === allIds.length ? [] : allIds);
  };

  const handleSelectAuto = () => {
    if (!remediationPlan) return;
    const autoActions = filterAutoFixableActions(remediationPlan);
    setSelectedActions(autoActions.map(a => a.id));
  };

  const handleApply = async () => {
    if (!remediationPlan || selectedActions.length === 0) {
      toast.error("No actions selected");
      return;
    }

    setIsApplying(true);
    setApplyProgress(0);
    setApplyOutput("");

    try {
      const result = await applyRemediation(remediationPlan, selectedActions, "/tmp/terraform");

      setApplyOutput(result.terraformOutput);
      setApplyProgress(100);

      if (result.success) {
        toast.success(`Successfully applied ${result.actionsApplied.length} remediation actions`);
      } else {
        toast.error(`${result.actionsFailed.length} actions failed`);
      }
    } catch (error) {
      console.error("Apply failed:", error);
      toast.error("Remediation apply failed");
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadScript = () => {
    if (!remediationPlan || selectedActions.length === 0) return;

    const script = generateRemediationScript(remediationPlan, selectedActions);
    const blob = new Blob([script], { type: "text/x-sh" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remediation-${remediationPlan.id}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Remediation script downloaded");
  };

  const handleDownloadPlan = () => {
    if (!remediationPlan) return;

    const blob = new Blob([remediationPlan.terraformPlan || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terraform-plan-${remediationPlan.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Terraform plan downloaded");
  };

  const stats = remediationPlan ? getRemediationStats(remediationPlan) : null;
  const filteredActions = remediationPlan ? remediationPlan.actions.filter(action => {
    if (viewMode === "auto") return action.autoFixable && !action.requiresApproval;
    if (viewMode === "approval") return action.requiresApproval;
    return true;
  }) : [];

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remediation-title"
    >
      <div
        className="bg-[#1e1e24] border border-[#2e2e36] rounded-lg shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2e2e36]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 id="remediation-title" className="text-lg font-semibold text-white">Drift Remediation</h2>
            {remediationPlan && (
              <span className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded">
                {remediationPlan.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {remediationPlan && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPlan}
                  className="text-neutral-400 hover:text-white"
                >
                  <FileCode className="w-4 h-4 mr-1" />
                  Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadScript}
                  disabled={selectedActions.length === 0}
                  className="text-neutral-400 hover:text-white"
                >
                  <Terminal className="w-4 h-4 mr-1" />
                  Script
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onClose(); setRemediationPlan(null); setSelectedActions([]); }}
              disabled={isGenerating || isApplying}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-2 border-b border-[#2e2e36]">
          <p className="text-sm text-neutral-400">
            Analyze infrastructure drift and generate automated remediation plans with Terraform
          </p>
        </div>

        {isGenerating && (
          <div className="px-4 py-2 bg-blue-600/10 border-b border-[#2e2e36] flex items-center gap-2 text-blue-400 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin" />
            Generating remediation plan...
          </div>
        )}

        <div className="p-4 space-y-6">
          {!driftResult ? (
            <div className="text-center py-12 text-neutral-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <p>No drift detection results available. Run drift detection first.</p>
            </div>
          ) : remediationPlan ? (
            <>
              {/* Stats Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-[#15151a] border-[#2e2e36]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
                        <p className="text-xs text-neutral-500">Total Actions</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#15151a] border-[#2e2e36]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-green-400">{stats?.autoFixable || 0}</p>
                        <p className="text-xs text-neutral-500">Auto-Fixable</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#15151a] border-[#2e2e36]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{stats?.requiresApproval || 0}</p>
                        <p className="text-xs text-neutral-500">Requires Approval</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#15151a] border-[#2e2e36]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-red-400">{stats?.byRisk?.high || 0}</p>
                        <p className="text-xs text-neutral-500">High Risk</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* View Filter */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All ({remediationPlan.actions.length})
                </Button>
                <Button
                  variant={viewMode === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("auto")}
                >
                  Auto-Fixable ({stats?.autoFixable || 0})
                </Button>
                <Button
                  variant={viewMode === "approval" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("approval")}
                >
                  Requires Approval ({stats?.requiresApproval || 0})
                </Button>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between py-2 border-t border-[#2e2e36]">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={selectedActions.length === filteredActions.length && filteredActions.length > 0}
                      onChange={handleSelectAll}
                      className="sr-only peer"
                    />
                    <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    Select All Visible
                  </label>
                  <Button variant="outline" size="sm" onClick={handleSelectAuto} disabled={stats?.autoFixable === 0}>
                    <Check className="w-4 h-4 mr-1" />
                    Select Auto-Fixable
                  </Button>
                </div>
                <div className="text-sm text-neutral-500">
                  {selectedActions.length} / {filteredActions.length} selected
                </div>
              </div>

              {/* Actions List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredActions.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No actions match the current filter
                  </div>
                ) : (
                  filteredActions.map(action => (
                    <Card
                      key={action.id}
                      className={`bg-[#15151a] border-[#2e2e36] transition-all ${
                        selectedActions.includes(action.id) ? "border-blue-500/50 bg-blue-600/5" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              checked={selectedActions.includes(action.id)}
                              onChange={() => handleActionToggle(action.id)}
                              className="sr-only peer"
                            />
                            <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          </label>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">
                                {action.resourceType}.{action.resourceName}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                action.type === "import" ? "bg-green-600/20 text-green-400" :
                                action.type === "update" ? "bg-blue-600/20 text-blue-400" :
                                action.type === "replace" ? "bg-yellow-600/20 text-yellow-400" :
                                "bg-gray-600/20 text-gray-400"
                              }`}>
                                {action.type.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                action.estimatedRisk === "high" ? "bg-red-600/20 text-red-400" :
                                action.estimatedRisk === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                                "bg-green-600/20 text-green-400"
                              }`}>
                                {action.estimatedRisk.toUpperCase()} RISK
                              </span>
                              {action.requiresApproval && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-600/20 text-purple-400">
                                  APPROVAL REQUIRED
                                </span>
                              )}
                              {action.autoFixable && !action.requiresApproval && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-600/20 text-green-400">
                                  AUTO-FIXABLE
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-400 mt-1">{action.description}</p>
                            {action.terraformCommand && (
                              <code className="text-xs text-neutral-500 font-mono block mt-1 bg-[#0b0c0e] px-2 py-1 rounded truncate">
                                {action.terraformCommand}
                              </code>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Apply Section */}
              <div className="border-t border-[#2e2e36] pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Apply Remediation</h4>
                  {isApplying && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#2e2e36] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${applyProgress}%` }}
                        />
                      </div>
                      <span className="text-sm text-neutral-400">{applyProgress}%</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleApply}
                  disabled={isApplying || selectedActions.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isApplying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2 animate-spin" />
                      Applying Remediation...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Apply {selectedActions.length} Action(s)
                    </>
                  )}
                </Button>

                {applyOutput && (
                  <div className="bg-[#0b0c0e] border border-[#2e2e36] rounded p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">{applyOutput}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-neutral-500">
              <RotateCcw className="w-12 h-12 mx-auto mb-4 text-neutral-600 animate-spin" />
              <p>Generating remediation plan...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}