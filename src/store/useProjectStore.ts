import { create } from "zustand";
import type { Edge } from "@xyflow/react";
import { useDiagramStore } from "./useDiagramStore";
import { useTerraformResourceStore } from "./useTerraformResourceStore";
import { useTerraformStore } from "./useTerraformStore";
import type { AnyNode } from "@/utils/types/resource";
import type { ResourceType, ResourceDataMap } from "./useTerraformResourceStore";

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: number;
  cloudId?: string;
  cloudUpdatedAt?: number;
}

type StoredResource = {
  id: string;
  type: ResourceType;
  data: ResourceDataMap[ResourceType];
};

export interface ProjectPayload {
  id: string;
  name: string;
  nodes: AnyNode[];
  edges: Edge[];
  resources: StoredResource[];
  terraformBlocks: Record<string, string>;
  updatedAt: number;
}

interface ProjectStore {
  currentProjectId: string | null;
  currentProjectName: string;
  projectsList: ProjectMetadata[];
  isInitialized: boolean;
  isSyncing: boolean;
  syncError: string | null;
  syncMode: "local" | "cloud" | "hybrid";

  init: () => Promise<void>;
  createNewProject: (name?: string) => string;
  loadProject: (id: string, source?: "local" | "cloud") => Promise<void>;
  saveCurrentProject: (target?: "local" | "cloud" | "both") => Promise<void>;
  renameCurrentProject: (newName: string) => void;
  deleteProject: (id: string, target?: "local" | "cloud" | "both") => Promise<void>;
  fetchCloudProjects: () => Promise<void>;
  setSyncMode: (mode: "local" | "cloud" | "hybrid") => void;
}

const METADATA_KEY = "infraflow_projects";
const SYNC_MODE_KEY = "infraflow_sync_mode";
let saveTimeout: NodeJS.Timeout | null = null;
let initializing = false;
let suppressAutoSave = false;
let subscribed = false;

const API_BASE = "/api/projects";

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const useProjectStore = create<ProjectStore>((set, get) => {
  // Debounced save helper to prevent spamming localStorage on every pixel move/drag
  const triggerDebouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (!suppressAutoSave) {
        get().saveCurrentProject(get().syncMode === "local" ? "local" : "both");
      }
    }, 800);
  };

  return {
    currentProjectId: null,
    currentProjectName: "Untitled Project",
    projectsList: [],
    isInitialized: false,
    isSyncing: false,
    syncError: null,
    syncMode: "local",

    init: async () => {
      if (typeof window === "undefined" || get().isInitialized || initializing) return;
      initializing = true;
      try {
        const storedMode = localStorage.getItem(SYNC_MODE_KEY);
        const syncMode = storedMode === "hybrid" || storedMode === "cloud" ? storedMode : "local";
        set({ syncMode });
        const stored = localStorage.getItem(METADATA_KEY);
        const localList: ProjectMetadata[] = stored ? JSON.parse(stored) : [];
        set({ projectsList: localList });
        if (syncMode !== "local") await get().fetchCloudProjects();

        const projects = get().projectsList;
        if (projects.length > 0) {
          const latest = projects.reduce((prev, current) =>
            prev.updatedAt > current.updatedAt ? prev : current
          );
          await get().loadProject(latest.id);
        }
        if (!get().currentProjectId) {
          get().createNewProject("My First Project");
        }
        set({ isInitialized: true });
        if (!subscribed) {
          useDiagramStore.subscribe(triggerDebouncedSave);
          useTerraformResourceStore.subscribe(triggerDebouncedSave);
          useTerraformStore.subscribe(triggerDebouncedSave);
          subscribed = true;
        }
      } catch (error) {
        console.error("Failed to initialize projects:", error);
        if (!get().currentProjectId) get().createNewProject("My First Project");
        set({ isInitialized: true });
      } finally {
        initializing = false;
      }
    },

    createNewProject: (name) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      if (get().currentProjectId) void get().saveCurrentProject("local");
      const id = crypto.randomUUID();
      const projectName = name || "Untitled Project";

      suppressAutoSave = true;
      // Clear current workspace states
      useDiagramStore.getState().clearAll();
      useDiagramStore.getState().setProjectMeta(id, projectName);
      useTerraformResourceStore.getState().resetAll();
      useTerraformStore.getState().clearAll();

      const timestamp = Date.now();
      const newProjectPayload: ProjectPayload = {
        id,
        name: projectName,
        nodes: [],
        edges: [],
        resources: [],
        terraformBlocks: {},
        updatedAt: timestamp,
      };

      try {
        localStorage.setItem(`infraflow_project_${id}`, JSON.stringify(newProjectPayload));

        const updatedList = [
          ...get().projectsList,
          { id, name: projectName, updatedAt: timestamp },
        ];
        localStorage.setItem(METADATA_KEY, JSON.stringify(updatedList));

        set({
          currentProjectId: id,
          currentProjectName: projectName,
          projectsList: updatedList,
        });
      } catch (e) {
        console.error("Failed to create new project:", e);
      } finally {
        suppressAutoSave = false;
      }

      return id;
    },

    loadProject: async (id, source = "local") => {
      if (typeof window === "undefined") return;
      if (saveTimeout) clearTimeout(saveTimeout);
      if (get().currentProjectId && get().currentProjectId !== id) {
        await get().saveCurrentProject("local");
      }

      try {
        let payload: ProjectPayload;
        const metadata = get().projectsList.find((project) => project.id === id);
        const localPayload = localStorage.getItem(`infraflow_project_${id}`);
        const shouldUseCloud = source === "cloud" ||
          (!localPayload && !!metadata?.cloudId) ||
          (!!metadata?.cloudId && !!metadata.cloudUpdatedAt &&
            metadata.cloudUpdatedAt > (localPayload ? JSON.parse(localPayload).updatedAt : 0));

        if (shouldUseCloud && metadata?.cloudId) {
          try {
            const { project } = await apiRequest(`/${metadata.cloudId}`, { method: "GET" });
            payload = {
              id,
              name: project.name,
              nodes: project.graph?.nodes || [],
              edges: project.graph?.edges || [],
              resources: project.resources || [],
              terraformBlocks: project.terraformBlocks || {},
              updatedAt: new Date(project.updatedAt).getTime(),
            };
          } catch (error) {
            if (!localPayload) throw error;
            console.warn("Cloud project unavailable; loading local copy:", error);
            set({ syncError: "Cloud project unavailable; loaded the local copy." });
            payload = JSON.parse(localPayload);
          }
        } else {
          if (!localPayload) {
            console.warn(`Project payload not found for ID: ${id}`);
            return;
          }
          payload = JSON.parse(localPayload);
        }

        suppressAutoSave = true;
        // Bind project metadata to diagram store before loading states
        useDiagramStore.getState().setProjectMeta(id, payload.name || "Untitled Project");

        // Load content into diagram, resources, and terraform blocks stores
        useDiagramStore.getState().setNodesAndEdges(payload.nodes || [], payload.edges || []);
        useTerraformResourceStore.getState().setResources(payload.resources || []);
        useTerraformStore.getState().setBlocks(payload.terraformBlocks || {});

        set({
          currentProjectId: id,
          currentProjectName: payload.name || "Untitled Project",
        });
        if (shouldUseCloud) {
          localStorage.setItem(`infraflow_project_${id}`, JSON.stringify(payload));
        }
      } catch (e) {
        console.error("Failed to load project:", e);
        set({ syncError: e instanceof Error ? e.message : "Failed to load project" });
      } finally {
        suppressAutoSave = false;
      }
    },

    saveCurrentProject: async (target) => {
      target ??= get().syncMode === "local" ? "local" : "both";
      const { currentProjectId, currentProjectName, projectsList } = get();
      if (!currentProjectId || typeof window === "undefined") return;

      const nodes = useDiagramStore.getState().nodes;
      const edges = useDiagramStore.getState().edges;
      const resources = useTerraformResourceStore.getState().resources;
      const terraformBlocks = useTerraformStore.getState().terraformBlocks;

      const timestamp = Date.now();
      const payload: ProjectPayload = {
        id: currentProjectId,
        name: currentProjectName,
        nodes,
        edges,
        resources,
        terraformBlocks,
        updatedAt: timestamp,
      };

      const updatedList = projectsList.map((p) =>
        p.id === currentProjectId
          ? { ...p, name: currentProjectName, updatedAt: timestamp }
          : p
      );

      // Save to localStorage
      if (target === "local" || target === "both") {
        try {
          localStorage.setItem(`infraflow_project_${currentProjectId}`, JSON.stringify(payload));
          localStorage.setItem(METADATA_KEY, JSON.stringify(updatedList));
          set({ projectsList: updatedList });
        } catch (e) {
          console.error("Failed to save project to localStorage:", e);
        }
      }

      // Save to cloud
      if (target === "cloud" || target === "both") {
        set({ isSyncing: true, syncError: null });
        try {
          const metadata = get().projectsList.find((p) => p.id === currentProjectId);
          const cloudId = metadata?.cloudId;
          const { project } = await apiRequest(cloudId ? `/${cloudId}` : "", {
            method: cloudId ? "PUT" : "POST",
            body: JSON.stringify({
              name: currentProjectName,
              graph: { nodes, edges },
              resources,
              terraformBlocks,
            }),
          });

          // Update local list with cloud timestamp
          const cloudUpdatedList = get().projectsList.map((p) =>
            p.id === currentProjectId
              ? { ...p, cloudId: cloudId || project.id, cloudUpdatedAt: new Date(project.updatedAt).getTime() }
              : p
          );
          localStorage.setItem(METADATA_KEY, JSON.stringify(cloudUpdatedList));
          set({ projectsList: cloudUpdatedList });
        } catch (e) {
          console.error("Failed to save project to cloud:", e);
          set({ syncError: e instanceof Error ? e.message : "Failed to save project to cloud" });
        } finally {
          set({ isSyncing: false });
        }
      }
    },

    renameCurrentProject: (newName) => {
      const { currentProjectId } = get();
      if (!currentProjectId) return;

      set({ currentProjectName: newName });
      get().saveCurrentProject();
    },

    deleteProject: async (id, target = "both") => {
      if (typeof window === "undefined") return;
      if (saveTimeout) clearTimeout(saveTimeout);

      const { currentProjectId, projectsList } = get();
      const cloudId = projectsList.find((p) => p.id === id)?.cloudId;

      // Delete from localStorage
      if (target === "local" || target === "both") {
        try {
          localStorage.removeItem(`infraflow_project_${id}`);
          const updatedList = projectsList.filter((p) => p.id !== id);
          localStorage.setItem(METADATA_KEY, JSON.stringify(updatedList));
          set({ projectsList: updatedList });
        } catch (e) {
          console.error("Failed to delete project from localStorage:", e);
        }
      }

      // Delete from cloud
      if ((target === "cloud" || target === "both") && cloudId) {
        try {
          await apiRequest(`/${cloudId}`, { method: "DELETE" });
        } catch (e) {
          console.error("Failed to delete project from cloud:", e);
        }
      }

      if (currentProjectId === id) {
        set({ currentProjectId: null });
        const updatedList = get().projectsList;
        if (updatedList.length > 0) {
          await get().loadProject(updatedList[0].id);
        } else {
          get().createNewProject("Untitled Project");
        }
      }
    },

    fetchCloudProjects: async () => {
      try {
        const { projects } = await apiRequest("", { method: "GET" });
        const merged = [...get().projectsList];
        for (const cloud of projects) {
          const cloudId = String(cloud.id || cloud._id);
          const cloudUpdatedAt = new Date(cloud.updatedAt).getTime();
          const index = merged.findIndex((local) => local.id === cloudId || local.cloudId === cloudId);
          if (index < 0) {
            merged.push({ id: cloudId, cloudId, name: cloud.name, updatedAt: cloudUpdatedAt, cloudUpdatedAt });
          } else {
            const local = merged[index];
            merged[index] = {
              ...local,
              cloudId,
              cloudUpdatedAt,
              name: cloudUpdatedAt > local.updatedAt ? cloud.name : local.name,
              updatedAt: Math.max(local.updatedAt, cloudUpdatedAt),
            };
          }
        }
        set({ projectsList: merged, syncError: null });
        localStorage.setItem(METADATA_KEY, JSON.stringify(merged));
      } catch (e) {
        console.error("Failed to fetch cloud projects:", e);
        set({ syncError: e instanceof Error ? e.message : "Failed to fetch cloud projects" });
      }
    },

    setSyncMode: (mode) => {
      set({ syncMode: mode });
      localStorage.setItem(SYNC_MODE_KEY, mode);
      if (mode !== "local") void get().fetchCloudProjects();
    },
  };
});
