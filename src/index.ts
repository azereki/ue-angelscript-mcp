#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./util/logger.js";
import { registerDocumentationTools } from "./tools/documentation.js";
import { registerScriptTools } from "./tools/scripts.js";
import { registerBuildTools } from "./tools/build.js";
import { registerProjectTools } from "./tools/project.js";

const server = new McpServer({
  name: "ue-angelscript",
  version: "0.1.0",
});

// Register all tool groups
registerDocumentationTools(server);
registerScriptTools(server);
registerBuildTools(server);
registerProjectTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("UE-Angelscript MCP server started");
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
