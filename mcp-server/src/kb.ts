import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.KNOWLEDGE_DIR ?? path.join(process.cwd(), "knowledge"));

export async function searchKnowledge(query: string, limit = 5) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const files = (await readdir(root)).filter((file) => file.endsWith(".md"));
  const hits: Array<{ file: string; score: number; preview: string }> = [];

  for (const file of files) {
    const content = await safeRead(file);
    const lowered = content.toLowerCase();
    const score = terms.reduce((sum, term) => sum + count(lowered, term), 0);
    if (score > 0) {
      hits.push({ file, score, preview: preview(content, terms[0] ?? "") });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function readKbSection(file: string, heading?: string) {
  const content = await safeRead(file);
  if (!heading) {
    return { file, content };
  }

  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => normalizeHeading(line) === normalizeHeading(heading));
  if (start < 0) {
    return { file, heading, content: "" };
  }

  const level = headingLevel(lines[start]);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (headingLevel(lines[i]) > 0 && headingLevel(lines[i]) <= level) {
      end = i;
      break;
    }
  }

  return { file, heading, content: lines.slice(start, end).join("\n") };
}

async function safeRead(file: string) {
  const resolved = path.resolve(root, file);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("KB path escapes knowledge root");
  }
  return readFile(resolved, "utf8");
}

function count(text: string, term: string) {
  if (!term) return 0;
  return text.split(term).length - 1;
}

function preview(content: string, term: string) {
  const index = term ? content.toLowerCase().indexOf(term) : 0;
  const start = Math.max(0, index - 120);
  return content.slice(start, start + 260).replace(/\s+/g, " ").trim();
}

function normalizeHeading(value: string) {
  return value.replace(/^#+\s*/, "").trim().toLowerCase();
}

function headingLevel(line: string) {
  const match = /^(#+)\s+/.exec(line);
  return match ? match[1].length : 0;
}
