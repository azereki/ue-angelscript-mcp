import fs from "fs";
import path from "path";

export interface Config {
  /** Path to UE project root (containing .uproject or engine root) */
  projectPath: string | null;
  /** Path to UnrealEditor-Cmd.exe */
  editorCmd: string | null;
  /** Additional script root directories */
  extraScriptRoots: string[];
  /** Whether projectPath points to an engine source tree (vs a game project) */
  isEngineTree: boolean;
}

/** Well-known relative paths where UnrealEditor-Cmd.exe lives inside an engine tree */
const EDITOR_CMD_CANDIDATES = [
  "Engine/Binaries/Win64/UnrealEditor-Cmd.exe",
  "Engine/Binaries/Linux/UnrealEditor-Cmd",
  "Engine/Binaries/Mac/UnrealEditor-Cmd",
];

/**
 * Check if a directory is a UE engine source tree
 * (has Engine/Plugins/Angelscript/).
 */
function isEngineRoot(dir: string): boolean {
  return fs.existsSync(path.join(dir, "Engine", "Plugins", "Angelscript"));
}

/**
 * Check if a directory contains a .uproject file.
 */
function hasUProject(dir: string): boolean {
  try {
    return fs.readdirSync(dir).some((e) => e.endsWith(".uproject"));
  } catch {
    return false;
  }
}

/**
 * Walk upward from `startDir` looking for a UE project or engine tree.
 * Prefers .uproject (game project), falls back to engine source detection.
 */
function findProjectRoot(startDir: string): { root: string; isEngine: boolean } | null {
  let dir = path.resolve(startDir);
  const fsRoot = path.parse(dir).root;

  let engineCandidate: string | null = null;

  while (dir !== fsRoot) {
    // Prefer game project (.uproject)
    if (hasUProject(dir)) {
      return { root: dir, isEngine: false };
    }
    // Remember engine root if we pass through one
    if (!engineCandidate && isEngineRoot(dir)) {
      engineCandidate = dir;
    }
    dir = path.dirname(dir);
  }

  // Fall back to engine source tree
  if (engineCandidate) {
    return { root: engineCandidate, isEngine: true };
  }

  return null;
}

/**
 * Given a project root, try to find the editor binary.
 * Checks well-known paths relative to the root and one level up.
 */
function findEditorCmd(projectRoot: string): string | null {
  const searchBases = [projectRoot, path.dirname(projectRoot)];

  for (const base of searchBases) {
    for (const candidate of EDITOR_CMD_CANDIDATES) {
      const full = path.join(base, candidate);
      if (fs.existsSync(full)) {
        return full;
      }
    }
  }
  return null;
}

function parseConfig(): Config {
  const extraRoots = process.env.UE_AS_EXTRA_SCRIPT_ROOTS;

  // 1. Project path: env var > auto-detect from cwd
  let projectPath: string | null = null;
  let isEngineTree = false;

  if (process.env.UE_AS_PROJECT_PATH) {
    projectPath = path.resolve(process.env.UE_AS_PROJECT_PATH);
    isEngineTree = isEngineRoot(projectPath);
  } else {
    const detected = findProjectRoot(process.cwd());
    if (detected) {
      projectPath = detected.root;
      isEngineTree = detected.isEngine;
    }
  }

  // 2. Editor binary: env var > auto-detect relative to project
  let editorCmd = process.env.UE_AS_EDITOR_CMD
    ? path.resolve(process.env.UE_AS_EDITOR_CMD)
    : null;

  if (!editorCmd && projectPath) {
    editorCmd = findEditorCmd(projectPath);
  }

  return {
    projectPath,
    editorCmd,
    isEngineTree,
    extraScriptRoots: extraRoots
      ? extraRoots.split(";").map((p) => path.resolve(p.trim())).filter(Boolean)
      : [],
  };
}

export const config = parseConfig();

/** Script directories for game projects */
const GAME_SCRIPT_DIRS = ["Script", "Scripts"];

/** Script directories for engine source trees */
const ENGINE_SCRIPT_DIRS = ["Script-Examples", "Script", "Scripts"];

/** Get all script root directories (default + extra) */
export function getScriptRoots(): string[] {
  const roots: string[] = [...config.extraScriptRoots];
  if (config.projectPath) {
    const dirs = config.isEngineTree ? ENGINE_SCRIPT_DIRS : GAME_SCRIPT_DIRS;
    for (const dir of dirs) {
      roots.push(path.join(config.projectPath, dir));
    }
  }
  return roots;
}
