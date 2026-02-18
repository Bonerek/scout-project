export interface NetworkConfig {
  name: string;
  subnet: string;
  vlan: string;
  scanFile: string;
}

export interface AppConfig {
  networks: NetworkConfig[];
}
