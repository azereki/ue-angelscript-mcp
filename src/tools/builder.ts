import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { config } from "../config.js";
import { getEngineRoot } from "../util/engine.js";

export function registerBuilderTools(server: McpServer): void {
  server.tool(
    "as_build_engine",
    "Trigger UnrealBuildTool (UBT) to compile the project or engine. This is necessary when C++ code or bindings are changed before Angelscript can hot reload them.",
    {
      target: z.string().optional().default("UnrealEditor")
        .describe("The build target (e.g., 'UnrealEditor', 'MyGameEditor')"),
      platform: z.string().optional().default("Win64")
        .describe("The target platform (e.g., 'Win64', 'Mac', 'Linux')"),
      configuration: z.string().optional().default("Development")
        .describe("The build configuration (e.g., 'Development', 'Shipping')"),
      projectFile: z.string().optional()
        .describe("Optional path to .uproject if building a game instead of the engine"),
    },
    async (args) => {
      const engineRoot = getEngineRoot();
      if (!engineRoot) {
        return {
          content: [{ type: "text" as const, text: "Error: Could not locate Unreal Engine root directory." }],
        };
      }

      // Find Build.bat or Build.sh
      const isWindows = process.platform === "win32";
      const buildScript = isWindows ? "Build.bat" : "Build.sh";
      const buildScriptPath = path.join(engineRoot, "Engine", "Build", "BatchFiles", buildScript);

      if (!fs.existsSync(buildScriptPath)) {
        return {
          content: [{ type: "text" as const, text: `Error: Build script not found at ${buildScriptPath}` }],
        };
      }

      // Determine arguments
      const cmdArgs = [args.target, args.platform, args.configuration];
      
      // If project path is given, or we are in a game project (not an engine tree), append -Project=
      let projectFlag = "";
      if (args.projectFile) {
        projectFlag = ` -Project="${args.projectFile}"`;
      } else if (!config.isEngineTree && config.projectPath) {
        // Find .uproject
        const uprojectFiles = fs.readdirSync(config.projectPath).filter(f => f.endsWith(".uproject"));
        if (uprojectFiles.length > 0) {
           projectFlag = ` -Project="${path.join(config.projectPath, uprojectFiles[0])}"`;
        }
      }

      const cmd = `"${buildScriptPath}" ${cmdArgs.join(" ")}${projectFlag}`;

      return new Promise((resolve) => {
        exec(cmd, { cwd: engineRoot, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
          let output = `Executed: ${cmd}\n\n`;
          
          if (stdout) {
             // Keep only the last 100 lines to avoid token explosion
             const lines = stdout.split(/\r?\n/);
             const recent = lines.slice(Math.max(0, lines.length - 100)).join("\n");
             output += `[STDOUT (last 100 lines)]:\n${recent}\n`;
          }
          if (stderr) output += `\n[STDERR]:\n${stderr}\n`;

          if (error) {
            output += `\n[BUILD FAILED]: Process exited with code ${error.code}\n`;
          } else {
             output += `\n[BUILD SUCCEEDED]\n`;
          }

          resolve({
            content: [{ type: "text" as const, text: output }],
          });
        });
      });
    }
  );
}
