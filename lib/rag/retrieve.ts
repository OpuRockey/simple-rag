import { prisma } from "@/lib/db";
import { createEmbedding } from "./embeddings";

export type RetrievedChunk = {
  documentTitle: string;
  content: string;
  score: number;
};

export async function retrieveContext(
  query: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const embedding = await createEmbedding(query);
  const embeddingText = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRaw<
    { title: string; content: string; distance: number }[]
  >`
    SELECT d."title", c."content", c."embedding" <=> ${embeddingText}::vector AS "distance"
    FROM "document_chunks" c
    JOIN "Document" d ON d."id" = c."document_id"
    ORDER BY c."embedding" <=> ${embeddingText}::vector
    LIMIT ${topK}
  `;

  return rows.map((row) => ({
    documentTitle: row.title,
    content: row.content,
    score: 1 - row.distance,
  }));
}
