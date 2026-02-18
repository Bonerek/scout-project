import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppConfig, NetworkConfig } from "@/lib/configTypes";
import { NmapResult, parseNmapXml } from "@/lib/nmapParser";
import ScanTable from "@/components/ScanTable";
import { Skeleton } from "@/components/ui/skeleton";

const NetworkTabs = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, NmapResult>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/config.json")
      .then((r) => r.json())
      .then((cfg: AppConfig) => {
        setConfig(cfg);
        // Load all scan files
        const promises = cfg.networks.map((net) =>
          fetch(net.scanFile)
            .then((r) => {
              if (!r.ok) throw new Error(`Failed to load ${net.scanFile}`);
              return r.text();
            })
            .then((xml) => ({ subnet: net.subnet, result: parseNmapXml(xml) }))
            .catch((err) => ({ subnet: net.subnet, error: err.message }))
        );
        return Promise.all(promises);
      })
      .then((results) => {
        const scans: Record<string, NmapResult> = {};
        const errs: Record<string, string> = {};
        results.forEach((r) => {
          if ("result" in r) scans[r.subnet] = r.result;
          else errs[r.subnet] = r.error;
        });
        setScanResults(scans);
        setErrors(errs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!config || config.networks.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No networks configured. Edit <code className="text-sm bg-muted px-1 rounded">public/config.json</code> to add networks.
      </div>
    );
  }

  return (
    <Tabs defaultValue={config.networks[0].subnet} className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-1 justify-start bg-card">
        {config.networks.map((net) => (
          <TabsTrigger key={net.subnet} value={net.subnet} className="text-xs md:text-sm">
            {net.name} — {net.subnet}
          </TabsTrigger>
        ))}
      </TabsList>

      {config.networks.map((net) => (
        <TabsContent key={net.subnet} value={net.subnet}>
          <div className="mb-2 text-sm text-muted-foreground">
            VLAN: <span className="font-medium text-foreground">{net.vlan}</span>
          </div>
          {errors[net.subnet] ? (
            <div className="p-6 text-center text-destructive">
              Error loading scan: {errors[net.subnet]}
            </div>
          ) : scanResults[net.subnet] ? (
            <ScanTable network={net} result={scanResults[net.subnet]} />
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default NetworkTabs;
