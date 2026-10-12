import * as hcl2json from "hcl2json";
import type { AnyNode } from "@/utils/types/resource";

export interface TerraformResource {
  type: string;
  name: string;
  provider: string;
  data: Record<string, unknown>;
  location?: {
    file: string;
    line: number;
  };
}

export interface TerraformModule {
  source: string;
  version?: string;
  providers: Record<string, { source: string; version?: string }>;
  variables?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  resources: TerraformResource[];
  dataSources: TerraformResource[];
  modules: TerraformModule[];
}

export interface ImportResult {
  success: boolean;
  module?: TerraformModule;
  errors: string[];
  warnings: string[];
}

/**
 * Parses Terraform HCL content and extracts resources, data sources, and modules
 */
export async function parseTerraformHCL(content: string, fileName: string = "main.tf"): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse HCL to JSON
    const parsed = await hcl2json.parse(content);

    const tfModule: TerraformModule = {
      source: fileName,
      resources: [],
      dataSources: [],
      modules: [],
      providers: {} as Record<string, { source: string; version?: string }>,
      variables: {},
      outputs: {},
    };

    // Extract resources
    if (parsed.resource) {
      for (const resourceType of Object.keys(parsed.resource)) {
        for (const resourceName of Object.keys(parsed.resource[resourceType])) {
          const resourceData = parsed.resource[resourceType][resourceName];

          // Determine provider from resource type prefix
          const provider = resourceType.split("_")[0] || "aws";

          tfModule.resources.push({
            type: resourceType,
            name: resourceName,
            provider,
            data: resourceData,
            location: { file: fileName, line: 0 }, // Line numbers not available in hcl2json
          });
        }
      }
    }

    // Extract data sources
    if (parsed.data) {
      for (const dataType of Object.keys(parsed.data)) {
        for (const dataName of Object.keys(parsed.data[dataType])) {
          const dataData = parsed.data[dataType][dataName];

          const provider = dataType.split("_")[0] || "aws";

          tfModule.dataSources.push({
            type: dataType,
            name: dataName,
            provider,
            data: dataData,
            location: { file: fileName, line: 0 },
          });
        }
      }
    }

    // Extract modules
    if (parsed.module) {
      for (const moduleName of Object.keys(parsed.module)) {
        const moduleData = parsed.module[moduleName];
        tfModule.modules.push({
          source: moduleData.source as string || "",
          version: moduleData.version as string,
          providers: {},
          resources: [],
          dataSources: [],
          modules: [],
        });
      }
    }

    // Extract providers
    if (parsed.provider) {
      for (const providerName of Object.keys(parsed.provider)) {
        const providerConfig = parsed.provider[providerName];
        tfModule.providers[providerName] = {
          source: providerConfig.source as string || providerName,
          version: providerConfig.version as string,
        };
      }
    }

    // Extract variables
    if (parsed.variable) {
      tfModule.variables = parsed.variable;
    }

    // Extract outputs
    if (parsed.output) {
      tfModule.outputs = parsed.output;
    }

    return {
      success: true,
      module: tfModule,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse HCL: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
    };
  }
}

/**
 * Converts Terraform resource to canvas node data
 */
export function terraformResourceToNode(resource: TerraformResource, index: number, total: number): AnyNode {
  // Calculate grid position
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const spacing = 280;

  const nodeType = mapTerraformTypeToNodeType(resource.type);

  return {
    id: `${resource.type}_${resource.name}`,
    type: nodeType,
    position: {
      x: col * spacing + 100,
      y: row * spacing + 100,
    },
    data: {
      name: resource.name,
      terraformType: resource.type,
      provider: resource.provider,
      ...resource.data,
    },
  } as unknown as AnyNode;
}

function mapTerraformTypeToNodeType(terraformType: string): string {
  // Map common Terraform resource types to our node types
  const typeMap: Record<string, string> = {
    "aws_vpc": "vpc",
    "aws_subnet": "subnet",
    "aws_instance": "ec2",
    "aws_db_instance": "rds",
    "aws_lb": "elb",
    "aws_lb_target_group": "elb",
    "aws_security_group": "security-group",
    "aws_s3_bucket": "s3",
    "aws_iam_role": "iam-role",
    "aws_iam_policy": "iam-policy",
    "aws_kms_key": "kms",
    "aws_cloudwatch_log_group": "cloudwatch",
    "aws_ecs_cluster": "ecs",
    "aws_ecs_service": "ecs-service",
    "aws_ecs_task_definition": "ecs-task",
    "aws_eks_cluster": "eks",
    "aws_lambda_function": "lambda",
    "aws_api_gateway_rest_api": "api-gateway",
    "aws_route53_zone": "route53",
    "aws_cloudfront_distribution": "cloudfront",
    "aws_elasticache_cluster": "elasticache",
    "aws_elasticache_replication_group": "elasticache",
    "aws_redshift_cluster": "redshift",
    "aws_dynamodb_table": "dynamodb",
    "aws_sqs_queue": "sqs",
    "aws_sns_topic": "sns",
    "aws_kinesis_stream": "kinesis",
  };

  return typeMap[terraformType] || "generic";
}

/**
 * Imports Terraform from multiple files
 */
export async function importTerraformFromFiles(files: File[]): Promise<ImportResult> {
  const allResources: TerraformResource[] = [];
  const allDataSources: TerraformResource[] = [];
  const allModules: TerraformModule[] = [];
  let allProviders: Record<string, { source: string; version?: string }> = {};
  let allVariables: Record<string, unknown> = {};
  let allOutputs: Record<string, unknown> = {};
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const content = await file.text();
    const result = await parseTerraformHCL(content, file.name);

    if (!result.success) {
      allErrors.push(...result.errors);
      continue;
    }

    if (result.module) {
      allResources.push(...result.module.resources);
      allDataSources.push(...result.module.dataSources);
      allModules.push(...result.module.modules);
      allProviders = { ...allProviders, ...result.module.providers };
      allVariables = { ...allVariables, ...result.module.variables };
      allOutputs = { ...allOutputs, ...result.module.outputs };
      allWarnings.push(...result.warnings);
    }
  }

  return {
    success: allErrors.length === 0,
    module: {
      source: "merged",
      resources: allResources,
      dataSources: allDataSources,
      modules: allModules,
      providers: allProviders,
      variables: allVariables,
      outputs: allOutputs,
    },
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Generates import summary for UI
 */
export function generateImportSummary(module: TerraformModule): string {
  const resourceCount = module.resources.length;
  const dataSourceCount = module.dataSources.length;
  const moduleCount = module.modules.length;

  const resourceTypes = new Set(module.resources.map(r => r.type));
  const providers = new Set(module.resources.map(r => r.provider));

  return `
Import Summary:
- Resources: ${resourceCount} (${resourceTypes.size} types)
- Data Sources: ${dataSourceCount}
- Modules: ${moduleCount}
- Providers: ${Array.from(providers).join(", ")}
  `.trim();
}