# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-16

### Added

- `as_get_context` tool for querying bundled Angelscript documentation by category or keyword
- `as_list_scripts` tool for listing `.as` files in project script directories
- `as_read_script` tool for reading script files with optional line ranges and path traversal protection
- `as_search_scripts` tool for regex search across all project script files
- `as_run_tests` tool for running Angelscript unit tests via the AngelscriptTest commandlet
- `as_get_script_roots` tool for listing script root directories (commandlet with config fallback)
- `as_project_info` tool for project overview with configuration status and capability assessment
- Auto-detection of project root from working directory (supports both game projects and engine source trees)
- Auto-detection of editor binary in standard engine paths (Win64, Linux, Mac)
- Bundled documentation: UE-AS reference (1,690 lines) and language reference (1,043 lines)
- Heading-based document chunking with keyword-density category tagging (122 chunks, 7 categories)
- Environment variable overrides for project path, editor binary, and extra script roots
- Global CLI install via `npm link` for portable `.mcp.json` configuration
