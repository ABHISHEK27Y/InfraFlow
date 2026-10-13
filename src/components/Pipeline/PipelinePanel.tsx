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
import { Download, FileCode, GitBranch, Cloud, Settings, X, Check, Terminal } from "lucide-react";
import { generatePipeline, PIPELINE_FORMATS, PipelineOptions, PipelineResult } from "@/lib/ci-cd/pipelineGenerator";
import { toast } from "sonner";

interface PipelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PipelinePanel({ isOpen, onClose }: PipelinePanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<PipelineOptions["format"]>("github-actions");
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value as PipelineOptions["format"]);
  };
  const [environment, setEnvironment] = useState("dev");
  const handleEnvironmentChange = (value: string) => {
    setEnvironment(value);
  };
  const [provider, setProvider] = useState<"aws" | "azure" | "gcp">("aws");
  const handleProviderChange = (value: string) => {
    setProvider(value as "aws" | "azure" | "gcp");
  };
  const [region, setRegion] = useState("us-east-1");
  const handleRegionChange = (value: string) => {
    setRegion(value);
  };
  const [terraformVersion, setTerraformVersion] = useState("1.7.0");
  const [nodeVersion, setNodeVersion] = useState("20");
  const [includeCostEstimation, setIncludeCostEstimation] = useState(true);
  const [includePolicyCheck, setIncludePolicyCheck] = useState(true);
  const [includeSecurityScan, setIncludeSecurityScan] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [manualApproval, setManualApproval] = useState(true);
  const [branches, setBranches] = useState("main,develop");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<string>("");
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: PipelineOptions = {
        format: selectedFormat,
        environment,
        provider,
        region,
        terraformVersion,
        nodeVersion,
        includeCostEstimation,
        includePolicyCheck,
        includeSecurityScan,
        autoApprove,
        manualApproval,
        branches: branches.split(",").map(b => b.trim()),
      };

      const result = generatePipeline(options);
      setPipelineResult(result);
      setShowPreview(true);
      setPreviewFile(result.mainFile);
      toast.success(`Generated ${PIPELINE_FORMATS.find(f => f.value === selectedFormat)?.label} pipeline for ${environment}`);
    } catch (error) {
      console.error("Pipeline generation failed:", error);
      toast.error("Pipeline generation failed. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pipelineResult) return;

    const files = pipelineResult.files;
    Object.entries(files).forEach(([filename, content]) => {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${Object.keys(files).length} file(s)`);
  };

  const formatInfo = PIPELINE_FORMATS.find(f => f.value === selectedFormat);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pipeline-title"
    >
      <div
        className="bg-[#1e1e24] border border-[#2e2e36] rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2e2e36]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h2 id="pipeline-title" className="text-lg font-semibold text-white">CI/CD Pipeline Generator</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onClose(); setPipelineResult(null); setShowPreview(false); }}
            disabled={isGenerating}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Description */}
        <div className="px-4 py-2 border-b border-[#2e2e36]">
          <p className="text-sm text-neutral-400">Generate CI/CD pipelines for Terraform deployments with security, cost, and policy checks</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Settings className="w-4 h-4" />
              Pipeline Platform
            </Label>
            <Select value={selectedFormat} onValueChange={handleFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_FORMATS.map(format => (
                  <SelectItem key={format.value} value={format.value} className="flex flex-col items-start gap-1 py-3">
                    <span className="font-medium">{format.label}</span>
                    <span className="text-xs text-neutral-400">{format.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formatInfo && (
              <p className="text-sm text-neutral-400 ml-2">
                {formatInfo.description}
              </p>
            )}
          </div>

          {/* Environment & Provider Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <GitBranch className="w-4 h-4" />
                Environment
              </Label>
              <Select value={environment} onValueChange={handleEnvironmentChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Cloud className="w-4 h-4" />
                Cloud Provider
              </Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">AWS</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                  <SelectItem value="gcp">Google Cloud</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Cloud className="w-4 h-4" />
                Region
              </Label>
              <Select value={region} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                  <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Settings className="w-4 h-4" />
                Terraform Version
              </Label>
              <input
                type="text"
                value={terraformVersion}
                onChange={(e) => setTerraformVersion(e.target.value)}
                className="w-full max-w-xs bg-[#15151a] border border-[#2e2e36] rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.7.0"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <FileCode className="w-4 h-4" />
                Node.js Version
              </Label>
              <input
                type="text"
                value={nodeVersion}
                onChange={(e) => setNodeVersion(e.target.value)}
                className="w-full max-w-xs bg-[#15151a] border border-[#2e2e36] rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <GitBranch className="w-4 h-4" />
                Branches (comma-separated)
              </Label>
              <input
                type="text"
                value={branches}
                onChange={(e) => setBranches(e.target.value)}
                className="w-full max-w-xs bg-[#15151a] border border-[#2e2e36] rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="main,develop"
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="border border-[#2e2e36] rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pipeline Features
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={includeCostEstimation}
                  onChange={e => setIncludeCostEstimation(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div>
                  <span className="font-medium">Cost Estimation</span>
                  <p className="text-xs text-neutral-500">Infracost integration</p>
                </div>
              </Label>

              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={includePolicyCheck}
                  onChange={e => setIncludePolicyCheck(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div>
                  <span className="font-medium">Policy Check</span>
                  <p className="text-xs text-neutral-500">OPA/Rego validation</p>
                </div>
              </Label>

              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={includeSecurityScan}
                  onChange={e => setIncludeSecurityScan(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div>
                  <span className="font-medium">Security Scan</span>
                  <p className="text-xs text-neutral-500">tfsec & Checkov</p>
                </div>
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-[#2e2e36]">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={manualApproval}
                  onChange={e => setManualApproval(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div>
                  <span className="font-medium">Manual Approval</span>
                  <p className="text-xs text-neutral-500">Require approval before apply</p>
                </div>
              </Label>

              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoApprove}
                  onChange={e => setAutoApprove(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <div>
                  <span className="font-medium">Auto Approve</span>
                  <p className="text-xs text-neutral-500">Skip approval for non-prod</p>
                </div>
              </Label>
            </div>
          </div>

          {/* Preview */}
          {showPreview && pipelineResult && (
            <div className="border border-[#2e2e36] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Preview: {pipelineResult.mainFile}</h4>
                <Select value={previewFile} onValueChange={e => setPreviewFile(e)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(pipelineResult.files).map(file => (
                      <SelectItem key={file} value={file}>{file}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <pre className="bg-[#0b0c0e] p-3 rounded text-xs overflow-x-auto max-h-64 text-neutral-300 font-mono">
                {pipelineResult.files[previewFile]}
              </pre>
              <div className="flex gap-2 pt-2 border-t border-[#2e2e36]">
                <Button onClick={handleDownload} className="flex-1" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Files
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2e2e36] p-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => { onClose(); setPipelineResult(null); setShowPreview(false); }}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Pipeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}