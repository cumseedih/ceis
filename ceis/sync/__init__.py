"""Conversation sync between the account's devices (contract C7): the engine that pushes
and pulls, the relay client it uses, and the ``@<device>`` mention at the start of a
message that sends the work to another device."""

from ceis.sync.client import SyncClient
from ceis.sync.engine import ConversationSync
from ceis.sync.mention import Mention, parse_mention, system_note

__all__ = ["ConversationSync", "Mention", "SyncClient", "parse_mention", "system_note"]
