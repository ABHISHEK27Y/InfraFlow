"use client";

import { Edge, Position } from "@xyflow/react";

interface OrthogonalEdgeProps extends Edge {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  label?: React.ReactNode;
  labelPosition?: "center" | "source" | "target" | number;
  labelBackground?: string;
  style?: React.CSSProperties;
}

export function getOrthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position = Position.Right,
  targetPosition: Position = Position.Left
): { path: string; labelX: number; labelY: number; labelAngle: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const horizontalFirst = Math.abs(dx) > Math.abs(dy);

  let path = "";
  let midX = sourceX;
  let midY = sourceY;
  let lastX = sourceX;
  let lastY = sourceY;
  const offset = 20;

  if (horizontalFirst) {
    // Horizontal then vertical
    const bendX = sourceX + dx / 2;

    // From source to first bend
    switch (sourcePosition) {
      case Position.Right:
        lastX = sourceX + offset;
        break;
      case Position.Left:
        lastX = sourceX - offset;
        break;
      case Position.Bottom:
        lastY = sourceY + offset;
        break;
      case Position.Top:
        lastY = sourceY - offset;
        break;
    }
    path = `M ${sourceX} ${sourceY} L ${lastX} ${lastY}`;

    // First bend to middle
    path += ` L ${bendX} ${lastY}`;
    midX = bendX;
    midY = lastY;

    // Middle to second bend
    switch (targetPosition) {
      case Position.Right:
        lastX = targetX + offset;
        break;
      case Position.Left:
        lastX = targetX - offset;
        break;
      case Position.Bottom:
        lastY = targetY + offset;
        break;
      case Position.Top:
        lastY = targetY - offset;
        break;
    }
    path += ` L ${bendX} ${lastY}`;

    // Second bend to target
    path += ` L ${lastX} ${lastY} L ${targetX} ${targetY}`;
  } else {
    // Vertical then horizontal
    const bendY = sourceY + dy / 2;

    // From source to first bend
    switch (sourcePosition) {
      case Position.Right:
        lastX = sourceX + offset;
        break;
      case Position.Left:
        lastX = sourceX - offset;
        break;
      case Position.Bottom:
        lastY = sourceY + offset;
        break;
      case Position.Top:
        lastY = sourceY - offset;
        break;
    }
    path = `M ${sourceX} ${sourceY} L ${lastX} ${lastY}`;

    // First bend to middle
    path += ` L ${lastX} ${bendY}`;
    midX = lastX;
    midY = bendY;

    // Middle to second bend
    switch (targetPosition) {
      case Position.Right:
        lastX = targetX + offset;
        break;
      case Position.Left:
        lastX = targetX - offset;
        break;
      case Position.Bottom:
        lastY = targetY + offset;
        break;
      case Position.Top:
        lastY = targetY - offset;
        break;
    }
    path += ` L ${lastX} ${bendY}`;

    // Second bend to target
    path += ` L ${lastX} ${lastY} L ${targetX} ${targetY}`;
  }

  // Calculate label position (middle of the path)
  const labelX = midX;
  const labelY = midY;
  let labelAngle = 0;

  if (horizontalFirst) {
    labelAngle = 0;
  } else {
    labelAngle = -90;
  }

  return { path, labelX, labelY, labelAngle };
}

export default function OrthogonalEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  label,
  labelPosition = "center",
  labelBackground = "rgba(15, 18, 25, 0.9)",
  style = {},
  id,
  selected = false,
  markerEnd,
}: OrthogonalEdgeProps) {
  const { path, labelX, labelY, labelAngle } = getOrthogonalPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  );

  const strokeColor = selected ? "#818cf8" : "#475569";
  const strokeWidth = selected ? 2 : 1.5;

  // Calculate label position based on labelPosition prop
  let finalLabelX = labelX;
  let finalLabelY = labelY;

  if (typeof labelPosition === "number") {
    // Use percentage along path (0-1)
    const ratio = Math.max(0, Math.min(1, labelPosition));
    finalLabelX = sourceX + (targetX - sourceX) * ratio;
    finalLabelY = sourceY + (targetY - sourceY) * ratio;
  } else if (labelPosition === "source") {
    finalLabelX = sourceX + (targetX - sourceX) * 0.25;
    finalLabelY = sourceY + (targetY - sourceY) * 0.25;
  } else if (labelPosition === "target") {
    finalLabelX = sourceX + (targetX - sourceX) * 0.75;
    finalLabelY = sourceY + (targetY - sourceY) * 0.75;
  }

  return (
    <g>
      <path
        id={`${id}-path`}
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        style={{
          pointerEvents: "stroke",
          transition: "stroke 0.2s, stroke-width 0.2s",
          ...style,
        }}
        markerEnd={markerEnd ? `url(#${markerEnd})` : undefined}
      />

      {label && (
        <text
          x={finalLabelX}
          y={finalLabelY - 8}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fill="#e2e8f0"
          fontSize="11"
          fontWeight={500}
          pointerEvents="none"
          transform={labelAngle !== 0 ? `rotate(${labelAngle} ${finalLabelX} ${finalLabelY - 8})` : undefined}
        >
          <rect
            x={finalLabelX - 30}
            y={finalLabelY - 20}
            width={60}
            height={16}
            rx={3}
            fill={labelBackground}
            stroke={strokeColor}
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <text
            x={finalLabelX}
            y={finalLabelY - 8}
            textAnchor="middle"
            dominantBaseline="alphabetic"
            fill="#e2e8f0"
            fontSize="11"
            fontWeight={500}
            pointerEvents="none"
            transform={labelAngle !== 0 ? `rotate(${labelAngle} ${finalLabelX} ${finalLabelY - 8})` : undefined}
          >
            {label}
          </text>
        </text>
      )}

      {/* Selection indicator */}
      {selected && (
        <path
          d={path}
          stroke="#818cf8"
          strokeWidth={4}
          fill="none"
          opacity={0.3}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

// Curved orthogonal edge (smoother corners)
export function CurvedOrthogonalEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  label,
  labelBackground = "rgba(15, 18, 25, 0.9)",
  style = {},
  selected = false,
  markerEnd,
}: OrthogonalEdgeProps) {

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const horizontalFirst = Math.abs(dx) > Math.abs(dy);
  const radius = 10;

  let path = "";

  if (horizontalFirst) {
    const bendX = sourceX + dx / 2;

    path = `M ${sourceX} ${sourceY} `;

    switch (sourcePosition) {
      case Position.Right:
        path += `C ${sourceX + radius} ${sourceY}, ${bendX - radius} ${sourceY}, ${bendX} ${sourceY} `;
        break;
      case Position.Left:
        path += `C ${sourceX - radius} ${sourceY}, ${bendX + radius} ${sourceY}, ${bendX} ${sourceY} `;
        break;
      case Position.Bottom:
        path += `C ${sourceX} ${sourceY + radius}, ${bendX} ${sourceY + radius}, ${bendX} ${sourceY} `;
        break;
      case Position.Top:
        path += `C ${sourceX} ${sourceY - radius}, ${bendX} ${sourceY - radius}, ${bendX} ${sourceY} `;
        break;
    }

    switch (targetPosition) {
      case Position.Right:
        path += `C ${bendX} ${targetY}, ${targetX - radius} ${targetY}, ${targetX} ${targetY}`;
        break;
      case Position.Left:
        path += `C ${bendX} ${targetY}, ${targetX + radius} ${targetY}, ${targetX} ${targetY}`;
        break;
      case Position.Bottom:
        path += `C ${bendX} ${targetY}, ${targetX} ${targetY - radius}, ${targetX} ${targetY}`;
        break;
      case Position.Top:
        path += `C ${bendX} ${targetY}, ${targetX} ${targetY + radius}, ${targetX} ${targetY}`;
        break;
    }
  } else {
    const bendY = sourceY + dy / 2;

    path = `M ${sourceX} ${sourceY} `;

    switch (sourcePosition) {
      case Position.Right:
        path += `C ${sourceX + radius} ${sourceY}, ${sourceX + radius} ${bendY - radius}, ${sourceX} ${bendY} `;
        break;
      case Position.Left:
        path += `C ${sourceX - radius} ${sourceY}, ${sourceX - radius} ${bendY - radius}, ${sourceX} ${bendY} `;
        break;
      case Position.Bottom:
        path += `C ${sourceX} ${sourceY + radius}, ${sourceX} ${bendY - radius}, ${sourceX} ${bendY} `;
        break;
      case Position.Top:
        path += `C ${sourceX} ${sourceY - radius}, ${sourceX} ${bendY + radius}, ${sourceX} ${bendY} `;
        break;
    }

    switch (targetPosition) {
      case Position.Right:
        path += `C ${sourceX} ${bendY}, ${targetX - radius} ${bendY}, ${targetX} ${targetY}`;
        break;
      case Position.Left:
        path += `C ${sourceX} ${bendY}, ${targetX + radius} ${bendY}, ${targetX} ${targetY}`;
        break;
      case Position.Bottom:
        path += `C ${sourceX} ${bendY}, ${targetX} ${targetY - radius}, ${targetX} ${targetY}`;
        break;
      case Position.Top:
        path += `C ${sourceX} ${bendY}, ${targetX} ${targetY + radius}, ${targetX} ${targetY}`;
        break;
    }
  }

  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  const strokeColor = selected ? "#818cf8" : "#475569";
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <g>
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        style={{
          pointerEvents: "stroke",
          transition: "stroke 0.2s, stroke-width 0.2s",
          ...style,
        }}
        markerEnd={markerEnd ? `url(#${markerEnd})` : undefined}
      />

      {label && (
        <>
          <rect
            x={labelX - 30}
            y={labelY - 20}
            width={60}
            height={16}
            rx={3}
            fill={labelBackground}
            stroke={strokeColor}
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <text
            x={labelX}
            y={labelY - 8}
            textAnchor="middle"
            dominantBaseline="alphabetic"
            fill="#e2e8f0"
            fontSize="11"
            fontWeight={500}
            pointerEvents="none"
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}

// Straight edge (default)
export function StraightEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  labelBackground = "rgba(15, 18, 25, 0.9)",
  style = {},
  selected = false,
  markerEnd,
}: OrthogonalEdgeProps) {

  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  const strokeColor = selected ? "#818cf8" : "#475569";
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <g>
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        style={{
          pointerEvents: "stroke",
          transition: "stroke 0.2s, stroke-width 0.2s",
          ...style,
        }}
        markerEnd={markerEnd ? `url(#${markerEnd})` : undefined}
      />

      {label && (
        <>
          <rect
            x={labelX - 30}
            y={labelY - 20}
            width={60}
            height={16}
            rx={3}
            fill={labelBackground}
            stroke={strokeColor}
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <text
            x={labelX}
            y={labelY - 8}
            textAnchor="middle"
            dominantBaseline="alphabetic"
            fill="#e2e8f0"
            fontSize="11"
            fontWeight={500}
            pointerEvents="none"
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}

// Edge type registry
export const edgeTypes = {
  orthogonal: OrthogonalEdge,
  curved: CurvedOrthogonalEdge,
  straight: StraightEdge,
  default: StraightEdge,
} as const;