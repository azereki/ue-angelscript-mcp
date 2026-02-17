import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getByCategory, searchChunks, getCategorySummary } from "../context/search.js";
import { getCategoryById } from "../context/categories.js";
import type { DocChunk } from "../context/loader.js";

const MAX_CHUNK_LINES = 200;

export function registerDocumentationTools(server: McpServer): void {
  server.tool(
    "as_get_context",
    "Query Unreal Engine Angelscript documentation by category or keyword. Call with no arguments to see available categories.",
    {
      category: z
        .string()
        .optional()
        .describe("Category ID to filter by (e.g. 'scripting_basics', 'networking')"),
      query: z
        .string()
        .optional()
        .describe("Keyword to search across all documentation"),
      max_results: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of doc sections to return"),
    },
    async (args) => {
      // No args - return category summary
      if (!args.category && !args.query) {
        return formatCategorySummary();
      }

      let results: DocChunk[] = [];
      let searchType = "";

      // Category filter
      if (args.category) {
        const category = getCategoryById(args.category);
        if (!category) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Unknown category '${args.category}'. Call with no arguments to see available categories.`,
              },
            ],
          };
        }

        results = getByCategory(args.category);
        searchType = `category: ${category.name}`;
      }
      // Keyword search
      else if (args.query) {
        results = searchChunks(args.query);
        searchType = `query: "${args.query}"`;
      }

      // Limit results
      const maxResults = args.max_results ?? 5;
      const totalFound = results.length;
      results = results.slice(0, maxResults);

      // Format output
      return formatResults(results, searchType, totalFound, maxResults);
    }
  );
}

/**
 * Format category summary for display.
 */
function formatCategorySummary() {
  const summary = getCategorySummary();

  let text = "# Angelscript Documentation Categories\n\n";
  text += "Use the `category` parameter to get documentation from a specific category.\n\n";

  for (const cat of summary) {
    text += `## ${cat.name} (${cat.chunkCount} sections)\n`;
    text += `**ID:** \`${cat.id}\`\n`;
    text += `${cat.description}\n\n`;
  }

  text += "\n---\n\n";
  text += "**Usage examples:**\n";
  text += "- `as_get_context(category='scripting_basics')` - Get actor and component basics\n";
  text += "- `as_get_context(query='replication')` - Search for replication docs\n";
  text += "- `as_get_context(category='testing', max_results=10)` - Get up to 10 testing sections\n";

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

/**
 * Format search results for display.
 */
function formatResults(
  results: DocChunk[],
  searchType: string,
  totalFound: number,
  maxResults: number
) {
  if (results.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No documentation found for ${searchType}.`,
        },
      ],
    };
  }

  let text = `# Angelscript Documentation Results\n\n`;
  text += `**Search:** ${searchType}\n`;
  text += `**Found:** ${totalFound} section(s)`;

  if (totalFound > maxResults) {
    text += ` (showing first ${maxResults})`;
  }
  text += "\n\n";
  text += "---\n\n";

  for (let i = 0; i < results.length; i++) {
    const chunk = results[i];

    text += `## ${chunk.heading}\n\n`;
    text += `**Source:** ${chunk.source} | **Categories:** ${chunk.categories.join(", ") || "none"}\n\n`;

    // Truncate long chunks
    const lines = chunk.content.split("\n");
    const totalLines = lines.length;

    if (totalLines > MAX_CHUNK_LINES) {
      const truncatedContent = lines.slice(0, MAX_CHUNK_LINES).join("\n");
      text += truncatedContent;
      text += `\n\n*[... truncated ${totalLines - MAX_CHUNK_LINES} lines, ${totalLines} total]*\n\n`;
    } else {
      text += chunk.content + "\n\n";
    }

    // Add separator between sections
    if (i < results.length - 1) {
      text += "---\n\n";
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}
