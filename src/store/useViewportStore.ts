import { create } from "zustand";
import { Viewport } from "@xyflow/react";

interface ViewportState {
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),
}));