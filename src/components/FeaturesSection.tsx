import { Heart, Brain, MessageCircleHeart, Shield, Zap, Globe } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Emotion Detection",
    description: "Identifies primary and secondary emotions like sadness, joy, anger, and insecurity with confidence scores.",
  },
  {
    icon: Heart,
    title: "Sentiment Analysis",
    description: "Classifies text as positive, negative, or neutral with nuanced understanding of context and tone.",
  },
  {
    icon: MessageCircleHeart,
    title: "Empathetic Replies",
    description: "Generates warm, thoughtful suggested responses that acknowledge the detected emotions.",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description: "Get instant analysis powered by state-of-the-art AI models with sub-second response times.",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    description: "Analyze emotions across multiple languages with culturally-aware sentiment detection.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your text is analyzed in real-time and never stored — your conversations stay private.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Powerful NLP capabilities
          </h2>
          <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto">
            Built on advanced natural language processing to understand the full spectrum of human emotion.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-warm group-hover:text-primary-foreground transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">{feature.title}</h3>
              <p className="font-body text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
