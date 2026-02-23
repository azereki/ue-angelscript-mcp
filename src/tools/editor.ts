import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BRIDGE_URL = "http://127.0.0.1:3000";

async function fetchFromBridge(endpoint: string, method: string = "GET", body?: any) {
  try {
    const response = await fetch(`${BRIDGE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    return await response.json();
  } catch (error: any) {
    if (error.cause && error.cause.code === "ECONNREFUSED") {
      throw new Error("Editor Bridge is not running. Please run 'import ue_angelscript_bridge; ue_angelscript_bridge.start()' in the Unreal Editor Python console.");
    }
    throw new Error(`Failed to communicate with Editor Bridge: ${error.message}`);
  }
}

export function registerEditorTools(server: McpServer): void {
  server.tool(
    "as_editor_status",
    "Check if the Unreal Engine Editor Bridge is running and connected.",
    {},
    async () => {
      try {
        const data = await fetchFromBridge("/status");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: e.message }],
        };
      }
    }
  );

  server.tool(
    "as_get_level_actors",
    "Get a list of all actors currently in the loaded Unreal Engine level. Requires the Editor Bridge.",
    {},
    async () => {
      try {
        const data = await fetchFromBridge("/level/actors");
        if (data.error) {
          return { content: [{ type: "text" as const, text: `Error: ${data.error}` }] };
        }
        
        let output = `Found ${data.actors.length} actors in the level:\n\n`;
        // Limit output to prevent massive context bloat
        const maxActors = 200;
        const displayActors = data.actors.slice(0, maxActors);
        
        for (const actor of displayActors) {
           output += `- ${actor.label} (${actor.class}) [${actor.name}]\n`;
        }

        if (data.actors.length > maxActors) {
           output += `\n... and ${data.actors.length - maxActors} more actors.`;
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: e.message }],
        };
      }
    }
  );

  server.tool(
    "as_execute_python",
    "Execute arbitrary Python code inside the Unreal Editor. Extremely powerful. You can manipulate actors, run console commands, and query editor state. Requires the Editor Bridge.",
    {
      code: z.string().describe("The Python code to execute. The 'unreal' module is pre-imported. To return data back to MCP, assign it to a variable named 'result'. Example: result = unreal.EditorLevelLibrary.get_all_level_actors()"),
    },
    async (args) => {
      try {
        const data = await fetchFromBridge("/execute/python", "POST", { code: args.code });
        
        if (data.error) {
          let output = `Error Executing Python:\n${data.error}\n\nTraceback:\n${data.traceback}`;
          if (data.stdout) output += `\n\nStdout:\n${data.stdout}`;
          return { content: [{ type: "text" as const, text: output }] };
        }

        let output = "";
        if (data.stdout) output += `[STDOUT]:\n${data.stdout}\n`;
        if (data.stderr) output += `[STDERR]:\n${data.stderr}\n`;
        output += `[RESULT]:\n${data.result}`;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: e.message }],
        };
      }
    }
  );

  server.tool(
    "as_spawn_actor",
    "Spawn an actor from a class path at a specific location. Requires the Editor Bridge.",
    {
      classPath: z.string().describe("The Unreal path to the class (e.g., '/Game/Blueprints/BP_MyActor.BP_MyActor_C' or 'StaticMeshActor')"),
      location: z.array(z.number()).length(3).optional().default([0, 0, 0]).describe("The XYZ location to spawn the actor at"),
      rotation: z.array(z.number()).length(3).optional().default([0, 0, 0]).describe("The Roll, Pitch, Yaw rotation"),
    },
    async (args) => {
      const code = `
import unreal

class_path = "${args.classPath}"
location = unreal.Vector(${args.location[0]}, ${args.location[1]}, ${args.location[2]})
rotation = unreal.Rotator(${args.rotation[0]}, ${args.rotation[1]}, ${args.rotation[2]})

try:
    # Try loading as a blueprint class first
    actor_class = unreal.EditorAssetLibrary.load_blueprint_class(class_path)
except Exception:
    actor_class = None

if not actor_class:
    try:
        # Try loading as a native class
        actor_class = unreal.EditorAssetLibrary.load_class(class_path)
    except Exception:
        pass

if not actor_class:
    # Fallback to simple class name lookup for native types
    actor_class = getattr(unreal, class_path, None)

if actor_class:
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(actor_class, location, rotation)
    if actor:
        result = f"Spawned actor '{actor.get_actor_label()}' of class '{actor_class.get_name()}' at {location}"
    else:
        result = "Failed to spawn actor. Is a level open?"
else:
    result = f"Could not find class '{class_path}'"
`;
      try {
        const data = await fetchFromBridge("/execute/python", "POST", { code });
        if (data.error) return { content: [{ type: "text" as const, text: `Error: ${data.error}\n${data.traceback}` }] };
        return { content: [{ type: "text" as const, text: data.result || "Executed." }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: e.message }] };
      }
    }
  );

  server.tool(
    "as_focus_viewport",
    "Focus the active Editor Viewport camera on a specific actor or location. Requires the Editor Bridge.",
    {
      actorLabel: z.string().optional().describe("The label of the actor to focus on"),
      location: z.array(z.number()).length(3).optional().describe("Alternatively, a specific XYZ location to focus on"),
    },
    async (args) => {
      if (!args.actorLabel && !args.location) {
        return { content: [{ type: "text" as const, text: "Must provide either an actorLabel or a location." }] };
      }

      let code = "";
      if (args.actorLabel) {
        code = `
import unreal

label = "${args.actorLabel}"
actors = unreal.EditorLevelLibrary.get_all_level_actors()
target_actor = next((a for a in actors if a.get_actor_label() == label), None)

if target_actor:
    unreal.EditorLevelLibrary.editor_set_game_view(True) # Optional, just standardizes view
    # In UE5, there isn't a direct "Focus Viewport" exposed to Python EditorLevelLibrary cleanly.
    # However, we can select it and execute the standard "Focus" command.
    unreal.EditorLevelLibrary.set_selected_level_actors([target_actor])
    unreal.SystemLibrary.execute_console_command(None, "CAMERA ALIGN")
    
    result = f"Selected and focused on '{label}'"
else:
    result = f"Could not find actor '{label}' in the current level."
`;
      } else if (args.location) {
        code = `
import unreal

location = unreal.Vector(${args.location[0]}, ${args.location[1]}, ${args.location[2]})
rotation = unreal.Rotator(0, 0, 0) # Looking forward

# Teleport the viewport camera
success = unreal.EditorLevelLibrary.set_level_viewport_camera_info(location, rotation)
if success:
    result = f"Moved viewport camera to {location}"
else:
    result = "Failed to move viewport camera."
`;
      }

      try {
        const data = await fetchFromBridge("/execute/python", "POST", { code });
        if (data.error) return { content: [{ type: "text" as const, text: `Error: ${data.error}\n${data.traceback}` }] };
        return { content: [{ type: "text" as const, text: data.result || "Executed." }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: e.message }] };
      }
    }
  );
}
