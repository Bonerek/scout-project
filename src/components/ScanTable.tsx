import { useState, useMemo } from "react";
import tuxLogo from "@/assets/tux-linux.svg";
import { ScanHost, ScanResult } from "@/lib/scanParser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NetworkConfig } from "@/lib/configTypes";
import { Search, Monitor, MonitorOff, ArrowUp, ArrowDown, ArrowUpDown, Cable, MonitorSmartphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

type StatusFilter = "online" | "offline" | "free" | "unregistered";

function getHostStatus(host: ScanHost): StatusFilter {
  if (host.status === "online") return host.hostname ? "online" : "unregistered";
  return host.hostname ? "offline" : "free";
}

const ScanTable = ({ network, result }: ScanTableProps) => {
  const [filter, setFilter] = useState("");
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
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
    if (statusFilters.length > 0) {
      hosts = hosts.filter((h) => statusFilters.includes(getHostStatus(h)));
    }
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
  }, [result.hosts, filter, statusFilters, sortField, sortDir]);

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
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by IP, hostname, vendor, or MAC..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="multiple"
          value={statusFilters}
          onValueChange={(v) => setStatusFilters(v as StatusFilter[])}
          className="flex-shrink-0"
        >
          <ToggleGroupItem value="online" className="text-xs gap-1 data-[state=on]:bg-green-700 data-[state=on]:text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Online
          </ToggleGroupItem>
          <ToggleGroupItem value="unregistered" className="text-xs gap-1 data-[state=on]:bg-yellow-600 data-[state=on]:text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" /> Unreg
          </ToggleGroupItem>
          <ToggleGroupItem value="offline" className="text-xs gap-1 data-[state=on]:bg-red-700 data-[state=on]:text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Offline
          </ToggleGroupItem>
          <ToggleGroupItem value="free" className="text-xs gap-1 data-[state=on]:bg-gray-600 data-[state=on]:text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" /> Free
          </ToggleGroupItem>
        </ToggleGroup>
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
                <TableHead className="hidden md:table-cell w-[80px] text-center cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("os")}>
                  OS <SortIcon field="os" />
                </TableHead>
                
                <TableHead className="hidden lg:table-cell w-[50px] text-center">MAC</TableHead>
                <TableHead className="hidden lg:table-cell">NetBIOS Name</TableHead>
                <TableHead className="hidden lg:table-cell">NetBIOS Group</TableHead>
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
                    {(() => {
                      const isOnline = host.status === "online";
                      const isFree = !isOnline && !host.hostname;
                      const isUnregistered = isOnline && !host.hostname;
                      const color = isOnline
                        ? isUnregistered
                          ? "bg-yellow-500 shadow-yellow-500/40"
                          : "bg-green-500 shadow-green-500/40"
                        : isFree
                          ? "bg-gray-400 shadow-gray-400/40"
                          : "bg-red-500 shadow-red-500/40";
                      const glow = isOnline
                        ? isUnregistered
                          ? "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(234,179,8,0.4)"
                          : "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(34,197,94,0.4)"
                        : isFree
                          ? "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(156,163,175,0.4)"
                          : "inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 6px rgba(239,68,68,0.4)";
                      const label = isOnline
                        ? isUnregistered ? "Online, unregistered" : "Online"
                        : isFree ? "Free" : "Offline";
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span
                                className={`inline-block h-5 w-5 rounded-full shadow-md ${color}`}
                                style={{ boxShadow: glow }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>{label}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {host.os ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {host.os.toLowerCase().includes("windows") ? (
                              <svg className="inline-block h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12V6.5l8-1.1V12H3zm9-6.8L22 3.5V12H12V5.2zM12 13h10v8.5l-10-1.3V13zM3 13h8v6.6l-8-1.1V13z"/></svg>
                            ) : host.os.toLowerCase().includes("linux") ? (
                              <img src={tuxLogo} alt="Linux" className="inline-block h-7 w-7 object-contain" />
                            ) : (
                              <MonitorSmartphone className="inline-block h-7 w-7 text-muted-foreground" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>{host.os}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">
                    {host.mac ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Cable className="h-5 w-5 text-muted-foreground inline-block" />
                          </TooltipTrigger>
                          <TooltipContent>{host.mac}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-lg">
                    {host.netbiosName || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-lg">
                    {host.netbiosGroup || "—"}
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
