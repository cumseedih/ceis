"""Chat channels: your wevvy inside Feishu, DingTalk, WeCom and Telegram.

Everything the vendors need is imported lazily; this package imports with none of their
SDKs installed. See ``docs/channels.md``.
"""

from wevvy.channels.base import Channel, ChannelStatus, Field, InboundFile, InboundMessage

__all__ = ["Channel", "ChannelStatus", "Field", "InboundFile", "InboundMessage"]
