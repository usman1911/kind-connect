import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  emotion: string;
  sentiment: string;
  confidence: number;
  suggestedReply: string;
  breakdown: { label: string; score: number }[];
}

const sentimentColors: Record<string, string> = {
  Positive: "bg-green-100 text-green-800",
  Negative: "bg-red-100 text-red-800",
  Neutral: "bg-muted text-muted-foreground",
};

const exampleTexts = [
  "I feel like you don't care about me anymore. You've been distant lately.",
  "I just got promoted at work! I can't believe it, all those late nights paid off!",
  "I don't know what to do with my life anymore. Everything feels meaningless.",
  "Thank you so much for being there for me. You truly are a wonderful friend.",
];

const AnalyzerSection = forwardRef<HTMLDivElement>((_, ref) => {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-emotion", {
        body: { text },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast({
        title: "Analysis failed",
        description: e.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReply = () => {
    if (result?.suggestedReply) {
      navigator.clipboard.writeText(result.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section ref={ref} className="py-24 bg-card">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Try it yourself
          </h2>
          <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto">
            Type any message and watch the AI detect emotions, sentiment, and suggest an empathetic reply.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Example chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {exampleTexts.map((ex, i) => (
              <button
                key={i}
                onClick={() => setText(ex)}
                className="px-3 py-1.5 text-xs font-body rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate max-w-[200px]"
              >
                "{ex.slice(0, 35)}…"
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message to analyze its emotional content…"
              className="min-h-[120px] text-base font-body rounded-2xl border-border bg-background resize-none pr-16 focus:ring-primary"
            />
            <Button
              variant="hero"
              size="icon"
              className="absolute bottom-4 right-4 rounded-xl"
              onClick={analyze}
              disabled={loading || !text.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Emotion + Sentiment */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-background border border-border">
                  <div className="font-body text-sm text-muted-foreground mb-1">Emotion Detected</div>
                  <div className="font-display text-xl text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {result.emotion}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-background border border-border">
                  <div className="font-body text-sm text-muted-foreground mb-1">Sentiment</div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${sentimentColors[result.sentiment] || sentimentColors.Neutral}`}>
                      {result.sentiment}
                    </span>
                    <span className="font-body text-sm text-muted-foreground">
                      {Math.round(result.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Emotion Breakdown */}
              {result.breakdown && result.breakdown.length > 0 && (
                <div className="p-5 rounded-2xl bg-background border border-border">
                  <div className="font-body text-sm text-muted-foreground mb-3">Emotion Breakdown</div>
                  <div className="space-y-3">
                    {result.breakdown.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="font-body text-sm text-foreground w-28 shrink-0">{item.label}</span>
                        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-warm transition-all duration-700"
                            style={{ width: `${Math.round(item.score * 100)}%` }}
                          />
                        </div>
                        <span className="font-body text-sm text-muted-foreground w-12 text-right">
                          {Math.round(item.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Reply */}
              <div className="p-5 rounded-2xl bg-gradient-hero border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-body text-sm text-muted-foreground">Suggested Reply</div>
                  <button onClick={copyReply} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-body text-foreground leading-relaxed italic">
                  "{result.suggestedReply}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

AnalyzerSection.displayName = "AnalyzerSection";

export default AnalyzerSection;
