# [C03-F04, C03-F05, C03-F16] POST /ask-assistant — collections agent with SSE streaming.
#
# SSE event types emitted:
#   data: {"status":"..."}   during tool execution
#   data: {"message":"..."}  final answer chunks
#   data: {"error":"..."}    on unexpected error
#   data: [DONE]

import json
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from lib import mcp_client
from lib.agent import build_messages, handle_tool_calls
from lib.ai_core import get_access_token, call_ai_core
from lib.logger import log, err

router = APIRouter()


@router.post("/ask-assistant")
async def ask_assistant(request: Request):
    body = await request.json()

    # [C03-F04] Validate request body.
    message = body.get("message")
    if not message or not isinstance(message, str) or not message.strip():
        return JSONResponse(status_code=400, content={"error": "message is required"})

    history = body.get("history") or []
    context = body.get("context") or {}
    start = time.monotonic()

    truncated = message[:80] + ("…" if len(message) > 80 else "")
    log("[request]", f"message=\"{truncated}\"  history={len(history)} turns  context={json.dumps(context)}")

    # [C03-F05] Collect all SSE events into a list synchronously, then stream them.
    # Using a queue + create_task is unreliable inside async generators; collecting
    # first then yielding avoids task-scheduling races.
    async def event_generator():
        events: list[str] = []

        def emit(data: str) -> None:
            events.append(data)

        try:
            token = await get_access_token()
            messages = build_messages(history, message)

            t1_start = time.monotonic()
            turn1 = await call_ai_core(token, {
                "messages": messages,
                "stream": False,
                "tools": mcp_client.tools,
                "tool_choice": "auto",
            })
            choice = (turn1.get("choices") or [{}])[0]
            usage = turn1.get("usage", {})
            elapsed = int((time.monotonic() - t1_start) * 1000)
            log(
                "[ai-core]",
                f"turn-1  {elapsed}ms  finish={choice.get('finish_reason')}  "
                f"tokens={usage.get('total_tokens', '?')}  "
                f"(prompt={usage.get('prompt_tokens', '?')} + "
                f"completion={usage.get('completion_tokens', '?')})",
            )

            if choice.get("finish_reason") == "tool_calls":
                tool_names = ", ".join(
                    tc["function"]["name"]
                    for tc in choice["message"].get("tool_calls", [])
                )
                log("[agent]", f"tool_calls: {tool_names}")

                # Collect status events and streamed chunks via callbacks.
                streamed_chunks: list[str] = []

                async def send_chunk(text: str) -> None:
                    emit(json.dumps({"message": text}))
                    streamed_chunks.append(text)

                async def send_status(text: str) -> None:
                    emit(json.dumps({"status": text}))

                send = {"chunk": send_chunk, "status": send_status}
                await handle_tool_calls(token, messages, choice, send, context)

            else:
                content = (choice.get("message") or {}).get("content") or ""
                log("[agent]", f"direct answer  chars={len(content)}")
                emit(json.dumps({"message": content}))

            total = int((time.monotonic() - start) * 1000)
            log("[done]", f"total={total}ms")

        except Exception as exc:
            err("[error]", str(exc))
            events.append(json.dumps({"error": "An unexpected error occurred. Please try again."}))

        events.append("[DONE]")

        for data in events:
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
