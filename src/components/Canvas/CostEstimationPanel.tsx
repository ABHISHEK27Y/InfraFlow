"use client";

import { useState, useMemo } from "react";
import {
  X,
  DollarSign,
  RefreshCw,
  Settings,
  ChevronDown,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { useCostEstimation, useInfracostConfig, configureInfracost } from "@/hooks/useCostEstimation";
import { formatCostDetailed } from "@/lib/infracost/client";

interface CostEstimationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CostEstimationPanel({ isOpen, onClose }: CostEstimationPanelProps) {
  const {
    estimate,
    isLoading,
    error,
    autoRefresh,
    setAutoRefresh,
    setRefreshInterval,
    fetchEstimate,
  } = useCostEstimation();

  const config = useInfracostConfig();

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [refreshInterval, setRefreshIntervalState] = useState(30000);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const totalMonthly = useMemo(() => estimate?.totalMonthlyCost || 0, [estimate]);
  const totalHourly = useMemo(() => estimate?.totalHourlyCost || 0, [estimate]);
  const resources = useMemo(() => estimate?.resources || [], [estimate]);
  const lastUpdated = useMemo(() => estimate?.lastUpdated, [estimate]);

  const toggleResource = (resourceId: string) => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const handleSaveSettings = () => {
    if (apiKey.trim()) {
      configureInfracost(apiKey.trim(), true);
      setShowSettings(false);
      fetchEstimate();
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) return;
    // Could add a test API call here
    alert("Connection test would verify API key validity");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cost Estimation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Powered by Infracost
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Infracost Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="infracost-xxx..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleTestConnection}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Test
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://dashboard.infracost.io" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Infracost Dashboard</a>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Auto Refresh Interval
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setRefreshIntervalState(val);
                    setRefreshInterval(val);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save & Refresh
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                {!config.enabled && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Configure Infracost API key in settings to enable cost estimation.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!error && !estimate && !isLoading && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Cost Estimate Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add resources to your diagram and configure Infracost to see cost estimates.
              </p>
              {!config.enabled && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Configure Infracost
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Fetching cost estimate...</p>
            </div>
          )}

          {/* Cost Summary */}
          {estimate && !isLoading && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Monthly Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCostDetailed(totalMonthly)}
                </p>
              </div>
              <div className="border-l border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Hourly Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCostDetailed(totalHourly)}
                </p>
              </div>
              <div className="border-l border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Resources
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {resources.length}
                </p>
              </div>
            </div>
          )}

          {/* Resource Breakdown */}
          {estimate && resources.length > 0 && !isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Resource Breakdown
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-3 h-3 text-primary-600 border-gray-300 rounded"
                    />
                    Auto-refresh
                  </label>
                  <button
                    onClick={fetchEstimate}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    aria-label="Refresh"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resources.map((resource) => {
                  const isExpanded = expandedResources.has(resource.id);
                  return (
                    <div
                      key={resource.id}
                      className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleResource(resource.id)}
                        className="w-full p-3 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded">
                            <DollarSign className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                              {resource.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {resource.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {formatCostDetailed(resource.monthlyCost)}/mo
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="space-y-2 mt-2">
                            {resource.costComponents.map((comp, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 px-2 bg-white dark:bg-gray-700/50 rounded"
                              >
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <span>{comp.name}</span>
                                  {comp.details && (
                                    <span className="cursor-help" title={comp.details}>
                                      <Info className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                  <span className="text-gray-500 dark:text-gray-500">
                                    {comp.monthlyQuantity} {comp.unit}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-500">
                                    @ {formatCostDetailed(comp.price)}/{comp.unit}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {formatCostDetailed(comp.monthlyCost)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Info */}
          {estimate && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Last updated: {lastUpdated?.toLocaleTimeString() || "Unknown"}
              </span>
              <a
                href="https://www.infracost.io/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Infracost Docs
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}