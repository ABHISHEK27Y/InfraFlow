import { beforeEach, describe, expect, it, vi } from "vitest";

function browserStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(),
  };
}

describe("project persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", browserStorage());
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ projects: [] }),
    })));
  });

  it("keeps a local project when switching projects and loading it again", async () => {
    const { useProjectStore } = await import("./useProjectStore");
    const { useTerraformStore } = await import("./useTerraformStore");
    await useProjectStore.getState().init();
    const firstId = useProjectStore.getState().currentProjectId!;
    useTerraformStore.getState().setBlocks({ example: "resource example {}" });
    const secondId = useProjectStore.getState().createNewProject("Second");
    expect(secondId).not.toBe(firstId);
    await useProjectStore.getState().loadProject(firstId);
    expect(useTerraformStore.getState().terraformBlocks.example).toBe("resource example {}");
    expect(useProjectStore.getState().currentProjectId).toBe(firstId);
    expect(fetch).not.toHaveBeenCalled();
  }, 20000);

  it("prefers a newer local copy over an older cloud copy", async () => {
    localStorage.setItem("infraflow_sync_mode", "hybrid");
    localStorage.setItem("infraflow_projects", JSON.stringify([
      { id: "local-id", cloudId: "507f1f77bcf86cd799439011", name: "Local", updatedAt: 200 },
    ]));
    localStorage.setItem("infraflow_project_local-id", JSON.stringify({
      id: "local-id", name: "Local", nodes: [], edges: [], resources: [],
      terraformBlocks: { example: "local version" }, updatedAt: 200,
    }));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ projects: [{
        _id: "507f1f77bcf86cd799439011", name: "Cloud",
        updatedAt: new Date(100).toISOString(),
      }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { useProjectStore } = await import("./useProjectStore");
    const { useTerraformStore } = await import("./useTerraformStore");
    await useProjectStore.getState().init();
    expect(useProjectStore.getState().currentProjectId).toBe("local-id");
    expect(useTerraformStore.getState().terraformBlocks.example).toBe("local version");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 20000);

  it("creates a cloud record before updating it and preserves the local ID", async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => options?.method === "POST"
        ? { project: { id: "507f1f77bcf86cd799439011", updatedAt: new Date().toISOString() } }
        : options?.method === "PUT"
          ? { project: { id: "507f1f77bcf86cd799439011", updatedAt: new Date().toISOString() } }
          : { projects: [] },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { useProjectStore } = await import("./useProjectStore");
    await useProjectStore.getState().init();
    const localId = useProjectStore.getState().currentProjectId!;
    await useProjectStore.getState().saveCurrentProject("both");
    await useProjectStore.getState().saveCurrentProject("both");
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method !== "GET")
      .map(([url, options]) => [url, options?.method])).toEqual([
      ["/api/projects", "POST"],
      ["/api/projects/507f1f77bcf86cd799439011", "PUT"],
    ]);
    expect(useProjectStore.getState().currentProjectId).toBe(localId);
    expect(useProjectStore.getState().projectsList[0].cloudId).toBe("507f1f77bcf86cd799439011");
  }, 20000);
});
