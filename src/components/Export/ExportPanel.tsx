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
import { Download, FileCode, GitBranch, Cloud, Box, Settings, X, Check } from "lucide-react";
import { exportDiagram, EXPORT_FORMATS, ExportOptions, ExportResult } from "@/lib/export/multiCloudExport";
import { createExportZip } from "@/lib/export/createZip";
import { AnyNode } from "@/utils/types/resource";
import { Edge } from "@xyflow/react";
import { toast } from "sonner";

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: AnyNode[];
  edges: Edge[];
}

export function ExportPanel({ isOpen, onClose, nodes, edges }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions["format"]>("terraform");
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value as ExportOptions["format"]);
  };
  const [moduleStructure, setModuleStructure] = useState(true);
  const [includeProvider, setIncludeProvider] = useState(true);
  const [includeBackend, setIncludeBackend] = useState(false);
  const [region, setRegion] = useState("us-east-1");
  const [environment, setEnvironment] = useState("dev");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
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

  const handleExport = async () => {
    if (nodes.length === 0) {
      toast.error("No resources to export. Add resources to your diagram first.");
      return;
    }

    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format: selectedFormat,
        moduleStructure,
        includeProvider,
        includeBackend,
        region,
        environment,
      };

      const result = exportDiagram(nodes, edges, options);
      setExportResult(result);
      setShowPreview(true);
      setPreviewFile(result.mainFile);
      toast.success(`Exported ${nodes.length} resources as ${EXPORT_FORMATS.find(f => f.value === selectedFormat)?.label}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportResult) return;

    const files = exportResult.files;
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

  const handleDownloadZip = async () => {
    if (!exportResult) return;
    try {
      const blob = await createExportZip(exportResult.files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `infraflow-${exportResult.format}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("ZIP downloaded");
    } catch (error) {
      console.error("ZIP download failed:", error);
      toast.error("ZIP download failed. Check console for details.");
    }
  };

  const formatInfo = EXPORT_FORMATS.find(f => f.value === selectedFormat);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
    >
      <div
        className="bg-[#1e1e24] border border-[#2e2e36] rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2e2e36]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h2 id="export-title" className="text-lg font-semibold text-white">Export Infrastructure</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onClose(); setExportResult(null); setShowPreview(false); }}
            disabled={isExporting}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Description */}
        <div className="px-4 py-2 border-b border-[#2e2e36]">
          <p className="text-sm text-neutral-400">Export your diagram as Infrastructure-as-Code in multiple formats</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Settings className="w-4 h-4" />
              Export Format
            </Label>
            <Select value={selectedFormat} onValueChange={handleFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map(format => (
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

          {/* Options based on format */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={moduleStructure}
                  onChange={e => setModuleStructure(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                Module Structure
              </Label>
              <p className="text-xs text-neutral-500 ml-6">
                Organize resources into separate module files
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={includeProvider}
                  onChange={e => setIncludeProvider(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                Include Provider Config
              </Label>
              <p className="text-xs text-neutral-500 ml-6">
                Include provider and backend configuration
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={includeBackend}
                  onChange={e => setIncludeBackend(e.target.checked)}
                />
                <span className="relative flex h-4 w-4 items-center justify-center rounded border border-[#2e2e36] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
                Include Backend Config
              </Label>
              <p className="text-xs text-neutral-500 ml-6">
                Include Terraform backend (S3, Azure, GCS, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <GitBranch className="w-4 h-4" />
                Environment
              </Label>
              <Select value={environment} onValueChange={setEnvironment}>
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
                Region
              </Label>
              <Select value={region} onValueChange={setRegion}>
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
          </div>

          {/* Preview */}
          {showPreview && exportResult && (
            <div className="border border-[#2e2e36] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Preview: {exportResult.mainFile}</h4>
                <Select value={previewFile} onValueChange={setPreviewFile}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(exportResult.files).map(file => (
                      <SelectItem key={file} value={file}>{file}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <pre className="bg-[#0b0c0e] p-3 rounded text-xs overflow-x-auto max-h-64 text-neutral-300 font-mono">
                {exportResult.files[previewFile]}
              </pre>
              <div className="flex gap-2 pt-2 border-t border-[#2e2e36]">
                <Button onClick={handleDownload} className="flex-1" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Files
                </Button>
                <Button onClick={handleDownloadZip} variant="outline" className="flex-1" size="sm">
                  <Box className="w-4 h-4 mr-2" />
                  Download as ZIP
                </Button>
              </div>
            </div>
          )}

          {/* Resource Summary */}
          <div className="bg-[#15151a] border border-[#2e2e36] rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Resources to Export: {nodes.length}</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(nodes.map(n => n.type))).map(type => (
                <span key={type} className="px-2 py-1 text-xs bg-[#0b0c0e] border border-[#2e2e36] rounded text-neutral-300">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2e2e36] p-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => { onClose(); setExportResult(null); setShowPreview(false); }}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || nodes.length === 0}>
            {isExporting ? "Generating..." : "Generate Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}
