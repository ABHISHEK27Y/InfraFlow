import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";

export const downloadTerraformZip = (code: string) => {
  const zip = new JSZip();

  // Basic terraform files mapping
  zip.file("main.tf", code);
  
  // We can add empty/default variables and providers for completeness
  zip.file("providers.tf", `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
`);

  zip.file("variables.tf", `# Define your variables here
`);

  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, "infraflow-terraform.zip");
  });
};

export const exportDiagramToPNG = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Filter out UI toolbars that shouldn't be in the snapshot
  const filter = (node: HTMLElement) => {
    const exclusionClasses = ["react-flow__panel", "react-flow__minimap", "react-flow__controls"];
    if (node.classList) {
      return !exclusionClasses.some((cls) => node.classList.contains(cls));
    }
    return true;
  };

  try {
    const dataUrl = await toPng(element, { filter, backgroundColor: "#070913" });
    saveAs(dataUrl, "infraflow-architecture.png");
  } catch (err) {
    console.error("Failed to export image", err);
  }
};
