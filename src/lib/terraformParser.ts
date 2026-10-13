/**
 * Simple Terraform HCL parser for importing diagrams
 * Note: This is a basic parser for common patterns. For production use,
 * consider using a proper HCL parser like @terraform-aws-modules/hcl-parser
 */

interface ParsedResource {
  type: string;
  name: string;
  attributes: Record<string, any>;
}

interface ParsedTerraform {
  resources: ParsedResource[];
  variables: Record<string, any>;
  outputs: Record<string, any>;
}

export function parseHCL(content: string): ParsedTerraform {
  const result: ParsedTerraform = {
    resources: [],
    variables: {},
    outputs: {},
  };

  // Remove comments
  const cleaned = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//gm, "");

  // Parse resource blocks: resource "type" "name" { ... }
  const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*{([\s\S]*?)}/g;
  let match;

  while ((match = resourceRegex.exec(cleaned)) !== null) {
    const [, type, name, body] = match;
    const attributes = parseBlockBody(body);
    result.resources.push({ type, name, attributes });
  }

  // Parse variable blocks
  const variableRegex = /variable\s+"([^"]+)"\s*{([\s\S]*?)}/g;
  while ((match = variableRegex.exec(cleaned)) !== null) {
    const [, name, body] = match;
    result.variables[name] = parseBlockBody(body);
  }

  // Parse output blocks
  const outputRegex = /output\s+"([^"]+)"\s*{([\s\S]*?)}/g;
  while ((match = outputRegex.exec(cleaned)) !== null) {
    const [, name, body] = match;
    result.outputs[name] = parseBlockBody(body);
  }

  return result;
}

export function parseBlockBody(body: string): Record<string, any> {
  const result: Record<string, any> = {};

  // Handle nested blocks first (recursive)
  const nestedBlockRegex = /(\w+)\s+"([^"]+)"\s*{([\s\S]*?)}/g;
  let nestedMatch;
  while ((nestedMatch = nestedBlockRegex.exec(body)) !== null) {
    const [, blockType, blockName, blockBody] = nestedMatch;
    const key = `${blockType}_${blockName}`;
    result[key] = parseBlockBody(blockBody);
  }

  // Handle simple key = value pairs
  const attrRegex = /(\w+)\s*=\s*([^\n]+)/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(body)) !== null) {
    const [, key, value] = attrMatch;
    result[key.trim()] = parseValue(value.trim());
  }

  // Handle list values: key = [ "a", "b" ]
  const listRegex = /(\w+)\s*=\s*\[([\s\S]*?)\]/g;
  let listMatch;
  while ((listMatch = listRegex.exec(body)) !== null) {
    const [, key, listContent] = listMatch;
    const items = listContent
      .split(",")
      .map((item) => parseValue(item.trim()))
      .filter((item) => item !== undefined && item !== "");
    result[key.trim()] = items;
  }

  return result;
}

function parseValue(value: string): any {
  // Remove trailing commas
  value = value.replace(/,$/, "").trim();

  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Null
  if (value === "null") return null;

  // Numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // Strings (quoted)
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }

  // References (e.g., aws_vpc.main.id)
  if (value.match(/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\.\w+$/)) {
    return { ref: value };
  }

  // Function calls (e.g., jsonencode({...}))
  if (value.match(/^\w+\(.*\)$/)) {
    return { fn: value };
  }

  return value;
}

/**
 * Convert parsed Terraform resources to InfraFlow diagram format
 */
export function terraformToDiagram(parsed: ParsedTerraform): {
  nodes: any[];
  edges: any[];
} {
  const nodes: any[] = [];
  const edges: any[] = [];
  const resourceIdMap = new Map<string, string>();

  // First pass: create nodes for each resource
  for (const resource of parsed.resources) {
    const nodeId = crypto.randomUUID();
    resourceIdMap.set(`${resource.type}.${resource.name}`, nodeId);

    const nodeType = mapTerraformTypeToNodeType(resource.type);
    if (!nodeType) continue;

    const nodeData = mapResourceAttributes(nodeType, resource.attributes);
    nodeData.NodeID = nodeId;
    nodeData.TerraformType = resource.type;
    nodeData.TerraformName = resource.name;

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x: 0, y: 0 }, // Will be auto-arranged
      data: nodeData,
    });
  }

  // Second pass: create edges based on references
  for (const resource of parsed.resources) {
    const sourceId = resourceIdMap.get(`${resource.type}.${resource.name}`);
    if (!sourceId) continue;

    findReferences(resource.attributes, sourceId, resourceIdMap, edges);
  }

  return { nodes, edges };
}

function mapTerraformTypeToNodeType(tfType: string): string | null {
  const typeMap: Record<string, string> = {
    aws_instance: "ec2",
    aws_vpc: "vpc",
    aws_subnet: "subnet",
    aws_security_group: "securitygroup",
    aws_key_pair: "keypair",
    aws_iam_role: "iam",
    aws_iam_instance_profile: "instanceprofile",
    aws_db_instance: "rds",
    aws_ebs_volume: "ebs",
    aws_volume_attachment: "ec2ebs",
    aws_lb: "elb",
    aws_lb_target_group_attachment: "elbec2",
    aws_s3_bucket: "s3",
  };
  return typeMap[tfType] || null;
}

function mapResourceAttributes(nodeType: string, attrs: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  switch (nodeType) {
    case "ec2":
      result.AMI = attrs.ami;
      result.InstanceType = attrs.instance_type;
      result.KeyName = attrs.key_name;
      result.SecurityGroups = attrs.vpc_security_group_ids?.map((sg: any) =>
        sg.ref ? sg.ref.split(".")[1] : sg
      ) || [];
      result.SubnetID = attrs.subnet_id?.ref ? attrs.subnet_id.ref.split(".")[1] : attrs.subnet_id;
      result.TagName = attrs.tags?.Name || attrs.name;
      result.InstanceProfile = attrs.iam_instance_profile?.ref
        ? attrs.iam_instance_profile.ref.split(".")[1]
        : undefined;
      break;

    case "vpc":
      result.CIDR = attrs.cidr_block;
      result.EnableDNS = attrs.enable_dns_hostnames ? "yes" : "no";
      result.Name = attrs.tags?.Name || attrs.name;
      break;

    case "subnet":
      result.CIDR = attrs.cidr_block;
      result.ParentVpcId = attrs.vpc_id?.ref ? attrs.vpc_id.ref.split(".")[1] : attrs.vpc_id;
      result.AvailabilityZone = attrs.availability_zone;
      result.MapPublicIpOnLaunch = attrs.map_public_ip_on_launch ? "yes" : "no";
      result.Name = attrs.tags?.Name || attrs.name;
      break;

    case "securitygroup":
      result.Name = attrs.name;
      result.Description = attrs.description;
      result.VpcID = attrs.vpc_id?.ref ? attrs.vpc_id.ref.split(".")[1] : attrs.vpc_id;
      break;

    case "keypair":
      result.KeyName = attrs.key_name;
      result.PublicKey = attrs.public_key;
      break;

    case "iam":
      result.Name = attrs.name;
      result.Services = extractServicesFromAssumeRole(attrs.assume_role_policy);
      result.ManagedPolicies = extractPolicyArns(attrs);
      break;

    case "instanceprofile":
      result.Name = attrs.name;
      result.ParentRoleName = attrs.role?.ref ? attrs.role.ref.split(".")[1] : attrs.role;
      break;

    case "rds":
      result.Engine = attrs.engine;
      result.EngineVersion = attrs.engine_version;
      result.InstanceClass = attrs.instance_class;
      result.AllocatedStorage = attrs.allocated_storage;
      result.StorageType = attrs.storage_type;
      result.DBName = attrs.db_name;
      result.Username = attrs.username;
      result.Password = attrs.password;
      result.TagName = attrs.tags?.Name || attrs.name;
      break;

    case "ebs":
      result.Size = attrs.size;
      result.VolumeType = attrs.type;
      result.AvailabilityZone = attrs.availability_zone;
      result.Encrypted = attrs.encrypted ? "yes" : "no";
      result.TagName = attrs.tags?.Name || attrs.name;
      break;

    case "ec2ebs":
      result.VolumeID = attrs.volume_id?.ref ? attrs.volume_id.ref.split(".")[1] : attrs.volume_id;
      result.EC2NodeID = attrs.instance_id?.ref ? attrs.instance_id.ref.split(".")[1] : attrs.instance_id;
      result.DeviceName = attrs.device_name || "/dev/sdf";
      break;

    case "elb":
      result.Name = attrs.name;
      result.Scheme = attrs.internal ? "internal" : "internet-facing";
      result.SubnetID = attrs.subnets?.[0]?.ref ? attrs.subnets[0].ref.split(".")[1] : attrs.subnets?.[0];
      result.ListenerPort = attrs.listeners?.[0]?.port || 80;
      result.TargetPort = attrs.target_group?.[0]?.port || 80;
      break;

    case "elbec2":
      result.ALBNodeID = attrs.target_group_arn?.ref ? attrs.target_group_arn.ref.split(".")[1] : attrs.target_group_arn;
      result.EC2NodeID = attrs.target_id?.ref ? attrs.target_id.ref.split(".")[1] : attrs.target_id;
      result.TargetPort = attrs.port || 80;
      break;

    case "s3":
      result.BucketName = attrs.bucket;
      break;
  }

  return result;
}

function extractServicesFromAssumeRole(policy: any): string[] {
  if (!policy) return [];
  if (typeof policy === "string") {
    try {
      const parsed = JSON.parse(policy);
      return parsed.Statement?.[0]?.Principal?.Service || [];
    } catch {
      return [];
    }
  }
  if (policy.ref) return [];
  return policy.Statement?.[0]?.Principal?.Service || [];
}

function extractPolicyArns(attrs: Record<string, any>): string[] {
  const policies: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("policy_arn") || key.includes("managed_policy")) {
      if (Array.isArray(value)) {
        policies.push(...value);
      } else {
        policies.push(value);
      }
    }
  }
  return policies;
}

function findReferences(
  obj: Record<string, unknown>,
  sourceId: string,
  resourceIdMap: Map<string, string>,
  edges: any[]
): void {
  if (!obj || typeof obj !== "object") return;

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && "ref" in value) {
      const refValue = (value as { ref: string }).ref;
      const targetId = resourceIdMap.get(refValue);
      if (targetId && targetId !== sourceId) {
        const edgeType = mapReferenceToEdgeType(key);
        if (edgeType) {
          edges.push({
            id: crypto.randomUUID(),
            source: sourceId,
            target: targetId,
            type: edgeType,
            data: { label: key },
          });
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          findReferences(item as Record<string, unknown>, sourceId, resourceIdMap, edges);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      findReferences(value as Record<string, unknown>, sourceId, resourceIdMap, edges);
    }
  }
}

function mapReferenceToEdgeType(refKey: string): string | null {
  const edgeMap: Record<string, string> = {
    subnet_id: "subnet",
    vpc_id: "vpc",
    vpc_security_group_ids: "securitygroup",
    key_name: "keypair",
    iam_instance_profile: "instanceprofile",
    security_groups: "securitygroup",
    target_group_arn: "elb",
    target_id: "ec2",
    instance_id: "ec2",
    volume_id: "ebs",
    role: "iam",
  };
  return edgeMap[refKey] || "connection";
}

/**
 * Main export function
 */
export function parseTerraformFile(content: string): {
  nodes: any[];
  edges: any[];
} {
  const parsed = parseHCL(content);
  return terraformToDiagram(parsed);
}