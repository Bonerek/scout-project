import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { NetworkConfig } from "@/lib/configTypes";

interface SubnetDetails {
  name: string;
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  cidr: number;
  usableRange: string;
  usableCount: number;
  vlan: string;
  gateway: string;
}

function parseSubnet(net: NetworkConfig): SubnetDetails | null {
  const match = net.subnet.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;

  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  const cidr = Number(match[5]);
  const ip = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const netmask = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
  const networkAddr = (ip & netmask) >>> 0;
  const broadcastAddr = (networkAddr | ~netmask) >>> 0;
  const firstUsable = networkAddr + 1;
  const lastUsable = broadcastAddr - 1;

  const toIp = (n: number) =>
    `${(n >>> 24) & 0xFF}.${(n >>> 16) & 0xFF}.${(n >>> 8) & 0xFF}.${n & 0xFF}`;

  return {
    name: net.name,
    networkAddress: toIp(networkAddr),
    broadcastAddress: toIp(broadcastAddr),
    subnetMask: toIp(netmask),
    cidr,
    usableRange: cidr >= 31 ? "—" : `${toIp(firstUsable)} – ${toIp(lastUsable)}`,
    usableCount: cidr >= 31 ? 0 : lastUsable - firstUsable + 1,
    vlan: net.vlan,
    gateway: net.gateway || "—",
  };
}

interface SubnetInfoProps {
  network: NetworkConfig;
}

const SubnetInfo = ({ network }: SubnetInfoProps) => {
  const info = useMemo(() => parseSubnet(network), [network]);

  if (!info) return null;

  const items = [
    { label: "Network", value: info.networkAddress },
    { label: "Subnet Mask", value: `${info.subnetMask} (/${info.cidr})` },
    { label: "Usable Range", value: info.usableRange },
    { label: "Usable Hosts", value: info.usableCount.toLocaleString() },
    { label: "Broadcast", value: info.broadcastAddress },
    { label: "Gateway", value: info.gateway },
    { label: "VLAN", value: info.vlan },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
            {items.slice(0, 4).map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {items.slice(4).map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubnetInfo;
