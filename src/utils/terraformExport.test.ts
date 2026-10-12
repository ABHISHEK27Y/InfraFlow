import { describe, expect, it } from "vitest";
import { generateTerraformConfig } from "./terraformExport";
import type { UGCPGraph } from "@/models/ugcp/schema";

describe("Terraform export", () => {
  it("includes saved resource blocks in a single file", () => {
    const result = generateTerraformConfig(
      { nodes: [], edges: [] } as unknown as UGCPGraph,
      { example: 'resource "aws_s3_bucket" "example" {}' },
      { format: "single", includeProvider: false, includeVariables: false, includeOutputs: false },
    );
    expect(result).toContain('resource "aws_s3_bucket" "example" {}');
  });
});
