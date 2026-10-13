"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTerraformStore } from "@/store/useTerraformStore";
import { useCostEstimateStore } from "@/store/useCostEstimateStore";
import { createInfracostClient } from "@/lib/infracost/client";

interface InfracostConfig {
  apiKey: string;
  enabled: boolean;
}

let config: InfracostConfig = {
  apiKey: "",
  enabled: false,
};

export function configureInfracost(apiKey: string, enabled: boolean = true) {
  config = { apiKey, enabled };
}

export function useCostEstimation() {
  const { getAllAsString: getTerraform } = useTerraformStore();
  const { setEstimate, setLoading, setError, autoRefresh, refreshInterval } = useCostEstimateStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEstimate = useCallback(async () => {
    if (!config.enabled || !config.apiKey) {
      setError("Infracost not configured. Please add API key in settings.");
      return;
    }

    const terraformCode = getTerraform();
    if (!terraformCode.trim()) {
      setEstimate(null);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const client = createInfracostClient(config.apiKey);
      const estimate = await client.getCostEstimate(terraformCode);
      setEstimate(estimate);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      const message = error instanceof Error ? error.message : "Failed to fetch cost estimate";
      setError(message);
      console.error("Infracost error:", error);
    } finally {
      setLoading(false);
    }
  }, [getTerraform, setEstimate, setLoading, setError]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && config.enabled && config.apiKey) {
      intervalRef.current = setInterval(fetchEstimate, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchEstimate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    fetchEstimate,
    isLoading: useCostEstimateStore((s) => s.isLoading),
    error: useCostEstimateStore((s) => s.error),
    estimate: useCostEstimateStore((s) => s.estimate),
    autoRefresh: useCostEstimateStore((s) => s.autoRefresh),
    setAutoRefresh: useCostEstimateStore((s) => s.setAutoRefresh),
    setRefreshInterval: useCostEstimateStore((s) => s.setRefreshInterval),
  };
}

// Export config for use in settings
export function getInfracostConfig(): InfracostConfig {
  return config;
}

export function isInfracostConfigured(): boolean {
  return config.enabled && config.apiKey.length > 0;
}

export function useInfracostConfig() {
  return config;
}