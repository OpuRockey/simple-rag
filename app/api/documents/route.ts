import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestDocument } from "@/lib/rag/ingest";

export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const content = body.content?.trim();
  if (!title || !content) {
    return NextResponse.json(
      { error: "Both title and content are required" },
      { status: 400 },
    );
  }

  try {
    const { document, chunkCount } = await ingestDocument(title, content);
    return NextResponse.json(
      {
        document: {
          id: document.id,
          title: document.title,
          chunkCount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
