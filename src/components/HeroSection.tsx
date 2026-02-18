import { Button } from "@/components/ui/button";
import { Compass, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-foreground/40" />
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Compass className="h-10 w-10 text-primary-foreground" />
          <span className="text-3xl font-bold tracking-tight text-primary-foreground font-serif">
            Scout
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 font-serif leading-tight">
          Discover What
          <br />
          <span className="text-primary">Matters Most</span>
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
          Your intelligent companion for exploring ideas, uncovering insights, and navigating the unknown with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" className="text-base px-8 py-6">
            Start Exploring
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="heroOutline" size="lg" className="text-base px-8 py-6 text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
