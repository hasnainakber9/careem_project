type ApiRequest = {
  method?: string;
  body?: {
    metrics?: unknown;
    brief?: {
      takeaways?: string[];
      action?: string;
      risk?: string;
    };
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
};

type OpenRouterPayload = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const fallbackBrief = {
  takeaways: [],
  action: "Use the deterministic brief from the browser.",
  risk: "OPENROUTER_API_KEY is not configured.",
  mode: "rules",
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const submittedBrief = request.body?.brief ?? fallbackBrief;
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    response.status(200).json({
      source: "rules",
      brief: { ...submittedBrief, mode: "rules" },
      note: "OPENROUTER_API_KEY is not configured.",
    });
    return;
  }

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mobility-decision-brief.vercel.app",
        "X-Title": "Mobility Decision Brief",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content:
              "Rewrite mobility analytics into concise executive language. Return strict JSON with takeaways:string[], action:string, risk:string. Keep facts consistent with the input.",
          },
          {
            role: "user",
            content: JSON.stringify({
              metrics: request.body?.metrics,
              deterministicBrief: submittedBrief,
            }),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenRouter returned ${aiResponse.status}`);
    }

    const payload = (await aiResponse.json()) as OpenRouterPayload;
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;

    if (!parsed?.takeaways || !parsed?.action || !parsed?.risk) {
      throw new Error("AI response did not include the expected brief shape.");
    }

    response.status(200).json({
      source: "openrouter/free",
      brief: {
        takeaways: parsed.takeaways.slice(0, 3),
        action: parsed.action,
        risk: parsed.risk,
        mode: "ai",
      },
    });
  } catch (error) {
    response.status(200).json({
      source: "rules",
      brief: { ...submittedBrief, mode: "rules" },
      note: error instanceof Error ? error.message : "AI rewrite failed.",
    });
  }
}
