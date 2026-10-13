"""Throwaway smoke test: one chat turn over the friday websocket."""
import asyncio
import json
import sys

import websockets


async def main(text: str) -> int:
    async with websockets.connect("ws://127.0.0.1:7341/ws") as ws:
        await ws.send(json.dumps({"type": "chat", "text": text}))
        while True:
            raw = await asyncio.wait_for(ws.recv(), timeout=120)
            m = json.loads(raw)
            t = m.get("type")
            if t == "assistant":
                print("[assistant]", m.get("text", "")[:400])
            elif t == "error":
                print("[ERROR]", m.get("text"))
                return 1
            elif t == "done":
                print("[done]")
                return 0
            else:
                print(f"[{t}]", json.dumps(m, ensure_ascii=False)[:180])


if __name__ == "__main__":
    sys.exit(asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "status report")))

