import { Search, Zap, Shield, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Deep Discovery",
    description: "Uncover hidden patterns and connections across vast landscapes of information.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get results in milliseconds with our optimized exploration engine.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Your explorations stay yours. End-to-end encryption keeps your data safe.",
  },
  {
    icon: BarChart3,
    title: "Rich Insights",
    description: "Transform raw findings into actionable intelligence with visual analytics.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
            Built for Explorers
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Powerful tools designed to help you navigate complexity with ease.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
