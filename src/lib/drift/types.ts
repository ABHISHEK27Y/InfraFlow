/**
 * Drift Detection Types
 * Defines the structure for drift comparison between diagram state and deployed infrastructure
 */

export interface DriftResource {
  id: string;
  type: string;
  provider: string;
  name: string;
  attributes: Record<string, unknown>;
  address: string; // Terraform address (e.g., "aws_vpc.main")
}

export interface DriftResult {
  resourceId: string;
  resourceType: string;
  resourceName: string;
  provider: string;
  driftType: "added" | "removed" | "modified";
  severity: "info" | "warning" | "critical";
  changes: DriftChange[];
  terraformAddress?: string;
  diagramNodeId?: string;
}

export interface DriftChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: "added" | "removed" | "modified";
}

export interface DriftSummary {
  totalResources: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface DriftDetectionOptions {
  diagramGraph: UGCPGraph;
  deployedResources: DriftResource[];
  provider?: string; // Filter by provider
  ignoreFields?: string[]; // Fields to ignore in comparison (e.g., "tags", "arn")
  matchBy?: "id" | "address" | "name"; // How to match resources
}

export interface DriftDetectionResult {
  timestamp: string;
  provider: string;
  drifts: DriftResult[];
  summary: DriftSummary;
}

export interface UGCPGraph {
  projectId: string;
  version: number;
  updatedAt: number;
  nodes: UGCPNode[];
  edges: UGCPEdge[];
  metadata: {
    name: string;
    description: string;
    tags: string[];
  };
}

export interface UGCPNode {
  id: string;
  type: string;
  parentId: string | null;
  position: { x: number; y: number };
  width: number | null;
  height: number | null;
  data: Record<string, unknown>;
  provenance?: UGCPProvenance;
}

export interface UGCPEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: Record<string, unknown>;
  provenance?: UGCPProvenance;
}

export interface UGCPProvenance {
  source: "human" | "import" | "generation" | "sync";
  createdAt: string;
  createdBy: string;
  rationale?: string;
  requirementRef?: string | null;
  patternRef?: string | null;
  promptRef?: string | null;
  overrides?: string[];
}