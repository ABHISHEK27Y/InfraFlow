"use client";

import React, { useState, useEffect, useRef } from "react";
import { collaborationService, Collaborator, Comment } from "@/lib/collaboration/collaborationService";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useProjectStore } from "@/store/useProjectStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send, X, Loader2, MessageSquare, UserPlus, Check, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CollaborationPanel({ isOpen, onClose }: CollaborationPanelProps) {
  const { nodes, edges, addNode, addEdge, updateNodeData, deleteNode, addEdge: addEdgeAction } = useDiagramStore();
  const { currentProjectId } = useProjectStore();
  const [activeTab, setActiveTab] = useState<"collaborators" | "comments" | "settings">("collaborators");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [userName, setUserName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCursors, setShowCursors] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem("infraflow_user_name");
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEvent = (event: any) => {
      if (event.type === "node_add" && event.userId !== collaborationService.getUserId()) {
        addNode(event.payload);
      } else if (event.type === "node_update" && event.userId !== collaborationService.getUserId()) {
        updateNodeData(event.payload.nodeId, event.payload.updates);
      } else if (event.type === "node_delete" && event.userId !== collaborationService.getUserId()) {
        deleteNode(event.payload.nodeId);
      } else if (event.type === "edge_add" && event.userId !== collaborationService.getUserId()) {
        addEdgeAction(event.payload);
      } else if (event.type === "edge_update" && event.userId !== collaborationService.getUserId()) {
        // Edge update would need implementation in store
      } else if (event.type === "edge_delete" && event.userId !== collaborationService.getUserId()) {
        // deleteEdge not available in store, would need to be added
        console.warn("Edge deletion from collaboration not implemented in store");
      }
    };

    const handleCollaboratorsUpdate = (collabs: Collaborator[]) => {
      setCollaborators(collabs.filter(c => c.id !== collaborationService.getUserId()));
    };

    const handleCommentsUpdate = (comms: Comment[]) => {
      setComments(comms);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSyncData = (data: { nodes: any[]; edges: any[] }) => {
      // Could implement full sync here if needed
    };

    const handleConnected = () => {
      setIsConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleDisconnected = (data: { reason: string }) => {
      setIsConnected(false);
      setConnecting(false);
      setError(`Disconnected: ${data.reason}`);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setConnecting(false);
    };

    collaborationService.on("event", handleEvent);
    collaborationService.on("collaborators_update", handleCollaboratorsUpdate);
    collaborationService.on("comments_update", handleCommentsUpdate);
    collaborationService.on("sync_data", handleSyncData);
    collaborationService.on("connected", handleConnected);
    collaborationService.on("disconnected", handleDisconnected);
    collaborationService.on("error", handleError);

    // Connect if we have a project
    if (currentProjectId) {
      connectToProject(currentProjectId);
    }

    return () => {
      collaborationService.off("event", handleEvent);
      collaborationService.off("collaborators_update", handleCollaboratorsUpdate);
      collaborationService.off("comments_update", handleCommentsUpdate);
      collaborationService.off("sync_data", handleSyncData);
      collaborationService.off("connected", handleConnected);
      collaborationService.off("disconnected", handleDisconnected);
      collaborationService.off("error", handleError);
    };
  }, [isOpen, currentProjectId, nodes, edges, addNode, addEdge, updateNodeData, deleteNode, addEdgeAction]);

  const connectToProject = async (projectId: string) => {
    if (!userName.trim()) {
      setError("Please enter your name first");
      return;
    }

    setConnecting(true);
    setError(null);
    collaborationService.setUserName(userName);

    try {
      await collaborationService.connect(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setConnecting(false);
      setIsConnected(false);
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;

    collaborationService.addComment({
      nodeId: selectedNodeId || undefined,
      edgeId: selectedEdgeId || undefined,
      authorId: collaborationService.getUserId(),
      authorName: collaborationService.getUserName(),
      authorColor: collaborationService.getUserColor(),
      content: commentText,
      resolved: false,
    });

    setCommentText("");
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleReply = (commentId: string, replyText: string) => {
    if (!replyText.trim()) return;
    collaborationService.replyToComment(commentId, replyText);
  };

  const handleResolve = (commentId: string, resolved: boolean) => {
    collaborationService.resolveComment(commentId, resolved);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-4xl max-h-[90vh] bg-[#131316] border border-[#374151] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <CardHeader className="flex items-center justify-between p-4 border-b border-[#374151] flex-shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Collaboration
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-xs text-gray-400">{isConnected ? "Connected" : connecting ? "Connecting..." : "Disconnected"}</span>
            <button onClick={onClose} className="p-1 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>

        {!isConnected && !connecting && (
          <div className="p-4 border-b border-[#374151] bg-[#1a1a22]">
            <div className="flex gap-2 mb-3">
              <Input
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 bg-[#131316] border-[#374151] text-white"
                onKeyDown={e => e.key === "Enter" && connectToProject(currentProjectId!)}
              />
              <Button onClick={() => connectToProject(currentProjectId!)} disabled={connecting || !userName.trim() || !currentProjectId} className="gap-2">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Join Session
              </Button>
            </div>
            {currentProjectId ? null : <p className="text-xs text-gray-500">Create or select a project to enable collaboration</p>}
            {error && <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
          </div>
        )}

        {isConnected && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "collaborators" | "comments" | "settings")} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-[#1a1a22] border-b border-[#374151] p-1">
              <TabsTrigger value="collaborators" className="text-xs flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Collaborators ({collaborators.length + 1})
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3" /> Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="collaborators" className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {/* Current user */}
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: collaborationService.getUserColor() }}>
                      {collaborationService.getUserName().charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{collaborationService.getUserName()} <span className="text-xs text-gray-500">(You)</span></p>
                      <p className="text-xs text-gray-500">ID: {collaborationService.getUserId().slice(0, 8)}...</p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Online</span>
                  </div>

                  {/* Other collaborators */}
                  {collaborators.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                      <p>No other collaborators yet. Share the project link to invite others.</p>
                    </div>
                  ) : (
                    collaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center gap-3 p-3 bg-[#1a1a22] border border-[#374151] rounded-lg">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: collab.color }}>
                          {collab.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{collab.name}</p>
                          <p className="text-xs text-gray-500">ID: {collab.id.slice(0, 8)}...</p>
                        </div>
                        {collab.cursor && showCursors && (
                          <span className="text-xs text-gray-500">Cursor: {Math.round(collab.cursor.x)}, {Math.round(collab.cursor.y)}</span>
                        )}
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Online</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#374151]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">Comments</h3>
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={showCursors} onChange={e => setShowCursors(e.target.checked)} className="w-3 h-3" />
                    Show Cursors
                  </label>
                </div>
                <p className="text-xs text-gray-500">Click a node/edge to attach a comment, or leave blank for general comment</p>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div ref={messagesEndRef} />
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                    <p>No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <CommentThread key={comment.id} comment={comment} onReply={handleReply} onResolve={handleResolve} currentUserId={collaborationService.getUserId()} formatTime={formatTime} />
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-[#374151] bg-[#1a1a22]">
                {(selectedNodeId || selectedEdgeId) && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                    <span>Attached to: </span>
                    <span className="bg-[#374151] px-2 py-0.5 rounded">{selectedNodeId ? `Node: ${selectedNodeId}` : `Edge: ${selectedEdgeId}`}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}>
                      <X className="w-3 h-3" /> Clear
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-[#131316] border-[#374151] text-white placeholder-gray-500 focus:border-blue-500 min-h-[60px] max-h-[120px] resize-none"
                    rows={2}
                  />
                  <Button onClick={handleSendComment} disabled={!commentText.trim()} className="gap-2 self-end">
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#374151]">
                <h3 className="font-medium text-white">Collaboration Settings</h3>
              </div>

              <div className="p-4 space-y-6">
                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">Your Name</Label>
                  <Input
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Your display name"
                    className="bg-[#1a1a22] border-[#374151] text-white"
                  />
                </div>

                <Separator className="border-[#374151]" />

                <div>
                  <h4 className="font-medium text-white mb-3">Session Info</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Project ID: <span className="text-white">{currentProjectId || "None"}</span></p>
                    <p>Your User ID: <span className="text-white">{collaborationService.getUserId().slice(0, 12)}...</span></p>
                    <p>Status: <span className={isConnected ? "text-green-400" : "text-red-400"}>{isConnected ? "Connected" : "Disconnected"}</span></p>
                  </div>
                </div>

                <Separator className="border-[#374151]" />

                <div>
                  <h4 className="font-medium text-white mb-3">Actions</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => collaborationService.requestSync()}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Request Sync
                    </Button>
                    <Button variant="outline" onClick={() => collaborationService.disconnect()}>
                      <Users className="w-3 h-3 mr-1" /> Leave Session
                    </Button>
                  </div>
                </div>

                <Separator className="border-[#374151]" />

                <div>
                  <h4 className="font-medium text-white mb-3">How it works</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>• Real-time cursor positions</p>
                    <p>• Live node/edge synchronization</p>
                    <p>• Threaded comments on resources</p>
                    <p>• Presence indicators</p>
                    <p>• Works across browser tabs</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
}

function CommentThread({ comment, onReply, onResolve, currentUserId, formatTime }: {
  comment: Comment;
  onReply: (commentId: string, text: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  currentUserId: string;
  formatTime: (ts: number) => string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  return (
    <div className="bg-[#1a1a22] border border-[#374151] rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[#374151] flex items-start gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: comment.authorColor }}>
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{comment.authorName}</span>
            <span className="text-xs text-gray-500">{formatTime(comment.createdAt)}</span>
            {comment.resolved && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Resolved</span>}
          </div>
          <p className="text-sm text-gray-300">{comment.content}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setShowReplyInput(!showReplyInput)} className="p-1">
            <MessageSquare className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onResolve(comment.id, !comment.resolved)} className="p-1">
            <Check className="w-3 h-3" />
          </Button>
          {comment.replies.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowReplies(!showReplies)} className="p-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${showReplies ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {showReplyInput && (
        <div className="p-3 border-b border-[#374151] flex gap-2">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 bg-[#131316] border-[#374151] text-white placeholder-gray-500 focus:border-blue-500 min-h-[40px] max-h-[80px] resize-none"
            rows={1}
          />
          <Button size="sm" onClick={() => { onReply(comment.id, replyText); setReplyText(""); setShowReplyInput(false); }} disabled={!replyText.trim()}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      )}

      {showReplies && comment.replies.length > 0 && (
        <div className="pl-10 border-l border-[#374151]">
          {comment.replies.map((reply, idx) => (
            <div key={idx} className="p-3 border-b border-[#374151] flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: reply.authorColor }}>
                {reply.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{reply.authorName}</span>
                  <span className="text-xs text-gray-500">{formatTime(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-300">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add missing imports
