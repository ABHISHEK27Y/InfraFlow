"use client";

import { Node, Edge } from "@xyflow/react";

export type LayoutAlgorithm = "force-directed" | "hierarchical" | "grid" | "radial";

export interface LayoutOptions {
  algorithm?: LayoutAlgorithm;
  direction?: "TB" | "LR" | "RL" | "BT"; // for hierarchical
  spacing?: { x: number; y: number }; // for grid
  center?: { x: number; y: number }; // for radial/force-directed
  radius?: number; // for radial
  iterations?: number; // for force-directed
  nodeSize?: { width: number; height: number }; // estimated node dimensions
}

const DEFAULT_NODE_SIZE = { width: 200, height: 100 };
const DEFAULT_SPACING = { x: 250, y: 150 };
const DEFAULT_CENTER = { x: 0, y: 0 };

/**
 * Force-directed layout using a simple Fruchterman-Reingold algorithm
 */
export function forceDirectedLayout<NodeType extends Node = Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: LayoutOptions = {}
): NodeType[] {
  const {
    center = DEFAULT_CENTER,
    iterations = 100,
    nodeSize = DEFAULT_NODE_SIZE,
  } = options;

  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const nodeArray = Array.from(nodeMap.values());

  // Initialize positions randomly around center if not positioned
  nodeArray.forEach((node, i) => {
    if (node.position.x === 0 && node.position.y === 0) {
      const angle = (i / nodeArray.length) * Math.PI * 2;
      const radius = 200;
      node.position = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }
  });

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  nodeArray.forEach((n) => adjacency.set(n.id, new Set()));
  edges.forEach((e) => {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  });

  const k = Math.sqrt(
    (nodeSize.width * nodeSize.height) / Math.max(nodeArray.length, 1)
  ) * 2;

  const temperature = Math.max(nodeSize.width, nodeSize.height) * 2;
  const coolingFactor = temperature / iterations;

  for (let iter = 0; iter < iterations; iter++) {
    const displacement = new Map<string, { x: number; y: number }>();
    nodeArray.forEach((n) => displacement.set(n.id, { x: 0, y: 0 }));

    // Repulsive forces (node-node)
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const n1 = nodeArray[i];
        const n2 = nodeArray[j];
        const dx = n1.position.x - n2.position.x;
        const dy = n1.position.y - n2.position.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const d1 = displacement.get(n1.id)!;
        const d2 = displacement.get(n2.id)!;
        d1.x += fx;
        d1.y += fy;
        d2.x -= fx;
        d2.y -= fy;
      }
    }

    // Attractive forces (edges)
    edges.forEach((e) => {
      const n1 = nodeMap.get(e.source);
      const n2 = nodeMap.get(e.target);
      if (!n1 || !n2) return;

      const dx = n1.position.x - n2.position.x;
      const dy = n1.position.y - n2.position.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const d1 = displacement.get(e.source)!;
      const d2 = displacement.get(e.target)!;
      d1.x -= fx;
      d1.y -= fy;
      d2.x += fx;
      d2.y += fy;
    });

    // Apply displacements with temperature limit
    nodeArray.forEach((n) => {
      const d = displacement.get(n.id)!;
      const dist = Math.sqrt(d.x * d.x + d.y * d.y);
      const limitedDist = Math.min(dist, temperature - iter * coolingFactor);
      if (dist > 0) {
        n.position.x += (d.x / dist) * limitedDist;
        n.position.y += (d.y / dist) * limitedDist;
      }
    });
  }

  return nodeArray;
}

/**
 * Hierarchical layout (top-down or left-right) using Sugiyama-style algorithm
 */
export function hierarchicalLayout<NodeType extends Node = Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: LayoutOptions = {}
): NodeType[] {
  const { direction = "TB" } = options;
  const spacing = options.spacing || DEFAULT_SPACING;

  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const nodeArray = Array.from(nodeMap.values()) as NodeType[];

  // Build adjacency
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const allNodes = new Set(nodeArray.map((n) => n.id));

  nodeArray.forEach((n) => {
    children.set(n.id, []);
    parents.set(n.id, []);
  });

  edges.forEach((e) => {
    children.get(e.source)?.push(e.target);
    parents.get(e.target)?.push(e.source);
    allNodes.add(e.source);
    allNodes.add(e.target);
  });

  // Find roots (nodes with no parents)
  const roots = nodeArray.filter((n) => (parents.get(n.id)?.length || 0) === 0);
  if (roots.length === 0 && nodeArray.length > 0) {
    roots.push(nodeArray[0]);
  }

  // Assign layers using BFS
  const layers = new Map<string, number>();
  const queue: { id: string; layer: number }[] = roots.map((r) => ({ id: r.id, layer: 0 }));

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (layers.has(id) && layers.get(id)! <= layer) continue;
    layers.set(id, layer);
    (children.get(id) || []).forEach((childId) => {
      queue.push({ id: childId, layer: layer + 1 });
    });
  }

  // Group nodes by layer
  const layerNodes = new Map<number, string[]>();
  layers.forEach((layer, id) => {
    if (!layerNodes.has(layer)) layerNodes.set(layer, []);
    layerNodes.get(layer)!.push(id);
  });

  // Position nodes
  layerNodes.forEach((nodeIds, layer) => {
    const count = nodeIds.length;
    const startPos = -((count - 1) * spacing.x) / 2;

    nodeIds.forEach((id, index) => {
      const node = nodeMap.get(id);
      if (!node) return;

      if (direction === "TB" || direction === "BT") {
        node.position.x = startPos + index * spacing.x;
        node.position.y =
          direction === "TB"
            ? layer * spacing.y
            : -layer * spacing.y;
      } else {
        node.position.y = startPos + index * spacing.y;
        node.position.x =
          direction === "LR"
            ? layer * spacing.x
            : -layer * spacing.x;
      }
    });
  });

  return Array.from(nodeMap.values());
}

/**
 * Grid layout - arranges nodes in a grid pattern
 */
export function gridLayout<NodeType extends Node = Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: LayoutOptions = {}
): NodeType[] {
  const { spacing = DEFAULT_SPACING, center = DEFAULT_CENTER } = options;

  const nodeArray = nodes.map((n) => ({ ...n })) as NodeType[];
  const count = nodeArray.length;
  if (count === 0) return nodeArray;

  // Calculate grid dimensions (as square as possible)
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const startX = center.x - ((cols - 1) * spacing.x) / 2;
  const startY = center.y - ((rows - 1) * spacing.y) / 2;

  nodeArray.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    node.position.x = startX + col * spacing.x;
    node.position.y = startY + row * spacing.y;
  });

  return nodeArray;
}

/**
 * Radial layout - arranges nodes in concentric circles
 */
export function radialLayout<NodeType extends Node = Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: LayoutOptions = {}
): NodeType[] {
  const { center = DEFAULT_CENTER, radius = 300 } = options;

  const nodeArray = nodes.map((n) => ({ ...n })) as NodeType[];
  const count = nodeArray.length;
  if (count === 0) return nodeArray;

  // Find central node (most connected) or use first node
  const centralIndex = findCentralNode(nodes, edges);
  const centralNode = nodeArray[centralIndex];
  centralNode.position = { x: center.x, y: center.y };

  // Build adjacency for layering
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  nodeArray.forEach((n) => {
    children.set(n.id, []);
    parents.set(n.id, []);
  });
  edges.forEach((e) => {
    children.get(e.source)?.push(e.target);
    parents.get(e.target)?.push(e.source);
  });

  // BFS from central node to assign layers
  const layers = new Map<string, number>();
  const queue: { id: string; layer: number }[] = [{ id: centralNode.id, layer: 0 }];

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (layers.has(id)) continue;
    layers.set(id, layer);
    [...(children.get(id) || []), ...(parents.get(id) || [])].forEach((neighborId) => {
      if (!layers.has(neighborId)) {
        queue.push({ id: neighborId, layer: layer + 1 });
      }
    });
  }

  // Group by layer
  const layerNodes = new Map<number, string[]>();
  layers.forEach((layer, id) => {
    if (!layerNodes.has(layer)) layerNodes.set(layer, []);
    layerNodes.get(layer)!.push(id);
  });

  // Position nodes in concentric circles
  layerNodes.forEach((nodeIds, layer) => {
    if (layer === 0) return; // central node already positioned
    const count = nodeIds.length;
    const layerRadius = radius * layer;
    const angleStep = (Math.PI * 2) / count;

    nodeIds.forEach((id, index) => {
      const node = nodeArray.find((n) => n.id === id);
      if (!node) return;
      const angle = index * angleStep;
      node.position.x = center.x + Math.cos(angle) * layerRadius;
      node.position.y = center.y + Math.sin(angle) * layerRadius;
    });
  });

  return nodeArray;
}

function findCentralNode<NodeType extends Node = Node>(nodes: NodeType[], edges: Edge[]): number {
  const degree = new Map<string, number>();
  nodes.forEach((n) => degree.set(n.id, 0));
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  });

  let maxDegree = -1;
  let centralIndex = 0;
  nodes.forEach((n, i) => {
    const d = degree.get(n.id) || 0;
    if (d > maxDegree) {
      maxDegree = d;
      centralIndex = i;
    }
  });
  return centralIndex;
}

/**
 * Main layout function that dispatches to the appropriate algorithm
 */
export function applyLayout<NodeType extends Node = Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: LayoutOptions
): NodeType[] {
  switch (options.algorithm) {
    case "force-directed":
      return forceDirectedLayout(nodes, edges, options);
    case "hierarchical":
      return hierarchicalLayout(nodes, edges, options);
    case "grid":
      return gridLayout(nodes, edges, options);
    case "radial":
      return radialLayout(nodes, edges, options);
    default:
      return nodes;
  }
}

/**
 * Get available layout algorithms with descriptions
 */
export function getLayoutAlgorithms(): { value: LayoutAlgorithm; label: string; description: string }[] {
  return [
    {
      value: "force-directed",
      label: "Force Directed",
      description: "Physics-based layout that simulates repulsion and attraction",
    },
    {
      value: "hierarchical",
      label: "Hierarchical",
      description: "Top-down or left-right tree layout for directed graphs",
    },
    {
      value: "grid",
      label: "Grid",
      description: "Arranges nodes in a regular grid pattern",
    },
    {
      value: "radial",
      label: "Radial",
      description: "Concentric circles layout from a central node",
    },
  ];
}