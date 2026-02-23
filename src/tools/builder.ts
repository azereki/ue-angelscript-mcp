import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { config } from "../config.js";
import { getEngineRoot } from "../util/engine.js";
import { taskManager } from "../util/task-manager.js";

export function registerBuilderTools(server: McpServer): void {
  server.tool(
    "as_build_engine",
    "Trigger UnrealBuildTool (UBT) to compile the project or engine. This is necessary when C++ code or bindings are changed before Angelscript can hot reload them. Since builds take a long time, this tool runs asynchronously and returns a task_id to poll.",
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

      // Create an async task to track the build
      const task = taskManager.createTask(`UBT Build: ${args.target} ${args.platform} ${args.configuration}`);
      taskManager.updateTask(task.id, { status: "running", progress: 5, message: "Build process started..." });

      const buildProcess = exec(cmd, { cwd: engineRoot, maxBuffer: 1024 * 1024 * 10 });
      task.process = buildProcess;

      let stdoutLog = "";
      let stderrLog = "";
      
      buildProcess.stdout?.on("data", (data) => {
        stdoutLog += data;
        // Simple heuristic to update progress based on the build action count "[1/4] Compiling..."
        const match = data.toString().match(/\[(\d+)\/(\d+)\]/);
        if (match) {
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);
          const progress = Math.min(95, Math.floor((current / total) * 100));
          taskManager.updateTask(task.id, { progress, message: `Compiling ${current}/${total}...` });
        }
      });

      buildProcess.stderr?.on("data", (data) => {
        stderrLog += data;
      });

      buildProcess.on("close", (code) => {
        let finalOutput = `Executed: ${cmd}\n\n`;
        
        // Keep only the last 150 lines to avoid token explosion
        const lines = stdoutLog.split(/\r?\n/);
        const recent = lines.slice(Math.max(0, lines.length - 150)).join("\n");
        finalOutput += `[STDOUT (last 150 lines)]:\n${recent}\n`;
        
        if (stderrLog) finalOutput += `\n[STDERR]:\n${stderrLog}\n`;

        if (code === 0) {
          finalOutput += `\n[BUILD SUCCEEDED]\n`;
          taskManager.completeTask(task.id, finalOutput);
        } else {
          finalOutput += `\n[BUILD FAILED]: Process exited with code ${code}\n`;
          taskManager.failTask(task.id, finalOutput);
        }
      });

      // Return immediately with the task ID
      return {
        content: [{ 
          type: "text" as const, 
          text: `Build process started successfully in the background.\n\n[Task ID]: ${task.id}\n[Command]: ${cmd}\n\nUse the 'as_task_status' tool to poll this ID until completion.` 
        }],
      };
    }
  );
}
