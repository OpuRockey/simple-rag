const MAX_CHUNK_CHARS = 1000;
const OVERLAP_CHARS = 150;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_CHUNK_CHARS) {
      flush();
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + MAX_CHUNK_CHARS, paragraph.length);
        const piece = paragraph.slice(start, end).trim();
        if (piece) chunks.push(piece);
        if (end === paragraph.length) break;
        start = end - OVERLAP_CHARS;
      }
      continue;
    }

    if (current.length + paragraph.length + 2 > MAX_CHUNK_CHARS) flush();
    current += (current ? "\n\n" : "") + paragraph;
  }

  flush();
  return chunks;
}
