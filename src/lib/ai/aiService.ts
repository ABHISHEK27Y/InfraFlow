"use client";

import { AnyNode, ResourceBlock } from "@/utils/types/resource";
import type { Edge } from "@xyflow/react";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DiagramGenerationResult {
  nodes: AnyNode[];
  edges: Edge[];
  explanation: string;
  suggestedPatterns?: string[];
}

export interface ResourceSuggestion {
  type: string;
  reason: string;
  suggestedConfig: Partial<ResourceBlock["data"]>;
  connections?: { targetType: string; reason: string }[];
}

export interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  category: "web" | "data" | "serverless" | "microservices" | "hybrid";
  nodes: Partial<AnyNode>[];
  edges: Partial<Edge>[];
  estimatedCost?: string;
  complexity: "simple" | "moderate" | "complex";
}

export interface CostOptimizationRecommendation {
  id: string;
  type: "rightsizing" | "reserved_instances" | "savings_plans" | "storage_tiering" | "idle_resources" | "architecture";
  title: string;
  description: string;
  resourceType: string;
  resourceName?: string;
  currentCost: string;
  estimatedSavings: string;
  savingsPercentage: number;
  effort: "low" | "medium" | "high";
  implementationSteps: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface SecurityComplianceFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "network" | "identity" | "data" | "monitoring" | "compliance" | "configuration";
  title: string;
  description: string;
  resourceType?: string;
  resourceName?: string;
  remediation: string;
  references?: string[];
  frameworks?: string[];
}

export interface TerraformGenerationResult {
  mainTF: string;
  variablesTF: string;
  outputsTF: string;
  providersTF: string;
  versionsTF: string;
  modules?: Record<string, string>;
  explanation: string;
}

const SYSTEM_PROMPT = `You are InfraFlow AI, an expert cloud infrastructure architect specializing in AWS.
Your task is to convert natural language descriptions into valid infrastructure diagrams.

AVAILABLE AWS RESOURCE TYPES:
- vpc: Virtual Private Cloud (container for subnets)
- subnet: Public or private subnet within a VPC
- ec2: EC2 instance (specify instance type, AMI)
- rds: RDS database (specify engine, instance class)
- elb: Elastic Load Balancer (ALB/NLB)
- s3: S3 bucket
- lambda: Lambda function
- iam: IAM role/policy
- security-group: Security group
- nat-gateway: NAT Gateway for private subnet internet access
- internet-gateway: Internet Gateway for VPC
- route-table: Route table for subnet routing
- eip: Elastic IP
- cloudfront: CloudFront distribution
- waf: WAF Web ACL
- autoscaling: Auto Scaling Group
- ecs: ECS Cluster/Service
- eks: EKS Cluster
- efs: EFS File System
- dynamodb: DynamoDB table
- sqs: SQS queue
- sns: SNS topic
- eventbridge: EventBridge bus
- secretsmanager: Secrets Manager secret
- parameter-store: Systems Manager Parameter Store
- cloudwatch: CloudWatch log group/alarm
- kms: KMS key

OUTPUT FORMAT (JSON):
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "resource-type",
      "position": { "x": 100, "y": 100 },
      "data": {
        "Name": "resource-name",
        ...resource-specific-config
      }
    }
  ],
  "edges": [
    { "id": "edge-id", "source": "node-id", "target": "node-id", "type": "default" }
  ],
  "explanation": "Human-readable explanation of the architecture",
  "suggestedPatterns": ["pattern-name"]
}

RULES:
1. Always create a VPC first if networking resources are needed
2. Place subnets inside VPCs (parentId = VPC id)
3. Private subnets need NAT Gateway for internet access
4. Public subnets need Internet Gateway
5. ALB goes in public subnets, targets in private
6. RDS goes in private subnets
7. Use security groups for all network resources
8. Follow AWS Well-Architected Framework principles
9. Position nodes logically (left-to-right flow)
10. Include all necessary connections`;

const SUGGESTION_SYSTEM_PROMPT = `You are InfraFlow AI. Analyze the current diagram and suggest missing or recommended resources.
Return JSON array of suggestions:
[{
  "type": "resource-type",
  "reason": "Why this is needed",
  "suggestedConfig": { "Name": "name", ...config },
  "connections": [{ "targetType": "existing-resource-type", "reason": "connection reason" }]
}]`;

class AIService {
  private apiKey: string | null = null;
  private baseUrl = "/api/ai";

  setApiKey(key: string) {
    this.apiKey = key || null;
    // Keep a user-supplied key only in memory for this browser session.
    localStorage.removeItem("infraflow_ai_key");
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  async generateDiagram(prompt: string, context?: { existingNodes: AnyNode[]; existingEdges: Edge[] }): Promise<DiagramGenerationResult> {
    const messages: AIMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: this.buildDiagramPrompt(prompt, context) },
    ];

    const response = await this.callLLM(messages, { temperature: 0.3, maxTokens: 4000 });
    return this.parseDiagramResponse(response);
  }

  async suggestResources(nodes: AnyNode[], edges: Edge[]): Promise<ResourceSuggestion[]> {
    const context = this.summarizeDiagram(nodes, edges);
    const messages: AIMessage[] = [
      { role: "system", content: SUGGESTION_SYSTEM_PROMPT },
      { role: "user", content: `Current diagram:\n${context}\n\nSuggest missing or recommended resources.` },
    ];

    const response = await this.callLLM(messages, { temperature: 0.4, maxTokens: 2000 });
    return this.parseSuggestionsResponse(response);
  }

  async getArchitecturePatterns(): Promise<ArchitecturePattern[]> {
    return [
      {
        id: "three-tier-web",
        name: "Three-Tier Web Application",
        description: "Classic web app with ALB, public subnets for ALB, private subnets for app servers, private subnets for RDS",
        category: "web",
        nodes: [
          { type: "vpc", data: { Name: "Main VPC", CIDR: "10.0.0.0/16", EnableDNS: "yes" } },
          { type: "subnet", data: { Name: "Public Subnet 1", CIDR: "10.0.1.0/24", AvailabilityZone: "us-east-1a", MapPublicIpOnLaunch: "yes" } },
          { type: "subnet", data: { Name: "Public Subnet 2", CIDR: "10.0.2.0/24", AvailabilityZone: "us-east-1b", MapPublicIpOnLaunch: "yes" } },
          { type: "subnet", data: { Name: "App Subnet 1", CIDR: "10.0.11.0/24", AvailabilityZone: "us-east-1a" } },
          { type: "subnet", data: { Name: "App Subnet 2", CIDR: "10.0.12.0/24", AvailabilityZone: "us-east-1b" } },
          { type: "subnet", data: { Name: "DB Subnet 1", CIDR: "10.0.21.0/24", AvailabilityZone: "us-east-1a" } },
          { type: "subnet", data: { Name: "DB Subnet 2", CIDR: "10.0.22.0/24", AvailabilityZone: "us-east-1b" } },
          { type: "internet-gateway", data: { Name: "IGW" } },
          { type: "nat-gateway", data: { Name: "NAT Gateway 1" } },
          { type: "nat-gateway", data: { Name: "NAT Gateway 2" } },
          { type: "elb", data: { Name: "ALB", Scheme: "internet-facing", ListenerPort: "80", TargetPort: "80" } },
          { type: "ec2", data: { Name: "App Server", InstanceType: "t3.medium", AMI: "ami-12345678" } },
          { type: "rds", data: { Name: "Primary DB", Engine: "postgres", InstanceClass: "db.t3.medium", AllocatedStorage: 20, DBName: "appdb", MasterUsername: "admin", MasterPassword: "changeme" } },
        ],
        edges: [
          { source: "vpc", target: "igw" },
          { source: "vpc", target: "nat-gateway-1" },
          { source: "vpc", target: "nat-gateway-2" },
          { source: "alb", target: "ec2" },
          { source: "ec2", target: "rds" },
        ],
        estimatedCost: "$150-300/month",
        complexity: "moderate",
      },
      {
        id: "serverless-api",
        name: "Serverless REST API",
        description: "API Gateway + Lambda + DynamoDB (simulated with S3) with custom domain and WAF",
        category: "serverless",
        nodes: [
          { type: "s3", data: { Name: "API Data Bucket" } },
          { type: "lambda", data: { Name: "API Handler", runtime: "nodejs20.x", memory: "256" } },
          { type: "elb", data: { Name: "ALB Frontend", Scheme: "internet-facing", ListenerPort: "443", TargetPort: "80" } },
          { type: "s3", data: { Name: "Static Assets Bucket" } },
        ],
        edges: [
          { source: "elb", target: "lambda" },
          { source: "lambda", target: "s3" },
        ],
        estimatedCost: "$10-50/month",
        complexity: "simple",
      },
      {
        id: "microservices-ec2",
        name: "Microservices on EC2",
        description: "EC2-based microservices with ALB, RDS, ElastiCache (simulated), and monitoring",
        category: "microservices",
        nodes: [
          { type: "vpc", data: { Name: "Microservices VPC", CIDR: "10.0.0.0/16", EnableDNS: "yes" } },
          { type: "subnet", data: { Name: "Public Subnet 1", CIDR: "10.0.1.0/24" } },
          { type: "subnet", data: { Name: "Public Subnet 2", CIDR: "10.0.2.0/24" } },
          { type: "subnet", data: { Name: "Private Subnet 1", CIDR: "10.0.11.0/24" } },
          { type: "subnet", data: { Name: "Private Subnet 2", CIDR: "10.0.12.0/24" } },
          { type: "elb", data: { Name: "ALB Ingress", Scheme: "internet-facing", ListenerPort: "80", TargetPort: "8080" } },
          { type: "ec2", data: { Name: "Service A", InstanceType: "t3.medium", AMI: "ami-12345678" } },
          { type: "ec2", data: { Name: "Service B", InstanceType: "t3.medium", AMI: "ami-12345678" } },
          { type: "rds", data: { Name: "Shared DB", Engine: "postgres", InstanceClass: "db.t3.medium", AllocatedStorage: 20, DBName: "shared", MasterUsername: "admin", MasterPassword: "changeme" } },
          { type: "ebs", data: { Name: "Redis Cache Volume", VolumeType: "gp3", Size: 20 } },
          { type: "security-group", data: { Name: "App SG", Description: "Application security group" } },
        ],
        edges: [
          { source: "elb", target: "ec2" },
          { source: "ec2", target: "rds" },
          { source: "ec2", target: "ebs" },
        ],
        estimatedCost: "$500-2000/month",
        complexity: "complex",
      },
      {
        id: "data-lake",
        name: "Analytics Data Lake",
        description: "S3-based data lake with ETL (EC2), query engine, and BI",
        category: "data",
        nodes: [
          { type: "s3", data: { Name: "Raw Data Bucket" } },
          { type: "s3", data: { Name: "Processed Data Bucket" } },
          { type: "s3", data: { Name: "Curated Data Bucket" } },
          { type: "ec2", data: { Name: "ETL Server", InstanceType: "r5.xlarge", AMI: "ami-12345678" } },
          { type: "ec2", data: { Name: "Query Engine", InstanceType: "r5.2xlarge", AMI: "ami-12345678" } },
          { type: "ec2", data: { Name: "BI Server", InstanceType: "t3.large", AMI: "ami-12345678" } },
        ],
        edges: [
          { source: "ec2", target: "s3" },
          { source: "ec2", target: "s3" },
          { source: "ec2", target: "s3" },
          { source: "ec2", target: "s3" },
          { source: "ec2", target: "ec2" },
        ],
        estimatedCost: "$200-1000/month",
        complexity: "moderate",
      },
    ];
  }

  private buildDiagramPrompt(prompt: string, context?: { existingNodes: AnyNode[]; existingEdges: Edge[] }): string {
    let fullPrompt = `Generate an AWS infrastructure diagram for: ${prompt}`;

    if (context) {
      fullPrompt += `\n\nExisting diagram context (add to or modify):\n${this.summarizeDiagram(context.existingNodes, context.existingEdges)}`;
    }

    fullPrompt += `\n\nReturn only valid JSON matching the specified format.`;
    return fullPrompt;
  }

  private summarizeDiagram(nodes: AnyNode[], edges: Edge[]): string {
    const summary = nodes.map(n => {
      const data = n.data as Record<string, unknown>;
      return `- ${n.type}: ${data.Name || n.id} (${n.parentId ? `in ${n.parentId}` : "root"})`;
    }).join("\n");

    const connections = edges.map(e => `  ${e.source} → ${e.target}`).join("\n");

    return `Nodes:\n${summary}\n\nConnections:\n${connections}`;
  }

  private async callLLM(messages: AIMessage[], options: { temperature: number; maxTokens: number }): Promise<string> {
    const key = this.getApiKey();

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private parseDiagramResponse(response: string): DiagramGenerationResult {
    try {
      const parsed = JSON.parse(response);
      return {
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        explanation: parsed.explanation || "Generated diagram",
        suggestedPatterns: parsed.suggestedPatterns,
      };
    } catch {
      console.error("Failed to parse AI response:", response);
      throw new Error("Invalid AI response format");
    }
  }

  private parseSuggestionsResponse(response: string): ResourceSuggestion[] {
    try {
      return JSON.parse(response);
    } catch {
      console.error("Failed to parse suggestions:", response);
      return [];
    }
  }

  // ============ COST OPTIMIZATION AI ============
  async analyzeCostOptimization(
    nodes: AnyNode[],
    edges: Edge[],
    costData?: { totalMonthlyCost: string; breakdown: Record<string, string> }
  ): Promise<CostOptimizationRecommendation[]> {
    const context = this.summarizeDiagram(nodes, edges);
    const costContext = costData
      ? `\n\nCurrent Cost Analysis:\nTotal: ${costData.totalMonthlyCost}\nBreakdown:\n${Object.entries(costData.breakdown).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`
      : "";

    const COST_OPTIMIZATION_PROMPT = `You are InfraFlow AI, an expert in AWS cost optimization. Analyze the infrastructure and provide specific, actionable cost optimization recommendations.

Return JSON array of recommendations:
[{
  "id": "unique-id",
  "type": "rightsizing|reserved_instances|savings_plans|storage_tiering|idle_resources|architecture",
  "title": "Short title",
  "description": "Detailed explanation",
  "resourceType": "ec2|rds|s3|elb|...",
  "resourceName": "optional resource name",
  "currentCost": "$XX/month",
  "estimatedSavings": "$XX/month",
  "savingsPercentage: number,
  "effort": "low|medium|high",
  "implementationSteps": ["step1", "step2", ...],
  "riskLevel": "low|medium|high"
}]

Focus on:
1. Rightsizing over-provisioned instances
2. Reserved Instances / Savings Plans for steady workloads
3. Storage tiering (S3 Intelligent-Tiering, Glacier)
4. Identifying idle/unused resources
5. Architecture improvements (serverless, spot instances, etc.)`;

    const messages: AIMessage[] = [
      { role: "system", content: COST_OPTIMIZATION_PROMPT },
      { role: "user", content: `Current diagram:\n${context}${costContext}\n\nProvide cost optimization recommendations.` },
    ];

    const response = await this.callLLM(messages, { temperature: 0.3, maxTokens: 3000 });
    return this.parseCostOptimizationResponse(response);
  }

  private parseCostOptimizationResponse(response: string): CostOptimizationRecommendation[] {
    try {
      return JSON.parse(response);
    } catch {
      console.error("Failed to parse cost optimization response:", response);
      return [];
    }
  }

  // ============ SECURITY/COMPLIANCE AI REVIEW ============
  async analyzeSecurityCompliance(
    nodes: AnyNode[],
    edges: Edge[],
    frameworks?: string[]
  ): Promise<SecurityComplianceFinding[]> {
    const context = this.summarizeDiagram(nodes, edges);
    const frameworkContext = frameworks && frameworks.length > 0
      ? `\n\nCompliance Frameworks to Check: ${frameworks.join(", ")}`
      : "";

    const SECURITY_PROMPT = `You are InfraFlow AI, an expert in cloud security and compliance. Analyze the infrastructure for security vulnerabilities and compliance gaps.

Return JSON array of findings:
[{
  "id": "unique-id",
  "severity": "critical|high|medium|low|info",
  "category": "network|identity|data|monitoring|compliance|configuration",
  "title": "Short title",
  "description": "Detailed explanation of the issue",
  "resourceType": "ec2|rds|s3|vpc|...",
  "resourceName": "optional resource name",
  "remediation": "Specific steps to fix",
  "references": ["AWS docs URL", "CIS benchmark", ...],
  "frameworks": ["CIS", "NIST", "SOC2", "PCI-DSS", "HIPAA", "GDPR"]
}]

Check for:
1. Network: Open security groups, missing NACLs, public subnets without need
2. Identity: Over-permissive IAM, missing MFA, root account usage
3. Data: Unencrypted storage, public S3 buckets, missing backup
4. Monitoring: Missing CloudTrail, GuardDuty, Config, logging
5. Compliance: Framework-specific requirements
6. Configuration: Default settings, missing tags, outdated versions`;

    const messages: AIMessage[] = [
      { role: "system", content: SECURITY_PROMPT },
      { role: "user", content: `Current diagram:\n${context}${frameworkContext}\n\nProvide security and compliance findings.` },
    ];

    const response = await this.callLLM(messages, { temperature: 0.2, maxTokens: 4000 });
    return this.parseSecurityResponse(response);
  }

  private parseSecurityResponse(response: string): SecurityComplianceFinding[] {
    try {
      return JSON.parse(response);
    } catch {
      console.error("Failed to parse security response:", response);
      return [];
    }
  }

  // ============ TERRAFORM GENERATION FROM DIAGRAM ============
  async generateTerraformFromDiagram(
    nodes: AnyNode[],
    edges: Edge[],
    options?: { moduleStructure?: boolean; includeProvider?: boolean; includeBackend?: boolean }
  ): Promise<TerraformGenerationResult> {
    const context = this.summarizeDiagram(nodes, edges);
    const moduleOption = options?.moduleStructure ? "Use module structure (separate files per resource type)" : "Single main.tf file";
    const backendOption = options?.includeBackend ? "Include S3 backend configuration" : "";

    const TERRAFORM_PROMPT = `You are InfraFlow AI, an expert in Terraform. Generate production-ready Terraform HCL code from the infrastructure diagram.

Return JSON with these fields:
{
  "mainTF": "main.tf content",
  "variablesTF": "variables.tf content",
  "outputsTF": "outputs.tf content",
  "providersTF": "providers.tf content",
  "versionsTF": "versions.tf content",
  "modules": { "module-name": "module content" }, // optional, if moduleStructure=true
  "explanation": "Human-readable explanation of the generated code"
}

Requirements:
1. Use AWS provider with proper version constraints
2. Follow Terraform best practices (naming, modules, locals)
3. Include all resources from the diagram with proper dependencies
4. Use variables for configurable values (regions, instance types, CIDR blocks)
5. Output important values (VPC ID, ALB DNS, DB endpoint, etc.)
6. Handle resource references correctly (use terraform references, not hardcoded values)
7. Add appropriate tags to all resources
8. Include lifecycle rules where appropriate (prevent_destroy for stateful resources)

${moduleOption}
${backendOption}`;

    const messages: AIMessage[] = [
      { role: "system", content: TERRAFORM_PROMPT },
      { role: "user", content: `Current diagram:\n${context}\n\nGenerate Terraform HCL code.` },
    ];

    const response = await this.callLLM(messages, { temperature: 0.1, maxTokens: 8000 });
    return this.parseTerraformResponse(response);
  }

  private parseTerraformResponse(response: string): TerraformGenerationResult {
    try {
      return JSON.parse(response);
    } catch {
      console.error("Failed to parse Terraform response:", response);
      return {
        mainTF: "",
        variablesTF: "",
        outputsTF: "",
        providersTF: "",
        versionsTF: "",
        explanation: "Failed to generate Terraform code",
      };
    }
  }
}

export const aiService = new AIService();
