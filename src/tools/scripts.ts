import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config, getScriptRoots } from "../config.js";
import { scanForScripts, ScriptFile } from "../util/file-scanner.js";
import { logger } from "../util/logger.js";

/**
 * Check if a path is within one of the allowed script roots.
 * Prevents path traversal attacks.
 */
function isPathInScriptRoots(absolutePath: string, roots: string[]): boolean {
  const normalizedPath = path.normalize(absolutePath);
  return roots.some((root) => {
    const normalizedRoot = path.normalize(root);
    return (
      normalizedPath.startsWith(normalizedRoot) &&
      (normalizedPath.length === normalizedRoot.length ||
        normalizedPath[normalizedRoot.length] === path.sep)
    );
  });
}

/**
 * Resolve a file path (relative or absolute) to an absolute path within script roots.
 * Returns null if the path doesn't exist or is outside script roots.
 */
function resolveScriptPath(
  filePath: string,
  roots: string[]
): { absolutePath: string; root: string } | null {
  // If already absolute, validate it's in a script root
  if (path.isAbsolute(filePath)) {
    if (isPathInScriptRoots(filePath, roots) && fs.existsSync(filePath)) {
      const root = roots.find((r) => {
        const normalizedRoot = path.normalize(r);
        const normalizedPath = path.normalize(filePath);
        return normalizedPath.startsWith(normalizedRoot);
      });
      return root ? { absolutePath: filePath, root } : null;
    }
    return null;
  }

  // Try resolving against each script root
  for (const root of roots) {
    const absolutePath = path.resolve(root, filePath);
    if (isPathInScriptRoots(absolutePath, roots) && fs.existsSync(absolutePath)) {
      return { absolutePath, root };
    }
  }

  return null;
}

/**
 * Read file with optional line range.
 */
function readFileWithLines(
  filePath: string,
  startLine?: number,
  endLine?: number
): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Apply line range if specified
  const start = startLine ? Math.max(1, startLine) - 1 : 0;
  const end = endLine ? Math.min(lines.length, endLine) : lines.length;
  const selectedLines = lines.slice(start, end);

  // Add line numbers (1-based)
  return selectedLines
    .map((line, idx) => `${start + idx + 1}:\t${line}`)
    .join("\n");
}

/**
 * Simple substring pattern matching for file paths.
 */
function matchesPattern(relativePath: string, pattern: string): boolean {
  // Convert glob-like pattern to simple substring matching
  // This is intentionally simple - just checks if pattern is in the path
  const normalizedPath = relativePath.toLowerCase();
  const normalizedPattern = pattern.toLowerCase().replace(/\*/g, "");
  return normalizedPath.includes(normalizedPattern);
}

/**
 * Search for pattern in file and return matches with context.
 */
function searchInFile(
  file: ScriptFile,
  pattern: RegExp,
  contextLines: number
): Array<{ line: number; content: string; context: string[] }> {
  try {
    const content = fs.readFileSync(file.absolutePath, "utf-8");
    const lines = content.split("\n");
    const matches: Array<{ line: number; content: string; context: string[] }> =
      [];

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        // Collect context lines
        const contextBefore = [];
        const contextAfter = [];

        for (let j = Math.max(0, i - contextLines); j < i; j++) {
          contextBefore.push(`${j + 1}:\t${lines[j]}`);
        }

        for (
          let j = i + 1;
          j <= Math.min(lines.length - 1, i + contextLines);
          j++
        ) {
          contextAfter.push(`${j + 1}:\t${lines[j]}`);
        }

        matches.push({
          line: i + 1,
          content: lines[i],
          context: [...contextBefore, `${i + 1}:\t${lines[i]}`, ...contextAfter],
        });
      }
    }

    return matches;
  } catch (err) {
    logger.warn(`Failed to search in file ${file.absolutePath}:`, err);
    return [];
  }
}

export function registerScriptTools(server: McpServer): void {
  // Tool 1: List .as script files
  server.tool(
    "as_list_scripts",
    "List Angelscript (.as) files in project Script/ directories",
    {
      pattern: z
        .string()
        .optional()
        .describe(
          "Optional filter pattern (substring match on relative path, e.g. 'Actor', 'UI/*.as')"
        ),
      max_results: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of results to return"),
    },
    async ({ pattern, max_results }) => {
      // Check if project path is configured
      if (!config.projectPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Project path not configured. Please set the UE_AS_PROJECT_PATH environment variable to your Unreal project root directory (containing .uproject file).",
            },
          ],
        };
      }

      const roots = getScriptRoots();
      if (roots.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No script directories found. Expected Script/ or Scripts/ in project root, or configure UE_AS_EXTRA_SCRIPT_ROOTS.",
            },
          ],
        };
      }

      logger.debug(`Scanning script roots: ${roots.join(", ")}`);
      let files = scanForScripts(roots);

      // Apply pattern filter if provided
      if (pattern) {
        files = files.filter((f) => matchesPattern(f.relativePath, pattern));
      }

      // Limit results
      const total = files.length;
      files = files.slice(0, max_results);

      // Format output
      const lines = [
        `Found ${total} script file(s)${pattern ? ` matching '${pattern}'` : ""}`,
        `Showing ${files.length} result(s)\n`,
      ];

      if (files.length === 0) {
        lines.push("No matching files found.");
      } else {
        for (const file of files) {
          const sizeKB = (file.size / 1024).toFixed(1);
          lines.push(`${file.relativePath} (${sizeKB} KB)`);
        }

        if (total > max_results) {
          lines.push(
            `\n... and ${total - max_results} more file(s). Increase max_results to see more.`
          );
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );

  // Tool 2: Read script file contents
  server.tool(
    "as_read_script",
    "Read the contents of an Angelscript (.as) file",
    {
      path: z
        .string()
        .describe(
          "Path to .as file (relative to script root or absolute within project)"
        ),
      start_line: z
        .number()
        .optional()
        .describe("Start line number (1-based, inclusive)"),
      end_line: z
        .number()
        .optional()
        .describe("End line number (1-based, inclusive)"),
    },
    async ({ path: filePath, start_line, end_line }) => {
      // Check if project path is configured
      if (!config.projectPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Project path not configured. Please set the UE_AS_PROJECT_PATH environment variable.",
            },
          ],
        };
      }

      const roots = getScriptRoots();
      if (roots.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No script directories configured.",
            },
          ],
        };
      }

      // Resolve and validate path
      const resolved = resolveScriptPath(filePath, roots);
      if (!resolved) {
        return {
          content: [
            {
              type: "text",
              text: `Error: File not found or access denied: ${filePath}\n\nThe file must be within one of the configured script roots:\n${roots.map((r) => `  - ${r}`).join("\n")}`,
            },
          ],
        };
      }

      try {
        const content = readFileWithLines(
          resolved.absolutePath,
          start_line,
          end_line
        );
        const relativePath = path.relative(resolved.root, resolved.absolutePath);

        return {
          content: [
            {
              type: "text",
              text: `File: ${relativePath}\n${"=".repeat(60)}\n${content}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: Search across script files
  server.tool(
    "as_search_scripts",
    "Search for a regex pattern across all Angelscript files",
    {
      pattern: z.string().describe("Regex pattern to search for"),
      context_lines: z
        .number()
        .optional()
        .default(2)
        .describe("Number of context lines before/after each match"),
      max_results: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum number of match results to return"),
    },
    async ({ pattern, context_lines, max_results }) => {
      // Check if project path is configured
      if (!config.projectPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Project path not configured. Please set the UE_AS_PROJECT_PATH environment variable.",
            },
          ],
        };
      }

      const roots = getScriptRoots();
      if (roots.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No script directories configured.",
            },
          ],
        };
      }

      // Compile regex pattern
      let regex: RegExp;
      try {
        regex = new RegExp(pattern);
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }

      // Scan for all scripts
      const files = scanForScripts(roots);
      const results: string[] = [];
      let matchCount = 0;

      // Search each file
      for (const file of files) {
        if (matchCount >= max_results) {
          break;
        }

        const matches = searchInFile(file, regex, context_lines);
        for (const match of matches) {
          if (matchCount >= max_results) {
            break;
          }

          results.push(`\n${file.relativePath}:${match.line}`);
          results.push(match.context.join("\n"));
          matchCount++;
        }
      }

      // Format output
      const lines = [
        `Search pattern: ${pattern}`,
        `Found ${matchCount} match(es) across ${files.length} file(s)`,
        `Showing up to ${max_results} result(s)\n`,
      ];

      if (results.length === 0) {
        lines.push("No matches found.");
      } else {
        lines.push(...results);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
