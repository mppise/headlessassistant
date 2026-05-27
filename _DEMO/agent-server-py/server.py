# [C03-F01, C03-F02, C03-F15] FastAPI application entry point.
# Loads .env, applies CORS middleware, mounts routes, initialises MCP client, starts uvicorn.

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lib.logger import warn
from lib import mcp_client
from routes.assistant import router as assistant_router
from routes.widget import router as widget_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # [C03-F10] Initialise MCP client (spawns mcp_server.py subprocess) on startup.
    await mcp_client._initialise()
    yield


app = FastAPI(docs_url=None, redoc_url=None, lifespan=lifespan)

# [C03-F02] CORS — allow all origins for local demo use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["Content-Type", "Authorization"],
    allow_methods=["*"],
)

app.include_router(widget_router)
app.include_router(assistant_router)


if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3000))

    # [C03-F15] Startup banner — matches Node.js warn('[server]', ...) format.
    warn("[server]", f"Agent server  →  http://localhost:{PORT}")
    warn("[server]", "  GET  /headless-assistant.js   widget bundle")
    warn("[server]", "  POST /ask-assistant            collections agent")

    uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="warning")
