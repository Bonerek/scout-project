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
}

export interface AppConfig {
  networks: NetworkConfig[];
  general: GeneralConfig;
}
