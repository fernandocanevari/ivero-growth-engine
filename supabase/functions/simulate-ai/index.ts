import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModelConfig {
  name: string;
  url: string;
  model: string;
  getHeaders: () => Record<string, string>;
  parseResponse: (data: any) => string;
}

function getModelConfigs(): ModelConfig[] {
  const openaiKey = Deno.env.get("Key_Open_IA");
  const geminiKey = Deno.env.get("Key_gemini");
  const claudeKey = Deno.env.get("Key_antropic_claude");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const configs: ModelConfig[] = [];

  if (openaiKey) {
    configs.push({
      name: "ChatGPT",
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      getHeaders: () => ({
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });
  }

  if (geminiKey) {
    configs.push({
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      model: "gemini-2.0-flash",
      getHeaders: () => ({ "Content-Type": "application/json" }),
      parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    });
  }

  if (claudeKey) {
    configs.push({
      name: "Claude",
      url: "https://api.anthropic.com/v1/messages",
      model: "claude-3-5-haiku-latest",
      getHeaders: () => ({
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.content?.[0]?.text || "",
    });
  }

  // Perplexity via Lovable AI Gateway (sonar model)
  // Perplexity via Lovable AI Gateway — uses a supported model to simulate Perplexity-style responses
  if (lovableKey) {
    configs.push({
      name: "Perplexity",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
      getHeaders: () => ({
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });
  }

  return configs;
}

async function callModel(
  config: ModelConfig,
  userPrompt: string,
  systemPrompt: string,
  brandName: string,
  mode: string
): Promise<{ model: string; response?: string; mentionsBrand?: boolean; mentioned?: boolean; error?: string }> {
  try {
    let body: any;

    if (config.name === "Gemini") {
      // Gemini uses a different API format
      body = {
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser query: ${userPrompt}` }] },
        ],
        generationConfig: { maxOutputTokens: 300 },
      };
    } else if (config.name === "Claude") {
      body = {
        model: config.model,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      };
    } else {
      // OpenAI-compatible (ChatGPT, Perplexity via gateway)
      body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      };
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers: config.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`${config.name} error [${response.status}]:`, errText);
      return {
        model: config.name,
        ...(mode === "simulator"
          ? { response: `[Erro ao consultar ${config.name}]`, mentionsBrand: false }
          : { mentioned: false }),
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const content = config.parseResponse(data);
    const mentionsBrand = content.toLowerCase().includes(brandName.toLowerCase());

    if (mode === "simulator") {
      return { model: config.name, response: content, mentionsBrand };
    } else {
      return { model: config.name, mentioned: mentionsBrand };
    }
  } catch (e) {
    console.error(`${config.name} call failed:`, e);
    return {
      model: config.name,
      ...(mode === "simulator"
        ? { response: `[Erro ao consultar ${config.name}]`, mentionsBrand: false }
        : { mentioned: false }),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, brandName, mode } = await req.json();

    if (!prompt || !brandName) {
      return new Response(JSON.stringify({ error: "prompt and brandName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const configs = getModelConfigs();
    if (configs.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = mode === "tester"
      ? `You are an AI assistant. Answer the user's question naturally in Portuguese (Brazil). If the brand "${brandName}" is relevant to the answer, mention it naturally. If not, don't force it. Keep it to 1-3 sentences.`
      : `You are an AI assistant. Answer the user's question naturally in Portuguese (Brazil). If the brand "${brandName}" is relevant to the answer, mention it naturally. If not, don't force it. Keep it to 1-3 sentences.`;

    // Call all models in parallel
    const results = await Promise.all(
      configs.map((config) => callModel(config, prompt, systemPrompt, brandName, mode))
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
