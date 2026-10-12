"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calculator,
  AlertTriangle,
  RefreshCw,
  Settings,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { formatCostDetailed } from "@/lib/infracost/client";

export default function CostPanel() {
  const {
    fetchEstimate,
    isLoading,
    error,
    estimate,
    autoRefresh,
    setAutoRefresh,
  } = useCostEstimation();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem("infracost_config");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setApiKey(config.apiKey || "");
        setEnabled(config.enabled || false);
      } catch (e) {
        console.error("Failed to load Infracost config:", e);
      }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem(
      "infracost_config",
      JSON.stringify({ apiKey, enabled })
    );
    // The useCostEstimation hook uses a module-level config, so we need to
    // manually update it. In a real app, you'd use a proper store.
    setTestResult({ success: true, message: "Configuration saved!" });
    setShowSettings(false);
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: "Please enter an API key" });
      return;
    }

    setTestResult({ success: false, message: "Testing..." });

    try {
      const { createInfracostClient } = await import("@/lib/infracost/client");
      const client = createInfracostClient(apiKey);
      // Test with a minimal terraform
      await client.getCostEstimate(`
        resource "aws_instance" "test" {
          ami           = "ami-123"
          instance_type = "t3.micro"
        }
      `);
      setTestResult({ success: true, message: "API key is valid!" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid API key";
      setTestResult({ success: false, message });
    }
  };

  const handleRefresh = () => {
    fetchEstimate();
  };

  const totalMonthly = estimate?.totalMonthlyCost || 0;
  const totalHourly = estimate?.totalHourlyCost || 0;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 p-0 rounded-xl bg-[#232329] border border-white/10 hover:border-green-500/50 transition-colors shadow-lg"
        title="Cost Estimation"
      >
        <Calculator className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
          {totalMonthly > 0 ? "$" : ""}
        </span>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card
        className="w-96 max-h-[70vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl"
      >
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#374151]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-green-400" />
            </div>
            <CardTitle className="text-white font-semibold">Cost Estimation</CardTitle>
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
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Infracost API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ico-xxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500">
                Get your free API key at{" "}
                <a
                  href="https://www.infracost.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  infracost.io <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="infracost-enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1a1a22] text-green-500 focus:ring-green-500"
              />
              <Label htmlFor="infracost-enabled" className="text-gray-300 cursor-pointer">
                Enable automatic cost estimation
              </Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={testApiKey} disabled={!apiKey.trim()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Test API Key
              </Button>
              <Button onClick={saveConfig}>
                <CheckCircle className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                  testResult.success
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <Button variant="ghost" onClick={() => setShowSettings(false)} className="w-full">
              <ChevronUp className="w-4 h-4 mr-2" /> Back to Cost View
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            {(!enabled || !apiKey) && (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                  <Calculator className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-white font-medium mb-2">Cost Estimation Not Configured</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Add your Infracost API key to see real-time cost estimates for your infrastructure.
                </p>
                <Button onClick={() => setShowSettings(true)} className="w-full">
                  <Settings className="w-4 h-4 mr-2" /> Configure Infracost
                </Button>
              </div>
            )}

            {enabled && apiKey && (
              <div className="p-4 space-y-4">
                {/* Total Cost Summary */}
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Estimated Monthly Cost</span>
                    <span className="text-green-400 font-mono text-lg">{formatCostDetailed(totalMonthly)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Estimated Hourly Cost</span>
                    <span className="text-blue-400 font-mono text-sm">{formatCostDetailed(totalHourly)}/hr</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2 px-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex-1 ${autoRefresh ? "bg-green-500/20 border-green-500/50 text-green-300" : ""}`}
                  >
                    {autoRefresh ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Auto: ON
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Auto: OFF
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Resource Breakdown */}
                {estimate && estimate.resources.length > 0 && (
                  <div className="px-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">Resource Breakdown</h4>
                      <span className="text-gray-500 text-xs">
                        {estimate.resources.length} resources
                      </span>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {estimate.resources
                          .sort((a, b) => b.monthlyCost - a.monthlyCost)
                          .map((resource) => (
                            <div
                              key={resource.id}
                              className="bg-[#1a1a22] border border-[#374151] rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">
                                    {resource.type}
                                  </span>
                                  <span className="text-white text-sm font-medium truncate max-w-[200px]">
                                    {resource.name}
                                  </span>
                                </div>
                                <span className="text-green-400 font-mono text-sm">
                                  {formatCostDetailed(resource.monthlyCost)}/mo
                                </span>
                              </div>
                              {resource.costComponents.length > 0 && (
                                <div className="text-xs text-gray-500 ml-8 space-y-0.5">
                                  {resource.costComponents
                                    .filter((c) => c.monthlyCost > 0)
                                    .slice(0, 3)
                                    .map((comp) => (
                                      <div key={comp.name} className="flex justify-between">
                                        <span>{comp.name}</span>
                                        <span className="font-mono">
                                          {formatCostDetailed(comp.monthlyCost)}
                                        </span>
                                      </div>
                                    ))}
                                  {resource.costComponents.filter((c) => c.monthlyCost > 0).length > 3 && (
                                    <div className="text-gray-600">
                                      +{resource.costComponents.filter((c) => c.monthlyCost > 0).length - 3} more...
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {enabled && apiKey && !isLoading && !error && (!estimate || estimate.resources.length === 0) && (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No costable resources found in current diagram</p>
                    <p className="text-xs mt-1">Add AWS resources (EC2, RDS, S3, etc.) to see estimates</p>
                  </div>
                )}

                {/* Last updated */}
                {estimate && (
                  <div className="px-4 pb-4 text-xs text-gray-500 text-center border-t border-[#374151]">
                    Last updated: {estimate.lastUpdated.toLocaleTimeString()}
                    {autoRefresh && <span className="ml-2 text-green-400">• Auto-refresh enabled</span>}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}