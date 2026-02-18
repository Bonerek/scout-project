export interface NmapPort {
  portid: string;
  protocol: string;
  state: string;
  reason: string;
  service: string;
}

export interface NmapHost {
  ip: string;
  mac: string;
  vendor: string;
  hostname: string;
  state: string;
  reason: string;
  timedout: boolean;
  ports: NmapPort[];
}

export interface NmapScanInfo {
  scanner: string;
  args: string;
  startTime: string;
  elapsed: string;
  hostsUp: number;
  hostsDown: number;
  hostsTotal: number;
  summary: string;
}

export interface NmapResult {
  scanInfo: NmapScanInfo;
  hosts: NmapHost[];
}

export function parseNmapXml(xmlText: string): NmapResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const nmaprun = doc.querySelector("nmaprun");
  const finished = doc.querySelector("runstats > finished");
  const hostsStats = doc.querySelector("runstats > hosts");

  const scanInfo: NmapScanInfo = {
    scanner: nmaprun?.getAttribute("scanner") || "",
    args: nmaprun?.getAttribute("args") || "",
    startTime: nmaprun?.getAttribute("startstr") || "",
    elapsed: finished?.getAttribute("elapsed") || "",
    hostsUp: parseInt(hostsStats?.getAttribute("up") || "0"),
    hostsDown: parseInt(hostsStats?.getAttribute("down") || "0"),
    hostsTotal: parseInt(hostsStats?.getAttribute("total") || "0"),
    summary: finished?.getAttribute("summary") || "",
  };

  const hosts: NmapHost[] = [];
  const hostElements = doc.querySelectorAll("host");

  hostElements.forEach((hostEl) => {
    const status = hostEl.querySelector("status");
    const ipAddr = hostEl.querySelector('address[addrtype="ipv4"]');
    const macAddr = hostEl.querySelector('address[addrtype="mac"]');
    const hostnameEl = hostEl.querySelector("hostname");

    const ports: NmapPort[] = [];
    hostEl.querySelectorAll("port").forEach((portEl) => {
      const stateEl = portEl.querySelector("state");
      const serviceEl = portEl.querySelector("service");
      ports.push({
        portid: portEl.getAttribute("portid") || "",
        protocol: portEl.getAttribute("protocol") || "",
        state: stateEl?.getAttribute("state") || "",
        reason: stateEl?.getAttribute("reason") || "",
        service: serviceEl?.getAttribute("name") || "",
      });
    });

    hosts.push({
      ip: ipAddr?.getAttribute("addr") || "",
      mac: macAddr?.getAttribute("addr") || "",
      vendor: macAddr?.getAttribute("vendor") || "",
      hostname: hostnameEl?.getAttribute("name") || "",
      state: status?.getAttribute("state") || "",
      reason: status?.getAttribute("reason") || "",
      timedout: hostEl.getAttribute("timedout") === "true",
      ports,
    });
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

  return { scanInfo, hosts };
}
