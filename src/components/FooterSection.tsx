import { Compass } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-serif font-semibold text-foreground">Scout</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Scout. Navigate the unknown.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
