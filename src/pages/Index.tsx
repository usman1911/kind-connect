import { useRef } from "react";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AnalyzerSection from "@/components/AnalyzerSection";
import { Heart } from "lucide-react";

const Index = () => {
  const analyzerRef = useRef<HTMLDivElement>(null);

  const scrollToAnalyzer = () => {
    analyzerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl text-foreground">
            <Heart className="w-5 h-5 text-primary fill-primary" />
            EmotiSense
          </div>
          <button
            onClick={scrollToAnalyzer}
            className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-body text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            Try Analyzer
          </button>
        </div>
      </nav>

      <HeroSection onTryIt={scrollToAnalyzer} />
      <FeaturesSection />
      <AnalyzerSection ref={analyzerRef} />

    </div>
  );
};

export default Index;
