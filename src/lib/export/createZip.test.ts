import JSZip from "jszip";
import { createExportZip } from "./createZip";

describe("export ZIP", () => {
  it("contains every generated file with its content", async () => {
    const blob = await createExportZip({
      "main.tf": 'resource "aws_vpc" "main" {}',
      "variables.tf": 'variable "region" {}',
    });

    const archive = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(archive.files).sort()).toEqual(["main.tf", "variables.tf"]);
    expect(await archive.file("main.tf")?.async("string")).toBe('resource "aws_vpc" "main" {}');
  });
});
