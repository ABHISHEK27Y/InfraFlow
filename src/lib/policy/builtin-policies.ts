import { PolicyRule, PolicySet } from "./types";

export const awsSecurityPolicies: PolicyRule[] = [
  {
    id: "aws-s3-no-public-read",
    name: "S3 Bucket Public Read Prohibited",
    description: "S3 buckets should not have public read access",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_s3_bucket", "aws_s3_bucket_public_access_block"],
    query: `
      package aws.s3

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        not resource.data.acl
        msg := "S3 bucket " + resource.name + " has no explicit ACL (defaults to private but should be explicit)"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        resource.data.acl == "public-read"
        msg := "S3 bucket " + resource.name + " has public-read ACL"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        resource.data.acl == "public-read-write"
        msg := "S3 bucket " + resource.name + " has public-read-write ACL"
      }
    `,
  },
  {
    id: "aws-s3-versioning-enabled",
    name: "S3 Bucket Versioning Enabled",
    description: "S3 buckets should have versioning enabled for data protection",
    severity: "warning",
    category: "security",
    resourceTypes: ["aws_s3_bucket"],
    query: `
      package aws.s3

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        not resource.data.versioning
        msg := "S3 bucket " + resource.name + " does not have versioning enabled"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        resource.data.versioning
        resource.data.versioning.enabled != true
        msg := "S3 bucket " + resource.name + " has versioning disabled"
      }
    `,
  },
  {
    id: "aws-s3-encryption-enabled",
    name: "S3 Bucket Encryption Enabled",
    description: "S3 buckets should have server-side encryption enabled",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_s3_bucket"],
    query: `
      package aws.s3

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        not resource.data.server_side_encryption_configuration
        msg := "S3 bucket " + resource.name + " does not have server-side encryption configured"
      }
    `,
  },
  {
    id: "aws-ec2-no-public-ip",
    name: "EC2 Instance Public IP Prohibited",
    description: "EC2 instances should not have public IP addresses assigned",
    severity: "warning",
    category: "security",
    resourceTypes: ["aws_instance"],
    query: `
      package aws.ec2

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_instance"
        resource.data.associate_public_ip_address == true
        msg := "EC2 instance " + resource.name + " has public IP address enabled"
      }
    `,
  },
  {
    id: "aws-ec2-imdsv2-enforced",
    name: "EC2 Instance IMDSv2 Enforced",
    description: "EC2 instances should enforce IMDSv2 for metadata access",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_instance"],
    query: `
      package aws.ec2

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_instance"
        not resource.data.metadata_options
        msg := "EC2 instance " + resource.name + " does not enforce IMDSv2"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_instance"
        resource.data.metadata_options
        resource.data.metadata_options.http_tokens != "required"
        msg := "EC2 instance " + resource.name + " does not enforce IMDSv2 (http_tokens not required)"
      }
    `,
  },
  {
    id: "aws-rds-encryption-enabled",
    name: "RDS Encryption Enabled",
    description: "RDS instances should have encryption at rest enabled",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_db_instance"],
    query: `
      package aws.rds

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_db_instance"
        resource.data.storage_encrypted != true
        msg := "RDS instance " + resource.name + " does not have encryption at rest enabled"
      }
    `,
  },
  {
    id: "aws-rds-backup-retention",
    name: "RDS Backup Retention Configured",
    description: "RDS instances should have automated backups with sufficient retention",
    severity: "warning",
    category: "reliability",
    resourceTypes: ["aws_db_instance"],
    query: `
      package aws.rds

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_db_instance"
        not resource.data.backup_retention_period
        msg := "RDS instance " + resource.name + " does not have backup retention configured"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_db_instance"
        resource.data.backup_retention_period < 7
        msg := "RDS instance " + resource.name + " has backup retention less than 7 days"
      }
    `,
  },
  {
    id: "aws-sg-no-unrestricted-ingress",
    name: "Security Group Unrestricted Ingress",
    description: "Security groups should not allow unrestricted ingress (0.0.0.0/0) on sensitive ports",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_security_group", "aws_security_group_rule"],
    query: `
      package aws.securitygroup

      sensitive_ports := {"22", "3389", "3306", "5432", "27017", "6379", "9200", "11211"}

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_security_group"
        ingress := resource.data.ingress[_]
        ingress.cidr_blocks[_] == "0.0.0.0/0"
        ingress.from_port <= 1024
        ingress.to_port >= 1024
        msg := "Security group " + resource.name + " allows unrestricted ingress on port range " + ingress.from_port + "-" + ingress.to_port
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_security_group"
        ingress := resource.data.ingress[_]
        ingress.cidr_blocks[_] == "0.0.0.0/0"
        port_str := ingress.from_port + ""
        sensitive_ports[port_str]
        msg := "Security group " + resource.name + " allows unrestricted ingress on sensitive port " + port_str
      }
    `,
  },
  {
    id: "aws-iam-no-wildcard-policies",
    name: "IAM Policy Wildcard Actions",
    description: "IAM policies should not use wildcard actions (*) on wildcard resources (*)",
    severity: "error",
    category: "security",
    resourceTypes: ["aws_iam_policy", "aws_iam_role_policy"],
    query: `
      package aws.iam

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_iam_policy"
        statement := resource.data.policy[_]
        statement.effect == "Allow"
        statement.actions[_] == "*"
        statement.resources[_] == "*"
        msg := "IAM policy " + resource.name + " allows all actions on all resources"
      }
    `,
  },
  {
    id: "aws-kms-key-rotation",
    name: "KMS Key Rotation Enabled",
    description: "KMS keys should have automatic key rotation enabled",
    severity: "warning",
    category: "security",
    resourceTypes: ["aws_kms_key"],
    query: `
      package aws.kms

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_kms_key"
        resource.data.enable_key_rotation != true
        msg := "KMS key " + resource.name + " does not have automatic key rotation enabled"
      }
    `,
  },
  {
    id: "aws-cloudtrail-enabled",
    name: "CloudTrail Enabled",
    description: "CloudTrail should be enabled for all regions",
    severity: "error",
    category: "compliance",
    resourceTypes: ["aws_cloudtrail"],
    query: `
      package aws.cloudtrail

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_cloudtrail"
        not resource.data.is_multi_region_trail
        msg := "CloudTrail " + resource.name + " is not a multi-region trail"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_cloudtrail"
        resource.data.enable_logging != true
        msg := "CloudTrail " + resource.name + " does not have logging enabled"
      }
    `,
  },
];

export const awsCostPolicies: PolicyRule[] = [
  {
    id: "aws-ec2-rightsizing",
    name: "EC2 Instance Rightsizing",
    description: "EC2 instances should be appropriately sized for workload",
    severity: "info",
    category: "cost",
    resourceTypes: ["aws_instance"],
    query: `
      package aws.cost

      oversized_types := {"m5.24xlarge", "m5.12xlarge", "c5.24xlarge", "r5.24xlarge", "r5.12xlarge"}

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_instance"
        oversized_types[resource.data.instance_type]
        msg := "EC2 instance " + resource.name + " uses potentially oversized instance type " + resource.data.instance_type + ". Consider rightsizing."
      }
    `,
  },
  {
    id: "aws-rds-multi-az",
    name: "RDS Multi-AZ for Production",
    description: "Production RDS instances should use Multi-AZ deployment",
    severity: "warning",
    category: "cost",
    resourceTypes: ["aws_db_instance"],
    query: `
      package aws.cost

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_db_instance"
        resource.data.multi_az != true
        contains(resource.name, "prod")
        msg := "Production RDS instance " + resource.name + " does not use Multi-AZ deployment"
      }
    `,
  },
  {
    id: "aws-ebs-gp3-migration",
    name: "EBS GP3 Migration",
    description: "EBS volumes should use gp3 for better price/performance",
    severity: "info",
    category: "cost",
    resourceTypes: ["aws_ebs_volume"],
    query: `
      package aws.cost

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_ebs_volume"
        resource.data.type == "gp2"
        msg := "EBS volume " + resource.name + " uses gp2. Consider migrating to gp3 for 20% cost savings."
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_ebs_volume"
        resource.data.type == "io1"
        msg := "EBS volume " + resource.name + " uses io1. Consider migrating to io2 Block Express for better performance/cost."
      }
    `,
  },
  {
    id: "aws-s3-intelligent-tiering",
    name: "S3 Intelligent Tiering",
    description: "S3 buckets should use Intelligent-Tiering for cost optimization",
    severity: "info",
    category: "cost",
    resourceTypes: ["aws_s3_bucket"],
    query: `
      package aws.cost

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_s3_bucket"
        not resource.data.intelligent_tiering_configuration
        msg := "S3 bucket " + resource.name + " does not use Intelligent-Tiering for cost optimization"
      }
    `,
  },
  {
    id: "aws-nat-gateway-single-az",
    name: "NAT Gateway Single AZ",
    description: "NAT Gateways in single AZ increase costs and reduce availability",
    severity: "warning",
    category: "cost",
    resourceTypes: ["aws_nat_gateway"],
    query: `
      package aws.cost

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_nat_gateway"
        not resource.data.subnet_id
        msg := "NAT Gateway " + resource.name + " may be in single AZ. Consider one per AZ for HA."
      }
    `,
  },
];

export const awsBestPracticePolicies: PolicyRule[] = [
  {
    id: "aws-resource-tagging",
    name: "Resource Tagging Required",
    description: "All resources should have required tags (Environment, Owner, Project)",
    severity: "warning",
    category: "best-practice",
    resourceTypes: ["*"],
    query: `
      package aws.bestpractice

      required_tags := {"Environment", "Owner", "Project", "CostCenter"}

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        tags := resource.data.tags
        not tags
        msg := "Resource " + resource.name + " (" + resource.type + ") has no tags"
      }

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        tags := resource.data.tags
        missing_tag := required_tags[_]
        not tags[missing_tag]
        msg := "Resource " + resource.name + " (" + resource.type + ") missing required tag: " + missing_tag
      }
    `,
  },
  {
    id: "aws-vpc-flow-logs",
    name: "VPC Flow Logs Enabled",
    description: "VPCs should have flow logs enabled for network monitoring",
    severity: "warning",
    category: "best-practice",
    resourceTypes: ["aws_vpc"],
    query: `
      package aws.bestpractice

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_vpc"
        not resource.data.flow_logs
        msg := "VPC " + resource.name + " does not have flow logs enabled"
      }
    `,
  },
  {
    id: "aws-alb-waf-enabled",
    name: "ALB WAF Enabled",
    description: "Application Load Balancers should have WAF attached",
    severity: "warning",
    category: "best-practice",
    resourceTypes: ["aws_lb"],
    query: `
      package aws.bestpractice

      violation[{"msg": msg, "resource": resource}] {
        resource := input.resources[_]
        resource.type == "aws_lb"
        resource.data.load_balancer_type == "application"
        not resource.data.waf_association
        msg := "ALB " + resource.name + " does not have WAF attached"
      }
    `,
  },
];

export const allPolicySets: PolicySet[] = [
  {
    id: "aws-security",
    name: "AWS Security Best Practices",
    description: "Security policies for AWS resources based on AWS Well-Architected Framework",
    version: "1.0.0",
    rules: awsSecurityPolicies,
  },
  {
    id: "aws-cost-optimization",
    name: "AWS Cost Optimization",
    description: "Cost optimization policies for AWS resources",
    version: "1.0.0",
    rules: awsCostPolicies,
  },
  {
    id: "aws-best-practices",
    name: "AWS General Best Practices",
    description: "General best practices for AWS resource configuration",
    version: "1.0.0",
    rules: awsBestPracticePolicies,
  },
];

export const getAllPolicyRules = (): PolicyRule[] => {
  return [
    ...awsSecurityPolicies,
    ...awsCostPolicies,
    ...awsBestPracticePolicies,
  ];
};

export const getPolicySetById = (id: string): PolicySet | undefined => {
  return allPolicySets.find((ps) => ps.id === id);
};

export const getRulesByCategory = (category: string): PolicyRule[] => {
  return getAllPolicyRules().filter((rule) => rule.category === category);
};

export const getRulesByResourceType = (resourceType: string): PolicyRule[] => {
  return getAllPolicyRules().filter((rule) =>
    rule.resourceTypes.includes("*") || rule.resourceTypes.includes(resourceType)
  );
};