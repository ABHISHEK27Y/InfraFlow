export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  category: "security" | "cost" | "best-practice" | "compliance" | "reliability";
  resourceTypes: string[];
  query: string; // Rego query
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  resourceId: string;
  resourceType: string;
  location?: {
    file: string;
    line: number;
  };
  remediation?: string;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: PolicyViolation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface PolicySet {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
}

export interface PolicyEngineConfig {
  policySets: PolicySet[];
  defaultSeverity: "error" | "warning" | "info";
  failOnError: boolean;
  failOnWarning: boolean;
}