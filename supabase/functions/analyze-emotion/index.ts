import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert NLP emotion and sentiment analyzer. Given any text input, analyze it and return a JSON response with exactly this structure:
{
  "emotion": "Primary emotion(s) detected (e.g., Sadness + Insecurity, Joy + Gratitude)",
  "sentiment": "Positive, Negative, or Neutral",
  "confidence": 0.95,
  "suggestedReply": "An empathetic, warm suggested reply that addresses the emotion detected. Include an emoji.",
  "breakdown": [
    { "label": "Emotion Label", "score": 0.85 }
  ]
}
Always return valid JSON. The breakdown should have 3-5 emotion scores that sum roughly to 1.0.`
          },
          { role: "user", content: text }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_emotion",
              description: "Return emotion and sentiment analysis results",
              parameters: {
                type: "object",
                properties: {
                  emotion: { type: "string" },
                  sentiment: { type: "string", enum: ["Positive", "Negative", "Neutral"] },
                  confidence: { type: "number" },
                  suggestedReply: { type: "string" },
                  breakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        score: { type: "number" }
                      },
                      required: ["label", "score"]
                    }
                  }
                },
                required: ["emotion", "sentiment", "confidence", "suggestedReply", "breakdown"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_emotion" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-emotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
