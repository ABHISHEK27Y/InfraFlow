import { connectionKeys } from "@/lib/nodeConnections/connectionLogicRegistry";

// Allowed connections map
const connectionRules: Record<string, string[]> = {
  ec2: ["ebs", "s3", "rds"],
  ebs: ["ec2"],
  s3: ["ec2"],
  elb: ["ec2"],
  vpc: ["subnet"], // While usually parent/child, they can be connected via edges theoretically
  subnet: ["ec2", "rds", "lambda", "elb"],
  lambda: ["s3", "rds"], // Lambda can connect to S3 or RDS
  sg: ["ec2", "rds", "elb", "lambda"],
  iam: ["ec2", "lambda"],
};

// Connection validation
export default function canConnect(
  sourceType: string,
  targetType: string
): boolean {
  // If source has rules, check against them
  if (connectionRules[sourceType]) {
    return connectionRules[sourceType].includes(targetType);
  }

  return false; // Default to false instead of true for safety
}

export function keyGen(
  sourceType: string,
  destinationType: string
): string | null {
  if (sourceType === "ec2" && destinationType === "ebs") {
    return "ec2ebs";
  } else if (sourceType === "ec2" && destinationType === "s3") {
    return "ec2s3";
  } else if (sourceType === "elb" && destinationType === "ec2") {
    return "elbec2";
  }
  // Generic fallback if no specific edge logic exists, but valid rule
  if (canConnect(sourceType, destinationType)) {
    return `${sourceType}${destinationType}`; 
  }
  return null;
}
