import fs from "fs";
import path from "path";
import { config } from "../config.js";

/**
 * Gets the root directory of the Unreal Engine installation.
 */
export function getEngineRoot(): string | null {
  // If we are in an engine tree, the project path is the engine root.
  if (config.isEngineTree && config.projectPath) {
    return config.projectPath;
  }

  // If we have an editor cmd path (e.g., C:/UnrealEngine/Engine/Binaries/Win64/UnrealEditor-Cmd.exe)
  // we can infer the engine root from it.
  if (config.editorCmd) {
    // Engine/Binaries/Win64/UnrealEditor-Cmd.exe -> .../Engine/...
    const engineMatch = config.editorCmd.match(/^(.*?[\/]Engine)[\/]/i);
    if (engineMatch && engineMatch[1]) {
      // The directory containing the Engine folder
      return path.dirname(engineMatch[1]);
    }
  }

  return null;
}

/**
 * Gets the path to the Angelscript plugin directory within the engine.
 */
export function getAngelscriptPluginDir(): string | null {
  const engineRoot = getEngineRoot();
  if (!engineRoot) return null;

  const pluginDir = path.join(engineRoot, "Engine", "Plugins", "Angelscript");
  if (fs.existsSync(pluginDir)) {
    return pluginDir;
  }

  return null;
}
