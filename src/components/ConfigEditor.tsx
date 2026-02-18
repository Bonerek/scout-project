import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, Save } from "lucide-react";
import { NetworkConfig } from "@/lib/configTypes";
import { useToast } from "@/hooks/use-toast";

interface ConfigEditorProps {
  networks: NetworkConfig[];
  onSave: (networks: NetworkConfig[]) => void;
}

const generateScanFile = (subnet: string, vlan: string): string => {
  if (!subnet.trim() || !vlan.trim()) return "";
  const sanitizedSubnet = subnet.replace(/[./]/g, "_");
  const sanitizedVlan = vlan.replace(/\s+/g, "_");
  return `/scans/scan_${sanitizedSubnet}_${sanitizedVlan}.xml`;
};

const emptyNetwork: NetworkConfig = {
  name: "",
  subnet: "",
  vlan: "",
  scanFile: "",
};

const ConfigEditor = ({ networks, onSave }: ConfigEditorProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NetworkConfig[]>([]);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(networks.map((n) => ({ ...n })));
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
  };

  const addNetwork = () => {
    setDraft((prev) => [...prev, { ...emptyNetwork }]);
  };

  const removeNetwork = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const invalid = draft.some(
      (n) => !n.name.trim() || !n.subnet.trim() || !n.vlan.trim() || !n.scanFile.trim()
    );
    if (invalid) {
      toast({
        title: "Validation error",
        description: "All fields are required for every network entry.",
        variant: "destructive",
      });
      return;
    }
    onSave(draft);
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Network Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {draft.map((net, idx) => (
            <div
              key={idx}
              className="border border-border rounded-lg p-4 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Network #{idx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeNetwork(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`name-${idx}`} className="text-xs">Name</Label>
                  <Input
                    id={`name-${idx}`}
                    value={net.name}
                    onChange={(e) => updateField(idx, "name", e.target.value)}
                    placeholder="e.g. REF OPS"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`subnet-${idx}`} className="text-xs">Subnet</Label>
                  <Input
                    id={`subnet-${idx}`}
                    value={net.subnet}
                    onChange={(e) => updateField(idx, "subnet", e.target.value)}
                    placeholder="e.g. 10.80.128.0/24"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`vlan-${idx}`} className="text-xs">VLAN</Label>
                  <Input
                    id={`vlan-${idx}`}
                    value={net.vlan}
                    onChange={(e) => updateField(idx, "vlan", e.target.value)}
                    placeholder="e.g. VLAN 128"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`scanFile-${idx}`} className="text-xs">Scan File Path (auto-generated)</Label>
                  <Input
                    id={`scanFile-${idx}`}
                    value={net.scanFile}
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={addNetwork}>
            <Plus className="h-4 w-4" />
            Add Network
          </Button>
        </div>

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
