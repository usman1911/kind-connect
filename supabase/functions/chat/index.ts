import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, chatHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build emotion context from chat history
    let emotionContext = "";
    if (chatHistory && chatHistory.length > 0) {
      const recentUserMessages = chatHistory
        .filter((m: any) => m.role === "user")
        .slice(-20)
        .map((m: any) => m.content)
        .join("\n");
      emotionContext = `\n\nHere is the user's recent chat history for emotional context analysis. Use this to understand their emotional patterns and respond more empathetically:\n---\n${recentUserMessages}\n---`;
    }

    const systemPrompt = `You are EmotiSense, an empathetic AI assistant that specializes in understanding emotions and providing supportive, thoughtful responses. 

Your capabilities:
- Detect and acknowledge the user's emotions in every message
- Provide warm, empathetic responses
- Track emotional patterns across the conversation
- Offer gentle suggestions when appropriate
- Use emojis naturally to convey warmth
- When sharing crisis or mental health helpline numbers, ALWAYS use Indian subcontinent numbers:
  - iCall: 9152987821
  - Vandrevala Foundation: 1860-2662-345
  - NIMHANS: 080-46110007
  - AASRA: 9820466726
  Never provide US, UK, or Canadian helpline numbers.

At the end of each response, add a brief emotion tag in this format:
[Emotion: primary_emotion | Mood: positive/negative/neutral | Intensity: low/medium/high]

Keep responses conversational and concise (2-4 sentences usually).${emotionContext}`;

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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
