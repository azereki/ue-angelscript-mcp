# CLAUDE.md

MCP server for Unreal Engine Angelscript development. TypeScript, ES modules, `@modelcontextprotocol/sdk`.

## Commands

```bash
npm run build       # Compile TypeScript to build/
npm run dev         # Watch mode (recompiles on save)
npm start           # Run server directly
npm link            # Install globally as ue-angelscript-mcp
npx @modelcontextprotocol/inspector ue-angelscript-mcp  # Interactive tool testing
```

## Project Structure

```
src/
├── index.ts                 # Entry point: McpServer + StdioServerTransport
├── config.ts                # Auto-detection of project root + editor binary
├── tools/
│   ├── documentation.ts     # as_get_context (doc search by category/keyword)
│   ├── scripts.ts           # as_list_scripts, as_read_script, as_search_scripts
│   ├── build.ts             # as_run_tests, as_get_script_roots
│   └── project.ts           # as_project_info
├── context/
│   ├── categories.ts        # 7 category definitions with keyword arrays
│   ├── loader.ts            # Heading-based markdown chunking + category tagging
│   └── search.ts            # Category lookup + keyword search across chunks
└── util/
    ├── commandlet.ts        # Spawns UnrealEditor-Cmd.exe with timeout
    ├── file-scanner.ts      # Recursive .as file discovery
    └── logger.ts            # stderr-only logging (stdout = MCP protocol)
docs/
├── ue-as-reference.md       # UE5 scripting reference (1786 lines)
└── language-reference.md    # Language + C++ bindings reference (1206 lines)
```

## Key Patterns

- **stdout is sacred** — all logging goes to stderr via `logger.*`. Any stdout output breaks the MCP JSON-RPC protocol.
- **ES module imports** — all imports must use `.js` extensions (e.g., `./config.js`).
- **Doc path resolution** — `loader.ts` resolves `docs/` relative to the built JS location using `import.meta.url`, going from `build/context/` up to project root.
- **Auto-detection** — `config.ts` walks up from `cwd` looking for `.uproject` (game project) or `Engine/Plugins/Angelscript/` (engine source tree). Env vars override.
- **Path traversal protection** — `as_read_script` validates resolved paths are within known script roots before reading.

## Adding a New Tool

1. Create or edit a file in `src/tools/`
2. Export a `registerXTools(server: McpServer)` function
3. Use `server.tool(name, description, zodSchema, handler)` to register
4. Import and call the register function in `src/index.ts`
5. `npm run build` and test with the MCP Inspector
