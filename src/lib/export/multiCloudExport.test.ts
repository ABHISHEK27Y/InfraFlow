import { exportDiagram } from "./multiCloudExport";
import type { AnyNode } from "@/utils/types/resource";

describe("canvas Terraform export", () => {
  it("writes a VPC resource to the generated main file", () => {
    const node = {
      id: "vpc-1",
      type: "vpc",
      position: { x: 0, y: 0 },
      data: { Name: "Main VPC", CIDR: "10.0.0.0/16", EnableDNS: "yes" },
    } as AnyNode;

    const result = exportDiagram([node], [], { format: "terraform", region: "us-east-1" });

    expect(result.mainFile).toBe("main.tf");
    expect(result.files["main.tf"]).toContain('resource "aws_vpc" "main_vpc"');
    expect(result.files["main.tf"]).toContain('cidr_block           = "10.0.0.0/16"');
    expect(result.files["variables.tf"]).toContain('default     = "us-east-1"');
  });

  it("gives an unnamed canvas resource a readable Terraform identifier", () => {
    const node = {
      id: "14b6e7d6-48b2-4964-84a5-bac634dab088",
      type: "vpc",
      position: { x: 0, y: 0 },
      data: { Name: "", CIDR: "10.0.0.0/16" },
    } as AnyNode;

    const result = exportDiagram([node], [], { format: "terraform" });
    expect(result.files["main.tf"]).toContain('resource "aws_vpc" "vpc_14b6e7d6"');
  });
});
