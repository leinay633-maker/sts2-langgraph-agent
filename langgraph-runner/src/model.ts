import { ChatOpenAI } from "@langchain/openai";

type JsonObject = Record<string, unknown>;

export async function invokeModelJson<T extends JsonObject>(system: string, payload: JsonObject): Promise<T | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0
  });

  const response = await model.invoke([
    { role: "system", content: `${system}\nReturn compact JSON only. Do not include markdown.` },
    { role: "user", content: JSON.stringify(payload) }
  ]);

  return parseJson<T>(contentToText(response.content));
}

function parseJson<T extends JsonObject>(text: string): T | null {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return String((part as { text: unknown }).text);
      return JSON.stringify(part);
    })
    .join("");
}
