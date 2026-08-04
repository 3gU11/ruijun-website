from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from redis.asyncio import Redis

from .config import Settings
from .dify import DifyGateway, DifyUnavailableError
from .models import (
    ConversationRequest,
    FeedbackRequest,
    HandoffRequest,
    HandoffType,
    MessageRequest,
    SourceChannel,
    utc_now,
)
from .redis_store import RedisStore

logger = logging.getLogger("ruijun.faq")
VISITOR_COOKIE = "ruijun_faq_visitor"
STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, separators=(',', ':'))}\n\n"


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _sign_visitor(visitor_id: str, secret: str) -> str:
    signature = hmac.new(secret.encode("utf-8"), visitor_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{visitor_id}.{signature}"


def _verify_visitor(token: str, secret: str) -> str | None:
    try:
        visitor_id, signature = token.rsplit(".", 1)
    except ValueError:
        return None
    expected = hmac.new(secret.encode("utf-8"), visitor_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return visitor_id if hmac.compare_digest(signature, expected) else None


def _visitor_subject(request: Request, settings: Settings) -> tuple[str, str | None]:
    secret = settings.signing_secret or "development-only-signing-secret"
    token = request.cookies.get(VISITOR_COOKIE, "")
    visitor_id = _verify_visitor(token, secret)
    new_token = None
    if not visitor_id:
        visitor_id = secrets.token_urlsafe(24)
        new_token = _sign_visitor(visitor_id, secret)
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")[:200]
    return _hash(f"{visitor_id}:{ip}:{user_agent}"), new_token


def _set_visitor_cookie(response: Response, token: str | None, settings: Settings) -> None:
    if not token:
        return
    response.set_cookie(
        VISITOR_COOKIE,
        token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="none" if settings.cookie_secure else "lax",
        path="/",
    )


def create_app(
    settings: Settings | None = None,
    redis_client: Redis | None = None,
    dify_gateway: DifyGateway | None = None,
) -> FastAPI:
    app_settings = settings or Settings.from_env()
    app_settings.validate()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        owns_redis = redis_client is None
        owns_http = dify_gateway is None
        current_redis = redis_client or Redis.from_url(app_settings.redis_url, decode_responses=True)
        http_client = None
        current_dify = dify_gateway
        if current_dify is None:
            http_client = httpx.AsyncClient(
                limits=httpx.Limits(max_connections=200, max_keepalive_connections=50),
                follow_redirects=False,
            )
            current_dify = DifyGateway(http_client, app_settings)
        app.state.store = RedisStore(current_redis, app_settings)
        app.state.dify = current_dify
        try:
            yield
        finally:
            if owns_http and http_client:
                await http_client.aclose()
            if owns_redis:
                await current_redis.aclose()

    app = FastAPI(title="Ruijun FAQ BFF", version="0.1.0", lifespan=lifespan, docs_url=None, redoc_url=None)
    app.state.settings = app_settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(app_settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Idempotency-Key"],
    )

    def store(request: Request) -> RedisStore:
        return request.app.state.store

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        origin = request.headers.get("origin", "").strip()
        if origin and origin not in app_settings.allowed_origins:
            return JSONResponse({"detail": "请求来源不在允许列表中"}, status_code=status.HTTP_403_FORBIDDEN)
        if (
            request.method in STATE_CHANGING_METHODS
            and request.url.path.startswith("/api/faq/v1/")
            and not origin
        ):
            return JSONResponse({"detail": "写入请求必须携带受信任的 Origin"}, status_code=status.HTTP_403_FORBIDDEN)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/internal/health/live")
    async def live() -> dict[str, Any]:
        return {"ok": True, "service": "ruijun-faq-bff"}

    @app.get("/internal/health/ready")
    async def ready(redis_store: RedisStore = Depends(store)):
        try:
            redis_ok = await redis_store.ping()
        except Exception:
            redis_ok = False
        body = {"ok": redis_ok and app_settings.dify_configured, "redis": redis_ok, "difyConfigured": app_settings.dify_configured}
        return JSONResponse(body, status_code=200 if body["ok"] else 503)

    @app.post("/api/faq/v1/conversations", status_code=status.HTTP_201_CREATED)
    async def conversations(payload: ConversationRequest, request: Request, response: Response, redis_store: RedisStore = Depends(store)):
        subject_hash, visitor_token = _visitor_subject(request, app_settings)
        session_id = payload.faq_session_id
        if session_id:
            session = await redis_store.get_session(session_id)
            if session and hmac.compare_digest(session.get("subjectHash", ""), subject_hash):
                _set_visitor_cookie(response, visitor_token, app_settings)
                return {"faqSessionId": session_id, "restored": True, "sourceChannel": session["sourceChannel"]}
        session_id = secrets.token_urlsafe(32)
        session = {
            "subjectHash": subject_hash,
            "sourceChannel": payload.source_channel.value,
            "context": payload.context.model_dump(by_alias=True),
            "difyConversationId": "",
            "conversationReference": secrets.token_urlsafe(18),
            "createdAt": utc_now(),
        }
        await redis_store.create_session(session_id, session)
        _set_visitor_cookie(response, visitor_token, app_settings)
        return {"faqSessionId": session_id, "restored": False, "sourceChannel": payload.source_channel.value}

    @app.get("/api/faq/v1/quota")
    async def quota(
        request: Request,
        response: Response,
        source_channel: SourceChannel = Query(alias="sourceChannel"),
        redis_store: RedisStore = Depends(store),
    ):
        subject_hash, visitor_token = _visitor_subject(request, app_settings)
        used = await redis_store.quota_used(subject_hash)
        _set_visitor_cookie(response, visitor_token, app_settings)
        return {"sourceChannel": source_channel.value, "used": used, "limit": app_settings.daily_quota, "remaining": max(0, app_settings.daily_quota - used)}

    @app.post("/api/faq/v1/messages")
    async def messages(
        payload: MessageRequest,
        request: Request,
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=128),
        redis_store: RedisStore = Depends(store),
    ):
        if len(payload.message) > app_settings.input_max_length:
            raise HTTPException(413, "消息长度超过限制")
        session = await redis_store.get_session(payload.faq_session_id)
        if not session:
            raise HTTPException(404, "FAQ 会话不存在或已过期")
        subject_hash, visitor_token = _visitor_subject(request, app_settings)
        if not hmac.compare_digest(session.get("subjectHash", ""), subject_hash):
            raise HTTPException(403, "FAQ 会话不属于当前访问者")

        key_hash = _hash(idempotency_key)
        existing = await redis_store.get_idempotency(payload.faq_session_id, key_hash)
        if existing and existing.get("requestHash") != _hash(payload.message):
            raise HTTPException(409, "Idempotency-Key 已用于不同消息")

        async def replay(events: list[dict[str, Any]]):
            for item in events:
                yield _sse(item["event"], item["data"])

        if existing and existing.get("status") == "done":
            response = StreamingResponse(replay(existing.get("events", [])), media_type="text/event-stream")
            _set_visitor_cookie(response, visitor_token, app_settings)
            return response
        if existing:
            return StreamingResponse(
                replay([{"event": "error", "data": {"code": "REQUEST_IN_PROGRESS", "message": "相同请求正在处理中", "retryAfter": 2}}]),
                media_type="text/event-stream",
                status_code=409,
            )

        request_id = secrets.token_urlsafe(18)
        started = await redis_store.begin_idempotency(payload.faq_session_id, key_hash, {
            "status": "running", "requestId": request_id, "requestHash": _hash(payload.message), "startedAt": utc_now()
        })
        if not started:
            raise HTTPException(409, "相同请求正在处理中")
        used = await redis_store.quota_used(subject_hash)

        async def generate():
            events: list[dict[str, Any]] = []
            acquired_session = False
            acquired_channel = False

            def event(name: str, data: dict[str, Any]) -> str:
                events.append({"event": name, "data": data})
                return _sse(name, data)

            try:
                if used >= app_settings.daily_quota:
                    yield event("error", {"requestId": request_id, "code": "QUOTA_EXCEEDED", "message": "今日问答次数已用完", "retryAfter": 3600})
                    return
                acquired_session = await redis_store.acquire_generation(payload.faq_session_id, request_id)
                if not acquired_session:
                    yield event("error", {"requestId": request_id, "code": "SESSION_BUSY", "message": "当前会话已有回答正在生成", "retryAfter": 2})
                    return
                acquired_channel = await redis_store.acquire_channel_slot(session["sourceChannel"], request_id)
                if not acquired_channel:
                    yield event("error", {"requestId": request_id, "code": "SERVICE_BUSY", "message": "当前咨询较多，请稍后重试", "retryAfter": 10})
                    return
                yield event("ack", {"requestId": request_id, "faqSessionId": payload.faq_session_id})
                citations: list[dict[str, Any]] = []
                context = {**session.get("context", {}), **(payload.context.model_dump(by_alias=True) if payload.context else {})}
                context["sourceChannel"] = session["sourceChannel"]
                upstream_done: dict[str, Any] = {}
                async for item in request.app.state.dify.stream(
                    message=payload.message,
                    conversation_id=session.get("difyConversationId", ""),
                    user_reference=session["conversationReference"],
                    context=context,
                ):
                    if await request.is_disconnected():
                        raise asyncio.CancelledError
                    if item["type"] == "delta":
                        yield event("delta", {"requestId": request_id, "text": item["text"]})
                    elif item["type"] == "citation":
                        citation = item["citation"]
                        if citation not in citations:
                            citations.append(citation)
                            yield event("citation", {"requestId": request_id, **citation})
                    elif item["type"] == "upstream_done":
                        upstream_done = item
                if upstream_done.get("conversationId"):
                    session["difyConversationId"] = upstream_done["conversationId"]
                    session["context"] = context
                    await redis_store.update_session(payload.faq_session_id, session)
                remaining = max(0, app_settings.daily_quota - await redis_store.increment_quota(subject_hash))
                yield event("done", {"requestId": request_id, "remainingQuota": remaining, "citationCount": len(citations)})
            except asyncio.CancelledError:
                logger.info("faq_stream_cancelled request_id=%s channel=%s", request_id, session["sourceChannel"])
                raise
            except (DifyUnavailableError, httpx.HTTPError, TimeoutError):
                yield event("error", {"requestId": request_id, "code": "UPSTREAM_UNAVAILABLE", "message": "智能问答暂时不可用，请稍后重试或联系人工售后", "retryAfter": 15})
            except Exception:
                logger.exception("faq_stream_failed request_id=%s channel=%s", request_id, session["sourceChannel"])
                yield event("error", {"requestId": request_id, "code": "INTERNAL_ERROR", "message": "服务暂时不可用，请联系人工售后", "retryAfter": 15})
            finally:
                if acquired_channel:
                    await redis_store.release_channel_slot(session["sourceChannel"], request_id)
                if acquired_session:
                    await redis_store.release_generation(payload.faq_session_id, request_id)
                final_state = {
                    "status": "done", "requestId": request_id, "requestHash": _hash(payload.message), "events": events, "finishedAt": utc_now()
                }
                await redis_store.finish_idempotency(payload.faq_session_id, key_hash, final_state)

        response = StreamingResponse(generate(), media_type="text/event-stream", headers={"X-Accel-Buffering": "no"})
        _set_visitor_cookie(response, visitor_token, app_settings)
        return response

    @app.post("/api/faq/v1/feedback", status_code=status.HTTP_202_ACCEPTED)
    async def feedback(payload: FeedbackRequest, request: Request, redis_store: RedisStore = Depends(store)):
        session = await redis_store.get_session(payload.faq_session_id)
        if not session:
            raise HTTPException(404, "FAQ 会话不存在或已过期")
        subject_hash, _ = _visitor_subject(request, app_settings)
        if not hmac.compare_digest(session.get("subjectHash", ""), subject_hash):
            raise HTTPException(403, "FAQ 会话不属于当前访问者")
        await redis_store.add_feedback({
            "faqConversationReference": session["conversationReference"],
            "requestId": payload.request_id,
            "sourceChannel": session["sourceChannel"],
            "helpful": payload.helpful,
            "reason": payload.reason,
            "escalateToHuman": payload.escalate_to_human,
            "createdAt": utc_now(),
        })
        return {"accepted": True}

    @app.post("/api/faq/v1/handoffs", status_code=status.HTTP_201_CREATED)
    async def handoffs(payload: HandoffRequest, request: Request, redis_store: RedisStore = Depends(store)):
        session = await redis_store.get_session(payload.faq_session_id)
        if not session:
            raise HTTPException(404, "FAQ 会话不存在或已过期")
        subject_hash, _ = _visitor_subject(request, app_settings)
        if not hmac.compare_digest(session.get("subjectHash", ""), subject_hash):
            raise HTTPException(403, "FAQ 会话不属于当前访问者")
        source = "website_faq" if session["sourceChannel"] == SourceChannel.WEBSITE.value else "repair_portal_faq"
        handoff = {
            "handoffType": payload.handoff_type.value,
            "faqSessionId": payload.faq_session_id,
            "faqConversationReference": session["conversationReference"],
            "sourceChannel": source,
            "createdAt": utc_now(),
        }
        if payload.handoff_type == HandoffType.REPAIR_DRAFT:
            handoff.update(payload.repair_draft.model_dump(by_alias=True))
            handoff["consentAt"] = utc_now()
            handoff["consentUiVersion"] = payload.consent_ui_version
        token, expires_in = await redis_store.create_handoff(handoff)
        return {"token": token, "handoffType": payload.handoff_type.value, "expiresIn": expires_in}

    async def require_internal_key(x_faq_internal_key: str = Header(alias="X-FAQ-Internal-Key")) -> None:
        if not app_settings.internal_api_key or not hmac.compare_digest(x_faq_internal_key, app_settings.internal_api_key):
            raise HTTPException(401, "内部服务认证失败")

    @app.post("/api/internal/v1/faq-handoffs/{token}/redeem", dependencies=[Depends(require_internal_key)])
    async def redeem(token: str, redis_store: RedisStore = Depends(store)):
        if len(token) < 32 or len(token) > 128:
            raise HTTPException(404, "交接令牌无效或已过期")
        payload = await redis_store.redeem_handoff(token)
        if not payload:
            raise HTTPException(410, "交接令牌无效、已过期或已兑换")
        return payload

    return app


app = create_app()
