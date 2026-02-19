export interface ScanPort {
  portid: string;
  state: string;
  reason: string;
}

export interface ScanHost {
  ip: string;
  hostname: string;
  status: string;
  os: string;
  netbiosName: string;
  netbiosGroup: string;
  ports: ScanPort[];
}

export interface ScanInfo {
  subnet: string;
  statusText: string;
  hostsUp: number;
  hostsDown: number;
  hostsTotal: number;
}

export interface ScanResult {
  scanInfo: ScanInfo;
  hosts: ScanHost[];
}

interface JsonPort {
  state: string;
  reason: string;
}

interface JsonHost {
  ip: string;
  ptr: string;
  status: string;
  os: string;
  netbios_name: string;
  netbios_group: string;
  ports: Record<string, JsonPort>;
}

interface JsonScan {
  subnet: string;
  status: string;
  results: JsonHost[];
}

export function parseScanJson(json: string): ScanResult {
  const data: JsonScan = JSON.parse(json);

  const hosts: ScanHost[] = data.results.map((h) => {
    const ports: ScanPort[] = Object.entries(h.ports).map(([portid, p]) => ({
      portid,
      state: p.state,
      reason: p.reason,
    }));

    return {
      ip: h.ip,
      hostname: h.ptr || "",
      status: h.status,
      os: h.os || "",
      netbiosName: h.netbios_name || "",
      netbiosGroup: h.netbios_group || "",
      ports,
    };
  });

  // Sort by IP
  hosts.sort((a, b) => {
    const partsA = a.ip.split(".").map(Number);
    const partsB = b.ip.split(".").map(Number);
    for (let i = 0; i < 4; i++) {
      if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
    }
    return 0;
  });

  const hostsUp = hosts.filter((h) => h.status === "online").length;
  const hostsTotal = hosts.length;

  return {
    scanInfo: {
      subnet: data.subnet,
      statusText: data.status,
      hostsUp,
      hostsDown: hostsTotal - hostsUp,
      hostsTotal,
    },
    hosts,
  };
}
