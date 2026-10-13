"use client";

import { useCallback } from "react";
import dagre from "dagre";
import { AnyNode } from "@/utils/types/resource";
import { Edge } from "@xyflow/react";
import { useDiagramStore } from "@/store/useDiagramStore";

interface LayoutOptions {
  direction?: "TB" | "BT" | "LR" | "RL";
  rankSep?: number;
  nodeSep?: number;
  edgeSep?: number;
  align?: "UL" | "UR" | "DL" | "DR";
}

export function useAutoLayout() {
  const { nodes, edges, setAllNodes } = useDiagramStore();

  const layout = useCallback(
    (options: LayoutOptions = {}) => {
      if (nodes.length === 0) return;

      const {
        direction = "TB",
        rankSep = 100,
        nodeSep = 80,
        edgeSep = 20,
        align = "UL",
      } = options;

      // Create a new Dagre graph
      const g = new dagre.graphlib.Graph();
      g.setGraph({
        rankdir: direction,
        ranksep: rankSep,
        nodesep: nodeSep,
        edgesep: edgeSep,
        align,
      });
      g.setDefaultEdgeLabel(() => ({}));

      // Add nodes to graph
      nodes.forEach((node) => {
        const width = node.width || 150;
        const height = node.height || 80;
        g.setNode(node.id, { width, height });
      });

      // Add edges to graph
      edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
      });

      // Run layout
      dagre.layout(g);

      // Update node positions
      const newNodes = nodes.map((node) => {
        const dagreNode = g.node(node.id);
        if (dagreNode) {
          return {
            ...node,
            position: {
              x: dagreNode.x - (node.width || 150) / 2,
              y: dagreNode.y - (node.height || 80) / 2,
            },
          };
        }
        return node;
      });

      setAllNodes(newNodes);
    },
    [nodes, edges, setAllNodes]
  );

  const layoutSelected = useCallback(
    (options: LayoutOptions = {}) => {
      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length === 0) return;

      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      const relevantEdges = edges.filter(
        (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
      );

      if (relevantEdges.length === 0 && selectedNodes.length === 1) {
        // Single node, just center it
        const node = selectedNodes[0];
        setAllNodes(
          nodes.map((n) =>
            n.id === node.id
              ? { ...n, position: { x: 0, y: 0 } }
              : n
          )
        );
        return;
      }

      const {
        direction = "TB",
        rankSep = 100,
        nodeSep = 80,
        edgeSep = 20,
        align = "UL",
      } = options;

      const g = new dagre.graphlib.Graph();
      g.setGraph({
        rankdir: direction,
        ranksep: rankSep,
        nodesep: nodeSep,
        edgesep: edgeSep,
        align,
      });
      g.setDefaultEdgeLabel(() => ({}));

      selectedNodes.forEach((node) => {
        const width = node.width || 150;
        const height = node.height || 80;
        g.setNode(node.id, { width, height });
      });

      relevantEdges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
      });

      dagre.layout(g);

      const newNodes = nodes.map((node) => {
        if (!selectedIds.has(node.id)) return node;
        const dagreNode = g.node(node.id);
        if (dagreNode) {
          return {
            ...node,
            position: {
              x: dagreNode.x - (node.width || 150) / 2,
              y: dagreNode.y - (node.height || 80) / 2,
            },
          };
        }
        return node;
      });

      setAllNodes(newNodes);
    },
    [nodes, edges, setAllNodes]
  );

  return { layout, layoutSelected };
}

// Radial layout helper
export function radialLayout(
  nodes: AnyNode[],
  edges: Edge[],
  centerX: number = 0,
  centerY: number = 0,
  radius: number = 200
): AnyNode[] {
  if (nodes.length === 0) return nodes;

  // Build adjacency list
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    const sources = adj.get(e.source) || [];
    sources.push(e.target);
    adj.set(e.source, sources);
  });

  // Find root nodes (nodes with no incoming edges)
  const hasIncoming = new Set<string>();
  edges.forEach((e) => hasIncoming.add(e.target));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const queue: { id: string; level: number }[] = roots.map((r) => ({
    id: r.id,
    level: 0,
  }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    const children = adj.get(id) || [];
    children.forEach((child) => {
      if (!visited.has(child)) {
        queue.push({ id: child, level: level + 1 });
      }
    });
  }

  // Group by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    const group = levelGroups.get(level) || [];
    group.push(id);
    levelGroups.set(level, group);
  });

  // Position nodes radially
  const newNodes = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const group = levelGroups.get(level) || [];
    const index = group.indexOf(node.id);
    const angle = (index / group.length) * 2 * Math.PI - Math.PI / 2;
    const r = radius * (level + 1);

    return {
      ...node,
      position: {
        x: centerX + r * Math.cos(angle) - (node.width || 150) / 2,
        y: centerY + r * Math.sin(angle) - (node.height || 80) / 2,
      },
    };
  });

  return newNodes;
}

// Force-directed layout (simple implementation)
export function forceDirectedLayout(
  nodes: AnyNode[],
  edges: Edge[],
  iterations: number = 100
): AnyNode[] {
  if (nodes.length === 0) return nodes;

  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const k = 100; // Optimal distance
  const temperature = 50;

  for (let i = 0; i < iterations; i++) {
    const disp = new Map<string, { x: number; y: number }>();

    // Initialize displacement
    nodes.forEach((n) => disp.set(n.id, { x: 0, y: 0 }));

    // Repulsive forces
    nodes.forEach((n1) => {
      nodes.forEach((n2) => {
        if (n1.id === n2.id) return;
        const dx = (n1.position?.x || 0) - (n2.position?.x || 0);
        const dy = (n1.position?.y || 0) - (n2.position?.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / dist;
        const d = disp.get(n1.id)!;
        d.x += (dx / dist) * force;
        d.y += (dy / dist) * force;
      });
    });

    // Attractive forces
    edges.forEach((e) => {
      const source = nodeMap.get(e.source);
      const target = nodeMap.get(e.target);
      if (!source || !target) return;

      const dx = (target.position?.x || 0) - (source.position?.x || 0);
      const dy = (target.position?.y || 0) - (source.position?.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;

      const ds = disp.get(source.id)!;
      ds.x += (dx / dist) * force;
      ds.y += (dy / dist) * force;

      const dt = disp.get(target.id)!;
      dt.x -= (dx / dist) * force;
      dt.y -= (dy / dist) * force;
    });

    // Apply displacements with temperature limit
    const t = temperature * (1 - i / iterations);
    nodes.forEach((n) => {
      const d = disp.get(n.id)!;
      const dist = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
      const limitedDist = Math.min(dist, t);
      const node = nodeMap.get(n.id)!;
      node.position = {
        x: (node.position?.x || 0) + (d.x / dist) * limitedDist,
        y: (node.position?.y || 0) + (d.y / dist) * limitedDist,
      };
    });
  }

  return Array.from(nodeMap.values());
}