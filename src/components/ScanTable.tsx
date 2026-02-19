import { useState, useMemo } from "react";
import { ScanHost, ScanResult } from "@/lib/scanParser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NetworkConfig } from "@/lib/configTypes";
import { Search, Monitor, MonitorOff, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortField = "ip" | "hostname" | "status" | "os" | null;
type SortDir = "asc" | "desc";

function compareIp(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

interface ScanTableProps {
  network: NetworkConfig;
  result: ScanResult;
}

const portColorMap: Record<string, string> = {
  "22": "bg-emerald-600",
  "80": "bg-blue-600",
  "443": "bg-violet-600",
  "8080": "bg-cyan-600",
  "3389": "bg-rose-600",
  "445": "bg-amber-600",
  "139": "bg-orange-600",
  "53": "bg-teal-600",
  "25": "bg-pink-600",
  "21": "bg-indigo-600",
  "23": "bg-fuchsia-600",
  "3306": "bg-lime-600",
};

const fallbackColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  "bg-indigo-500", "bg-orange-500", "bg-fuchsia-500", "bg-lime-500",
];

function getPortColor(portid: string): string {
  if (portColorMap[portid]) return portColorMap[portid];
  let hash = 0;
  for (let i = 0; i < portid.length; i++) {
    hash = (hash * 37 + portid.charCodeAt(i) + 7) | 0;
  }
  return fallbackColors[Math.abs(hash) % fallbackColors.length];
}

function PortBadge({ portid }: { portid: string }) {
  const color = getPortColor(portid);
  return (
    <Badge className={`mr-0.5 mb-0.5 text-sm rounded-md px-2 py-0.5 border-transparent text-white ${color}`}>
      {portid}
    </Badge>
  );
}

function PortBadgeWithTooltip({ portid, host }: { portid: string; host: ScanHost }) {
  const httpPorts = ["80", "443", "8080", "8443"];
  const isHttp = httpPorts.includes(portid);
  const protocol = portid === "443" || portid === "8443" ? "https" : "http";
  const port = portid === "80" || portid === "443" ? "" : `:${portid}`;
  const target = host.hostname || host.ip;
  const url = `${protocol}://${target}${port}`;

  const badge = <PortBadge portid={portid} />;

  if (isHttp) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
              {badge}
            </a>
          </TooltipTrigger>
          <TooltipContent>{url}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
}

const ScanTable = ({ network, result }: ScanTableProps) => {
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="inline h-4 w-4 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />;
  };

  const filtered = useMemo(() => {
    let hosts = result.hosts;
    if (filter) {
      const q = filter.toLowerCase();
      hosts = hosts.filter(
        (h) =>
          h.ip.includes(q) ||
          h.hostname.toLowerCase().includes(q) ||
          h.os.toLowerCase().includes(q) ||
          h.netbiosName.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      hosts = [...hosts].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "ip": cmp = compareIp(a.ip, b.ip); break;
          case "hostname": cmp = a.hostname.localeCompare(b.hostname); break;
          case "status": cmp = a.status.localeCompare(b.status); break;
          case "os": cmp = a.os.localeCompare(b.os); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return hosts;
  }, [result.hosts, filter, sortField, sortDir]);

  const hostsWithPorts = result.hosts.filter((h) => h.ports.length > 0);
  const openPortCount = result.hosts.reduce(
    (sum, h) => sum + h.ports.filter((p) => p.state === "open").length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Hosts Up</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              {result.scanInfo.hostsUp}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Hosts Down</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MonitorOff className="h-5 w-5 text-muted-foreground" />
              {result.scanInfo.hostsDown}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Scanned Hosts</CardDescription>
            <CardTitle className="text-2xl">{hostsWithPorts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Open Ports</CardDescription>
            <CardTitle className="text-2xl text-primary">{openPortCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Scan info */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-mono break-all">
            {result.scanInfo.statusText}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by IP, hostname, vendor, or MAC..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] cursor-pointer select-none" onClick={() => toggleSort("ip")}>
                  IP Address <SortIcon field="ip" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("hostname")}>
                  Reverse DNS <SortIcon field="hostname" />
                </TableHead>
                <TableHead className="w-[120px] text-center cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("status")}>
                  Status <SortIcon field="status" />
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort("os")}>
                  OS <SortIcon field="os" />
                </TableHead>
                
                <TableHead className="hidden md:table-cell">Roles</TableHead>
                <TableHead>Ports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((host) => (
                <TableRow key={host.ip}>
                  <TableCell className="font-mono text-lg">{host.ip}</TableCell>
                  <TableCell className="text-lg">{host.hostname || "—"}</TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {(() => {
                            const isOnline = host.status === "online";
                            const isUnregistered = isOnline && !host.hostname;
                            const color = isOnline
                              ? isUnregistered
                                ? "bg-yellow-500 shadow-yellow-500/40"
                                : "bg-green-500 shadow-green-500/40"
                              : "bg-red-500 shadow-red-500/40";
                            const glow = isOnline
                              ? isUnregistered
                                ? "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(234,179,8,0.4)"
                                : "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(34,197,94,0.4)"
                              : "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(239,68,68,0.4)";
                            return (
                              <span
                                className={`inline-block h-5 w-5 rounded-full shadow-md ${color}`}
                                style={{ boxShadow: glow }}
                              />
                            );
                          })()}
                        </TooltipTrigger>
                        <TooltipContent>
                          {host.status === "online"
                            ? host.hostname
                              ? "Online"
                              : "Online, unregistered"
                            : "Offline"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-lg text-muted-foreground">
                    {host.os || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {host.roles && host.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {host.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {host.ports.filter((p) => p.state === "open").length > 0 ? (
                      <div className="flex flex-wrap">
                        {host.ports
                          .filter((p) => p.state === "open")
                          .map((p) => (
                            <PortBadgeWithTooltip key={p.portid} portid={p.portid} host={host} />
                          ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hosts match the filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable;
