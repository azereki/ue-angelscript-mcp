import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { categories } from "./categories.js";

export interface DocChunk {
  id: string;
  source: string;
  heading: string;
  level: number;
  content: string;
  categories: string[];
}

let cachedChunks: DocChunk[] | null = null;

/**
 * Load and chunk the markdown reference documentation.
 * Results are cached after first load.
 */
export function loadDocChunks(): DocChunk[] {
  if (cachedChunks) {
    return cachedChunks;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Go from build/context/ -> project root -> docs/
  const docsDir = path.resolve(__dirname, "..", "..", "docs");

  const ueAsRefPath = path.join(docsDir, "ue-as-reference.md");
  const langRefPath = path.join(docsDir, "language-reference.md");

  const ueAsContent = fs.readFileSync(ueAsRefPath, "utf-8");
  const langContent = fs.readFileSync(langRefPath, "utf-8");

  const chunks: DocChunk[] = [];

  chunks.push(...chunkMarkdown(ueAsContent, "ue-as-reference"));
  chunks.push(...chunkMarkdown(langContent, "language-reference"));

  cachedChunks = chunks;
  return chunks;
}

/**
 * Split markdown content into chunks by H2 and H3 headings.
 * Each chunk includes the heading and all content until the next heading.
 */
function chunkMarkdown(content: string, source: string): DocChunk[] {
  // Normalize line endings to \n
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.split("\n");
  const chunks: DocChunk[] = [];
  let currentChunk: { heading: string; level: number; lines: string[] } | null = null;
  let chunkIndex = 0;

  for (const line of lines) {
    // Match ## or ### headings (but not # alone)
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h2Match || h3Match) {
      // Save previous chunk if exists
      if (currentChunk) {
        chunks.push(finalizeChunk(currentChunk, source, chunkIndex++));
      }

      // Start new chunk
      const heading = h2Match ? h2Match[1] : h3Match![1];
      const level = h2Match ? 2 : 3;
      currentChunk = {
        heading,
        level,
        lines: [line],
      };
    } else if (currentChunk) {
      // Add line to current chunk
      currentChunk.lines.push(line);
    }
    // Skip lines before the first heading
  }

  // Save final chunk
  if (currentChunk) {
    chunks.push(finalizeChunk(currentChunk, source, chunkIndex));
  }

  return chunks;
}

/**
 * Convert a raw chunk into a DocChunk with categorization.
 */
function finalizeChunk(
  raw: { heading: string; level: number; lines: string[] },
  source: string,
  index: number
): DocChunk {
  const content = raw.lines.join("\n");
  const id = `${source}:${slugify(raw.heading)}`;

  // Match categories by keyword density
  const matchedCategories = categorizeChunk(content);

  return {
    id,
    source,
    heading: raw.heading,
    level: raw.level,
    content,
    categories: matchedCategories,
  };
}

/**
 * Categorize a chunk by counting keyword matches.
 * Returns category IDs with >= 2 keyword matches.
 */
function categorizeChunk(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const matched: string[] = [];

  for (const category of categories) {
    let matchCount = 0;

    for (const keyword of category.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      // Use word boundary matching to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(lowerKeyword)}\\b`, "i");
      if (regex.test(lowerContent)) {
        matchCount++;
      }
    }

    if (matchCount >= 2) {
      matched.push(category.id);
    }
  }

  return matched;
}

/**
 * Create a URL-safe slug from heading text.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
