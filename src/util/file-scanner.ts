import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export interface ScriptFile {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to the script root */
  relativePath: string;
  /** Which script root this file belongs to */
  root: string;
  /** File size in bytes */
  size: number;
}

/** Directories to skip during recursive scan */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "Intermediate",
  "Saved",
  "__pycache__",
  "Binaries",
  ".vscode",
  ".idea",
]);

/**
 * Recursively scan a single directory for .as files.
 * @param dir Directory to scan
 * @param rootDir The script root directory (for computing relative paths)
 * @param results Accumulator array for results
 */
function scanDirectory(
  dir: string,
  rootDir: string,
  results: ScriptFile[]
): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        // Recurse into subdirectory
        scanDirectory(fullPath, rootDir, results);
      } else if (entry.isFile() && entry.name.endsWith(".as")) {
        try {
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(rootDir, fullPath);

          results.push({
            absolutePath: fullPath,
            relativePath: relativePath.replace(/\\/g, "/"), // Normalize to forward slashes
            root: rootDir,
            size: stats.size,
          });
        } catch (err) {
          logger.warn(`Failed to stat file ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to read directory ${dir}:`, err);
  }
}

/**
 * Recursively scan directories for .as files.
 * Skips node_modules, .git, Intermediate, Saved directories.
 * @param roots Array of script root directories to scan
 * @returns Sorted array of script files
 */
export function scanForScripts(roots: string[]): ScriptFile[] {
  const results: ScriptFile[] = [];

  for (const root of roots) {
    // Check if root directory exists
    try {
      const stats = fs.statSync(root);
      if (!stats.isDirectory()) {
        logger.warn(`Script root is not a directory: ${root}`);
        continue;
      }
    } catch (err) {
      // Directory doesn't exist - this is fine, just skip it
      logger.debug(`Script root does not exist: ${root}`);
      continue;
    }

    scanDirectory(root, root, results);
  }

  // Sort by relative path for consistent output
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return results;
}
