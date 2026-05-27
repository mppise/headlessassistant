# [C03-F03] Widget route — serves headless-assistant.js as application/javascript.

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

_WIDGET_PATH = Path(__file__).parent.parent.parent / "agent-server" / "lib" / "headless-assistant.js"

router = APIRouter()


@router.get("/headless-assistant.js")
async def serve_widget():
    return FileResponse(_WIDGET_PATH, media_type="application/javascript")
