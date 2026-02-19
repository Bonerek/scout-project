export interface NetworkConfig {
  name: string;
  subnet: string;
  vlan: string;
  gateway: string;
  scanFile: string;
}

export interface GeneralConfig {
  dns1: string;
  dns2: string;
  ntp1: string;
  ntp2: string;
  ntp3: string;
}

export interface AppConfig {
  networks: NetworkConfig[];
  general: GeneralConfig;
}
