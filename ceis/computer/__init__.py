"""This computer as a device: its screen as a picture, and — when Hands is on — as a hand.

:mod:`ceis.computer.screen` takes the picture (``mss`` and Pillow, or the platform's own
tool) and names the active window; :mod:`ceis.computer.hands` moves the mouse and types
(``pyautogui``, or ``xdotool`` on X11); :mod:`ceis.computer.link` is the object the
operator loop and the ``computer_*`` tools talk to, shaped like the phone's
:class:`~ceis.phone.link.PhoneLink` so one loop serves both.
"""

from ceis.computer.screen import active_window, capture, take_screenshot

__all__ = ["active_window", "capture", "take_screenshot"]
