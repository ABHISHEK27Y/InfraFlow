/**
 * Drift Detection Providers
 * Interfaces for fetching deployed infrastructure state from various providers
 */

import { DriftResource } from "./types";

export interface DeployedResourceProvider {
  name: string;
  fetchResources: (config: ProviderConfig) => Promise<DriftResource[]>;
  validateConfig: (config: ProviderConfig) => boolean;
  getConfigSchema: () => ProviderConfigSchema;
}

export interface ProviderConfig {
  provider: string;
  region?: string;
  credentials?: Record<string, string>;
  [key: string]: unknown;
}

export interface ProviderConfigSchema {
  fields: {
    name: string;
    label: string;
    type: "text" | "password" | "select" | "textarea";
    required: boolean;
    options?: string[];
    description?: string;
  }[];
}

/**
 * Mock provider for testing/development
 * In production, this would be replaced with actual AWS/GCP/Azure SDK calls
 */
export class MockProvider implements DeployedResourceProvider {
  name = "mock";

  async fetchResources(config: ProviderConfig): Promise<DriftResource[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock deployed resources
    // In real implementation, this would call AWS SDK, Terraform state, etc.
    return [
      {
        id: "aws_vpc_main",
        type: "aws_vpc",
        provider: "aws",
        name: "main",
        address: "aws_vpc.main",
        attributes: {
          cidr_block: "10.0.0.0/16",
          enable_dns_hostnames: true,
          enable_dns_support: true,
          instance_tenancy: "default",
          tags: { Name: "main-vpc", Environment: "production" },
        },
      },
      {
        id: "aws_subnet_public_1",
        type: "aws_subnet",
        provider: "aws",
        name: "public_1",
        address: "aws_subnet.public_1",
        attributes: {
          vpc_id: "vpc-12345",
          cidr_block: "10.0.1.0/24",
          availability_zone: "us-east-1a",
          map_public_ip_on_launch: true,
          tags: { Name: "public-subnet-1", Tier: "public" },
        },
      },
      {
        id: "aws_subnet_public_2",
        type: "aws_subnet",
        provider: "aws",
        name: "public_2",
        address: "aws_subnet.public_2",
        attributes: {
          vpc_id: "vpc-12345",
          cidr_block: "10.0.2.0/24",
          availability_zone: "us-east-1b",
          map_public_ip_on_launch: true,
          tags: { Name: "public-subnet-2", Tier: "public" },
        },
      },
      {
        id: "aws_instance_web",
        type: "aws_instance",
        provider: "aws",
        name: "web",
        address: "aws_instance.web",
        attributes: {
          ami: "ami-12345",
          instance_type: "t3.medium",
          subnet_id: "subnet-12345",
          vpc_security_group_ids: ["sg-12345"],
          tags: { Name: "web-server", Role: "web" },
        },
      },
      {
        id: "aws_security_group_web",
        type: "aws_security_group",
        provider: "aws",
        name: "web",
        address: "aws_security_group.web",
        attributes: {
          name: "web-sg",
          description: "Security group for web servers",
          vpc_id: "vpc-12345",
          ingress: [
            { from_port: 80, to_port: 80, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] },
            { from_port: 443, to_port: 443, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] },
          ],
          egress: [
            { from_port: 0, to_port: 0, protocol: "-1", cidr_blocks: ["0.0.0.0/0"] },
          ],
          tags: { Name: "web-sg" },
        },
      },
      {
        id: "aws_db_instance_main",
        type: "aws_db_instance",
        provider: "aws",
        name: "main",
        address: "aws_db_instance.main",
        attributes: {
          identifier: "main-db",
          engine: "postgres",
          engine_version: "15.3",
          instance_class: "db.t3.micro",
          allocated_storage: 20,
          storage_encrypted: true,
          deletion_protection: true,
          backup_retention_period: 7,
          multi_az: false,
          publicly_accessible: false,
          tags: { Name: "main-db", Environment: "production" },
        },
      },
      {
        id: "aws_s3_bucket_data",
        type: "aws_s3_bucket",
        provider: "aws",
        name: "data",
        address: "aws_s3_bucket.data",
        attributes: {
          bucket: "my-app-data-bucket",
          versioning: { enabled: true },
          server_side_encryption_configuration: {
            rule: { apply_server_side_encryption_by_default: { sse_algorithm: "AES256" } },
          },
          tags: { Name: "data-bucket", Environment: "production" },
        },
      },
    ];
  }

  validateConfig(config: ProviderConfig): boolean {
    return true; // Mock always valid
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "region",
          label: "AWS Region",
          type: "select",
          required: true,
          options: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
          description: "AWS region to scan for resources",
        },
      ],
    };
  }
}

/**
 * Terraform State Provider
 * Reads from local or remote Terraform state files
 */
export class TerraformStateProvider implements DeployedResourceProvider {
  name = "terraform-state";

  async fetchResources(config: ProviderConfig): Promise<DriftResource[]> {
    // In production, this would:
    // 1. Read terraform.tfstate file
    // 2. Parse resources from state
    // 3. Convert to DriftResource format
    // For now, return empty array as placeholder
    console.warn("TerraformStateProvider not fully implemented - returning empty resources");
    return [];
  }

  validateConfig(config: ProviderConfig): boolean {
    return !!(config.statePath || config.stateBackend);
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "statePath",
          label: "State File Path",
          type: "text",
          required: false,
          description: "Path to local terraform.tfstate file",
        },
        {
          name: "stateBackend",
          label: "State Backend Config",
          type: "textarea",
          required: false,
          description: "JSON configuration for remote state backend (S3, Consul, etc.)",
        },
      ],
    };
  }
}

/**
 * AWS Provider (placeholder for real implementation)
 * Would use AWS SDK to fetch actual deployed resources
 */
export class AWSProvider implements DeployedResourceProvider {
  name = "aws";

  async fetchResources(config: ProviderConfig): Promise<DriftResource[]> {
    // In production, this would use @aws-sdk/client-* to:
    // - List VPCs, Subnets, EC2 instances, RDS, S3, etc.
    // - Convert to DriftResource format
    console.warn("AWSProvider not fully implemented - use MockProvider for testing");
    return [];
  }

  validateConfig(config: ProviderConfig): boolean {
    return !!(config.region && config.credentials);
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "region",
          label: "AWS Region",
          type: "select",
          required: true,
          options: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"],
          description: "AWS region to scan",
        },
        {
          name: "accessKeyId",
          label: "Access Key ID",
          type: "text",
          required: true,
          description: "AWS Access Key ID",
        },
        {
          name: "secretAccessKey",
          label: "Secret Access Key",
          type: "password",
          required: true,
          description: "AWS Secret Access Key",
        },
        {
          name: "sessionToken",
          label: "Session Token (optional)",
          type: "password",
          required: false,
          description: "AWS Session Token for temporary credentials",
        },
      ],
    };
  }
}

/**
 * Registry of available providers
 */
export const providerRegistry: Record<string, DeployedResourceProvider> = {
  mock: new MockProvider(),
  "terraform-state": new TerraformStateProvider(),
  aws: new AWSProvider(),
};

/**
 * Gets a provider by name
 */
export function getProvider(name: string): DeployedResourceProvider | undefined {
  return providerRegistry[name];
}

/**
 * Lists all available providers
 */
export function listProviders(): DeployedResourceProvider[] {
  return Object.values(providerRegistry);
}