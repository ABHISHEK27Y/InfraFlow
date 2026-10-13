import mongoose from "mongoose";
import { UGCPGraph } from "@/models/ugcp/schema";

interface ProjectDocument extends mongoose.Document {
  userId: string;
  name: string;
  description: string;
  tags: string[];
  graph: UGCPGraph;
  resources: unknown[];
  terraformBlocks: Record<string, string>;
  thumbnail: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new mongoose.Schema<ProjectDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // Store the canonical UGCP graph
    graph: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    resources: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Terraform blocks snapshot
    terraformBlocks: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Thumbnail/preview data URL
    thumbnail: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for querying user's projects
projectSchema.index({ userId: 1, updatedAt: -1 });

// Transform to match UGCPGraph structure when retrieving
projectSchema.set("toJSON", {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Project = mongoose.models.Project || mongoose.model<ProjectDocument>("Project", projectSchema);

export default Project;
export type { UGCPGraph };
