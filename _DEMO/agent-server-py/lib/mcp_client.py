# [C03-F10] MCP client — spawns mcp_server.py via stdio, connects at module import,
# and exposes tools list + call_tool() + get_status_message().

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from lib.logger import err

_HERE = Path(__file__).parent
_ROOT = _HERE.parent
_NODE_TOOLS = _ROOT.parent / "agent-server" / "tools"
_REGISTRY_PATH = _NODE_TOOLS / "tool-registry.json"

# Load status messages from the shared registry without an MCP call.
with open(_REGISTRY_PATH, encoding="utf-8") as _f:
    _registry = json.load(_f)
_STATUS_MESSAGES: dict[str, str] = {e["name"]: e["statusMessage"] for e in _registry}

# Module-level state populated by _initialise() at startup.
tools: list[dict] = []
_session: ClientSession | None = None
_exit_stack = None


async def _initialise() -> None:
    global tools, _session, _exit_stack

    import contextlib
    _exit_stack = contextlib.AsyncExitStack()

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[str(_HERE / "mcp_server.py")],
        env={**os.environ},
    )

    read_stream, write_stream = await _exit_stack.enter_async_context(
        stdio_client(server_params)
    )
    _session = await _exit_stack.enter_async_context(
        ClientSession(read_stream, write_stream)
    )
    await _session.initialize()

    result = await _session.list_tools()
    tools.extend(
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.inputSchema,
            },
        }
        for t in result.tools
    )


def initialise_sync() -> None:
    """Called once at server startup to connect the MCP client."""
    asyncio.get_event_loop().run_until_complete(_initialise())


async def call_tool(name: str, args: dict, context: dict = {}) -> str:
    if _session is None:
        raise RuntimeError("MCP client not initialised")
    result = await _session.call_tool(name, arguments={**args, "_context": context})
    return result.content[0].text if result.content else "{}"


def get_status_message(name: str) -> str:
    return _STATUS_MESSAGES.get(name, "Fetching your information…")
