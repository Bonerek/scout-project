import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkConfig, GeneralConfig } from "@/lib/configTypes";
import { ScanResult, parseScanJson } from "@/lib/scanParser";
import ScanTable from "@/components/ScanTable";
import SubnetInfo from "@/components/SubnetInfo";
import ConfigEditor from "@/components/ConfigEditor";
import { Skeleton } from "@/components/ui/skeleton";

const defaultGeneral: GeneralConfig = { dns1: "", dns2: "", ntp1: "", ntp2: "", ntp3: "", refreshInterval: 0 };

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
    // Load general config from server
    fetch("/config.json")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.general) setGeneral({ ...defaultGeneral, ...cfg.general });
      })
      .catch(console.error);

    // Load networks from server
    fetch("/networks.json")
      .then((r) => r.json())
      .then((nets: NetworkConfig[]) => {
        setNetworks(nets);
        loadScans(nets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadScans]);

  // Auto-refresh
  useEffect(() => {
    if (!general.refreshInterval || general.refreshInterval <= 0 || networks.length === 0) return;
    const id = setInterval(() => {
      loadScans(networks);
    }, general.refreshInterval * 1000);
    return () => clearInterval(id);
  }, [general.refreshInterval, networks, loadScans]);

  const handleSaveConfig = (updatedNetworks: NetworkConfig[], updatedGeneral: GeneralConfig) => {
    setNetworks(updatedNetworks);
    setGeneral(updatedGeneral);
    loadScans(updatedNetworks);
  };

  const portalTarget = document.getElementById("config-button-portal");
  const configPortal = portalTarget
    ? createPortal(
        <ConfigEditor networks={networks} general={general} onSave={handleSaveConfig} />,
        portalTarget
      )
    : null;

  if (loading) {
    return (
      <>
        {configPortal}
        <div className="space-y-4 p-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {configPortal}

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
