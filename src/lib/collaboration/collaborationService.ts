"use client";

import { AnyNode } from "@/utils/types/resource";
import type { Edge } from "@xyflow/react";
import { io, Socket } from "socket.io-client";

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActive: number;
}

export interface CollaborationEvent {
  type: "join" | "leave" | "cursor" | "node_add" | "node_update" | "node_delete" | "edge_add" | "edge_update" | "edge_delete" | "sync_request" | "sync_response" | "comment_add" | "comment_update" | "comment_delete" | "comment_resolve" | "comment_reply";
  userId: string;
  userName: string;
  userColor: string;
  payload: any;
  timestamp: number;
}

export interface Comment {
  id: string;
  nodeId?: string;
  edgeId?: string;
  position?: { x: number; y: number };
  authorId: string;
  authorName: string;
  authorColor: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  resolved: boolean;
  replies: Comment[];
}

class CollaborationService {
  private socket: Socket | null = null;
  private userId: string = "";
  private userName: string = "";
  private userColor: string = "";
  private projectId: string | null = null;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private initialized = false;

  private ensureInitialized() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.userId = this.generateUserId();
    this.userName = this.getStoredName() || `User-${this.userId.slice(0, 4)}`;
    this.userColor = this.getStoredColor() || this.generateColor();
  }

  private generateUserId(): string {
    if (typeof window === "undefined") return "user_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    let id = localStorage.getItem("infraflow_user_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem("infraflow_user_id", id);
    }
    return id;
  }

  private getStoredName(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("infraflow_user_name");
  }

  private getStoredColor(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("infraflow_user_color");
  }

  private generateColor(): string {
    const colors = [
      "#ef4444", "#f97316", "#f59e0b", "#eab308",
      "#84cc16", "#22c55e", "#10b981", "#14b8a6",
      "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
      "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setUserName(name: string) {
    this.userName = name;
    if (typeof window !== "undefined") localStorage.setItem("infraflow_user_name", name);
  }

  getUserId(): string {
    this.ensureInitialized();
    return this.userId;
  }

  getUserName(): string {
    this.ensureInitialized();
    return this.userName;
  }

  getUserColor(): string {
    this.ensureInitialized();
    return this.userColor;
  }

  connect(projectId: string, serverUrl: string = ""): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected && this.projectId === projectId) {
        resolve();
        return;
      }

      this.projectId = projectId;
      const url = serverUrl || (typeof window !== "undefined" ? window.location.origin : "");

      this.socket = io(url, {
        path: "/api/socket",
        transports: ["websocket", "polling"],
        autoConnect: true,
        auth: {
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
          projectId,
        },
      });

      this.socket.on("connect", () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit("connected", {});
        resolve();
      });

      this.socket.on("disconnect", (reason) => {
        this.connected = false;
        this.emit("disconnected", { reason });
      });

      this.socket.on("connect_error", () => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit("error", { message: "Max reconnection attempts reached" });
          reject(new Error("Failed to connect to collaboration server"));
        }
      });

      this.socket.on("collaboration_event", (event: CollaborationEvent) => {
        this.emit("event", event);
      });

      this.socket.on("collaborators", (collaborators: Collaborator[]) => {
        this.emit("collaborators_update", collaborators);
      });

      this.socket.on("comments", (comments: Comment[]) => {
        this.emit("comments_update", comments);
      });

      this.socket.on("sync_data", (data: { nodes: AnyNode[]; edges: Edge[] }) => {
        this.emit("sync_data", data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.projectId = null;
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  sendEvent(type: CollaborationEvent["type"], payload: any) {
    if (!this.socket?.connected) return;

    const event: CollaborationEvent = {
      type,
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      payload,
      timestamp: Date.now(),
    };

    this.socket.emit("collaboration_event", event);
  }

  sendCursor(position: { x: number; y: number }) {
    this.sendEvent("cursor", position);
  }

  sendNodeAdd(node: AnyNode) {
    this.sendEvent("node_add", node);
  }

  sendNodeUpdate(nodeId: string, updates: Partial<AnyNode>) {
    this.sendEvent("node_update", { nodeId, updates });
  }

  sendNodeDelete(nodeId: string) {
    this.sendEvent("node_delete", { nodeId });
  }

  sendEdgeAdd(edge: Edge) {
    this.sendEvent("edge_add", edge);
  }

  sendEdgeUpdate(edgeId: string, updates: Partial<Edge>) {
    this.sendEvent("edge_update", { edgeId, updates });
  }

  sendEdgeDelete(edgeId: string) {
    this.sendEvent("edge_delete", { edgeId });
  }

  requestSync() {
    this.sendEvent("sync_request", {});
  }

  addComment(comment: Omit<Comment, "id" | "createdAt" | "replies">) {
    this.sendEvent("comment_add", comment);
  }

  updateComment(commentId: string, content: string) {
    this.sendEvent("comment_update", { commentId, content });
  }

  deleteComment(commentId: string) {
    this.sendEvent("comment_delete", { commentId });
  }

  resolveComment(commentId: string, resolved: boolean) {
    this.sendEvent("comment_resolve", { commentId, resolved });
  }

  replyToComment(commentId: string, content: string) {
    this.sendEvent("comment_reply", { commentId, content });
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const collaborationService = new CollaborationService();