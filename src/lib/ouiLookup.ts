let ouiMap: Map<string, string> | null = null;
let loading: Promise<Map<string, string>> | null = null;

function normalizeMacPrefix(mac: string): string {
  // Take first 3 octets, uppercase, no separators
  return mac.replace(/[:\-\.]/g, "").substring(0, 6).toUpperCase();
}

async function loadOuiDatabase(): Promise<Map<string, string>> {
  if (ouiMap) return ouiMap;
  if (loading) return loading;

  loading = fetch("/oui.txt")
    .then((res) => res.text())
    .then((text) => {
      const map = new Map<string, string>();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        // Match lines like: "28-6F-B9   (hex)		Nokia Shanghai Bell Co., Ltd."
        const match = line.match(/^\s*([0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2})\s+\(hex\)\s+(.+)$/);
        if (match) {
          const prefix = match[1].replace(/-/g, "").toUpperCase();
          map.set(prefix, match[2].trim());
        }
      }
      
      ouiMap = map;
      return map;
    })
    .catch((err) => {
      console.error("[OUI] Failed to load:", err);
      ouiMap = new Map();
      return ouiMap;
    });

  return loading;
}

export async function lookupMacVendor(mac: string): Promise<string | null> {
  const db = await loadOuiDatabase();
  const prefix = normalizeMacPrefix(mac);
  return db.get(prefix) || null;
}

export function useMacVendors(macs: string[]): Map<string, string> {
  // This is a sync cache check - returns what we have
  if (!ouiMap) {
    // Trigger load
    loadOuiDatabase();
    return new Map();
  }
  const result = new Map<string, string>();
  for (const mac of macs) {
    if (!mac) continue;
    const prefix = normalizeMacPrefix(mac);
    const vendor = ouiMap.get(prefix);
    if (vendor) result.set(mac, vendor);
  }
  return result;
}
