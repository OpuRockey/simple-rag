import { prisma } from "@/lib/db";
import { chunkText } from "./chunk";
import { createEmbeddings } from "./embeddings";

function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function ingestDocument(title: string, content: string) {
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    throw new Error("Document has no content to ingest");
  }

  const embeddings = await createEmbeddings(chunks);

  const document = await prisma.document.create({
    data: { title, content },
  });

  await prisma.$transaction(
    chunks.map((chunk, index) =>
      prisma.$executeRaw`
        INSERT INTO "document_chunks" ("document_id", "chunk_index", "content", "embedding")
        VALUES (${document.id}::uuid, ${index}, ${chunk}, ${toPgVector(embeddings[index])}::vector)
      `,
    ),
  );

  return { document, chunkCount: chunks.length };
}
