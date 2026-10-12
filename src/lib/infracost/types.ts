export interface InfracostResource {
  name: string;
  resourceType: string;
  providerName: string;
  hourlyCost: string | null;
  monthlyCost: string | null;
  costComponents: InfracostCostComponent[];
  subResources: InfracostResource[];
  usageBased: boolean;
  usageFileHash: string;
}

export interface InfracostCostComponent {
  name: string;
  unit: string;
  hourlyQuantity: string | null;
  monthlyQuantity: string | null;
  price: string | null;
  hourlyCost: string | null;
  monthlyCost: string | null;
  details: string | null;
  usageBased: boolean;
  limits: InfracostLimit[];
}

export interface InfracostLimit {
  limit: string;
  hourlyCost: string | null;
  monthlyCost: string | null;
}

export interface InfracostProject {
  name: string;
  breakdown: InfracostBreakdown;
  pastBreakdowns: InfracostBreakdown[];
}

export interface InfracostBreakdown {
  resources: InfracostResource[];
  totalHourlyCost: string | null;
  totalMonthlyCost: string | null;
  timeGenerated: string;
  currency: string;
}

export interface InfracostResponse {
  projects: InfracostProject[];
  timeGenerated: string;
  totalHourlyCost: string | null;
  totalMonthlyCost: string | null;
  currency: string;
}

export interface CostEstimate {
  totalMonthlyCost: number;
  totalHourlyCost: number;
  currency: string;
  resources: ResourceCostEstimate[];
  lastUpdated: Date;
}

export interface ResourceCostEstimate {
  id: string;
  name: string;
  type: string;
  monthlyCost: number;
  hourlyCost: number;
  costComponents: CostComponentEstimate[];
  terraformAddress: string;
}

export interface CostComponentEstimate {
  name: string;
  unit: string;
  monthlyQuantity: number;
  price: number;
  monthlyCost: number;
  details?: string;
}

export interface InfracostError {
  message: string;
  code?: string;
}