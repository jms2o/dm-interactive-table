export type DemoReadinessStatus = "ready" | "warning" | "blocked";

export interface DemoReadinessItem {
  id: string;
  label: string;
  status: DemoReadinessStatus;
  evidence: string;
}

export interface DemoRoute {
  label: string;
  url: string;
}

export interface DemoReadinessResponse {
  version: string;
  releaseName: string;
  allReady: boolean;
  readyCount: number;
  totalCount: number;
  items: DemoReadinessItem[];
  routes: DemoRoute[];
  commands: string[];
  updatedAt: string;
}
