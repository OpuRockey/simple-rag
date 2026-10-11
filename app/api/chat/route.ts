import { NextRequest, NextResponse } from "next/server";
import { CHAT_MODEL, openai } from "@/lib/openai";
import { retrieveContext } from "@/lib/rag/retrieve";

export async function POST(request: NextRequest) {
  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { error: "A message is required" },
      { status: 400 },
    );
  }

  try {
    const sources = await retrieveContext(message, 5);

    if (sources.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have any documents to answer from yet. Add a document first.",
        sources: [],
      });
    }

    const context = sources
      .map(
        (source, i) =>
          `[${i + 1}] (from "${source.documentTitle}", similarity ${source.score.toFixed(3)})\n${source.content}`,
      )
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions using the provided document excerpts. " +
            "Base your answer on the excerpts when they are relevant, cite them with [1], [2] etc., " +
            "and say so when the excerpts do not contain the answer.",
        },
        {
          role: "user",
          content: `Document excerpts:\n\n${context}\n\nQuestion: ${message}`,
        },
      ],
    });

    return NextResponse.json({
      answer: completion.choices[0]?.message?.content ?? "",
      sources: sources.map((source) => ({
        documentTitle: source.documentTitle,
        score: source.score,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to answer question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
