import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { taskManager } from "../util/task-manager.js";

export function registerTaskTools(server: McpServer): void {
  server.tool(
    "as_task_status",
    "Check the status and logs of a running background task (like a long engine build). Use this to poll until a task completes.",
    {
      task_id: z.string().describe("The ID of the background task to poll (e.g., 'task_17234..._1')"),
    },
    async (args) => {
      const task = taskManager.getTask(args.task_id);
      
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Error: Task with ID '${args.task_id}' not found.` }],
        };
      }

      let output = `[Task ID]: ${task.id}\n`;
      output += `[Name]: ${task.name}\n`;
      output += `[Status]: ${task.status.toUpperCase()}\n`;
      output += `[Progress]: ${task.progress}%\n`;
      output += `[Message]: ${task.message}\n`;
      output += `[Uptime]: ${Math.floor((Date.now() - task.createdAt) / 1000)}s\n`;

      if (task.status === "completed" && task.result) {
        output += `\n--- Task Result ---\n\n${task.result}`;
      } else if (task.status === "failed" && task.error) {
        output += `\n--- Task Error ---\n\n${task.error}`;
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );

  server.tool(
    "as_task_list",
    "List all background tasks and their current states.",
    {},
    async () => {
      const tasks = taskManager.getAllTasks();
      
      if (tasks.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No background tasks currently running." }],
        };
      }

      let output = `Found ${tasks.length} tasks:\n\n`;
      for (const task of tasks) {
        output += `- [${task.id}] ${task.name}: ${task.status.toUpperCase()} (${task.progress}%)\n`;
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );
}
