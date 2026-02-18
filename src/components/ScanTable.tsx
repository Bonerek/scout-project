import { useState, useMemo } from "react";
import { NmapHost, NmapResult } from "@/lib/nmapParser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NetworkConfig } from "@/lib/configTypes";
import { Search, Monitor, MonitorOff } from "lucide-react";

interface ScanTableProps {
  network: NetworkConfig;
  result: NmapResult;
}

function PortBadge({ state, portid, service }: { state: string; portid: string; service: string }) {
  const variant = state === "open" ? "default" : state === "closed" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="mr-1 mb-1 text-xs">
      {portid}/{service}
    </Badge>
  );
}

const ScanTable = ({ network, result }: ScanTableProps) => {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return result.hosts;
    const q = filter.toLowerCase();
    return result.hosts.filter(
      (h) =>
        h.ip.includes(q) ||
        h.hostname.toLowerCase().includes(q) ||
        h.vendor.toLowerCase().includes(q) ||
        h.mac.toLowerCase().includes(q)
    );
  }, [result.hosts, filter]);

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
            {result.scanInfo.summary}
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
                <TableHead className="w-[140px]">IP Address</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead className="hidden md:table-cell">MAC</TableHead>
                <TableHead className="hidden lg:table-cell">Vendor</TableHead>
                <TableHead>Ports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((host) => (
                <TableRow key={host.ip}>
                  <TableCell className="font-mono text-sm">{host.ip}</TableCell>
                  <TableCell className="text-sm">{host.hostname || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {host.mac || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {host.vendor || "—"}
                  </TableCell>
                  <TableCell>
                    {host.ports.length > 0 ? (
                      <div className="flex flex-wrap">
                        {host.ports.map((p) => (
                          <PortBadge
                            key={`${p.protocol}-${p.portid}`}
                            state={p.state}
                            portid={p.portid}
                            service={p.service}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">no data</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
