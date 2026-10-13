import { parseTerraformHCL } from "./terraform-import";

describe("Terraform file import", () => {
  it("imports a basic resource using the local parser", async () => {
    const result = await parseTerraformHCL(`resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}`, "main.tf");

    expect(result.success).toBe(true);
    expect(result.module?.resources).toEqual([
      expect.objectContaining({
        type: "aws_vpc",
        name: "main",
        provider: "aws",
        data: expect.objectContaining({ cidr_block: "10.0.0.0/16" }),
      }),
    ]);
  });

  it("warns when unsupported blocks would be skipped", async () => {
    const result = await parseTerraformHCL(`data "aws_ami" "latest" {}`, "lookup.tf");

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining("lookup.tf")]);
  });
});
