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
}
