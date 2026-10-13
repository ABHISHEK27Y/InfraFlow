/**
 * Template Marketplace Types
 * Defines the structure for community-contributed architecture templates
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail: string; // Base64 encoded or URL
  author: TemplateAuthor;
  version: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  isOfficial: boolean;
  isVerified: boolean;
  cloudProviders: CloudProvider[];
  complexity: "beginner" | "intermediate" | "advanced";
  estimatedCost: string; // e.g., "$50-100/month"
  architecture: TemplateArchitecture;
  documentation: string; // Markdown
  license: string;
  sourceUrl?: string; // GitHub, etc.
}

export interface TemplateAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  organization?: string;
}

export type TemplateCategory =
  | "web-application"
  | "microservices"
  | "data-platform"
  | "serverless"
  | "kubernetes"
  | "ml-ai"
  | "security"
  | "networking"
  | "storage"
  | "monitoring"
  | "ci-cd"
  | "database"
  | "custom";

export type CloudProvider = "aws" | "azure" | "gcp" | "multi-cloud";

export interface TemplateArchitecture {
  ugcpGraph: UGCPGraph;
  terraformModules: TerraformModule[];
  parameters: TemplateParameter[];
  outputs: TemplateOutput[];
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

export interface TerraformModule {
  name: string;
  source: string; // Local path or registry URL
  version?: string;
  variables: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface TemplateParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "list";
  description: string;
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
  sensitive?: boolean;
}

export interface TemplateOutput {
  name: string;
  description: string;
  value: string; // Terraform output reference
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

export interface TemplateSearchFilters {
  query?: string;
  category?: TemplateCategory;
  cloudProviders?: CloudProvider[];
  complexity?: ("beginner" | "intermediate" | "advanced")[];
  minRating?: number;
  maxCost?: number;
  isOfficial?: boolean;
  isVerified?: boolean;
  tags?: string[];
  sortBy?: "popular" | "recent" | "rating" | "downloads";
  sortOrder?: "asc" | "desc";
}

export interface TemplateSearchResult {
  templates: Template[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: Record<TemplateCategory, number>;
    providers: Record<CloudProvider, number>;
    complexities: Record<string, number>;
  };
}

export interface UserTemplateCollection {
  userId: string;
  templateIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSubmission {
  id: string;
  template: Omit<Template, "id" | "downloads" | "rating" | "reviewCount" | "createdAt" | "updatedAt">;
  submitterId: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
}