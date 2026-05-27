# [C03-F13] Timestamped console logger — matches Node.js format exactly.

import sys
from datetime import datetime


def _ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log(label: str, msg: str) -> None:
    print(f"{_ts()} {label:<12} {msg}", flush=True)


def err(label: str, msg: str) -> None:
    print(f"{_ts()} {label:<12} {msg}", file=sys.stderr, flush=True)


def warn(label: str, msg: str) -> None:
    print(f"{_ts()} {label:<12} {msg}", flush=True)
