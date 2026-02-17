import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import path from "path";
import { config, getScriptRoots } from "../config.js";
import { scanForScripts } from "../util/file-scanner.js";
import { logger } from "../util/logger.js";

/**
 * Find the .uproject file in the project directory.
 * @returns Name of .uproject file, or null if not found
 */
function findUProjectFileName(): string | null {
  if (!config.projectPath) {
    return null;
  }

  try {
    const entries = fs.readdirSync(config.projectPath);
    const uprojectFile = entries.find((f) => f.endsWith(".uproject"));
    return uprojectFile || null;
  } catch (err) {
    logger.warn(`Failed to read project directory: ${config.projectPath}`, err);
    return null;
  }
}

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "as_project_info",
    "Get project overview: script count, directory layout, configuration status",
    {},
    async () => {
      let output = "Unreal Engine Angelscript Project Overview\n";
      output += "==========================================\n\n";

      // Project Path
      output += "Configuration:\n";
      output += "--------------\n";
      if (config.projectPath) {
        const projectExists = fs.existsSync(config.projectPath);
        output += `Project Path: ${config.projectPath} ${projectExists ? "✓" : "✗ (not found)"}\n`;
      } else {
        output += "Project Path: Not configured (set UE_AS_PROJECT_PATH)\n";
      }

      // Editor Binary
      if (config.editorCmd) {
        const editorExists = fs.existsSync(config.editorCmd);
        output += `Editor Binary: ${config.editorCmd} ${editorExists ? "✓" : "✗ (not found)"}\n`;
      } else {
        output += "Editor Binary: Not configured (set UE_AS_EDITOR_CMD)\n";
      }

      // .uproject file
      const uprojectFile = findUProjectFileName();
      if (uprojectFile) {
        output += `Project File: ${uprojectFile}\n`;
      } else if (config.projectPath) {
        output += "Project File: No .uproject file found\n";
      }

      output += "\n";

      // Script Roots
      output += "Script Roots:\n";
      output += "-------------\n";

      const scriptRoots = getScriptRoots();

      if (scriptRoots.length === 0) {
        output += "No script roots configured\n";
      } else {
        // Categorize roots
        const defaultRoots: string[] = [];
        const extraRoots: string[] = [];

        for (const root of scriptRoots) {
          if (config.extraScriptRoots.includes(root)) {
            extraRoots.push(root);
          } else {
            defaultRoots.push(root);
          }
        }

        // Show default roots
        if (defaultRoots.length > 0) {
          output += "Default directories:\n";
          for (const root of defaultRoots) {
            const exists = fs.existsSync(root);
            const dirName = path.basename(root);
            output += `  ${exists ? "✓" : "✗"} ${dirName}/ (${root})\n`;
          }
        }

        // Show extra roots
        if (extraRoots.length > 0) {
          output += "\nExtra directories (UE_AS_EXTRA_SCRIPT_ROOTS):\n";
          for (const root of extraRoots) {
            const exists = fs.existsSync(root);
            output += `  ${exists ? "✓" : "✗"} ${root}\n`;
          }
        }
      }

      output += "\n";

      // Script File Count
      output += "Script Files:\n";
      output += "-------------\n";

      const existingRoots = scriptRoots.filter((r) => fs.existsSync(r));

      if (existingRoots.length === 0) {
        output += "No existing script roots to scan\n";
      } else {
        logger.debug(`Scanning ${existingRoots.length} script roots for .as files`);
        const scriptFiles = scanForScripts(existingRoots);

        if (scriptFiles.length === 0) {
          output += "No .as files found\n";
        } else {
          // Group by root
          const filesByRoot = new Map<string, number>();
          for (const file of scriptFiles) {
            const count = filesByRoot.get(file.root) || 0;
            filesByRoot.set(file.root, count + 1);
          }

          for (const root of existingRoots) {
            const count = filesByRoot.get(root) || 0;
            const dirName = config.extraScriptRoots.includes(root)
              ? root
              : path.basename(root) + "/";
            output += `  ${dirName}: ${count} files\n`;
          }

          output += `\nTotal: ${scriptFiles.length} .as files\n`;
        }
      }

      output += "\n";

      // Capabilities
      output += "Available Capabilities:\n";
      output += "-----------------------\n";

      const hasEditor = !!(config.editorCmd && fs.existsSync(config.editorCmd));
      const hasProject = !!(
        config.projectPath && fs.existsSync(config.projectPath) && uprojectFile
      );
      const hasScripts = existingRoots.length > 0;

      const capabilities: Array<{ name: string; available: boolean; reason?: string }> = [
        {
          name: "Run unit tests (as_run_tests)",
          available: hasEditor && hasProject,
          reason: !hasEditor
            ? "Editor binary not configured"
            : !hasProject
              ? "Project not configured"
              : undefined,
        },
        {
          name: "Get script roots (as_get_script_roots)",
          available: true,
        },
        {
          name: "Search scripts (as_search)",
          available: hasScripts,
          reason: !hasScripts ? "No script roots exist" : undefined,
        },
        {
          name: "Get script content (as_get_script)",
          available: hasScripts,
          reason: !hasScripts ? "No script roots exist" : undefined,
        },
      ];

      for (const cap of capabilities) {
        const status = cap.available ? "✓" : "✗";
        output += `${status} ${cap.name}`;
        if (cap.reason) {
          output += ` - ${cap.reason}`;
        }
        output += "\n";
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
