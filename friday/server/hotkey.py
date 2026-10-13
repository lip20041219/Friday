"""Global hotkey listener — Ctrl+Alt+F to wake FRIDAY.

Runs in a background thread. When triggered, broadcasts a `wake` event to all
connected WebSocket clients so the frontend starts listening.
"""
from __future__ import annotations

import asyncio
import logging
import threading

log = logging.getLogger("friday.hotkey")

HOTKEY_DESC = "Ctrl+Alt+F"

_listener = None
_stop_event = threading.Event()


def _trigger_wake(app_state) -> None:
    """Called from the hotkey thread — schedule wake broadcast on the event loop."""
    log.info("global hotkey %s pressed — waking FRIDAY", HOTKEY_DESC)
    clients = getattr(app_state, "ws_clients", set())
    if not clients:
        log.debug("no ws clients connected for wake broadcast")
        return

    loop = getattr(app_state, "loop", None)
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast_wake(clients), loop)
    else:
        # Fallback: fire-and-forget in a new loop (shouldn't happen normally).
        asyncio.run(_broadcast_wake(clients))


async def _broadcast_wake(clients) -> None:
    for send_fn in list(clients):
        try:
            await send_fn({"type": "wake", "source": "hotkey"})
        except Exception as e:  # noqa: BLE001
            log.debug("wake broadcast failed: %s", e)


def start_hotkey_listener(app_state) -> threading.Thread | None:
    """Start the global hotkey listener in a daemon thread. Returns the thread."""
    global _listener, _stop_event
    _stop_event = threading.Event()

    try:
        from pynput import keyboard
    except ImportError:
        log.warning("pynput not installed — global hotkey disabled")
        return None

    # Store the event loop so the hotkey thread can schedule coroutines.
    try:
        app_state.loop = asyncio.get_running_loop()
    except RuntimeError:
        pass

    current = set()

    def on_press(key):
        try:
            current.add(key)
            # Check Ctrl+Alt+F
            if (keyboard.Key.ctrl_l in current or keyboard.Key.ctrl_r in current) and \
               (keyboard.Key.alt_l in current or keyboard.Key.alt_r in current) and \
               key == keyboard.KeyCode.from_char('f'):
                _trigger_wake(app_state)
        except Exception:  # noqa: BLE001
            pass

    def on_release(key):
        try:
            current.discard(key)
        except Exception:  # noqa: BLE001
            pass
        if _stop_event.is_set():
            return False

    _listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    _listener.daemon = True
    _listener.start()
    log.info("global hotkey listener started (%s to wake)", HOTKEY_DESC)
    return _listener


def stop_hotkey_listener() -> None:
    global _listener
    _stop_event.set()
    if _listener:
        try:
            _listener.stop()
        except Exception:  # noqa: BLE001
            pass
        _listener = None
