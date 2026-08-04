from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import WatchError

from .config import Settings


class RedisStore:
    def __init__(self, client: Redis, settings: Settings):
        self.client = client
        self.settings = settings

    @staticmethod
    def _json(value: Any) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    @staticmethod
    def _decode(value: bytes | str | None) -> str | None:
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value

    async def ping(self) -> bool:
        return bool(await self.client.ping())

    async def create_session(self, session_id: str, data: dict[str, Any]) -> None:
        await self.client.set(
            f"faq:session:{session_id}",
            self._json(data),
            ex=self.settings.session_ttl_seconds,
            nx=True,
        )

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        raw = self._decode(await self.client.get(f"faq:session:{session_id}"))
        if not raw:
            return None
        await self.client.expire(f"faq:session:{session_id}", self.settings.session_ttl_seconds)
        return json.loads(raw)

    async def update_session(self, session_id: str, data: dict[str, Any]) -> None:
        await self.client.set(
            f"faq:session:{session_id}",
            self._json(data),
            ex=self.settings.session_ttl_seconds,
        )

    @staticmethod
    def quota_window() -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%d")

    async def quota_used(self, subject_hash: str) -> int:
        raw = self._decode(await self.client.get(f"faq:quota:{subject_hash}:{self.quota_window()}"))
        return int(raw or 0)

    async def increment_quota(self, subject_hash: str) -> int:
        key = f"faq:quota:{subject_hash}:{self.quota_window()}"
        async with self.client.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, 172_800)
            result = await pipe.execute()
        return int(result[0])

    async def acquire_generation(self, session_id: str, request_id: str) -> bool:
        return bool(
            await self.client.set(
                f"faq:active:{session_id}",
                request_id,
                ex=max(30, int(self.settings.dify_stream_timeout_seconds) + 10),
                nx=True,
            )
        )

    async def release_generation(self, session_id: str, request_id: str) -> None:
        key = f"faq:active:{session_id}"
        while True:
            async with self.client.pipeline(transaction=True) as pipe:
                try:
                    await pipe.watch(key)
                    if self._decode(await pipe.get(key)) != request_id:
                        await pipe.unwatch()
                        return
                    pipe.multi()
                    pipe.delete(key)
                    await pipe.execute()
                    return
                except WatchError:
                    continue

    async def acquire_channel_slot(self, channel: str, request_id: str) -> bool:
        key = f"faq:channel-active:{channel}"
        ttl = max(30, int(self.settings.dify_stream_timeout_seconds) + 10)
        while True:
            async with self.client.pipeline(transaction=True) as pipe:
                try:
                    await pipe.watch(key)
                    if int(await pipe.scard(key)) >= self.settings.channel_concurrency:
                        await pipe.unwatch()
                        return False
                    pipe.multi()
                    pipe.sadd(key, request_id)
                    pipe.expire(key, ttl)
                    await pipe.execute()
                    return True
                except WatchError:
                    continue

    async def release_channel_slot(self, channel: str, request_id: str) -> None:
        await self.client.srem(f"faq:channel-active:{channel}", request_id)

    async def get_idempotency(self, session_id: str, key_hash: str) -> dict[str, Any] | None:
        raw = self._decode(await self.client.get(f"faq:idempotency:{session_id}:{key_hash}"))
        return json.loads(raw) if raw else None

    async def begin_idempotency(self, session_id: str, key_hash: str, value: dict[str, Any]) -> bool:
        return bool(
            await self.client.set(
                f"faq:idempotency:{session_id}:{key_hash}",
                self._json(value),
                ex=self.settings.idempotency_ttl_seconds,
                nx=True,
            )
        )

    async def finish_idempotency(self, session_id: str, key_hash: str, value: dict[str, Any]) -> None:
        await self.client.set(
            f"faq:idempotency:{session_id}:{key_hash}",
            self._json(value),
            ex=self.settings.idempotency_ttl_seconds,
        )

    async def add_feedback(self, event: dict[str, Any]) -> None:
        async with self.client.pipeline(transaction=True) as pipe:
            pipe.lpush("faq:feedback", self._json(event))
            pipe.ltrim("faq:feedback", 0, 9_999)
            await pipe.execute()

    async def create_handoff(self, payload: dict[str, Any]) -> tuple[str, int]:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        await self.client.set(
            f"faq:handoff:{token_hash}",
            self._json(payload),
            ex=self.settings.handoff_ttl_seconds,
            nx=True,
        )
        return token, self.settings.handoff_ttl_seconds

    async def redeem_handoff(self, token: str) -> dict[str, Any] | None:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        raw = self._decode(await self.client.getdel(f"faq:handoff:{token_hash}"))
        return json.loads(raw) if raw else None
