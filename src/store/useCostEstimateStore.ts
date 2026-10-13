"use client";

import { create } from "zustand";
import { CostEstimate, ResourceCostEstimate } from "@/lib/infracost/types";

interface CostEstimateState {
  estimate: CostEstimate | null;
  isLoading: boolean;
  error: string | null;
  autoRefresh: boolean;
  refreshInterval: number; // in milliseconds

  setEstimate: (estimate: CostEstimate | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  clearEstimate: () => void;

  // Computed getters
  getResourceCost: (resourceId: string) => ResourceCostEstimate | undefined;
  getTotalMonthlyCost: () => number;
  getTotalHourlyCost: () => number;
}

export const useCostEstimateStore = create<CostEstimateState>((set, get) => ({
  estimate: null,
  isLoading: false,
  error: null,
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds default

  setEstimate: (estimate) => set({ estimate, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
  setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
  clearEstimate: () => set({ estimate: null, error: null }),

  getResourceCost: (resourceId) => {
    return get().estimate?.resources.find((r) => r.id === resourceId);
  },

  getTotalMonthlyCost: () => {
    return get().estimate?.totalMonthlyCost || 0;
  },

  getTotalHourlyCost: () => {
    return get().estimate?.totalHourlyCost || 0;
  },
}));