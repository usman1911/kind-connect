import { Button } from "@/components/ui/button";
import { Heart, Brain, MessageCircleHeart } from "lucide-react";

const HeroSection = ({ onTryIt }: { onTryIt: () => void }) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="container relative z-10 px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-body text-sm font-medium mb-8">
          <Brain className="w-4 h-4" />
          AI-Powered NLP Analysis
        </div>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground mb-6 leading-tight">
          Understand the
          <br />
          <span className="bg-gradient-warm bg-clip-text text-transparent">emotions</span> behind words
        </h1>

        <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          EmotiSense uses advanced AI to detect emotions, analyze sentiment, and craft empathetic responses — helping you communicate with deeper understanding.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" className="text-lg px-8 py-6 rounded-xl" onClick={onTryIt}>
            <Heart className="w-5 h-5" />
            Try the Analyzer
          </Button>
          <Button variant="soft" size="lg" className="text-lg px-8 py-6 rounded-xl">
            <MessageCircleHeart className="w-5 h-5" />
            Learn More
          </Button>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
