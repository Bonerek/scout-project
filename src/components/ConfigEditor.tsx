import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, Save } from "lucide-react";
import { NetworkConfig, GeneralConfig } from "@/lib/configTypes";
import { useToast } from "@/hooks/use-toast";

interface ConfigEditorProps {
  networks: NetworkConfig[];
  general: GeneralConfig;
  onSave: (networks: NetworkConfig[], general: GeneralConfig) => void;
}

interface ValidationErrors {
  [key: string]: { name?: string; subnet?: string; vlan?: string; gateway?: string };
}

const validateIp = (ip: string): string | undefined => {
  if (!ip.trim()) return undefined;
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return "Must be a valid IP address.";
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((o) => o > 255)) return "Each octet must be 0–255.";
  return undefined;
};

const validateGateway = (gateway: string, subnet: string): string | undefined => {
  if (!gateway.trim()) return undefined;
  const gwMatch = gateway.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!gwMatch) return "Must be a valid IP address.";
  const gwOctets = [gwMatch[1], gwMatch[2], gwMatch[3], gwMatch[4]].map(Number);
  if (gwOctets.some((o) => o > 255)) return "Each octet must be 0–255.";

  const subMatch = subnet.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!subMatch) return undefined;
  const subOctets = [subMatch[1], subMatch[2], subMatch[3], subMatch[4]].map(Number);
  const mask = Number(subMatch[5]);
  const netIp = ((subOctets[0] << 24) | (subOctets[1] << 16) | (subOctets[2] << 8) | subOctets[3]) >>> 0;
  const netmask = mask === 0 ? 0 : (0xFFFFFFFF << (32 - mask)) >>> 0;
  const gwIp = ((gwOctets[0] << 24) | (gwOctets[1] << 16) | (gwOctets[2] << 8) | gwOctets[3]) >>> 0;
  if ((gwIp & netmask) !== (netIp & netmask)) return "Gateway must be within the subnet range.";
  if (gwIp === netIp) return "Gateway cannot be the network address.";
  const broadcast = (netIp | ~netmask) >>> 0;
  if (gwIp === broadcast) return "Gateway cannot be the broadcast address.";
  return undefined;
};

const validateName = (name: string): string | undefined => {
  if (!name.trim()) return "Name is required.";
  if (!/^[A-Z0-9&\-_]+$/.test(name)) return "Only uppercase letters, digits, &, - and _ allowed.";
  return undefined;
};

const validateSubnet = (subnet: string): string | undefined => {
  if (!subnet.trim()) return "Subnet is required.";
  const match = subnet.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return "Must be in CIDR format (e.g. 10.80.128.0/24).";
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((o) => o > 255)) return "Each octet must be 0–255.";
  const mask = Number(match[5]);
  if (mask < 0 || mask > 32) return "Mask must be 0–32.";
  const ip = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const netmask = mask === 0 ? 0 : (0xFFFFFFFF << (32 - mask)) >>> 0;
  if ((ip & netmask) !== ip) return "Not a valid network address (host bits must be zero).";
  return undefined;
};

const validateVlan = (vlan: string): string | undefined => {
  if (!vlan.trim()) return "VLAN is required.";
  const num = Number(vlan);
  if (!Number.isInteger(num) || num < 1 || num > 1001) return "VLAN must be a number between 1 and 1001.";
  return undefined;
};

const generateScanFile = (subnet: string, vlan: string): string => {
  if (!subnet.trim() || !vlan.trim()) return "";
  const sanitizedSubnet = subnet.replace(/[./]/g, "_");
  return `/scans/scan_${sanitizedSubnet}_VLAN_${vlan}.json`;
};

const emptyNetwork: NetworkConfig = {
  name: "",
  subnet: "",
  vlan: "",
  gateway: "",
  scanFile: "",
};

const ConfigEditor = ({ networks, general, onSave }: ConfigEditorProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NetworkConfig[]>([]);
  const [generalDraft, setGeneralDraft] = useState<GeneralConfig>({ dns1: "", dns2: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [generalErrors, setGeneralErrors] = useState<{ dns1?: string; dns2?: string }>({});
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(networks.map((n) => ({ ...n })));
      setGeneralDraft({ ...general });
      setErrors({});
      setGeneralErrors({});
    }
    setOpen(isOpen);
  };

  const updateField = (index: number, field: keyof NetworkConfig, value: string) => {
    setDraft((prev) =>
      prev.map((n, i) => {
        if (i !== index) return n;
        const updated = { ...n, [field]: value };
        if (field === "subnet" || field === "vlan") {
          updated.scanFile = generateScanFile(
            field === "subnet" ? value : n.subnet,
            field === "vlan" ? value : n.vlan
          );
        }
        return updated;
      })
    );
    if (field === "name" || field === "vlan" || field === "subnet" || field === "gateway") {
      setErrors((prev) => {
        const copy = { ...prev };
        if (copy[index]) {
          copy[index] = { ...copy[index], [field]: undefined };
        }
        return copy;
      });
    }
  };

  const addNetwork = () => {
    setDraft((prev) => [...prev, { ...emptyNetwork }]);
  };

  const removeNetwork = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newErrors: ValidationErrors = {};
    let hasError = false;

    // Validate general
    const dns1Err = validateIp(generalDraft.dns1);
    const dns2Err = validateIp(generalDraft.dns2);
    if (dns1Err || dns2Err) {
      hasError = true;
      setGeneralErrors({ dns1: dns1Err, dns2: dns2Err });
    } else {
      setGeneralErrors({});
    }

    draft.forEach((n, idx) => {
      const nameErr = validateName(n.name);
      const subnetErr = validateSubnet(n.subnet);
      const vlanErr = validateVlan(n.vlan);
      const gatewayErr = n.gateway ? validateGateway(n.gateway, n.subnet) : undefined;
      if (nameErr || subnetErr || vlanErr || gatewayErr) {
        hasError = true;
        newErrors[idx] = { name: nameErr, subnet: subnetErr, vlan: vlanErr, gateway: gatewayErr };
      }
    });

    if (hasError) {
      setErrors(newErrors);
      toast({
        title: "Validation error",
        description: "Please fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    onSave(draft, generalDraft);
    setOpen(false);
    toast({ title: "Configuration updated", description: "Network list has been saved." });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="networks" className="flex-1">Networks</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="border border-border rounded-lg p-4 space-y-3">
              <span className="text-sm font-medium text-muted-foreground">DNS Servers</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dns1" className="text-xs">DNS 1</Label>
                  <Input
                    id="dns1"
                    value={generalDraft.dns1}
                    onChange={(e) => {
                      setGeneralDraft((prev) => ({ ...prev, dns1: e.target.value }));
                      setGeneralErrors((prev) => ({ ...prev, dns1: undefined }));
                    }}
                    placeholder="e.g. 8.8.8.8"
                  />
                  {generalErrors.dns1 && (
                    <p className="text-xs text-destructive">{generalErrors.dns1}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dns2" className="text-xs">DNS 2</Label>
                  <Input
                    id="dns2"
                    value={generalDraft.dns2}
                    onChange={(e) => {
                      setGeneralDraft((prev) => ({ ...prev, dns2: e.target.value }));
                      setGeneralErrors((prev) => ({ ...prev, dns2: undefined }));
                    }}
                    placeholder="e.g. 8.8.4.4"
                  />
                  {generalErrors.dns2 && (
                    <p className="text-xs text-destructive">{generalErrors.dns2}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="networks" className="space-y-4 py-4 flex-1 overflow-y-auto">
            {draft.map((net, idx) => (
              <div
                key={idx}
                className="border border-border rounded-lg p-4 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Network #{idx + 1}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Smazat síť?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Opravdu chcete smazat síť {net.name || `#${idx + 1}`}? Tuto akci nelze vrátit zpět.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeNetwork(idx)}>Smazat</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`name-${idx}`} className="text-xs">Name</Label>
                    <Input
                      id={`name-${idx}`}
                      value={net.name}
                      onChange={(e) => updateField(idx, "name", e.target.value.toUpperCase())}
                      placeholder="e.g. REF-OPS"
                    />
                    {errors[idx]?.name && (
                      <p className="text-xs text-destructive">{errors[idx].name}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`subnet-${idx}`} className="text-xs">Subnet</Label>
                    <Input
                      id={`subnet-${idx}`}
                      value={net.subnet}
                      onChange={(e) => updateField(idx, "subnet", e.target.value)}
                      placeholder="e.g. 10.80.128.0/24"
                    />
                    {errors[idx]?.subnet && (
                      <p className="text-xs text-destructive">{errors[idx].subnet}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`vlan-${idx}`} className="text-xs">VLAN (1–1001)</Label>
                    <Input
                      id={`vlan-${idx}`}
                      type="number"
                      min={1}
                      max={1001}
                      value={net.vlan}
                      onChange={(e) => updateField(idx, "vlan", e.target.value)}
                      placeholder="e.g. 128"
                    />
                    {errors[idx]?.vlan && (
                      <p className="text-xs text-destructive">{errors[idx].vlan}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`gateway-${idx}`} className="text-xs">Default Gateway</Label>
                    <Input
                      id={`gateway-${idx}`}
                      value={net.gateway}
                      onChange={(e) => updateField(idx, "gateway", e.target.value)}
                      placeholder="e.g. 10.80.128.1"
                    />
                    {errors[idx]?.gateway && (
                      <p className="text-xs text-destructive">{errors[idx].gateway}</p>
                    )}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor={`scanFile-${idx}`} className="text-xs">Scan File Path (auto-generated)</Label>
                    <Input
                      id={`scanFile-${idx}`}
                      value={net.scanFile}
                      readOnly
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full gap-2" onClick={addNetwork}>
              <Plus className="h-4 w-4" />
              Add Network
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigEditor;
