/**
 * Template Marketplace Service
 * Handles template search, download, submission, and management
 */

import {
  Template,
  TemplateSearchFilters,
  TemplateSearchResult,
  TemplateReview,
  TemplateSubmission,
  UserTemplateCollection,
  TemplateCategory,
  CloudProvider,
} from "./types";

// Mock data for demonstration
const MOCK_TEMPLATES: Template[] = [
  {
    id: "tmpl-001",
    name: "Scalable Web Application (AWS)",
    description: "A production-ready web application architecture with ALB, Auto Scaling Group, RDS, ElastiCache, and CloudFront CDN. Includes multi-AZ deployment for high availability.",
    category: "web-application",
    tags: ["aws", "web", "scalable", "production", "multi-az", "cd"],
    thumbnail: "",
    author: {
      id: "author-001",
      name: "InfraFlow Team",
      verified: true,
      organization: "InfraFlow",
    },
    version: "2.1.0",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-12-01T10:00:00Z",
    downloads: 15420,
    rating: 4.8,
    reviewCount: 234,
    isOfficial: true,
    isVerified: true,
    cloudProviders: ["aws"],
    complexity: "intermediate",
    estimatedCost: "$150-500/month",
    architecture: {
      ugcpGraph: {
        projectId: "template-web-aws",
        version: 1,
        updatedAt: Date.now(),
        nodes: [],
        edges: [],
        metadata: { name: "Web App AWS", description: "", tags: [] },
      },
      terraformModules: [
        { name: "vpc", source: "./modules/vpc", variables: {}, outputs: {} },
        { name: "alb", source: "./modules/alb", variables: {}, outputs: {} },
        { name: "asg", source: "./modules/asg", variables: {}, outputs: {} },
        { name: "rds", source: "./modules/rds", variables: {}, outputs: {} },
      ],
      parameters: [
        { name: "environment", type: "string", description: "Environment name", required: true, default: "production", validation: { enum: ["dev", "staging", "production"] } },
        { name: "instance_type", type: "string", description: "EC2 instance type", required: true, default: "t3.medium" },
        { name: "db_instance_class", type: "string", description: "RDS instance class", required: true, default: "db.t3.micro" },
      ],
      outputs: [
        { name: "alb_dns_name", description: "Application Load Balancer DNS name", value: "module.alb.dns_name" },
        { name: "database_endpoint", description: "RDS database endpoint", value: "module.rds.endpoint" },
      ],
    },
    documentation: "# Scalable Web Application (AWS)\n\n## Overview\nThis template deploys a highly available web application on AWS...\n\n## Architecture\n![Architecture Diagram](architecture.png)\n\n## Usage\n```hcl\nmodule \"web_app\" {\n  source = \"github.com/infraflow/templates//web-application/aws\"\n  environment = \"production\"\n}\n```",
    license: "MIT",
    sourceUrl: "https://github.com/infraflow/templates/tree/main/web-application/aws",
  },
  {
    id: "tmpl-002",
    name: "Microservices on EKS",
    description: "Complete microservices platform on Amazon EKS with service mesh (Istio), monitoring (Prometheus/Grafana), logging (ELK), and CI/CD (ArgoCD).",
    category: "microservices",
    tags: ["eks", "kubernetes", "microservices", "istio", "argocd", "monitoring"],
    thumbnail: "",
    author: {
      id: "author-002",
      name: "CloudNative Inc",
      verified: true,
      organization: "CloudNative Inc",
    },
    version: "1.5.0",
    createdAt: "2024-03-20T10:00:00Z",
    updatedAt: "2024-11-15T10:00:00Z",
    downloads: 8930,
    rating: 4.6,
    reviewCount: 156,
    isOfficial: false,
    isVerified: true,
    cloudProviders: ["aws"],
    complexity: "advanced",
    estimatedCost: "$500-2000/month",
    architecture: {
      ugcpGraph: { projectId: "template-eks-micro", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# Microservices on EKS\n\n## Overview\nDeploy a complete microservices platform...",
    license: "Apache-2.0",
    sourceUrl: "https://github.com/cloudnative/templates/tree/main/microservices/eks",
  },
  {
    id: "tmpl-003",
    name: "Serverless Data Pipeline (Multi-Cloud)",
    description: "Event-driven data processing pipeline using serverless functions across AWS Lambda, Azure Functions, and GCP Cloud Functions with unified orchestration.",
    category: "data-platform",
    tags: ["serverless", "multi-cloud", "data-pipeline", "event-driven", "analytics"],
    thumbnail: "",
    author: {
      id: "author-003",
      name: "DataFlow Labs",
      verified: true,
      organization: "DataFlow Labs",
    },
    version: "3.0.0",
    createdAt: "2024-06-10T10:00:00Z",
    updatedAt: "2024-12-10T10:00:00Z",
    downloads: 5670,
    rating: 4.9,
    reviewCount: 89,
    isOfficial: false,
    isVerified: true,
    cloudProviders: ["aws", "azure", "gcp"],
    complexity: "intermediate",
    estimatedCost: "$50-200/month",
    architecture: {
      ugcpGraph: { projectId: "template-serverless-data", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# Serverless Data Pipeline\n\nProcess data across multiple clouds...",
    license: "MIT",
    sourceUrl: "https://github.com/dataflowlabs/templates/tree/main/data-platform/serverless-multi",
  },
  {
    id: "tmpl-004",
    name: "ML Training & Inference Platform",
    description: "End-to-end ML platform with SageMaker/Vertex AI, feature store, model registry, A/B testing, and automated retraining pipelines.",
    category: "ml-ai",
    tags: ["ml", "ai", "sagemaker", "vertex-ai", "mlops", "training", "inference"],
    thumbnail: "",
    author: {
      id: "author-004",
      name: "MLOps Team",
      verified: true,
      organization: "MLOps Team",
    },
    version: "1.2.0",
    createdAt: "2024-08-01T10:00:00Z",
    updatedAt: "2024-11-20T10:00:00Z",
    downloads: 3420,
    rating: 4.7,
    reviewCount: 67,
    isOfficial: true,
    isVerified: true,
    cloudProviders: ["aws", "gcp"],
    complexity: "advanced",
    estimatedCost: "$300-1500/month",
    architecture: {
      ugcpGraph: { projectId: "template-ml-platform", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# ML Platform\n\nTrain and deploy ML models at scale...",
    license: "Apache-2.0",
    sourceUrl: "https://github.com/mlops/templates/tree/main/ml-ai/platform",
  },
  {
    id: "tmpl-005",
    name: "Zero-Trust Network Architecture",
    description: "Implement zero-trust networking with identity-aware proxies, micro-segmentation, continuous verification, and policy enforcement across clouds.",
    category: "security",
    tags: ["security", "zero-trust", "networking", "identity", "compliance", "soc2"],
    thumbnail: "",
    author: {
      id: "author-005",
      name: "SecureCloud",
      verified: true,
      organization: "SecureCloud",
    },
    version: "2.0.0",
    createdAt: "2024-02-15T10:00:00Z",
    updatedAt: "2024-12-05T10:00:00Z",
    downloads: 4560,
    rating: 4.8,
    reviewCount: 123,
    isOfficial: true,
    isVerified: true,
    cloudProviders: ["aws", "azure", "gcp"],
    complexity: "advanced",
    estimatedCost: "$200-800/month",
    architecture: {
      ugcpGraph: { projectId: "template-zero-trust", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# Zero-Trust Network\n\nImplement zero-trust security...",
    license: "MIT",
    sourceUrl: "https://github.com/securecloud/templates/tree/main/security/zero-trust",
  },
  {
    id: "tmpl-006",
    name: "Kubernetes GitOps Platform",
    description: "Production-ready GitOps platform with ArgoCD, Sealed Secrets, External Secrets Operator, and policy enforcement with Kyverno/OPA Gatekeeper.",
    category: "kubernetes",
    tags: ["kubernetes", "gitops", "argocd", "secrets", "policy", "kyverno"],
    thumbnail: "",
    author: {
      id: "author-006",
      name: "GitOps Collective",
      verified: false,
      organization: "GitOps Collective",
    },
    version: "1.8.0",
    createdAt: "2024-05-01T10:00:00Z",
    updatedAt: "2024-11-28T10:00:00Z",
    downloads: 7890,
    rating: 4.5,
    reviewCount: 98,
    isOfficial: false,
    isVerified: false,
    cloudProviders: ["aws", "azure", "gcp"],
    complexity: "intermediate",
    estimatedCost: "$100-400/month",
    architecture: {
      ugcpGraph: { projectId: "template-gitops-k8s", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# GitOps Platform\n\nDeploy applications with GitOps...",
    license: "Apache-2.0",
    sourceUrl: "https://github.com/gitops/templates/tree/main/kubernetes/gitops",
  },
  {
    id: "tmpl-007",
    name: "Static Site Hosting (Global CDN)",
    description: "Cost-effective static site hosting with global CDN, custom domains, SSL, form handling, and edge functions. Works with any static site generator.",
    category: "web-application",
    tags: ["static-site", "cdn", "edge", "hugo", "nextjs", "astro", "serverless"],
    thumbnail: "",
    author: {
      id: "author-007",
      name: "WebDev Community",
      verified: false,
      organization: "WebDev Community",
    },
    version: "1.0.0",
    createdAt: "2024-09-15T10:00:00Z",
    updatedAt: "2024-12-12T10:00:00Z",
    downloads: 12340,
    rating: 4.9,
    reviewCount: 312,
    isOfficial: false,
    isVerified: true,
    cloudProviders: ["aws", "azure", "gcp"],
    complexity: "beginner",
    estimatedCost: "$1-10/month",
    architecture: {
      ugcpGraph: { projectId: "template-static-site", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# Static Site Hosting\n\nHost static sites globally...",
    license: "MIT",
    sourceUrl: "https://github.com/webdev/templates/tree/main/web-application/static-site",
  },
  {
    id: "tmpl-008",
    name: "Disaster Recovery & Backup",
    description: "Automated backup and disaster recovery solution with cross-region replication, point-in-time recovery, and compliance reporting.",
    category: "storage",
    tags: ["backup", "disaster-recovery", "replication", "compliance", "rpo", "rto"],
    thumbnail: "",
    author: {
      id: "author-008",
      name: "Resilience Engineering",
      verified: true,
      organization: "Resilience Engineering",
    },
    version: "1.3.0",
    createdAt: "2024-04-10T10:00:00Z",
    updatedAt: "2024-11-01T10:00:00Z",
    downloads: 2890,
    rating: 4.6,
    reviewCount: 45,
    isOfficial: true,
    isVerified: true,
    cloudProviders: ["aws", "azure", "gcp"],
    complexity: "intermediate",
    estimatedCost: "$50-300/month",
    architecture: {
      ugcpGraph: { projectId: "template-dr-backup", version: 1, updatedAt: Date.now(), nodes: [], edges: [], metadata: { name: "", description: "", tags: [] } },
      terraformModules: [],
      parameters: [],
      outputs: [],
    },
    documentation: "# Disaster Recovery\n\nProtect your data with automated backup...",
    license: "Apache-2.0",
    sourceUrl: "https://github.com/resilience/templates/tree/main/storage/dr-backup",
  },
];

const templates: Template[] = [...MOCK_TEMPLATES];
const submissions: TemplateSubmission[] = [];
const collections: Map<string, UserTemplateCollection> = new Map();

export class TemplateMarketplaceService {
  /**
   * Search templates with filters
   */
  static async searchTemplates(filters: TemplateSearchFilters = {}): Promise<TemplateSearchResult> {
    let results = [...templates];

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filters.category) {
      results = results.filter((t) => t.category === filters.category);
    }

    if (filters.cloudProviders && filters.cloudProviders.length > 0) {
      results = results.filter((t) =>
        filters.cloudProviders!.some((p) => t.cloudProviders.includes(p))
      );
    }

    if (filters.complexity && filters.complexity.length > 0) {
      results = results.filter((t) => filters.complexity!.includes(t.complexity));
    }

    if (filters.minRating !== undefined) {
      results = results.filter((t) => t.rating >= filters.minRating!);
    }

    if (filters.maxCost !== undefined) {
      // Parse cost string (simplified)
      results = results.filter((t) => {
        const costMatch = t.estimatedCost.match(/\$(\d+)-?(\d+)?/);
        if (costMatch) {
          const max = costMatch[2] ? parseInt(costMatch[2]) : parseInt(costMatch[1]);
          return max <= filters.maxCost!;
        }
        return true;
      });
    }

    if (filters.isOfficial !== undefined) {
      results = results.filter((t) => t.isOfficial === filters.isOfficial);
    }

    if (filters.isVerified !== undefined) {
      results = results.filter((t) => t.isVerified === filters.isVerified);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((t) => filters.tags!.some((tag) => t.tags.includes(tag)));
    }

    // Sort
    const sortBy = filters.sortBy || "popular";
    const sortOrder = filters.sortOrder || "desc";

    results.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortBy) {
        case "popular":
          aVal = a.downloads;
          bVal = b.downloads;
          break;
        case "recent":
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
        case "rating":
          aVal = a.rating;
          bVal = b.rating;
          break;
        case "downloads":
          aVal = a.downloads;
          bVal = b.downloads;
          break;
        default:
          aVal = a.downloads;
          bVal = b.downloads;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Calculate facets
    const categories: Record<TemplateCategory, number> = {} as Record<TemplateCategory, number>;
    const providers: Record<CloudProvider, number> = {} as Record<CloudProvider, number>;
    const complexities: Record<string, number> = {};

    templates.forEach((t) => {
      categories[t.category] = (categories[t.category] || 0) + 1;
      t.cloudProviders.forEach((p) => {
        providers[p] = (providers[p] || 0) + 1;
      });
      complexities[t.complexity] = (complexities[t.complexity] || 0) + 1;
    });

    const page = filters.sortBy ? 1 : 1; // Simplified pagination
    const pageSize = 20;

    return {
      templates: results.slice(0, pageSize),
      total: results.length,
      page,
      pageSize,
      facets: { categories, providers, complexities },
    };
  }

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string): Promise<Template | null> {
    return templates.find((t) => t.id === id) || null;
  }

  /**
   * Get template categories
   */
  static async getCategories(): Promise<{ category: TemplateCategory; count: number }[]> {
    const counts: Record<TemplateCategory, number> = {} as Record<TemplateCategory, number>;
    templates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({ category: category as TemplateCategory, count }));
  }

  /**
   * Get popular tags
   */
  static async getPopularTags(limit = 20): Promise<{ tag: string; count: number }[]> {
    const tagCounts: Record<string, number> = {};
    templates.forEach((t) => {
      t.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Download template (increment download count, return template)
   */
  static async downloadTemplate(id: string, _userId: string): Promise<Template | null> {
    const template = templates.find((t) => t.id === id);
    if (!template) return null;

    template.downloads += 1;
    return template;
  }

  /**
   * Get template reviews
   */
  static async getReviews(templateId: string, page = 1, pageSize = 10): Promise<{ reviews: TemplateReview[]; total: number }> {
    // Mock reviews
    const reviews: TemplateReview[] = [
      {
        id: "rev-001",
        templateId,
        userId: "user-001",
        userName: "Alex Chen",
        userAvatar: "",
        rating: 5,
        comment: "Excellent template! Saved us weeks of work. Well documented and easy to customize.",
        createdAt: "2024-11-15T10:00:00Z",
        helpful: 12,
      },
      {
        id: "rev-002",
        templateId,
        userId: "user-002",
        userName: "Sarah Johnson",
        userAvatar: "",
        rating: 4,
        comment: "Great foundation for our web app. Minor issue with RDS parameter group but easily fixed.",
        createdAt: "2024-10-20T10:00:00Z",
        helpful: 8,
      },
    ];

    return {
      reviews: reviews.slice((page - 1) * pageSize, page * pageSize),
      total: reviews.length,
    };
  }

  /**
   * Submit a review
   */
  static async submitReview(
    templateId: string,
    userId: string,
    userName: string,
    rating: number,
    comment: string
  ): Promise<TemplateReview> {
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error("Template not found");

    const review: TemplateReview = {
      id: `rev-${Date.now()}`,
      templateId,
      userId,
      userName,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      helpful: 0,
    };

    // Update template rating (simplified)
    template.reviewCount += 1;
    template.rating = (template.rating * (template.reviewCount - 1) + rating) / template.reviewCount;

    return review;
  }

  /**
   * Submit a new template for review
   */
  static async submitTemplate(submission: Omit<TemplateSubmission, "id" | "status" | "submittedAt">): Promise<TemplateSubmission> {
    const newSubmission: TemplateSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    submissions.push(newSubmission);
    return newSubmission;
  }

  /**
   * Get user's template collection (favorites/saved)
   */
  static async getUserCollection(userId: string): Promise<UserTemplateCollection | null> {
    return collections.get(userId) || null;
  }

  /**
   * Add template to user's collection
   */
  static async addToCollection(userId: string, templateId: string): Promise<UserTemplateCollection> {
    let collection = collections.get(userId);
    if (!collection) {
      collection = {
        userId,
        templateIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      collections.set(userId, collection);
    }

    if (!collection.templateIds.includes(templateId)) {
      collection.templateIds.push(templateId);
      collection.updatedAt = new Date().toISOString();
    }

    return collection;
  }

  /**
   * Remove template from user's collection
   */
  static async removeFromCollection(userId: string, templateId: string): Promise<UserTemplateCollection | null> {
    const collection = collections.get(userId);
    if (!collection) return null;

    collection.templateIds = collection.templateIds.filter((id) => id !== templateId);
    collection.updatedAt = new Date().toISOString();

    return collection;
  }

  /**
   * Get templates by author
   */
  static async getTemplatesByAuthor(authorId: string): Promise<Template[]> {
    return templates.filter((t) => t.author.id === authorId);
  }

  /**
   * Get official templates
   */
  static async getOfficialTemplates(): Promise<Template[]> {
    return templates.filter((t) => t.isOfficial);
  }

  /**
   * Get verified templates
   */
  static async getVerifiedTemplates(): Promise<Template[]> {
    return templates.filter((t) => t.isVerified);
  }

  /**
   * Get trending templates (high downloads in recent period)
   */
  static async getTrendingTemplates(limit = 10): Promise<Template[]> {
    return [...templates]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get recently updated templates
   */
  static async getRecentTemplates(limit = 10): Promise<Template[]> {
    return [...templates]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }
}