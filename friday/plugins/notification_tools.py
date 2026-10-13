"""Desktop notification tools — Windows toast via plyer."""
from __future__ import annotations

import logging

from ..core.permissions import Permission
from .base import PluginInfo, tool

log = logging.getLogger("friday.notify")


def _notify(title: str, message: str, timeout: int = 8) -> bool:
    """Send a Windows desktop notification. Returns True on success."""
    # Prefer win11toast (reliable on Windows 10/11), fallback to plyer.
    try:
        from win11toast import toast
        toast(title, message, duration="long" if timeout > 8 else "short")
        return True
    except Exception as e:  # noqa: BLE001
        log.debug("win11toast failed, trying plyer: %s", e)
    try:
        from plyer import notification
        notification.notify(
            title=title,
            message=message,
            app_name="FRIDAY",
            timeout=timeout,
        )
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("desktop notification failed: %s", e)
        return False


def register(registry):
    @tool(
        name="send_notification",
        description="Send a Windows desktop toast notification. Use for alerts, reminders, or when a long task finishes.",
        permission=Permission.SAFE,
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Notification title"},
                "message": {"type": "string", "description": "Notification body"},
                "timeout": {"type": "integer", "default": 8, "description": "Seconds to display"},
            },
            "required": ["title", "message"],
        },
        preview=lambda a: f"notify: {a.get('title','')} — {a.get('message','')[:50]}",
    )
    def send_notification(title: str, message: str, timeout: int = 8) -> str:
        ok = _notify(title, message, timeout)
        return f"notification {'sent' if ok else 'failed'}: {title}"

    # Expose helper so other plugins (reminders, etc.) can notify.
    registry.services["notify"] = _notify

    registry.add_pending("notification_tools")
    registry.register_plugin(PluginInfo(
        name="notification_tools",
        description="Windows desktop toast notifications.",
    ))
