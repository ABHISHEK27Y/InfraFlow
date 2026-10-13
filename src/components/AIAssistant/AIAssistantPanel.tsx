"use client";

import React, { useState, useRef, useEffect } from "react";
import { aiService, DiagramGenerationResult, ArchitecturePattern, CostOptimizationRecommendation, SecurityComplianceFinding, TerraformGenerationResult } from "@/lib/ai/aiService";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, X, Loader2, Sparkles, Brain, Zap, FileText, Copy, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  const { nodes, edges, addNode, addEdge } = useDiagramStore();
  const [activeTab, setActiveTab] = useState<"generate" | "suggest" | "patterns" | "cost" | "security" | "terraform" | "settings">("generate");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; reason: string; suggestedConfig: Record<string, unknown> }>>([]);
  const [patterns, setPatterns] = useState<ArchitecturePattern[]>([]);
  const [result, setResult] = useState<DiagramGenerationResult | null>(null);
  const [costRecommendations, setCostRecommendations] = useState<CostOptimizationRecommendation[]>([]);
  const [securityFindings, setSecurityFindings] = useState<SecurityComplianceFinding[]>([]);
  const [terraformResult, setTerraformResult] = useState<TerraformGenerationResult | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string; diagram?: DiagramGenerationResult }>>([]);

  useEffect(() => {
    localStorage.removeItem("infraflow_ai_key");
    const savedKey = aiService.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    }
    loadPatterns();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const loadPatterns = async () => {
    try {
      const p = await aiService.getArchitecturePatterns();
      setPatterns(p);
    } catch (e) {
      console.error("Failed to load patterns:", e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!aiService.getApiKey()) {
      setError("Please configure your API key in Settings tab");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userMessage = { role: "user" as const, content: prompt };
      setChatHistory(prev => [...prev, userMessage]);

      const diagram = await aiService.generateDiagram(prompt, { existingNodes: nodes, existingEdges: edges });
      setResult(diagram);

      const assistantMessage = { role: "assistant" as const, content: diagram.explanation, diagram };
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      setChatHistory(prev => [...prev, { role: "assistant" as const, content: `Error: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDiagram = (diagram: DiagramGenerationResult) => {
    if (diagram.nodes.length === 0) return;

    // Add nodes and edges to the canvas
    diagram.nodes.forEach(node => addNode(node));
    diagram.edges.forEach(edge => addEdge(edge));

    setResult(null);
    setPrompt("");
    setActiveTab("generate");
  };

  const handleSuggest = async () => {
    if (!aiService.getApiKey()) {
      setError("Please configure your API key in Settings tab");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const s = await aiService.suggestResources(nodes, edges);
      setSuggestions(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggestions failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: { type: string; suggestedConfig: Record<string, unknown> }) => {
    // Create a node from the suggestion
    const newNode = {
      id: `${suggestion.type}-${Date.now()}`,
      type: suggestion.type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { Name: suggestion.suggestedConfig.Name || suggestion.type, ...suggestion.suggestedConfig },
    } as any;

    addNode(newNode);
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleApplyPattern = (pattern: ArchitecturePattern) => {
    // Create nodes with proper positioning
    const nodeIdMap: Record<string, string> = {};

    pattern.nodes.forEach((nodeDef, index) => {
      const newId = `${nodeDef.type}-${Date.now()}-${index}`;
      nodeIdMap[`${nodeDef.type}-${index}`] = newId;

      const data = nodeDef.data as Record<string, unknown> | undefined;
      const node = {
        id: newId,
        type: nodeDef.type!,
        position: { x: 100 + (index % 4) * 250, y: 100 + Math.floor(index / 4) * 200 },
        data: { Name: (data?.Name as string) || nodeDef.type!, ...(data || {}) },
      } as any;

      addNode(node);
    });

    // Create edges
    pattern.edges?.forEach(edgeDef => {
      const sourceId = nodeIdMap[`${edgeDef.source}-0`] || Object.values(nodeIdMap).find(id => id.includes(edgeDef.source as string));
      const targetId = nodeIdMap[`${edgeDef.target}-0`] || Object.values(nodeIdMap).find(id => id.includes(edgeDef.target as string));
      if (sourceId && targetId) {
        addEdge({ id: `edge-${Date.now()}-${Math.random()}`, source: sourceId, target: targetId, type: "default" } as any);
      }
    });

    setActiveTab("generate");
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      aiService.setApiKey(apiKey.trim());
      setShowKey(false);
      setError(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCostOptimization = async () => {
    if (!aiService.getApiKey()) {
      setError("Please configure your API key in Settings tab");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const recommendations = await aiService.analyzeCostOptimization(nodes, edges);
      setCostRecommendations(recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cost analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityReview = async () => {
    if (!aiService.getApiKey()) {
      setError("Please configure your API key in Settings tab");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const findings = await aiService.analyzeSecurityCompliance(nodes, edges, ["CIS", "NIST", "SOC2"]);
      setSecurityFindings(findings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Security scan failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerraformGeneration = async () => {
    if (!aiService.getApiKey()) {
      setError("Please configure your API key in Settings tab");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.generateTerraformFromDiagram(nodes, edges, { moduleStructure: false, includeProvider: true, includeBackend: true });
      setTerraformResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terraform generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-4xl max-h-[90vh] bg-[#131316] border border-[#374151] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <CardHeader className="flex items-center justify-between p-4 border-b border-[#374151] flex-shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Assistant
          </CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "generate" | "suggest" | "patterns" | "cost" | "security" | "terraform" | "settings")} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-7 bg-[#1a1a22] border-b border-[#374151] p-1">
            <TabsTrigger value="generate" className="text-xs">Generate</TabsTrigger>
            <TabsTrigger value="suggest" className="text-xs">Suggest</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">Patterns</TabsTrigger>
            <TabsTrigger value="cost" className="text-xs">Cost AI</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            <TabsTrigger value="terraform" className="text-xs">Terraform</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="flex-1 flex flex-col overflow-hidden">
            {/* Chat History */}
            <ScrollArea className="flex-1 p-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-purple-600/20 border border-purple-500/30" : "bg-[#1a1a22] border border-[#374151]"}`}>
                    <p className="text-sm text-white">{msg.content}</p>
                    {msg.diagram && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="default" onClick={() => handleApplyDiagram(msg.diagram!)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Apply to Canvas
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(msg.diagram, null, 2))}>
                          <Copy className="w-3 h-3 mr-1" /> Copy JSON
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-sm text-gray-400">Generating diagram...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-[#374151] bg-[#1a1a22] flex-shrink-0">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe your infrastructure... (Shift+Enter for new line, Enter to send)"
                className="bg-[#131316] border-[#374151] text-white placeholder-gray-500 focus:border-purple-500 min-h-[80px] max-h-[150px] resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  Try: &ldquo;Create a 3-tier web app with ALB, EC2 Auto Scaling, and RDS in private subnets&rdquo;
                </span>
                <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim() || !aiService.getApiKey()} className="gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Generate
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            </div>
          </TabsContent>

          <TabsContent value="suggest" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Smart Suggestions</h3>
                <Button onClick={handleSuggest} disabled={isLoading || nodes.length === 0 || !aiService.getApiKey()} size="sm">
                  <Brain className="w-3 h-3 mr-1" /> Analyze Diagram
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">AI analyzes your diagram and recommends missing resources</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click &ldquo;Analyze Diagram&rdquo; to get AI suggestions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white capitalize">{s.type}</span>
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">AI Suggested</span>
                          </div>
                          <p className="text-sm text-gray-400">{s.reason}</p>
                          {s.suggestedConfig && Object.keys(s.suggestedConfig).length > 0 && (
                            <pre className="mt-2 text-xs text-gray-500 bg-[#131316] p-2 rounded overflow-auto max-h-24">
                              {JSON.stringify(s.suggestedConfig, null, 2)}
                            </pre>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleApplySuggestion(s)}>
                          <Zap className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patterns" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <h3 className="font-medium text-white">Architecture Patterns</h3>
              <p className="text-xs text-gray-500 mt-1">Pre-built patterns you can apply instantly</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {patterns.map(pattern => (
                  <div
                    key={pattern.id}
                    className="p-4 bg-[#1a1a22] border border-[#374151] rounded-lg hover:border-purple-500/50 transition cursor-pointer"
                    onClick={() => handleApplyPattern(pattern)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-white">{pattern.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${pattern.category === "serverless" ? "bg-green-500/20 text-green-400" : pattern.category === "microservices" ? "bg-blue-500/20 text-blue-400" : pattern.category === "data" ? "bg-orange-500/20 text-orange-400" : "bg-purple-500/20 text-purple-400"}`}>
                          {pattern.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{pattern.estimatedCost}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{pattern.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {pattern.nodes.length} resources
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {pattern.complexity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <h3 className="font-medium text-white">AI Settings</h3>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <Label className="text-sm text-gray-300 mb-2 block">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-... or anthropic key"
                    className="flex-1 bg-[#1a1a22] border-[#374151] text-white"
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" onClick={handleSaveKey} disabled={!apiKey.trim()}>
                    Save
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Supports OpenAI and Anthropic keys. Kept in memory until this tab reloads.</p>
              </div>

              <Separator className="border-[#374151]" />

              <div>
                <h4 className="font-medium text-white mb-3">Model Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Model</Label>
                    <Select value="gpt-4o-mini" onValueChange={() => {}}>
                      <SelectTrigger className="bg-[#1a1a22] border-[#374151] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#131316] border-[#374151]">
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-effective)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku (Fast)</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Temperature: 0.3</Label>
                    <input type="range" min="0" max="1" step="0.1" value="0.3" className="w-full h-2 bg-[#374151] appearance-none rounded" />
                  </div>
                </div>
              </div>

              <Separator className="border-[#374151]" />

              <div>
                <h4 className="font-medium text-white mb-3">Usage</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>• Natural language → Complete diagram</p>
                  <p>• Smart suggestions for existing diagrams</p>
                  <p>• Pre-built architecture patterns</p>
                  <p>• Works with OpenAI or Anthropic APIs</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cost Optimization Tab */}
          <TabsContent value="cost" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Cost Optimization AI</h3>
                <Button onClick={handleCostOptimization} disabled={isLoading || nodes.length === 0 || !aiService.getApiKey()} size="sm">
                  <Zap className="w-3 h-3 mr-1" /> Analyze Costs
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">AI analyzes your architecture and provides cost-saving recommendations</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              {costRecommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click &ldquo;Analyze Costs&rdquo; to get AI cost optimization recommendations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {costRecommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white capitalize">{rec.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${rec.type === "rightsizing" ? "bg-blue-500/20 text-blue-400" : rec.type === "reserved_instances" ? "bg-green-500/20 text-green-400" : rec.type === "savings_plans" ? "bg-emerald-500/20 text-emerald-400" : rec.type === "storage_tiering" ? "bg-amber-500/20 text-amber-400" : rec.type === "idle_resources" ? "bg-red-500/20 text-red-400" : "bg-purple-500/20 text-purple-400"}`}>
                              {rec.type.replace("_", " ")}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${rec.effort === "low" ? "bg-green-500/20 text-green-400" : rec.effort === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                              {rec.effort} effort
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${rec.riskLevel === "low" ? "bg-green-500/20 text-green-400" : rec.riskLevel === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                              {rec.riskLevel} risk
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{rec.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Current: <span className="text-white">{rec.currentCost}</span></span>
                            <span>Savings: <span className="text-green-400">{rec.estimatedSavings} ({rec.savingsPercentage}%)</span></span>
                          </div>
                          {rec.implementationSteps && rec.implementationSteps.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Implementation:</p>
                              <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                                {rec.implementationSteps.map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Security/Compliance Tab */}
          <TabsContent value="security" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Security & Compliance Review</h3>
                <Button onClick={handleSecurityReview} disabled={isLoading || nodes.length === 0 || !aiService.getApiKey()} size="sm">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Scan Security
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">AI scans for security vulnerabilities and compliance gaps</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              {securityFindings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click &ldquo;Scan Security&rdquo; to get AI security and compliance findings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityFindings.map((finding, i) => (
                    <div key={i} className="p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white capitalize">{finding.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${finding.severity === "critical" ? "bg-red-500/20 text-red-400" : finding.severity === "high" ? "bg-orange-500/20 text-orange-400" : finding.severity === "medium" ? "bg-amber-500/20 text-amber-400" : finding.severity === "low" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}>
                              {finding.severity}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${finding.category === "network" ? "bg-blue-500/20 text-blue-400" : finding.category === "identity" ? "bg-purple-500/20 text-purple-400" : finding.category === "data" ? "bg-green-500/20 text-green-400" : finding.category === "monitoring" ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/20 text-gray-400"}`}>
                              {finding.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{finding.description}</p>
                          {finding.resourceType && (
                            <p className="text-xs text-gray-500 mb-1">Resource: <span className="text-white">{finding.resourceType}</span>{finding.resourceName ? ` (${finding.resourceName})` : ""}</p>
                          )}
                          <p className="text-xs text-gray-400 mb-2">Remediation: <span className="text-white">{finding.remediation}</span></p>
                          {finding.frameworks && finding.frameworks.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {finding.frameworks.map((fw, idx) => (
                                <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{fw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Terraform Generation Tab */}
          <TabsContent value="terraform" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Terraform Generation</h3>
                <Button onClick={handleTerraformGeneration} disabled={isLoading || nodes.length === 0 || !aiService.getApiKey()} size="sm">
                  <FileText className="w-3 h-3 mr-1" /> Generate HCL
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Generate production-ready Terraform HCL from your diagram</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              {terraformResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "mainTF", label: "main.tf" },
                      { key: "variablesTF", label: "variables.tf" },
                      { key: "outputsTF", label: "outputs.tf" },
                      { key: "providersTF", label: "providers.tf" },
                      { key: "versionsTF", label: "versions.tf" },
                    ].map(({ key, label }) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(terraformResult[key as keyof TerraformGenerationResult] as string)}
                        disabled={!(terraformResult[key as keyof TerraformGenerationResult] as string)}
                      >
                        {label}
                      </Button>
                    ))}
                    {terraformResult.modules && Object.keys(terraformResult.modules).length > 0 && (
                      <span className="text-xs text-gray-500 self-center">+ {Object.keys(terraformResult.modules).length} modules</span>
                    )}
                  </div>
                  <div className="bg-[#1a1a22] border border-[#374151] rounded-lg p-3 max-h-[400px] overflow-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {terraformResult.mainTF}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500">{terraformResult.explanation}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click &ldquo;Generate HCL&rdquo; to create Terraform code from your diagram</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#374151]">
              <h3 className="font-medium text-white">AI Settings</h3>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <Label className="text-sm text-gray-300 mb-2 block">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-... or anthropic key"
                    className="flex-1 bg-[#1a1a22] border-[#374151] text-white"
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" onClick={handleSaveKey} disabled={!apiKey.trim()}>
                    Save
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Supports OpenAI and Anthropic keys. Kept in memory until this tab reloads.</p>
              </div>

              <Separator className="border-[#374151]" />

              <div>
                <h4 className="font-medium text-white mb-3">Model Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Model</Label>
                    <Select value="gpt-4o-mini" onValueChange={() => {}}>
                      <SelectTrigger className="bg-[#1a1a22] border-[#374151] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#131316] border-[#374151]">
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-effective)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku (Fast)</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Temperature: 0.3</Label>
                    <input type="range" min="0" max="1" step="0.1" value="0.3" className="w-full h-2 bg-[#374151] appearance-none rounded" />
                  </div>
                </div>
              </div>

              <Separator className="border-[#374151]" />

              <div>
                <h4 className="font-medium text-white mb-3">Usage</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>• Natural language → Complete diagram</p>
                  <p>• Smart suggestions for existing diagrams</p>
                  <p>• Pre-built architecture patterns</p>
                  <p>• Cost optimization recommendations</p>
                  <p>• Security & compliance scanning</p>
                  <p>• Terraform HCL generation</p>
                  <p>• Works with OpenAI or Anthropic APIs</p>
                </div>
              </div>
            </div>
          </TabsContent>
      </Tabs>
    </Card>
    </div>
  );
}
