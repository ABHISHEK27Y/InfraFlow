"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Code,
  Plus,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { importTerraformFromFiles, terraformResourceToNode, TerraformModule } from "@/lib/terraform-import";

interface TerraformImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TerraformImportModal({ isOpen, onClose }: TerraformImportModalProps) {
  const { nodes: existingNodes } = useDiagramStore();
  const [files, setFiles] = useState<File[]>([]);
  const [parsedModules, setParsedModules] = useState<TerraformModule[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setFiles(fileArray);
    setIsParsing(true);
    setParseErrors([]);
    setParseWarnings([]);

    try {
      const result = await importTerraformFromFiles(fileArray);
      if (result.module) {
        setParsedModules([result.module]);
      }
      setParseErrors(result.errors);
      setParseWarnings(result.warnings);
    } catch (error) {
      setParseErrors([`Failed to parse: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleFilesChange(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setParsedModules(prev => prev.filter((_, i) => i !== index));
  };

  const toggleResource = (resourceKey: string) => {
    setSelectedResources(prev => {
      const next = new Set(prev);
      if (next.has(resourceKey)) {
        next.delete(resourceKey);
      } else {
        next.add(resourceKey);
      }
      return next;
    });
  };

  const toggleModule = (index: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllResources = () => {
    const allKeys = new Set<string>();
    parsedModules.forEach(module => {
      module.resources.forEach(r => allKeys.add(`${r.type}_${r.name}`));
      module.dataSources.forEach(r => allKeys.add(`data_${r.type}_${r.name}`));
    });
    setSelectedResources(allKeys);
  };

  const clearSelection = () => {
    setSelectedResources(new Set());
  };

  const importSelected = () => {
    let importedCount = 0;
    let nodeIndex = existingNodes.length;

    parsedModules.forEach(module => {
      module.resources.forEach(resource => {
        const key = `${resource.type}_${resource.name}`;
        if (selectedResources.has(key)) {
          const node = terraformResourceToNode(resource, nodeIndex++, nodeIndex);
          useDiagramStore.getState().addNode(node);
          importedCount++;
        }
      });

      module.dataSources.forEach(resource => {
        const key = `data_${resource.type}_${resource.name}`;
        if (selectedResources.has(key)) {
          const node = terraformResourceToNode(resource, nodeIndex++, nodeIndex);
          useDiagramStore.getState().addNode(node);
          importedCount++;
        }
      });
    });

    if (importedCount > 0) {
      onClose();
    }
  };

  const getTotalResources = () => {
    let count = 0;
    parsedModules.forEach(module => {
      count += module.resources.length + module.dataSources.length;
    });
    return count;
  };

  const getSelectedCount = () => {
    return selectedResources.size;
  };

  if (!isOpen) return null;

  const totalResources = getTotalResources();
  const selectedCount = getSelectedCount();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#374151] bg-[#131316]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white font-semibold">Import Terraform</CardTitle>
              <CardDescription className="text-gray-400 text-sm">Parse .tf/.hcl files and add resources to your diagram</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          {/* Drop Zone / File List */}
          {files.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center p-8 border-b border-[#374151]"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-white font-medium mb-2">Drop Terraform Files Here</h3>
              <p className="text-gray-400 text-sm mb-4">Supports .tf, .hcl, .tf.json files</p>
              <Button variant="outline" onClick={handleFileInputClick} className="w-full max-w-xs">
                <Plus className="w-4 h-4 mr-2" /> Select Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".tf,.hcl,.tf.json,.json"
                multiple
                onChange={(e) => e.target.files && handleFilesChange(e.target.files)}
                className="hidden"
              />
            </div>
          ) : (
            <div className="p-4 border-b border-[#374151] bg-[#131316] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Files ({files.length})</h4>
                <Button variant="outline" size="sm" onClick={handleFileInputClick}>
                  <Plus className="w-4 h-4 mr-2" /> Add More
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[#1a1a22] border border-[#374151] rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => removeFile(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parse Status */}
          {(isParsing || parseErrors.length > 0 || parseWarnings.length > 0) && (
            <div className="p-4 border-b border-[#374151] bg-[#131316] space-y-2">
              {isParsing && (
                <div className="flex items-center gap-3 text-blue-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Parsing Terraform files...</span>
                </div>
              )}
              {parseErrors.length > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{parseErrors.join(", ")}</span>
                </div>
              )}
              {parseWarnings.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{parseWarnings.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Parsed Resources */}
          {parsedModules.length > 0 && !isParsing && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#374151] bg-[#131316] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">
                    {totalResources} resources found
                    {selectedCount > 0 && (
                      <Badge variant="default" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {selectedCount} selected
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllResources} disabled={selectedCount === totalResources}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedCount === 0}>
                    <XCircle className="w-4 h-4 mr-2" /> Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {parsedModules.map((module, moduleIndex) => {
                    const isExpanded = expandedModules.has(moduleIndex);
                    const moduleResources = [...module.resources, ...module.dataSources];

                    return (
                      <div key={moduleIndex} className="bg-[#131316] border border-[#374151] rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#1a1a22]"
                          onClick={() => toggleModule(moduleIndex)}
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <Code className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">Module {moduleIndex + 1}</p>
                              <p className="text-gray-500 text-xs">{moduleResources.length} resources</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">
                              {module.resources.filter(r => selectedResources.has(`${r.type}_${r.name}`)).length} / {module.resources.length} resources
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 border-t border-[#374151] space-y-2">
                            {module.resources.map((resource) => {
                              const key = `${resource.type}_${resource.name}`;
                              const isSelected = selectedResources.has(key);
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-[#1a1a22]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleResource(key)}
                                    className="w-4 h-4 rounded border-gray-600 bg-[#1a1a22] text-blue-500 focus:ring-blue-500"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                                      {resource.type}
                                    </Badge>
                                    <span className="text-white text-sm font-medium truncate max-w-[200px]">{resource.name}</span>
                                  </div>
                                  <div className="flex-1" />
                                  <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                                    {resource.provider}
                                  </Badge>
                                </label>
                              );
                            })}
                            {module.dataSources.map((resource) => {
                              const key = `data_${resource.type}_${resource.name}`;
                              const isSelected = selectedResources.has(key);
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-[#1a1a22] opacity-70"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleResource(key)}
                                    className="w-4 h-4 rounded border-gray-600 bg-[#1a1a22] text-blue-500 focus:ring-blue-500"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                                      data.{resource.type}
                                    </Badge>
                                    <span className="text-white text-sm font-medium truncate max-w-[200px]">{resource.name}</span>
                                    <Badge variant="outline" className="text-xs text-gray-500 border-gray-600 bg-gray-800">
                                      Data Source
                                    </Badge>
                                  </div>
                                  <div className="flex-1" />
                                  <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                                    {resource.provider}
                                  </Badge>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Action Bar */}
              <div className="p-4 border-t border-[#374151] bg-[#131316] flex gap-2 justify-end">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={importSelected}
                  disabled={selectedCount === 0 || isParsing}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Import {selectedCount} Resource{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}