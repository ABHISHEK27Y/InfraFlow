import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/projectSchema";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const projects = await Project.find({ userId })
      .select("-graph -terraformBlocks")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, tags, graph, resources, terraformBlocks, thumbnail } = body;

    if (!name || !graph) {
      return NextResponse.json(
        { error: "Name and graph are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const project = await Project.create({
      userId,
      name,
      description: description || "",
      tags: tags || [],
      graph,
      resources: Array.isArray(resources) ? resources : [],
      terraformBlocks: terraformBlocks || {},
      thumbnail: thumbnail || "",
    });

    return NextResponse.json({
      project: {
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        tags: project.tags,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
