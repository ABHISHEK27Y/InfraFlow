import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("AI chat provider selection", () => {
  it("sends a supplied OpenAI key to OpenAI", async () => {
    const upstream = vi.fn(async (_url: string, _options?: RequestInit) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    }));
    vi.stubGlobal("fetch", upstream);
    const request = new NextRequest("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-openai" },
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("sends a supplied Anthropic key with an Anthropic model", async () => {
    const upstream = vi.fn(async (_url: string, _options?: RequestInit) => ({
      ok: true,
      json: async () => ({ content: [{ text: "{}" }] }),
    }));
    vi.stubGlobal("fetch", upstream);
    const request = new NextRequest("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { Authorization: "Bearer sk-ant-test" },
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
    expect(JSON.parse((upstream.mock.calls[0][1] as RequestInit).body as string).model)
      .toBe("claude-haiku-4-5-20251001");
  });
});
