import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkConfig, GeneralConfig } from "@/lib/configTypes";
import { ScanResult, parseScanJson } from "@/lib/scanParser";
import ScanTable from "@/components/ScanTable";
import SubnetInfo from "@/components/SubnetInfo";
import ConfigEditor from "@/components/ConfigEditor";
import { Skeleton } from "@/components/ui/skeleton";

const CONFIG_KEY = "scout_network_config";
const GENERAL_KEY = "scout_general_config";
const defaultGeneral: GeneralConfig = { dns1: "", dns2: "" };

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
    // Load general config
    const storedGeneral = localStorage.getItem(GENERAL_KEY);
    if (storedGeneral) {
      try { setGeneral(JSON.parse(storedGeneral)); } catch { /* ignore */ }
    }
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      try {
        const nets: NetworkConfig[] = JSON.parse(stored);
        const migrated = nets.map((n) => ({
          ...n,
          gateway: n.gateway || "",
          scanFile: n.scanFile.replace(/\.xml$/, ".json"),
        }));
        localStorage.setItem(CONFIG_KEY, JSON.stringify(migrated));
        setNetworks(migrated);
        loadScans(migrated);
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
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updatedNetworks));
    localStorage.setItem(GENERAL_KEY, JSON.stringify(updatedGeneral));
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
          <TabsList className="w-full flex-wrap h-auto gap-1 justify-start bg-card">
            {networks.map((net) => (
              <TabsTrigger key={net.subnet} value={net.subnet} className="text-xs md:text-sm">
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
