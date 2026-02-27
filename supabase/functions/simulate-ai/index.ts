import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = mode === "tester"
      ? `You are an AI brand visibility analyzer. Given a user prompt and a brand name, simulate how 4 different AI assistants (ChatGPT, Gemini, Claude, Perplexity) would respond. For each model, determine if the brand "${brandName}" would likely appear in the response. Return ONLY a JSON object with this exact structure, no markdown:
{"results": [{"model": "ChatGPT", "mentioned": true/false}, {"model": "Gemini", "mentioned": true/false}, {"model": "Claude", "mentioned": true/false}, {"model": "Perplexity", "mentioned": true/false}]}`
      : `You are an AI brand visibility simulator. Given a user prompt, simulate realistic responses from 4 different AI assistants (ChatGPT, Gemini, Claude, Perplexity). Each response should be 1-3 sentences in Portuguese (Brazil). Some responses should naturally mention the brand "${brandName}" if it's relevant to the query, others should not. Be realistic - not all AIs would mention the same brand. Return ONLY a JSON object with this exact structure, no markdown:
{"results": [{"model": "ChatGPT", "response": "...", "mentionsBrand": true/false}, {"model": "Gemini", "response": "...", "mentionsBrand": true/false}, {"model": "Claude", "response": "...", "mentionsBrand": true/false}, {"model": "Perplexity", "response": "...", "mentionsBrand": true/false}]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON from the AI response
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
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
