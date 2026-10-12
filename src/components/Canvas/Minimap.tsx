"use client";

import { MiniMap } from "@xyflow/react";
import { cn } from "@/lib/utils";

export default function Minimap() {
  return (
    <MiniMap
      nodeColor={({ type }) => {
        switch (type) {
          case "vpc":
            return "#3b82f6";
          case "subnet":
            return "#06b6d4";
          case "ec2":
          case "rds":
          case "lambda":
            return "#f59e0b";
          case "s3":
          case "ebs":
            return "#8b5cf6";
          case "securitygroup":
          case "iam":
          case "keypair":
            return "#ef4444";
          case "elb":
            return "#10b981";
          default:
            return "#64748b";
        }
      }}
      nodeStrokeColor={({ selected }) => (selected ? "#818cf8" : "#374151")}
      maskColor="rgba(15, 18, 25, 0.8)"
      nodeBorderRadius={4}
      nodeClassName={(node) => cn("opacity-80", node.selected && "opacity-100 ring-2 ring-blue-500")}
      style={{
        width: 200,
        height: 150,
        border: "1px solid #374151",
        borderRadius: "8px",
        backgroundColor: "#0f1219",
      }}
      position="bottom-left"
    />
  );
}