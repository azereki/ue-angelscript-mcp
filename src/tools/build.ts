import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config, getScriptRoots } from "../config.js";
import { logger } from "../util/logger.js";
import { runCommandlet } from "../util/commandlet.js";

/**
 * Find the .uproject file in the project directory.
 * @returns Path to .uproject file, or null if not found
 */
function findUProjectFile(): string | null {
  if (!config.projectPath) {
    return null;
  }

  try {
    const entries = fs.readdirSync(config.projectPath);
    const uprojectFile = entries.find((f) => f.endsWith(".uproject"));
    if (uprojectFile) {
      return path.join(config.projectPath, uprojectFile);
    }
  } catch (err) {
    logger.warn(`Failed to read project directory: ${config.projectPath}`, err);
  }

  return null;
}

export function registerBuildTools(server: McpServer): void {
  // Tool: as_run_tests
  server.tool(
    "as_run_tests",
    "Run Angelscript unit tests via the AngelscriptTest commandlet",
    {
      test_filter: z
        .string()
        .optional()
        .describe("Filter tests by name pattern (optional)"),
      timeout_seconds: z
        .number()
        .optional()
        .default(120)
        .describe("Timeout in seconds (default 120)"),
    },
    async ({ test_filter, timeout_seconds }) => {
      // Validate configuration
      if (!config.editorCmd) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Editor binary not configured. Please set the UE_AS_EDITOR_CMD environment variable to the path of UnrealEditor-Cmd.exe",
            },
          ],
        };
      }

      if (!config.projectPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Project path not configured. Please set the UE_AS_PROJECT_PATH environment variable to the project root directory",
            },
          ],
        };
      }

      // Find .uproject file
      const uprojectPath = findUProjectFile();
      if (!uprojectPath) {
        return {
          content: [
            {
              type: "text",
              text: `Error: No .uproject file found in ${config.projectPath}`,
            },
          ],
        };
      }

      // Verify editor binary exists
      if (!fs.existsSync(config.editorCmd)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Editor binary not found at ${config.editorCmd}`,
            },
          ],
        };
      }

      logger.info(
        `Running Angelscript tests (timeout: ${timeout_seconds}s)${test_filter ? ` with filter: ${test_filter}` : ""}`
      );

      // Build commandlet arguments
      const args: string[] = [];
      if (test_filter) {
        args.push(test_filter);
      }

      // Run the commandlet
      const timeoutMs = timeout_seconds * 1000;
      const result = await runCommandlet(
        config.editorCmd,
        uprojectPath,
        "AngelscriptTest",
        args,
        timeoutMs
      );

      // Format the result
      let output = "";

      if (result.timedOut) {
        output += `TIMEOUT: Test execution exceeded ${timeout_seconds} seconds\n\n`;
      }

      output += `Exit Code: ${result.exitCode}\n`;
      output += `Status: ${result.exitCode === 0 ? "PASSED" : "FAILED"}\n\n`;

      if (result.stdout) {
        output += "=== STDOUT ===\n";
        output += result.stdout;
        output += "\n\n";
      }

      if (result.stderr) {
        output += "=== STDERR ===\n";
        output += result.stderr;
        output += "\n";
      }

      if (result.timedOut) {
        output += "\nNote: The test process was forcibly terminated due to timeout.\n";
      }

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    }
  );

  // Tool: as_get_script_roots
  server.tool(
    "as_get_script_roots",
    "Get script root directories, with fallback to config-based discovery",
    {},
    async () => {
      const roots: Array<{ path: string; exists: boolean; source: string }> =
        [];

      // Try to get roots from commandlet if editor is available
      let commandletSucceeded = false;

      if (config.editorCmd && config.projectPath) {
        const uprojectPath = findUProjectFile();

        if (uprojectPath && fs.existsSync(config.editorCmd)) {
          logger.debug("Attempting to get script roots from GetScriptRoots commandlet");

          try {
            const result = await runCommandlet(
              config.editorCmd,
              uprojectPath,
              "GetScriptRoots",
              [],
              30000 // 30 second timeout for this simple commandlet
            );

            if (result.exitCode === 0 && result.stdout) {
              // Parse commandlet output
              // Expected format: one path per line
              const lines = result.stdout
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("Log") && path.isAbsolute(line));

              if (lines.length > 0) {
                for (const rootPath of lines) {
                  roots.push({
                    path: rootPath,
                    exists: fs.existsSync(rootPath),
                    source: "commandlet",
                  });
                }
                commandletSucceeded = true;
                logger.debug(`Got ${roots.length} script roots from commandlet`);
              }
            }
          } catch (err) {
            logger.warn("Failed to get script roots from commandlet:", err);
          }
        }
      }

      // Fallback to config-based discovery
      if (!commandletSucceeded) {
        logger.debug("Using config-based script root discovery");
        const configRoots = getScriptRoots();

        for (const rootPath of configRoots) {
          roots.push({
            path: rootPath,
            exists: fs.existsSync(rootPath),
            source: "config",
          });
        }
      }

      // Format output
      let output = "Script Root Directories:\n\n";

      if (roots.length === 0) {
        output += "No script roots found.\n";
        if (!config.projectPath) {
          output +=
            "\nNote: Project path not configured. Set UE_AS_PROJECT_PATH to enable automatic discovery.\n";
        }
      } else {
        for (const root of roots) {
          const status = root.exists ? "✓" : "✗";
          output += `${status} ${root.path} (${root.source})\n`;
        }

        const existingCount = roots.filter((r) => r.exists).length;
        output += `\nTotal: ${roots.length} roots (${existingCount} exist on disk)\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    }
  );
}
