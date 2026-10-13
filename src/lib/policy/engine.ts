import { PolicyRule, PolicyViolation, PolicyEvaluationResult, PolicyEngineConfig, PolicySet } from "./types";
import { allPolicySets } from "./builtin-policies";

interface RegoInput {
  resources: Array<{
    id: string;
    name: string;
    type: string;
    data: Record<string, unknown>;
    provider?: string;
  }>;
}

class PolicyEngine {
  private config: PolicyEngineConfig;
  private rules: Map<string, PolicyRule> = new Map();

  constructor(config?: Partial<PolicyEngineConfig>) {
    this.config = {
      policySets: allPolicySets,
      defaultSeverity: "warning",
      failOnError: true,
      failOnWarning: false,
      ...config,
    };

    // Load all rules from configured policy sets
    for (const policySet of this.config.policySets) {
      for (const rule of policySet.rules) {
        this.rules.set(rule.id, rule);
      }
    }
  }

  addPolicySet(policySet: PolicySet): void {
    this.config.policySets.push(policySet);
    for (const rule of policySet.rules) {
      this.rules.set(rule.id, rule);
    }
  }

  removePolicySet(policySetId: string): void {
    this.config.policySets = this.config.policySets.filter((ps) => ps.id !== policySetId);
    const rulesToRemove: string[] = [];
    this.rules.forEach((rule, id) => {
      if (this.config.policySets.every((ps) => !ps.rules.some((r) => r.id === id))) {
        rulesToRemove.push(id);
      }
    });
    rulesToRemove.forEach((id) => this.rules.delete(id));
  }

  getRules(): PolicyRule[] {
    return Array.from(this.rules.values());
  }

  getRulesByCategory(category: string): PolicyRule[] {
    return this.getRules().filter((rule) => rule.category === category);
  }

  getRulesByResourceType(resourceType: string): PolicyRule[] {
    return this.getRules().filter(
      (rule) => rule.resourceTypes.includes("*") || rule.resourceTypes.includes(resourceType)
    );
  }

  /**
   * Evaluates policies against Terraform resources
   * Note: This is a simplified JavaScript-based evaluator for Rego-like queries.
   * For production, consider using @open-policy-agent/opa-wasm or a backend service.
   */
  async evaluate(resources: RegoInput["resources"]): Promise<PolicyEvaluationResult> {
    const violations: PolicyViolation[] = [];

    for (const rule of this.rules.values()) {
      const relevantResources = resources.filter(
        (r) => rule.resourceTypes.includes("*") || rule.resourceTypes.includes(r.type)
      );

      if (relevantResources.length === 0) continue;

      const ruleViolations = await this.evaluateRule(rule, relevantResources);
      violations.push(...ruleViolations);
    }

    const summary = {
      total: violations.length,
      errors: violations.filter((v) => v.severity === "error").length,
      warnings: violations.filter((v) => v.severity === "warning").length,
      info: violations.filter((v) => v.severity === "info").length,
    };

    return {
      passed: summary.errors === 0 && (!this.config.failOnWarning || summary.warnings === 0),
      violations,
      summary,
    };
  }

  private async evaluateRule(
    rule: PolicyRule,
    resources: RegoInput["resources"]
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    // This is a simplified evaluator that handles common Rego patterns
    // In production, use actual OPA WASM or Rego interpreter
    for (const resource of resources) {
      try {
        const resourceViolations = this.evaluateRegoQuery(rule.query, resource);
        for (const v of resourceViolations) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            category: rule.category,
            message: v.msg,
            resourceId: resource.id,
            resourceType: resource.type,
            remediation: this.getRemediation(rule.id),
          });
        }
      } catch (error) {
        console.warn(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }

    return violations;
  }

  private evaluateRegoQuery(query: string, resource: RegoInput["resources"][0]): Array<{ msg: string }> {
    const violations: Array<{ msg: string }> = [];
    const data = resource.data;

    // Parse and evaluate common Rego patterns
    // This is a simplified implementation - in production use actual OPA

    // Pattern: resource.data.field == value
    const equalsMatches = query.match(/resource\.data\.(\w+)\s*==\s*["']([^"']+)["']/g);
    if (equalsMatches) {
      for (const match of equalsMatches) {
        const fieldMatch = match.match(/resource\.data\.(\w+)\s*==\s*["']([^"']+)["']/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          const expectedValue = fieldMatch[2];
          const actualValue = data[field];
          if (actualValue === expectedValue) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name) });
            }
          }
        }
      }
    }

    // Pattern: not resource.data.field
    const notExistsMatches = query.match(/not\s+resource\.data\.(\w+)/g);
    if (notExistsMatches) {
      for (const match of notExistsMatches) {
        const fieldMatch = match.match(/not\s+resource\.data\.(\w+)/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          if (!data[field]) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name) });
            }
          }
        }
      }
    }

    // Pattern: resource.data.field != true
    const notTrueMatches = query.match(/resource\.data\.(\w+)\s*!=\s*true/g);
    if (notTrueMatches) {
      for (const match of notTrueMatches) {
        const fieldMatch = match.match(/resource\.data\.(\w+)\s*!=\s*true/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          if (data[field] !== true) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name) });
            }
          }
        }
      }
    }

    // Pattern: resource.data.field < value
    const lessThanMatches = query.match(/resource\.data\.(\w+)\s*<\s*(\d+)/g);
    if (lessThanMatches) {
      for (const match of lessThanMatches) {
        const fieldMatch = match.match(/resource\.data\.(\w+)\s*<\s*(\d+)/);
        if (fieldMatch) {
          const field = fieldMatch[1];
          const threshold = parseInt(fieldMatch[2], 10);
          const actualValue = Number(data[field]);
          if (!isNaN(actualValue) && actualValue < threshold) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name) });
            }
          }
        }
      }
    }

    // Pattern: contains(resource.name, "pattern")
    const containsMatches = query.match(/contains\(resource\.name,\s*["']([^"']+)["']\)/g);
    if (containsMatches) {
      for (const match of containsMatches) {
        const patternMatch = match.match(/contains\(resource\.name,\s*["']([^"']+)["']\)/);
        if (patternMatch) {
          const pattern = patternMatch[1];
          if (resource.name.includes(pattern)) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name) });
            }
          }
        }
      }
    }

    // Pattern: ingress.cidr_blocks[_] == "0.0.0.0/0"
    if (query.includes('cidr_blocks[_] == "0.0.0.0/0"') && resource.type.includes("security_group")) {
      const ingress = data.ingress as Array<Record<string, unknown>> | undefined;
      if (ingress) {
        for (const rule of ingress) {
          const cidrBlocks = rule.cidr_blocks as string[] | undefined;
          if (cidrBlocks?.includes("0.0.0.0/0")) {
            const fromPort = Number(rule.from_port);
            const toPort = Number(rule.to_port);
            if (fromPort <= 1024 && toPort >= 1024) {
              const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
              if (msgMatch) {
                violations.push({
                  msg: msgMatch[1]
                    .replace(/\$\{resource\.name\}/g, resource.name)
                    .replace(/\$\{ingress\.from_port\}/g, String(fromPort))
                    .replace(/\$\{ingress\.to_port\}/g, String(toPort)),
                });
              }
            }
          }
        }
      }
    }

    // Pattern: required tags check
    if (query.includes("required_tags") && query.includes("not tags[missing_tag]")) {
      const requiredTags = ["Environment", "Owner", "Project", "CostCenter"];
      const tags = data.tags as Record<string, string> | undefined;
      if (!tags) {
        const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
        if (msgMatch) {
          violations.push({ msg: msgMatch[1].replace(/\$\{resource\.name\}/g, resource.name).replace(/\$\{resource\.type\}/g, resource.type) });
        }
      } else {
        for (const requiredTag of requiredTags) {
          if (!tags[requiredTag]) {
            const msgMatch = query.match(/msg\s*:=\s*["']([^"']+)["']/);
            if (msgMatch) {
              violations.push({
                msg: msgMatch[1]
                  .replace(/\$\{resource\.name\}/g, resource.name)
                  .replace(/\$\{resource\.type\}/g, resource.type)
                  .replace(/\$\{missing_tag\}/g, requiredTag),
              });
            }
          }
        }
      }
    }

    return violations;
  }

  private getRemediation(ruleId: string): string {
    const remediations: Record<string, string> = {
      "aws-s3-no-public-read": "Set explicit ACL to private or use bucket policies for controlled access",
      "aws-s3-versioning-enabled": "Enable versioning on the S3 bucket",
      "aws-s3-encryption-enabled": "Configure server-side encryption (SSE-S3 or SSE-KMS)",
      "aws-ec2-no-public-ip": "Disable associate_public_ip_address and use NAT Gateway for internet access",
      "aws-ec2-imdsv2-enforced": "Set metadata_options { http_tokens = \"required\" }",
      "aws-rds-encryption-enabled": "Enable storage_encrypted on RDS instance",
      "aws-rds-backup-retention": "Set backup_retention_period to at least 7 days",
      "aws-sg-no-unrestricted-ingress": "Restrict ingress to specific CIDR blocks or security groups",
      "aws-iam-no-wildcard-policies": "Use least privilege principle - specify exact actions and resources",
      "aws-kms-key-rotation": "Enable enable_key_rotation on KMS key",
      "aws-cloudtrail-enabled": "Create multi-region CloudTrail with logging enabled",
      "aws-ec2-rightsizing": "Analyze CPU/memory utilization and downsize instance type",
      "aws-rds-multi-az": "Enable multi_az for production databases",
      "aws-ebs-gp3-migration": "Modify volume type to gp3 or io2 Block Express",
      "aws-s3-intelligent-tiering": "Add intelligent_tiering_configuration to S3 bucket",
      "aws-nat-gateway-single-az": "Deploy NAT Gateway in each AZ for high availability",
      "aws-resource-tagging": "Add required tags: Environment, Owner, Project, CostCenter",
      "aws-vpc-flow-logs": "Enable VPC flow logs to CloudWatch or S3",
      "aws-alb-waf-enabled": "Attach WAF Web ACL to Application Load Balancer",
    };
    return remediations[ruleId] || "Review resource configuration against best practices";
  }
}

// Singleton instance
let engineInstance: PolicyEngine | null = null;

export function getPolicyEngine(config?: Partial<PolicyEngineConfig>): PolicyEngine {
  if (!engineInstance) {
    engineInstance = new PolicyEngine(config);
  }
  return engineInstance;
}

export function resetPolicyEngine(config?: Partial<PolicyEngineConfig>): PolicyEngine {
  engineInstance = new PolicyEngine(config);
  return engineInstance;
}

export { PolicyEngine };