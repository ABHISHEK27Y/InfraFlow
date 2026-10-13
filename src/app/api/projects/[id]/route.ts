import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/projectSchema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const project = await Project.findOne({ _id: id, userId });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectObj = project.toObject();

    return NextResponse.json({
      project: {
        id: projectObj._id.toString(),
        name: projectObj.name,
        description: projectObj.description,
        tags: projectObj.tags,
        graph: projectObj.graph,
        resources: projectObj.resources || [],
        terraformBlocks: projectObj.terraformBlocks,
        thumbnail: projectObj.thumbnail,
        isPublic: projectObj.isPublic,
        createdAt: projectObj.createdAt,
        updatedAt: projectObj.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, tags, graph, resources, terraformBlocks, thumbnail, isPublic } = body;

    await connectDB();

    const project = await Project.findOneAndUpdate(
      { _id: id, userId },
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        ...(graph && { graph }),
        ...(Array.isArray(resources) && { resources }),
        ...(terraformBlocks && { terraformBlocks }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectObj = project.toObject();

    return NextResponse.json({
      project: {
        id: projectObj._id.toString(),
        name: projectObj.name,
        description: projectObj.description,
        tags: projectObj.tags,
        createdAt: projectObj.createdAt,
        updatedAt: projectObj.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const project = await Project.findOneAndDelete({ _id: id, userId });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
