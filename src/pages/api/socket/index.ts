import { Server as NetServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { NextApiResponse } from "next";

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActive: number;
}

interface CollaborationEvent {
  type: "join" | "leave" | "cursor" | "node_add" | "node_update" | "node_delete" | "edge_add" | "edge_update" | "edge_delete" | "sync_request" | "sync_response" | "comment_add" | "comment_update" | "comment_delete" | "comment_resolve" | "comment_reply";
  userId: string;
  userName: string;
  userColor: string;
  payload: any;
  timestamp: number;
}

interface Comment {
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

const projectRooms = new Map<string, {
  collaborators: Map<string, Collaborator>;
  comments: Comment[];
  nodes: any[];
  edges: any[];
}>();

function getOrCreateRoom(projectId: string) {
  if (!projectRooms.has(projectId)) {
    projectRooms.set(projectId, {
      collaborators: new Map(),
      comments: [],
      nodes: [],
      edges: [],
    });
  }
  return projectRooms.get(projectId)!;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: any, res: NextApiResponse & { socket: any }) => {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.io server...");

    const httpServer: NetServer = res.socket.server as any;
    const io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket: Socket) => {
      const { userId, userName, userColor, projectId } = socket.handshake.auth;

      if (!projectId || !userId) {
        socket.disconnect();
        return;
      }

      const room = getOrCreateRoom(projectId);
      socket.join(projectId);

      // Add collaborator
      const collaborator: Collaborator = {
        id: userId,
        name: userName,
        color: userColor,
        lastActive: Date.now(),
      };
      room.collaborators.set(userId, collaborator);

      // Send current collaborators to the new user
      socket.emit("collaborators", Array.from(room.collaborators.values()));

      // Notify others about new collaborator
      socket.to(projectId).emit("collaboration_event", {
        type: "join",
        userId,
        userName,
        userColor,
        payload: collaborator,
        timestamp: Date.now(),
      });

      // Send current comments
      socket.emit("comments", room.comments);

      // Send current diagram state for sync
      socket.emit("sync_data", { nodes: room.nodes, edges: room.edges });

      // Handle events
      socket.on("collaboration_event", (event: CollaborationEvent) => {
        // Update last active
        const collab = room.collaborators.get(userId);
        if (collab) {
          collab.lastActive = Date.now();
          if (event.type === "cursor") {
            collab.cursor = event.payload;
          }
        }

        // Store diagram state
        if (event.type === "node_add" || event.type === "node_update") {
          const existingIndex = room.nodes.findIndex(n => n.id === (event.payload.id || event.payload.nodeId));
          if (existingIndex >= 0) {
            room.nodes[existingIndex] = { ...room.nodes[existingIndex], ...event.payload.updates || event.payload };
          } else if (event.type === "node_add") {
            room.nodes.push(event.payload);
          }
        }
        if (event.type === "node_delete") {
          room.nodes = room.nodes.filter(n => n.id !== event.payload.nodeId);
          room.edges = room.edges.filter(e => e.source !== event.payload.nodeId && e.target !== event.payload.nodeId);
        }
        if (event.type === "edge_add") {
          room.edges.push(event.payload);
        }
        if (event.type === "edge_update") {
          const existingIndex = room.edges.findIndex(e => e.id === event.payload.edgeId);
          if (existingIndex >= 0) {
            room.edges[existingIndex] = { ...room.edges[existingIndex], ...event.payload.updates };
          }
        }
        if (event.type === "edge_delete") {
          room.edges = room.edges.filter(e => e.id !== event.payload.edgeId);
        }

        // Broadcast to others in room
        socket.to(projectId).emit("collaboration_event", event);
      });

      // Handle comments
      socket.on("comment_add", (comment: Omit<Comment, "id" | "createdAt" | "replies">) => {
        const newComment: Comment = {
          ...comment,
          id: "comment_" + Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
          replies: [],
        };
        room.comments.push(newComment);
        io.to(projectId).emit("comments", room.comments);
      });

      socket.on("comment_update", ({ commentId, content }: { commentId: string; content: string }) => {
        const comment = room.comments.find(c => c.id === commentId);
        if (comment) {
          comment.content = content;
          comment.updatedAt = Date.now();
          io.to(projectId).emit("comments", room.comments);
        }
      });

      socket.on("comment_delete", ({ commentId }: { commentId: string }) => {
        room.comments = room.comments.filter(c => c.id !== commentId);
        io.to(projectId).emit("comments", room.comments);
      });

      socket.on("comment_resolve", ({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
        const comment = room.comments.find(c => c.id === commentId);
        if (comment) {
          comment.resolved = resolved;
          io.to(projectId).emit("comments", room.comments);
        }
      });

      socket.on("comment_reply", ({ commentId, content }: { commentId: string; content: string }) => {
        const comment = room.comments.find(c => c.id === commentId);
        if (comment) {
          const reply: Comment = {
            id: "comment_" + Math.random().toString(36).substr(2, 9),
            authorId: userId,
            authorName: userName,
            authorColor: userColor,
            content,
            createdAt: Date.now(),
            resolved: false,
            replies: [],
          };
          comment.replies.push(reply);
          io.to(projectId).emit("comments", room.comments);
        }
      });

      // Handle sync request
      socket.on("sync_request", () => {
        socket.emit("sync_data", { nodes: room.nodes, edges: room.edges });
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        room.collaborators.delete(userId);
        socket.to(projectId).emit("collaboration_event", {
          type: "leave",
          userId,
          userName,
          userColor,
          payload: { userId },
          timestamp: Date.now(),
        });
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default handler;