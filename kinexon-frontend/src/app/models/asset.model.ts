/**
 * INFO: Direct mapping of BE models
 * DATA ACCESS LAYER: SSE/REST JSON
 */
export type RawSSEPayload = {
  object_id: number;
  tag_id: string;
  timestamp: string;
  is_valid: boolean;
  source_id: number;
  x: number;
  y: number;
  z: number;
  a: number; // Angle/Heading
  b: number;
  c: number;
  latitude: number;
  longitude: number;
  altitude: number;
  flags: string[];
  tenant_id: number;
  battery: BatteryState;
};

export type BatteryState = {
  percentage: number;
  percentage_last_update: string;
};

export type RawSystemStatistics = {
  connected_clients: number;
  map_dimensions: MapDimensions;
  total_objects: number;
  total_positions: number;
  update_interval_ms: number;
};

export type MapDimensions = {
  height: number;
  width: string;
};

export type ContainerProperties = {
  capacity: number;
  fill_level: number;
  material_type: string;
  status: string;
  temperature: number;
  zone: string;
};

export type OrderProperties = {
  customer: string;
  due_date: string;
  item_count: number;
  order_id: string;
  priority: string;
  status: string;
  zone: string;
};

export type ToolProperties = {
  maintenance_due: number;
  max_load: number;
  operator: string;
  status: string;
  tool_type: string;
  usage_hours: number;
  zone: string;
};

/**
 * INFO: FE models optimized for high-frequency access
 * BUSINESS LOGIC LAYER: AssetService & AsyncService
 */
export type PositionUpdate = {
  readonly objectId: number;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly isValid: boolean;
  readonly battery: number;
  readonly timestamp: string;
};

export type AssetMetadata =
  | {
      id: number;
      name: string;
      labels: ["container"];
      properties: ContainerProperties;
    }
  | { id: number; name: string; labels: ["order"]; properties: OrderProperties }
  | { id: number; name: string; labels: ["tool"]; properties: ToolProperties };

export type AssetLabels = "container" | "order" | "tool";

/**
 * INFO: Data model optimized for least intensive display
 * UI LAYER: ControlPanelComponent
 */
export type SelectedAssetDetails = {
  id: string;
  name: string;
  type: AssetLabels;
  labels: string[];
  properties: ContainerProperties | OrderProperties | ToolProperties;
  telemetry: AssetTelemetry;
};

export type AssetTelemetry = {
  x: string;
  y: string;
  angle: string;
  isValid: boolean;
  lastSeen: string;
  battery: number;
};
