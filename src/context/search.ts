import { DocChunk, loadDocChunks } from "./loader.js";
import { categories, getCategoryById } from "./categories.js";

/**
 * Get all chunks matching a specific category.
 */
export function getByCategory(categoryId: string): DocChunk[] {
  const chunks = loadDocChunks();
  return chunks.filter((chunk) => chunk.categories.includes(categoryId));
}

/**
 * Search chunks by keyword query (case-insensitive substring match).
 * Searches both heading and content.
 */
export function searchChunks(query: string): DocChunk[] {
  const chunks = loadDocChunks();
  const lowerQuery = query.toLowerCase();

  return chunks.filter((chunk) => {
    const lowerHeading = chunk.heading.toLowerCase();
    const lowerContent = chunk.content.toLowerCase();
    return lowerHeading.includes(lowerQuery) || lowerContent.includes(lowerQuery);
  });
}

/**
 * Get a summary of available categories with chunk counts.
 */
export function getCategorySummary(): Array<{
  id: string;
  name: string;
  description: string;
  chunkCount: number;
}> {
  const chunks = loadDocChunks();

  return categories.map((cat) => {
    const chunkCount = chunks.filter((chunk) =>
      chunk.categories.includes(cat.id)
    ).length;

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      chunkCount,
    };
  });
}
