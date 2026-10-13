/**
 * Drift Detection Engine
 * Compares the diagram state (UGCP Graph) with deployed infrastructure state
 */

import {
  DriftResult,
  DriftChange,
  DriftSummary,
  DriftDetectionOptions,
  DriftResource,
  UGCPGraph,
  UGCPNode,
} from "./types";

export type {
  DriftResult,
  DriftChange,
  DriftSummary,
  DriftDetectionOptions,
  DriftResource,
  UGCPGraph,
  UGCPNode,
  UGCPEdge,
  UGCPProvenance,
} from "./types";

/**
 * Maps diagram node types to Terraform resource types
 */
const NODE_TYPE_TO_TERRAFORM: Record<string, string[]> = {
  vpc: ["aws_vpc"],
  subnet: ["aws_subnet"],
  ec2: ["aws_instance"],
  rds: ["aws_db_instance"],
  elb: ["aws_lb", "aws_lb_target_group"],
  "security-group": ["aws_security_group"],
  s3: ["aws_s3_bucket"],
  "iam-role": ["aws_iam_role"],
  "iam-policy": ["aws_iam_policy"],
  kms: ["aws_kms_key"],
  cloudwatch: ["aws_cloudwatch_log_group"],
  ecs: ["aws_ecs_cluster"],
  "ecs-service": ["aws_ecs_service"],
  "ecs-task": ["aws_ecs_task_definition"],
  eks: ["aws_eks_cluster"],
  lambda: ["aws_lambda_function"],
  "api-gateway": ["aws_api_gateway_rest_api"],
  route53: ["aws_route53_zone"],
  cloudfront: ["aws_cloudfront_distribution"],
  elasticache: ["aws_elasticache_cluster", "aws_elasticache_replication_group"],
  redshift: ["aws_redshift_cluster"],
  dynamodb: ["aws_dynamodb_table"],
  sqs: ["aws_sqs_queue"],
  sns: ["aws_sns_topic"],
  kinesis: ["aws_kinesis_stream"],
  generic: [],
};

/**
 * Maps Terraform resource types to diagram node types
 */
const TERRAFORM_TO_NODE_TYPE: Record<string, string> = {};
Object.entries(NODE_TYPE_TO_TERRAFORM).forEach(([nodeType, tfTypes]) => {
  tfTypes.forEach((tfType) => {
    TERRAFORM_TO_NODE_TYPE[tfType] = nodeType;
  });
});

/**
 * Default fields to ignore during comparison
 */
const DEFAULT_IGNORE_FIELDS = [
  "arn",
  "id",
  "owner_id",
  "creation_timestamp",
  "created_at",
  "updated_at",
  "version",
  "revision",
  "tags_all",
  "tags.*",
  "metadata",
  "provider_metadata",
];

/**
 * Default fields that are critical for security/compliance
 */
const CRITICAL_FIELDS = [
  "encryption",
  "encrypted",
  "kms_key_id",
  "publicly_accessible",
  "public_access_block",
  "block_public_acls",
  "block_public_policy",
  "ignore_public_acls",
  "restrict_public_buckets",
  "engine",
  "engine_version",
  "instance_type",
  "instance_class",
  "multi_az",
  "backup_retention_period",
  "deletion_protection",
  "enable_versioning",
  "server_side_encryption_configuration",
  "lifecycle_rule",
  "cors_rule",
  "policy",
  "assume_role_policy",
  "permissions_boundary",
  "inline_policy",
];

/**
 * Determines if a field change is critical
 */
function isCriticalField(field: string): boolean {
  const normalizedField = field.toLowerCase();
  return CRITICAL_FIELDS.some(
    (critical) => normalizedField.includes(critical.toLowerCase())
  );
}

/**
 * Determines drift severity based on changes
 */
function determineSeverity(changes: DriftChange[]): "info" | "warning" | "critical" {
  if (changes.some((c) => c.changeType === "removed")) {
    return "critical";
  }

  const hasCriticalChanges = changes.some((c) => isCriticalField(c.field));
  if (hasCriticalChanges) {
    return "critical";
  }

  const hasWarningChanges = changes.some((c) =>
    c.field.toLowerCase().includes("tag") ||
    c.field.toLowerCase().includes("label") ||
    c.field.toLowerCase().includes("annotation")
  );
  if (hasWarningChanges) {
    return "warning";
  }

  return "info";
}

/**
 * Converts a diagram node to a drift resource for comparison
 */
function nodeToDriftResource(node: UGCPNode): DriftResource | null {
  const terraformType = node.data.terraformType as string;
  if (!terraformType) {
    return null;
  }

  const name = (node.data.name as string) || node.id;
  const provider = (node.data.provider as string) || "aws";
  const address = `${terraformType}.${name}`;

  // Extract relevant attributes from node data
  const attributes: Record<string, unknown> = {};
  Object.entries(node.data).forEach(([key, value]) => {
    if (key !== "provenance" && key !== "terraformType" && key !== "provider" && key !== "name") {
      attributes[key] = value;
    }
  });

  return {
    id: node.id,
    type: terraformType,
    provider,
    name,
    attributes,
    address,
  };
}

/**
 * Matches diagram nodes to deployed resources
 */
function matchResources(
  diagramResources: DriftResource[],
  deployedResources: DriftResource[],
  matchBy: "id" | "address" | "name" = "address"
): Map<string, { diagram: DriftResource; deployed: DriftResource }> {
  const matches = new Map<string, { diagram: DriftResource; deployed: DriftResource }>();
  const deployedMap = new Map<string, DriftResource>();

  // Build lookup map based on match strategy
  deployedResources.forEach((r) => {
    let key: string;
    switch (matchBy) {
      case "id":
        key = r.id;
        break;
      case "address":
        key = r.address;
        break;
      case "name":
        key = r.name;
        break;
    }
    deployedMap.set(key, r);
  });

  // Find matches
  diagramResources.forEach((diagram) => {
    let key: string;
    switch (matchBy) {
      case "id":
        key = diagram.id;
        break;
      case "address":
        key = diagram.address;
        break;
      case "name":
        key = diagram.name;
        break;
    }

    const deployed = deployedMap.get(key);
    if (deployed) {
      matches.set(key, { diagram, deployed });
      deployedMap.delete(key);
    }
  });

  return matches;
}

/**
 * Compares two resource objects and returns drift changes
 */
function compareResources(
  diagram: DriftResource,
  deployed: DriftResource,
  ignoreFields: string[] = []
): DriftChange[] {
  const changes: DriftChange[] = [];
  const allFields = new Set([...Object.keys(diagram.attributes), ...Object.keys(deployed.attributes)]);

  allFields.forEach((field) => {
    // Check if field should be ignored
    const shouldIgnore = ignoreFields.some((ignore) => {
      if (ignore.includes("*")) {
        const pattern = ignore.replace("*", ".*");
        return new RegExp(`^${pattern}$`).test(field);
      }
      return ignore === field;
    });

    if (shouldIgnore) return;

    const diagramValue = diagram.attributes[field];
    const deployedValue = deployed.attributes[field];

    if (diagramValue === undefined && deployedValue !== undefined) {
      changes.push({
        field,
        oldValue: undefined,
        newValue: deployedValue,
        changeType: "added",
      });
    } else if (diagramValue !== undefined && deployedValue === undefined) {
      changes.push({
        field,
        oldValue: diagramValue,
        newValue: undefined,
        changeType: "removed",
      });
    } else if (diagramValue !== deployedValue) {
      // Deep comparison for objects
      const diagramStr = JSON.stringify(diagramValue);
      const deployedStr = JSON.stringify(deployedValue);
      if (diagramStr !== deployedStr) {
        changes.push({
          field,
          oldValue: diagramValue,
          newValue: deployedValue,
          changeType: "modified",
        });
      }
    }
  });

  return changes;
}

/**
 * Main drift detection function
 */
export function detectDrift(options: DriftDetectionOptions): DriftResult[] {
  const { diagramGraph, deployedResources, ignoreFields = [], matchBy = "address" } = options;

  // Convert diagram nodes to drift resources
  const diagramResources: DriftResource[] = [];
  diagramGraph.nodes.forEach((node) => {
    const resource = nodeToDriftResource(node);
    if (resource) {
      diagramResources.push(resource);
    }
  });

  // Match resources
  const matches = matchResources(diagramResources, deployedResources, matchBy);
  const matchedDeployed = new Set(matches.keys());
  const matchedDiagram = new Set(matches.keys());

  const results: DriftResult[] = [];

  // Process matched resources (check for modifications)
  matches.forEach((match, key) => {
    const changes = compareResources(match.diagram, match.deployed, [...DEFAULT_IGNORE_FIELDS, ...ignoreFields]);

    if (changes.length > 0) {
      results.push({
        resourceId: match.diagram.id,
        resourceType: match.diagram.type,
        resourceName: match.diagram.name,
        provider: match.diagram.provider,
        driftType: "modified",
        severity: determineSeverity(changes),
        changes,
        terraformAddress: match.diagram.address,
        diagramNodeId: match.diagram.id,
      });
    }
  });

  // Process diagram resources that don't exist in deployed (added in diagram, not deployed)
  diagramResources.forEach((diagram) => {
    let key: string;
    switch (matchBy) {
      case "id":
        key = diagram.id;
        break;
      case "address":
        key = diagram.address;
        break;
      case "name":
        key = diagram.name;
        break;
    }

    if (!matchedDiagram.has(key)) {
      results.push({
        resourceId: diagram.id,
        resourceType: diagram.type,
        resourceName: diagram.name,
        provider: diagram.provider,
        driftType: "added",
        severity: "info",
        changes: [],
        terraformAddress: diagram.address,
        diagramNodeId: diagram.id,
      });
    }
  });

  // Process deployed resources that don't exist in diagram (deployed but not in diagram)
  deployedResources.forEach((deployed) => {
    let key: string;
    switch (matchBy) {
      case "id":
        key = deployed.id;
        break;
      case "address":
        key = deployed.address;
        break;
      case "name":
        key = deployed.name;
        break;
    }

    if (!matchedDeployed.has(key)) {
      // Try to find a matching diagram node by type
      const matchingDiagram = diagramResources.find(
        (d) => d.type === deployed.type && d.name === deployed.name
      );

      results.push({
        resourceId: deployed.id,
        resourceType: deployed.type,
        resourceName: deployed.name,
        provider: deployed.provider,
        driftType: "removed",
        severity: "critical",
        changes: [],
        terraformAddress: deployed.address,
        diagramNodeId: matchingDiagram?.id,
      });
    }
  });

  return results;
}

/**
 * Generates a summary of drift results
 */
export function generateDriftSummary(results: DriftResult[]): DriftSummary {
  const summary: DriftSummary = {
    totalResources: results.length,
    addedCount: 0,
    removedCount: 0,
    modifiedCount: 0,
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
  };

  results.forEach((result) => {
    switch (result.driftType) {
      case "added":
        summary.addedCount++;
        break;
      case "removed":
        summary.removedCount++;
        break;
      case "modified":
        summary.modifiedCount++;
        break;
    }

    switch (result.severity) {
      case "critical":
        summary.criticalCount++;
        break;
      case "warning":
        summary.warningCount++;
        break;
      case "info":
        summary.infoCount++;
        break;
    }
  });

  return summary;
}

/**
 * Filters drift results by severity
 */
export function filterDriftBySeverity(
  results: DriftResult[],
  severity: "info" | "warning" | "critical"
): DriftResult[] {
  return results.filter((r) => r.severity === severity);
}

/**
 * Filters drift results by drift type
 */
export function filterDriftByType(
  results: DriftResult[],
  type: "added" | "removed" | "modified"
): DriftResult[] {
  return results.filter((r) => r.driftType === type);
}

/**
 * Gets drift results for a specific diagram node
 */
export function getDriftForNode(results: DriftResult[], nodeId: string): DriftResult | undefined {
  return results.find((r) => r.diagramNodeId === nodeId);
}

/**
 * Sorts drift results by severity (critical first) then by type
 */
export function sortDriftResults(results: DriftResult[]): DriftResult[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const typeOrder = { removed: 0, modified: 1, added: 2 };

  return [...results].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return typeOrder[a.driftType] - typeOrder[b.driftType];
  });
}