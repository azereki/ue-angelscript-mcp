import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import { getEngineRoot } from "../util/engine.js";

const execAsync = util.promisify(exec);

export function registerIntrospectionTools(server: McpServer): void {
  server.tool(
    "as_find_cpp_binding",
    "Grep the engine's C++ source for Angelscript bindings (e.g. METHOD, FUNC, UPROPERTY). Use this to find exact signatures of UE methods exported to Angelscript.",
    {
      query: z
        .string()
        .describe("Regex pattern to search for (e.g. 'Method(.*IsActorInitialized', 'Bind_AActor')"),
      contextLines: z
        .number()
        .optional()
        .default(2)
        .describe("Number of context lines to return around the match"),
    },
    async (args) => {
      const engineRoot = getEngineRoot();
      if (!engineRoot) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Could not locate Unreal Engine root directory. Ensure you are in an Angelscript project or have UE_AS_PROJECT_PATH set.",
            },
          ],
        };
      }

      // We want to search inside Engine/Plugins/Angelscript and Engine/Plugins/AngelscriptGAS
      const searchPaths = [
        path.join(engineRoot, "Engine", "Plugins", "Angelscript", "Source"),
        path.join(engineRoot, "Engine", "Plugins", "AngelscriptGAS", "Source"),
        path.join(engineRoot, "Engine", "Plugins", "AngelscriptEnhancedInput", "Source"),
      ].filter((p) => fs.existsSync(p));

      if (searchPaths.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Could not find Angelscript plugin source directories in the engine.",
            },
          ],
        };
      }

      // Convert windows paths to bash format if running inside git bash, but since we are executing via child_process on windows, we should use powershell or ripgrep if available.
      // We will just use standard findstr or grep depending on platform.
      // However, we can also just read the files using JS to be perfectly cross-platform.
      // But JS recursive grep might be slow. Let's try ripgrep or git grep or fallback to JS grep.
      // Actually, git grep is usually very fast and available if they use git.
      // Let's write a quick JS-based recursive regex searcher for robustness, the codebase isn't *that* huge.
      
      const results: string[] = [];
      const regex = new RegExp(args.query, "i");
      
      try {
        // Fallback to JS search
        let matchCount = 0;
        const maxMatches = 100;

        for (const searchPath of searchPaths) {
          const files = walkSync(searchPath);
          for (const file of files) {
            if (!file.endsWith(".cpp") && !file.endsWith(".h")) continue;
            
            const content = fs.readFileSync(file, "utf8");
            const lines = content.split(/\r?\n/);
            
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i])) {
                const start = Math.max(0, i - args.contextLines);
                const end = Math.min(lines.length - 1, i + args.contextLines);
                
                results.push(`File: ${path.relative(engineRoot, file)}`);
                for (let j = start; j <= end; j++) {
                  const prefix = j === i ? ">>" : "  ";
                  results.push(`${prefix} ${j + 1}: ${lines[j]}`);
                }
                results.push("---");
                matchCount++;
                
                if (matchCount >= maxMatches) break;
              }
            }
            if (matchCount >= maxMatches) break;
          }
          if (matchCount >= maxMatches) break;
        }

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No C++ bindings found matching '${args.query}'`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: results.join("\n"),
            },
          ],
        };

      } catch (e: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${e.message}`,
            },
          ],
        };
      }
    }
  );
}

// Simple recursive directory walk
function walkSync(dir: string, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}
