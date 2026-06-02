# [C03-F09] Agent logic — message building and agentic tool-call loop.

import asyncio
import json
import time
from pathlib import Path

from lib import mcp_client
from lib.ai_core import call_ai_core, stream_response
from lib.logger import log, err

_SYSTEM_PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts" / "system-prompt.txt"
SYSTEM_PROMPT = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")


def build_messages(history: list[dict], user_message: str) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": t["role"], "content": str(t["content"])} for t in history],
        {"role": "user", "content": user_message.strip()},
    ]


async def _run_tool_call(tool_call: dict, send_status, context: dict) -> dict:
    tc_id = tool_call["id"]
    fn = tool_call["function"]
    args = json.loads(fn.get("arguments") or "{}")
    status_msg = mcp_client.get_status_message(fn["name"])
    await send_status(status_msg)
    start = time.monotonic()
    log("[mcp]", f"→ {fn['name']}  \"{status_msg}\"  args={fn.get('arguments')}")
    try:
        result = await mcp_client.call_tool(fn["name"], args, context)
        elapsed = int((time.monotonic() - start) * 1000)
        snippet = result[:120] + ("…" if len(result) > 120 else "")
        log("[mcp]", f"← {fn['name']}  {elapsed}ms  result={snippet}")
        content = json.dumps(result)
    except Exception as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        err("[mcp]", f"← {fn['name']}  {elapsed}ms  ERROR: {exc}")
        content = json.dumps({"error": f"Tool {fn['name']} failed — please try again."})

    return {"role": "tool", "tool_call_id": tc_id, "content": content}


async def handle_tool_calls(token: str, messages: list[dict], choice: dict, send, context: dict = {}) -> None:
    tool_calls = choice["message"]["tool_calls"]
    messages.append({"role": "assistant", "content": None, "tool_calls": tool_calls})

    tool_results = await asyncio.gather(
        *[_run_tool_call(tc, send["status"], context) for tc in tool_calls]
    )
    for result in tool_results:
        messages.append(result)

    t2_start = time.monotonic()
    log("[ai-core]", "turn-2  streaming...")
    turn2_resp = await call_ai_core(token, {"messages": messages, "stream": True})

    async def _chunk(text: str) -> None:
        await send["chunk"](text)

    chars = await stream_response(turn2_resp, _chunk)
    elapsed = int((time.monotonic() - t2_start) * 1000)
    log("[ai-core]", f"turn-2  {elapsed}ms  chars={chars}")
