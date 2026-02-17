# ue-angelscript-mcp

MCP server for [Unreal Engine Angelscript](https://angelscript.hazelight.se/) development. Provides documentation lookup, script file management, and test running through [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or any MCP-compatible client.

Built for the [UE-AS engine fork](https://github.com/Hazelight/UnrealEngine-Angelscript) by Hazelight Studios.

## Tools

| Tool | Description | Requires |
|------|-------------|----------|
| `as_get_context` | Query AS documentation by category or keyword | Nothing |
| `as_list_scripts` | List `.as` files in project script directories | Project path |
| `as_read_script` | Read a script file with optional line range | Project path |
| `as_search_scripts` | Regex search across all `.as` files | Project path |
| `as_run_tests` | Run Angelscript unit tests via commandlet | Project path + editor binary |
| `as_get_script_roots` | List script root directories | Nothing (enhanced with editor) |
| `as_project_info` | Project overview with configuration status | Nothing |

## Install

```bash
git clone https://github.com/azereki/ue-angelscript-mcp.git
cd ue-angelscript-mcp
npm install
npm link
```

`npm install` automatically builds via the `prepare` script.

## Configure

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "ue-angelscript": {
      "command": "ue-angelscript-mcp"
    }
  }
}
```

That's it. The server auto-detects your project from the working directory.

### Auto-detection

The server walks upward from `cwd` to find your project:

1. **Game project** — directory containing a `.uproject` file
2. **Engine source tree** — directory containing `Engine/Plugins/Angelscript/`

Once the project root is found, the editor binary is located automatically at `Engine/Binaries/{platform}/UnrealEditor-Cmd`.

### Environment variable overrides

For non-standard layouts, set these in the `.mcp.json` `env` block or your shell:

| Variable | Description |
|----------|-------------|
| `UE_AS_PROJECT_PATH` | Path to UE project root |
| `UE_AS_EDITOR_CMD` | Path to `UnrealEditor-Cmd` binary |
| `UE_AS_EXTRA_SCRIPT_ROOTS` | Additional script directories (semicolon-separated) |

Example with overrides:

```json
{
  "mcpServers": {
    "ue-angelscript": {
      "command": "ue-angelscript-mcp",
      "env": {
        "UE_AS_PROJECT_PATH": "/path/to/my/project",
        "UE_AS_EXTRA_SCRIPT_ROOTS": "/shared/scripts;/mods/scripts"
      }
    }
  }
}
```

## Documentation categories

`as_get_context` organizes 2,700+ lines of bundled reference docs into searchable categories:

| Category | Covers |
|----------|--------|
| `scripting_basics` | Actors, components, UCLASS, UFUNCTION, BeginPlay |
| `language_fundamentals` | Types, containers, handles, casting, lambdas |
| `properties_events` | UPROPERTY specifiers, delegates, timers, input |
| `networking` | Replication, RPCs, net roles, authority |
| `testing` | Unit tests, integration tests, latent commands |
| `bindings` | C++ bindings, FUNC/METHOD macros, ScriptMixin |
| `advanced_features` | Hot reload, preprocessor, GAS, subsystems |

Call with no arguments to see all categories. Use `category` for browsing or `query` for keyword search.

## Development

```bash
npm run dev     # Watch mode (recompiles on save)
npm run build   # One-time build
npm start       # Run the server directly
```

Test interactively with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT
