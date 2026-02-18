import NetworkTabs from "@/components/NetworkTabs";
import { Wifi } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Wifi className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Scout — Network Scanner</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <NetworkTabs />
      </main>
    </div>
  );
};

export default Index;
