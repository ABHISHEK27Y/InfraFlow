import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { model, messages, temperature, max_tokens, response_format } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const suppliedKey = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const isAnthropic = suppliedKey
      ? suppliedKey.startsWith("sk-ant-")
      : !process.env.OPENAI_API_KEY && !!process.env.ANTHROPIC_API_KEY;
    const apiKey = suppliedKey || (isAnthropic ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured on server" }, { status: 500 });
    }

    const targetModel = model || (isAnthropic ? "claude-haiku-4-5-20251001" : "gpt-4o-mini");

    const url = isAnthropic
      ? "https://api.anthropic.com/v1/messages"
      : "https://api.openai.com/v1/chat/completions";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let body: Record<string, unknown>;

    if (isAnthropic) {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";

      const systemMessage = messages.find(m => m.role === "system");
      const userMessages = messages.filter(m => m.role !== "system");

      body = {
        model: targetModel,
        max_tokens: max_tokens || 4000,
        temperature: temperature ?? 0.3,
        system: systemMessage?.content || "",
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      };
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;

      body = {
        model: targetModel,
        messages,
        temperature: temperature ?? 0.3,
        max_tokens: max_tokens || 4000,
        response_format: response_format || { type: "text" },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      return NextResponse.json({ error: `AI provider error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();

    if (isAnthropic) {
      return NextResponse.json({
        choices: [{ message: { content: data.content[0]?.text || "" } }],
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
