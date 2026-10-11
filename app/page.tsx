"use client";

import { useEffect, useRef, useState, useActionState } from "react";

type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  _count: { chunks: number };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UploadState = { status: string | null };

type ChatState = { nonce: number };

export default function Home() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function fetchDocuments(): Promise<DocumentSummary[]> {
    const res = await fetch("/api/documents");
    const data = await res.json();
    return data.documents ?? [];
  }

  async function handleDelete(id: string) {
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    fetchDocuments().then(setDocuments);
  }

  const [uploadState, uploadAction, uploading] = useActionState(
    async (_prev: UploadState, formData: FormData): Promise<UploadState> => {
      const title = String(formData.get("title") ?? "").trim();
      const content = String(formData.get("content") ?? "").trim();
      if (!title || !content) {
        return { status: "Both title and content are required" };
      }
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { status: data.error ?? "Failed to add document" };
        }
        fetchDocuments().then(setDocuments);
        return {
          status: `Added "${title}" (${data.document.chunkCount} chunks embedded)`,
        };
      } catch {
        return { status: "Network error, please try again" };
      }
    },
    { status: null },
  );

  const [, chatAction, asking] = useActionState(
    async (prev: ChatState, formData: FormData): Promise<ChatState> => {
      const message = String(formData.get("message") ?? "").trim();
      if (!message) return prev;
      setMessages((current) => [...current, { role: "user", content: message }]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const data = await res.json();
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.answer ?? data.error ?? "Something went wrong.",
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: "Network error, please try again." },
        ]);
      }
      return { nonce: prev.nonce + 1 };
    },
    { nonce: 0 },
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments().then(setDocuments);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  return (
    <div className="flex flex-1 flex-col gap-8 bg-zinc-50 px-6 py-10 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="flex flex-col gap-6">
          <form
            action={uploadAction}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-lg font-semibold">Add a document</h2>
            <input
              name="title"
              placeholder="Document title"
              required
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
            />
            <textarea
              name="content"
              placeholder="Paste the document text here…"
              rows={8}
              required
              className="resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
            />
            <button
              type="submit"
              disabled={uploading}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {uploading ? "Embedding…" : "Add & embed"}
            </button>
            {uploadState.status && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {uploadState.status}
              </p>
            )}
          </form>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-lg font-semibold">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No documents yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <span className="truncate">{doc.title}</span>
                    <span className="flex items-center gap-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                      {doc._count.chunks} chunks
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex h-[70vh] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ask a question about your documents.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
            {asking && (
              <div className="self-start rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Searching documents…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            action={chatAction}
            className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
            <input
              name="message"
              placeholder="Ask a question…"
              required
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
            />
            <button
              type="submit"
              disabled={asking}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
