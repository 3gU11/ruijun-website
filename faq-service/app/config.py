from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_ALLOWED_ORIGINS = (
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:2888",
    "http://localhost:2888",
)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 3201
    redis_url: str = "redis://127.0.0.1:6379/3"
    dify_base_url: str = ""
    dify_api_key: str = ""
    internal_api_key: str = ""
    signing_secret: str = ""
    allowed_origins: tuple[str, ...] = DEFAULT_ALLOWED_ORIGINS
    cookie_secure: bool = False
    session_ttl_seconds: int = 86_400
    handoff_ttl_seconds: int = 300
    idempotency_ttl_seconds: int = 900
    daily_quota: int = 30
    channel_concurrency: int = 100
    input_max_length: int = 2_000
    dify_connect_timeout_seconds: float = 5.0
    dify_first_byte_timeout_seconds: float = 15.0
    dify_stream_timeout_seconds: float = 60.0

    @property
    def dify_configured(self) -> bool:
        return bool(self.dify_base_url and self.dify_api_key)

    @classmethod
    def from_env(cls) -> "Settings":
        origins = tuple(
            item.strip()
            for item in os.getenv("FAQ_ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS)).split(",")
            if item.strip()
        )
        return cls(
            environment=os.getenv("FAQ_ENV", "development").strip().lower(),
            host=os.getenv("FAQ_HOST", "127.0.0.1"),
            port=int(os.getenv("FAQ_PORT", "3201")),
            redis_url=os.getenv("FAQ_REDIS_URL", "redis://127.0.0.1:6379/3"),
            dify_base_url=os.getenv("FAQ_DIFY_BASE_URL", "").rstrip("/"),
            dify_api_key=os.getenv("FAQ_DIFY_API_KEY", "").strip(),
            internal_api_key=os.getenv("FAQ_INTERNAL_API_KEY", "").strip(),
            signing_secret=os.getenv("FAQ_SIGNING_SECRET", "").strip(),
            allowed_origins=origins,
            cookie_secure=_bool_env("FAQ_COOKIE_SECURE", False),
            session_ttl_seconds=int(os.getenv("FAQ_SESSION_TTL_SECONDS", "86400")),
            handoff_ttl_seconds=min(int(os.getenv("FAQ_HANDOFF_TTL_SECONDS", "300")), 300),
            idempotency_ttl_seconds=int(os.getenv("FAQ_IDEMPOTENCY_TTL_SECONDS", "900")),
            daily_quota=int(os.getenv("FAQ_DAILY_QUOTA", "30")),
            channel_concurrency=int(os.getenv("FAQ_CHANNEL_CONCURRENCY", "100")),
            input_max_length=int(os.getenv("FAQ_INPUT_MAX_LENGTH", "2000")),
            dify_connect_timeout_seconds=float(os.getenv("FAQ_DIFY_CONNECT_TIMEOUT_SECONDS", "5")),
            dify_first_byte_timeout_seconds=float(os.getenv("FAQ_DIFY_FIRST_BYTE_TIMEOUT_SECONDS", "15")),
            dify_stream_timeout_seconds=float(os.getenv("FAQ_DIFY_STREAM_TIMEOUT_SECONDS", "60")),
        )

    def validate(self) -> None:
        if self.environment == "production":
            if len(self.internal_api_key) < 32:
                raise RuntimeError("FAQ_INTERNAL_API_KEY must contain at least 32 characters in production")
            if len(self.signing_secret) < 32:
                raise RuntimeError("FAQ_SIGNING_SECRET must contain at least 32 characters in production")
            if not self.dify_configured:
                raise RuntimeError("Dify configuration is required in production")
            if not self.cookie_secure:
                raise RuntimeError("FAQ_COOKIE_SECURE must be true in production")
