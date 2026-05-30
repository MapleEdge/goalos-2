export interface ConnectorConfig {
  name: string;
  enabled: boolean;
  lastSync?: Date;
}

export interface ImportedItem {
  source: string;
  externalId: string;
  title: string;
  content?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface DataConnector {
  name: string;
  import(): Promise<ImportedItem[]>;
  isConfigured(): boolean;
}
