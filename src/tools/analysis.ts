import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import { getScriptRoots } from "../config.js";
import { scanForScripts } from "../util/file-scanner.js";
import { logger } from "../util/logger.js";
import { parseAngelscriptAST } from "../util/ast-parser.js";

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function registerAnalysisTools(server: McpServer): void {
  server.tool(
    "as_scan_definitions",
    "Parse an Angelscript file and return a structured summary of all classes, structs, enums, properties, and functions defined within it.",
    {
      filePath: z.string().describe("The absolute path to the .as file to scan"),
    },
    async ({ filePath }) => {
      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text" as const, text: `Error: File not found at ${filePath}` }],
        };
      }

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const ast = parseAngelscriptAST(content);

        let output = `AST Summary for ${filePath}:\n\n`;
        
        if (ast.classes.length > 0) {
          output += "Classes:\n";
          for (const c of ast.classes) {
            output += `  - class ${c.name}${c.parent ? ` : ${c.parent}` : ""}\n`;
            for (const p of c.properties) output += `      [P] ${p}\n`;
            for (const m of c.methods) output += `      [M] ${m}()\n`;
          }
          output += "\n";
        }

        if (ast.structs.length > 0) {
          output += "Structs:\n";
          for (const s of ast.structs) {
            output += `  - struct ${s.name}\n`;
            for (const p of s.properties) output += `      [P] ${p}\n`;
            for (const m of s.methods) output += `      [M] ${m}()\n`;
          }
          output += "\n";
        }

        if (ast.enums.length > 0) {
          output += "Enums:\n";
          for (const e of ast.enums) {
            output += `  - enum ${e.name}\n`;
            for (const v of e.values) output += `      ${v}\n`;
          }
          output += "\n";
        }

        if (ast.delegates.length > 0) {
          output += "Delegates:\n";
          for (const d of ast.delegates) {
            output += `  - ${d}\n`;
          }
          output += "\n";
        }

        if (ast.globalFunctions.length > 0) {
          output += "Global Functions:\n";
          for (const f of ast.globalFunctions) {
            output += `  - ${f}()\n`;
          }
        }

        if (Object.values(ast).every(arr => Array.isArray(arr) && arr.length === 0)) {
          output += "No definitions found or file is empty.";
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to read or parse file: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    "as_find_usages",
    "Search across all Angelscript files for usages of a specific class, struct, enum, function, or variable name.",
    {
      identifier: z.string().describe("The name of the identifier to search for (e.g., 'AMyActor', 'GetHealth', 'bIsDead')"),
      matchCase: z.boolean().optional().default(true).describe("Whether to perform a case-sensitive search"),
      exactWord: z.boolean().optional().default(true).describe("Whether to match whole words only"),
    },
    async ({ identifier, matchCase, exactWord }) => {
      const roots = getScriptRoots();
      if (roots.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Error: No script roots found. Please configure UE_AS_PROJECT_PATH." }],
        };
      }

      const scriptFiles = scanForScripts(roots);
      if (scriptFiles.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No Angelscript files found in the configured script roots." }],
        };
      }

      try {
        let regexStr = escapeRegExp(identifier);
        if (exactWord) {
          regexStr = `\\b${regexStr}\\b`;
        }
        
        const flags = matchCase ? "g" : "gi";
        const regex = new RegExp(regexStr, flags);
        
        const matches: Array<{ file: string; line: number; content: string }> = [];
        let totalMatches = 0;
        const maxMatches = 200; // Limit to prevent massive responses

        for (const scriptFile of scriptFiles) {
          if (totalMatches >= maxMatches) break;

          const content = fs.readFileSync(scriptFile.absolutePath, "utf-8");
          const lines = content.split(/\r?\n/);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            regex.lastIndex = 0; // Reset state
            if (regex.test(line)) {
              matches.push({
                file: scriptFile.relativePath,
                line: i + 1,
                content: line.trim()
              });
              totalMatches++;
              if (totalMatches >= maxMatches) break;
            }
          }
        }

        if (matches.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No usages of '${identifier}' found in ${scriptFiles.length} files.` }],
          };
        }

        let output = `Found ${totalMatches}${totalMatches >= maxMatches ? '+' : ''} usages of '${identifier}' in ${scriptFiles.length} files:\n\n`;
        
        // Group by file
        const byFile = matches.reduce((acc, match) => {
          if (!acc[match.file]) acc[match.file] = [];
          acc[match.file].push(match);
          return acc;
        }, {} as Record<string, typeof matches>);

        for (const [file, fileMatches] of Object.entries(byFile)) {
          output += `${file}:\n`;
          for (const m of fileMatches) {
            // Truncate very long lines
            let preview = m.content;
            if (preview.length > 100) preview = preview.substring(0, 97) + "...";
            output += `  Line ${m.line}: ${preview}\n`;
          }
          output += "\n";
        }

        if (totalMatches >= maxMatches) {
          output += `... and more (output truncated to ${maxMatches} matches).`;
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error searching files: ${err.message}` }],
        };
      }
    }
  );
}