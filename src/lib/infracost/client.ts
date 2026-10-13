import {
  CostEstimate,
  ResourceCostEstimate,
  CostComponentEstimate,
} from "./types";

const INFRACOST_API_URL = "https://pricing.api.infracost.io/graphql";

interface InfracostGraphQLResponse {
  data?: {
    projects: Array<{
      breakdown: {
        resources: Array<{
          name: string;
          resourceType: string;
          providerName: string;
          hourlyCost: string | null;
          monthlyCost: string | null;
          costComponents: Array<{
            name: string;
            unit: string;
            hourlyQuantity: string | null;
            monthlyQuantity: string | null;
            price: string | null;
            hourlyCost: string | null;
            monthlyCost: string | null;
            details: string | null;
            usageBased: boolean;
            limits: Array<{
              limit: string;
              hourlyCost: string | null;
              monthlyCost: string | null;
            }>;
          }>;
          subResources: Array<any>;
          usageBased: boolean;
          usageFileHash: string;
        }>;
        totalHourlyCost: string | null;
        totalMonthlyCost: string | null;
        timeGenerated: string;
        currency: string;
      };
    }>;
  };
  errors?: Array<{ message: string }>;
}

export class InfracostClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCostEstimate(terraformJson: string): Promise<CostEstimate> {
    const query = `
      query GetCostEstimate($path: String!) {
        projects(path: $path) {
          breakdown {
            resources {
              name
              resourceType
              providerName
              hourlyCost
              monthlyCost
              costComponents {
                name
                unit
                hourlyQuantity
                monthlyQuantity
                price
                hourlyCost
                monthlyCost
                details
                usageBased
                limits {
                  limit
                  hourlyCost
                  monthlyCost
                }
              }
              subResources {
                name
                resourceType
                providerName
                hourlyCost
                monthlyCost
                costComponents {
                  name
                  unit
                  hourlyQuantity
                  monthlyQuantity
                  price
                  hourlyCost
                  monthlyCost
                  details
                  usageBased
                  limits {
                    limit
                    hourlyCost
                    monthlyCost
                  }
                }
                usageBased
                usageFileHash
              }
              usageBased
              usageFileHash
            }
            totalHourlyCost
            totalMonthlyCost
            timeGenerated
            currency
          }
        }
      }
    `;

    try {
      const response = await fetch(INFRACOST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify({
          query,
          variables: {
            path: terraformJson,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Infracost API error: ${response.status} ${response.statusText} - ${
            errorData.errors?.[0]?.message || "Unknown error"
          }`
        );
      }

      const data: InfracostGraphQLResponse = await response.json();

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors.map((e) => e.message).join(", "));
      }

      if (!data.data?.projects?.length) {
        throw new Error("No projects returned from Infracost");
      }

      return this.parseResponse(data.data.projects[0]);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch cost estimate from Infracost");
    }
  }

  private parseResponse(project: NonNullable<InfracostGraphQLResponse["data"]>["projects"][0]): CostEstimate {
    const breakdown = project.breakdown;
    const resources: ResourceCostEstimate[] = [];

    for (const resource of breakdown.resources) {
      resources.push(this.parseResource(resource));
    }

    return {
      totalMonthlyCost: parseFloat(breakdown.totalMonthlyCost || "0"),
      totalHourlyCost: parseFloat(breakdown.totalHourlyCost || "0"),
      currency: breakdown.currency || "USD",
      resources,
      lastUpdated: new Date(breakdown.timeGenerated),
    };
  }

  private parseResource(
    resource: NonNullable<InfracostGraphQLResponse["data"]>["projects"][0]["breakdown"]["resources"][0]
  ): ResourceCostEstimate {
    const costComponents: CostComponentEstimate[] = resource.costComponents.map((comp) => ({
      name: comp.name,
      unit: comp.unit,
      monthlyQuantity: parseFloat(comp.monthlyQuantity || "0"),
      price: parseFloat(comp.price || "0"),
      monthlyCost: parseFloat(comp.monthlyCost || "0"),
      details: comp.details || undefined,
    }));

    return {
      id: crypto.randomUUID(),
      name: resource.name,
      type: resource.resourceType,
      monthlyCost: parseFloat(resource.monthlyCost || "0"),
      hourlyCost: parseFloat(resource.hourlyCost || "0"),
      costComponents,
      terraformAddress: resource.name,
    };
  }
}

export function createInfracostClient(apiKey: string): InfracostClient {
  return new InfracostClient(apiKey);
}

export function formatCost(cost: number): string {
  if (cost === 0) return `$0.00`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  if (cost < 1000) return `$${cost.toFixed(2)}`;
  if (cost < 1000000) return `$${(cost / 1000).toFixed(2)}K`;
  return `$${(cost / 1000000).toFixed(2)}M`;
}

export function formatCostDetailed(cost: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
}