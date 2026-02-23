import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

export function registerDiagnosticTools(server: McpServer): void {
  server.tool(
    "as_check_script_errors",
    "Check the latest Unreal Engine log file for Angelscript compilation errors and warnings.",
    {
      maxLines: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of recent log lines to scan"),
    },
    async (args) => {
      if (!config.projectPath) {
        return {
          content: [{ type: "text" as const, text: "Error: No project path configured." }],
        };
      }

      // Find the Logs directory
      const logsDir = path.join(config.projectPath, "Saved", "Logs");
      if (!fs.existsSync(logsDir)) {
        return {
          content: [{ type: "text" as const, text: `Error: Could not find Logs directory at ${logsDir}. Has the editor been run?` }],
        };
      }

      // Find the most recently modified .log file
      let latestLogFile: string | null = null;
      let latestMtime = 0;

      try {
        const files = fs.readdirSync(logsDir);
        for (const file of files) {
          if (!file.endsWith(".log")) continue;
          
          const filePath = path.join(logsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestLogFile = filePath;
          }
        }
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error reading Logs directory: ${e.message}` }],
        };
      }

      if (!latestLogFile) {
        return {
          content: [{ type: "text" as const, text: `No .log files found in ${logsDir}.` }],
        };
      }

      // Read the file and parse for LogAngelscript errors/warnings
      // For simplicity and to avoid memory issues with huge logs, we could read it fully,
      // but since logs can be GBs, let's just use a simple regex grep on the last N lines if possible, 
      // or read the whole file line-by-line using a stream if it's large, keeping only the most recent matches.
      
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const stat = fs.statSync(latestLogFile);
      
      if (stat.size > MAX_FILE_SIZE) {
         return {
          content: [{ type: "text" as const, text: `Log file ${latestLogFile} is too large (>50MB) to safely scan.` }],
        };
      }

      try {
        const content = fs.readFileSync(latestLogFile, "utf8");
        const lines = content.split(/\r?\n/);
        
        // We only care about lines containing LogAngelscript
        const asLogs: string[] = [];
        for (const line of lines) {
          if (line.includes("LogAngelscript")) {
            asLogs.push(line);
          }
        }
        
        if (asLogs.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No Angelscript logs found in ${path.basename(latestLogFile)}.` }],
          };
        }

        // Filter to just errors and warnings, and maybe the compilation success/failure lines
        const relevantLogs = asLogs.filter(line => 
          line.includes("Error:") || 
          line.includes("Warning:") ||
          line.includes("CompileModule") ||
          line.includes("Finished compiling")
        );

        // Take the last N lines
        const recentLogs = relevantLogs.slice(-args.maxLines);
        
        let output = `Found ${recentLogs.length} recent Angelscript messages in ${path.basename(latestLogFile)}:\n\n`;
        output += recentLogs.join("\n");

        return {
          content: [{ type: "text" as const, text: output }],
        };

      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error reading log file: ${e.message}` }],
        };
      }
    }
  );
}
