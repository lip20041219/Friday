"""Reminder / timer tools — set timed reminders with desktop + voice alert."""
from __future__ import annotations

import logging
import threading
import time
import uuid
from datetime import datetime, timedelta

from ..core.permissions import Permission
from .base import PluginInfo, tool

log = logging.getLogger("friday.reminder")

# In-memory reminder store: id -> {text, fire_at, timer, active}
_reminders: dict[str, dict] = {}
_lock = threading.Lock()


def _fire(reminder_id: str, text: str) -> None:
    """Called when a reminder fires: desktop notify + TTS speak."""
    with _lock:
        r = _reminders.get(reminder_id)
        if not r or not r["active"]:
            return
        r["active"] = False

    log.info("reminder fired: %s", text)

    # 1. Desktop notification
    try:
        from win11toast import toast
        toast("FRIDAY Reminder", text, duration="long")
    except Exception:  # noqa: BLE001
        try:
            from plyer import notification
            notification.notify(
                title="FRIDAY Reminder",
                message=text,
                app_name="FRIDAY",
                timeout=15,
            )
        except Exception as e2:  # noqa: BLE001
            log.warning("reminder notify failed: %s", e2)

    # 2. Sound alert via Windows system beep
    try:
        import winsound
        winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
    except Exception as e:  # noqa: BLE001
        log.debug("reminder beep skipped: %s", e)


def _parse_when(when: str) -> float:
    """Parse a free-form time string into a unix timestamp.
    Supports: 'in 5 minutes', 'in 2 hours', 'tomorrow 9am', '2026-10-11 14:00', '14:30'
    """
    now = datetime.now()
    when = when.strip().lower()

    # "in X minutes/hours"
    if when.startswith("in "):
        parts = when.split()
        if len(parts) >= 3:
            try:
                amount = int(parts[1])
                unit = parts[2]
                if "min" in unit:
                    return (now + timedelta(minutes=amount)).timestamp()
                if "hour" in unit:
                    return (now + timedelta(hours=amount)).timestamp()
                if "sec" in unit:
                    return (now + timedelta(seconds=amount)).timestamp()
            except (ValueError, IndexError):
                pass

    # "tomorrow"
    if when.startswith("tomorrow"):
        base = now + timedelta(days=1)
        time_part = when.replace("tomorrow", "").strip()
        if time_part:
            try:
                t = datetime.strptime(time_part, "%H:%M").time()
                return datetime.combine(base.date(), t).timestamp()
            except ValueError:
                pass
        return base.replace(hour=9, minute=0, second=0).timestamp()

    # "HH:MM" today (or tomorrow if already passed)
    try:
        t = datetime.strptime(when, "%H:%M").time()
        candidate = datetime.combine(now.date(), t)
        if candidate <= now:
            candidate += timedelta(days=1)
        return candidate.timestamp()
    except ValueError:
        pass

    # "YYYY-MM-DD HH:MM"
    for fmt in ("%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M", "%m-%d %H:%M"):
        try:
            return datetime.strptime(when, fmt).timestamp()
        except ValueError:
            continue

    # Fallback: try natural language minutes
    try:
        minutes = int(when)
        return (now + timedelta(minutes=minutes)).timestamp()
    except ValueError:
        pass

    raise ValueError(f"cannot parse time: {when}")


def register(registry):
    @tool(
        name="set_reminder",
        description="Set a timed reminder. When it fires, FRIDAY shows a desktop notification and speaks aloud. 'when' examples: 'in 5 minutes', 'in 1 hour', 'tomorrow 9am', '14:30', '2026-10-11 14:00'.",
        permission=Permission.SAFE,
        parameters={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "What to remind the user about"},
                "when": {"type": "string", "description": "When to fire (free-form)"},
            },
            "required": ["text", "when"],
        },
        preview=lambda a: f"reminder: {a.get('text','')[:40]} @ {a.get('when','')}",
    )
    def set_reminder(text: str, when: str) -> str:
        try:
            fire_at = _parse_when(when)
        except ValueError as e:
            return f"could not parse time '{when}': {e}"

        if fire_at <= time.time():
            return f"that time is in the past ({when})"

        rid = uuid.uuid4().hex[:8]
        delay = fire_at - time.time()

        timer = threading.Timer(delay, _fire, args=(rid, text))
        timer.daemon = True
        timer.start()

        with _lock:
            _reminders[rid] = {
                "text": text,
                "fire_at": fire_at,
                "timer": timer,
                "active": True,
            }

        fire_str = datetime.fromtimestamp(fire_at).strftime("%Y-%m-%d %H:%M")
        return f"reminder set ({rid}): '{text}' at {fire_str}"

    @tool(
        name="list_reminders",
        description="List all active pending reminders.",
        permission=Permission.SAFE,
        parameters={"type": "object", "properties": {}},
    )
    def list_reminders() -> str:
        with _lock:
            active = [(rid, r) for rid, r in _reminders.items() if r["active"]]
        if not active:
            return "no active reminders"
        lines = []
        for rid, r in sorted(active, key=lambda x: x[1]["fire_at"]):
            fire_str = datetime.fromtimestamp(r["fire_at"]).strftime("%Y-%m-%d %H:%M")
            lines.append(f"[{rid}] {fire_str} — {r['text']}")
        return "\n".join(lines)

    @tool(
        name="cancel_reminder",
        description="Cancel a reminder by its ID (from list_reminders).",
        permission=Permission.SAFE,
        parameters={
            "type": "object",
            "properties": {
                "reminder_id": {"type": "string", "description": "The reminder ID to cancel"},
            },
            "required": ["reminder_id"],
        },
    )
    def cancel_reminder(reminder_id: str) -> str:
        with _lock:
            r = _reminders.get(reminder_id)
            if not r:
                return f"reminder {reminder_id} not found"
            r["active"] = False
            if r["timer"]:
                r["timer"].cancel()
        return f"reminder cancelled: {reminder_id}"

    registry.add_pending("reminder_tools")
    registry.register_plugin(PluginInfo(
        name="reminder_tools",
        description="Timed reminders with desktop + voice alerts.",
    ))
