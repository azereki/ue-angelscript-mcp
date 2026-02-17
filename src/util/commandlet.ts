import { spawn } from "child_process";
import { logger } from "./logger.js";

export interface CommandletResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Maximum bytes to capture per stream (1MB) */
const MAX_OUTPUT_SIZE = 1024 * 1024;

/**
 * Run an Unreal commandlet via UnrealEditor-Cmd.exe.
 *
 * @param editorPath - Path to UnrealEditor-Cmd.exe
 * @param projectPath - Path to the .uproject file
 * @param commandlet - Commandlet name (e.g., "AngelscriptTest")
 * @param args - Additional commandlet arguments
 * @param timeoutMs - Timeout in milliseconds (default 120000 = 2 min)
 */
export async function runCommandlet(
  editorPath: string,
  projectPath: string,
  commandlet: string,
  args: string[] = [],
  timeoutMs: number = 120000
): Promise<CommandletResult> {
  return new Promise((resolve) => {
    const cmdArgs = [projectPath, `-run=${commandlet}`, ...args];

    logger.debug(`Running commandlet: ${editorPath} ${cmdArgs.join(" ")}`);

    const proc = spawn(editorPath, cmdArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let finished = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        logger.warn(`Commandlet timed out after ${timeoutMs}ms, killing process`);
        proc.kill("SIGKILL");
      }
    }, timeoutMs);

    // Capture stdout with size limit
    proc.stdout?.on("data", (data: Buffer) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        const chunk = data.toString();
        const remaining = MAX_OUTPUT_SIZE - stdout.length;
        if (chunk.length > remaining) {
          stdout += chunk.substring(0, remaining);
          stdout += "\n... [stdout truncated - exceeded 1MB limit]";
          stdoutTruncated = true;
        } else {
          stdout += chunk;
        }
      }
    });

    // Capture stderr with size limit
    proc.stderr?.on("data", (data: Buffer) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        const chunk = data.toString();
        const remaining = MAX_OUTPUT_SIZE - stderr.length;
        if (chunk.length > remaining) {
          stderr += chunk.substring(0, remaining);
          stderr += "\n... [stderr truncated - exceeded 1MB limit]";
          stderrTruncated = true;
        } else {
          stderr += chunk;
        }
      }
    });

    // Handle process exit
    proc.on("close", (code) => {
      finished = true;
      clearTimeout(timeout);

      const exitCode = code ?? -1;
      logger.debug(`Commandlet exited with code ${exitCode}`);

      resolve({
        exitCode,
        stdout,
        stderr,
        timedOut,
      });
    });

    // Handle spawn errors
    proc.on("error", (err) => {
      finished = true;
      clearTimeout(timeout);

      logger.error(`Failed to spawn commandlet:`, err);

      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + `\nSpawn error: ${err.message}`,
        timedOut: false,
      });
    });
  });
}
