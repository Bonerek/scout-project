import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkConfig, GeneralConfig } from "@/lib/configTypes";
import { ScanResult, parseScanJson } from "@/lib/scanParser";
import ScanTable from "@/components/ScanTable";
import SubnetInfo from "@/components/SubnetInfo";
import ConfigEditor from "@/components/ConfigEditor";
import { Skeleton } from "@/components/ui/skeleton";

const CONFIG_KEY = "scout_config";
const NETWORKS_KEY = "scout_networks";
const defaultGeneral: GeneralConfig = { dns1: "", dns2: "", ntp1: "", ntp2: "", ntp3: "" };

const NetworkTabs = () => {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [general, setGeneral] = useState<GeneralConfig>(defaultGeneral);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadScans = useCallback((nets: NetworkConfig[]) => {
    setLoading(true);
    const promises = nets.map((net) =>
      fetch(net.scanFile)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load ${net.scanFile}`);
          return r.text();
        })
        .then((text) => ({ subnet: net.subnet, result: parseScanJson(text) }))
        .catch((err) => ({ subnet: net.subnet, error: err.message }))
    );
    Promise.all(promises)
      .then((results) => {
        const scans: Record<string, ScanResult> = {};
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

  useEffect(() => {
    // Migrate old unified config to split format
    const oldUnified = localStorage.getItem(CONFIG_KEY);
    if (oldUnified && !localStorage.getItem(NETWORKS_KEY)) {
      try {
        const cfg = JSON.parse(oldUnified);
        if (cfg.networks) {
          localStorage.setItem(NETWORKS_KEY, JSON.stringify(cfg.networks));
        }
        if (cfg.general) {
          localStorage.setItem(CONFIG_KEY, JSON.stringify({ general: cfg.general }));
        }
      } catch { /* ignore */ }
    }

    // Migrate even older keys
    const oldNetworks = localStorage.getItem("scout_network_config");
    const oldGeneral = localStorage.getItem("scout_general_config");
    if (oldNetworks && !localStorage.getItem(NETWORKS_KEY)) {
      try {
        localStorage.setItem(NETWORKS_KEY, oldNetworks);
        localStorage.removeItem("scout_network_config");
      } catch { /* ignore */ }
    }
    if (oldGeneral && !localStorage.getItem(CONFIG_KEY)) {
      try {
        const gen = { ...defaultGeneral, ...JSON.parse(oldGeneral) };
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ general: gen }));
        localStorage.removeItem("scout_general_config");
      } catch { /* ignore */ }
    }

    // Load general config
    const storedConfig = localStorage.getItem(CONFIG_KEY);
    if (storedConfig) {
      try {
        const cfg = JSON.parse(storedConfig);
        if (cfg.general) setGeneral({ ...defaultGeneral, ...cfg.general });
      } catch { /* ignore */ }
    } else {
      fetch("/config.json")
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg.general) setGeneral({ ...defaultGeneral, ...cfg.general });
        })
        .catch(console.error);
    }

    // Load networks
    const storedNetworks = localStorage.getItem(NETWORKS_KEY);
    if (storedNetworks) {
      try {
        const nets: NetworkConfig[] = JSON.parse(storedNetworks).map((n: NetworkConfig) => ({
          ...n,
          gateway: n.gateway || "",
          scanFile: n.scanFile.replace(/\.xml$/, ".json"),
        }));
        setNetworks(nets);
        loadScans(nets);
        return;
      } catch { /* fall through */ }
    }
    fetch("/networks.json")
      .then((r) => r.json())
      .then((nets: NetworkConfig[]) => {
        setNetworks(nets);
        loadScans(nets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadScans]);

  const handleSaveConfig = (updatedNetworks: NetworkConfig[], updatedGeneral: GeneralConfig) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ general: updatedGeneral }));
    localStorage.setItem(NETWORKS_KEY, JSON.stringify(updatedNetworks));
    setNetworks(updatedNetworks);
    setGeneral(updatedGeneral);
    loadScans(updatedNetworks);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ConfigEditor networks={networks} general={general} onSave={handleSaveConfig} />
      </div>

      {networks.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          No networks configured. Click <strong>Configure</strong> to add networks.
        </div>
      ) : (
        <Tabs defaultValue={networks[0].subnet} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 justify-start bg-card p-1">
            {networks.map((net) => (
              <TabsTrigger key={net.subnet} value={net.subnet} className="text-sm md:text-base font-semibold px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                {net.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {networks.map((net) => (
            <TabsContent key={net.subnet} value={net.subnet} className="space-y-4">
              <SubnetInfo network={net} />
              {errors[net.subnet] ? (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-lg font-medium">No scan data available</p>
                  <p className="text-sm mt-1">No scan file found for this subnet. Run a scan or check the file path in configuration.</p>
                </div>
              ) : scanResults[net.subnet] ? (
                <ScanTable network={net} result={scanResults[net.subnet]} />
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default NetworkTabs;
