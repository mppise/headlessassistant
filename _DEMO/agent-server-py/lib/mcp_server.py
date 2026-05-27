# [C03-F11] MCP server — stdio transport.
# Reads tool-registry.json from the Node.js tree, builds Tool objects from each schema.json,
# and dispatches call_tool requests to each handler's execute().
# Spawned as a subprocess by mcp_client.py — never imported directly.

import sys
from pathlib import Path

# Ensure the agent-server-py root is on sys.path before any project imports.
_SERVER_ROOT = Path(__file__).parent.parent
if str(_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVER_ROOT))

import asyncio
import importlib
import json
import os

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

from lib.logger import err

# MCP server runs on stdio — only write to stderr to avoid corrupting the JSON-RPC channel.
def warn(label: str, msg: str) -> None:
    import sys
    from datetime import datetime
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{ts} {label:<12} {msg}", file=sys.stderr, flush=True)

_HERE = Path(__file__).parent
_ROOT = _HERE.parent
_NODE_TOOLS = _ROOT.parent / "agent-server" / "tools"
_REGISTRY_PATH = _NODE_TOOLS / "tool-registry.json"


def _load_registry() -> list[dict]:
    with open(_REGISTRY_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_schema(registry_entry: dict) -> dict:
    schema_path = _ROOT.parent / "agent-server" / registry_entry["schema"].lstrip("./")
    with open(schema_path, encoding="utf-8") as f:
        return json.load(f)


def _import_handler(tool_name: str):
    module_path = f"tools.{tool_name}.handler"
    mod = importlib.import_module(module_path)
    return mod.execute


async def main() -> None:
    registry = _load_registry()

    # Pre-load all schemas and handlers at startup.
    tool_defs: list[types.Tool] = []
    handlers: dict[str, object] = {}

    for entry in registry:
        schema = _load_schema(entry)
        fn = schema["function"]
        tool_defs.append(
            types.Tool(
                name=fn["name"],
                description=fn["description"],
                inputSchema=fn["parameters"],
            )
        )
        handlers[fn["name"]] = _import_handler(fn["name"])

    server = Server("agent-tools")

    @server.list_tools()
    async def list_tools() -> list[types.Tool]:
        return tool_defs

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
        context = arguments.pop("_context", {})
        start = asyncio.get_event_loop().time()
        execute = handlers.get(name)
        if execute is None:
            raise ValueError(f"Unknown tool: {name}")
        try:
            result = await execute(arguments, context)
            elapsed = int((asyncio.get_event_loop().time() - start) * 1000)
            warn("[mcp-server]", f"{name}  {elapsed}ms")
            return [types.TextContent(type="text", text=json.dumps(result))]
        except Exception as exc:
            elapsed = int((asyncio.get_event_loop().time() - start) * 1000)
            err("[mcp-server]", f"{name}  {elapsed}ms  ERROR: {exc}")
            return [types.TextContent(type="text", text=json.dumps({"error": f"Tool {name} failed — please try again."}))]

    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
