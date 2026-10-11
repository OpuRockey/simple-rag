import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: process.env.API_BASE_URL,
});

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";
