from __future__ import annotations

import json

import fakeredis.aioredis
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dify import ThinkFilter
from app.main import create_app


WEB_HEADERS = {"Origin": "http://127.0.0.1:4173"}


class FakeDifyGateway:
    def __init__(self) -> None:
        self.calls = 0

    async def stream(self, **_kwargs):
        self.calls += 1
        yield {"type": "delta", "text": "请先检查工作液。"}
        yield {"type": "citation", "citation": {"id": "KB-12", "title": "工作液检查", "version": "v3"}}
        yield {"type": "upstream_done", "conversationId": "upstream-private-id", "messageId": "message-private-id"}


@pytest.fixture
def client_bundle():
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    dify = FakeDifyGateway()
    settings = Settings(
        redis_url="redis://unused/0",
        dify_base_url="https://dify.invalid/v1",
        dify_api_key="test-key-is-never-sent",
        internal_api_key="internal-test-key",
        signing_secret="test-signing-secret",
        daily_quota=2,
        allowed_origins=("http://127.0.0.1:4173", "http://127.0.0.1:2888"),
    )
    app = create_app(settings=settings, redis_client=redis, dify_gateway=dify)
    with TestClient(app, base_url="http://faq.test") as client:
        yield client, dify


def create_conversation(client: TestClient, source: str = "website") -> str:
    response = client.post(
        "/api/faq/v1/conversations",
        headers=WEB_HEADERS,
        json={"sourceChannel": source, "context": {"pageType": "product", "pageSlug": "fr-xs", "modelCode": "FR-XS"}},
    )
    assert response.status_code == 201
    return response.json()["faqSessionId"]


def test_public_faq_writes_require_an_exact_allowed_origin(client_bundle):
    client, _ = client_bundle
    payload = {"sourceChannel": "website", "context": {"pageType": "service"}}

    missing = client.post("/api/faq/v1/conversations", json=payload)
    assert missing.status_code == 403

    spoofed = client.post(
        "/api/faq/v1/conversations",
        headers={"Origin": "http://127.0.0.1:4173.attacker.test"},
        json=payload,
    )
    assert spoofed.status_code == 403

    trusted = client.post(
        "/api/faq/v1/conversations",
        headers={"Origin": "http://127.0.0.1:4173"},
        json=payload,
    )
    assert trusted.status_code == 201


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    current_event = ""
    for line in text.splitlines():
        if line.startswith("event: "):
            current_event = line.removeprefix("event: ")
        elif line.startswith("data: "):
            events.append((current_event, json.loads(line.removeprefix("data: "))))
    return events


def test_message_contract_quota_and_idempotent_replay(client_bundle):
    client, dify = client_bundle
    session_id = create_conversation(client)
    payload = {"faqSessionId": session_id, "message": "工作液报警怎么处理？"}

    first = client.post("/api/faq/v1/messages", headers={**WEB_HEADERS, "Idempotency-Key": "request-key-0001"}, json=payload)
    assert first.status_code == 200
    first_events = parse_sse(first.text)
    assert [name for name, _ in first_events] == ["ack", "delta", "citation", "done"]
    assert first_events[-1][1]["remainingQuota"] == 1
    assert "upstream-private-id" not in first.text

    replay = client.post("/api/faq/v1/messages", headers={**WEB_HEADERS, "Idempotency-Key": "request-key-0001"}, json=payload)
    assert replay.status_code == 200
    assert parse_sse(replay.text) == first_events
    assert dify.calls == 1

    quota = client.get("/api/faq/v1/quota", params={"sourceChannel": "website"})
    assert quota.status_code == 200
    assert quota.json() == {"sourceChannel": "website", "used": 1, "limit": 2, "remaining": 1}


def test_idempotency_key_cannot_be_reused_for_another_message(client_bundle):
    client, _ = client_bundle
    session_id = create_conversation(client)
    headers = {**WEB_HEADERS, "Idempotency-Key": "request-key-0002"}
    assert client.post("/api/faq/v1/messages", headers=headers, json={"faqSessionId": session_id, "message": "问题一"}).status_code == 200
    conflict = client.post("/api/faq/v1/messages", headers=headers, json={"faqSessionId": session_id, "message": "问题二"})
    assert conflict.status_code == 409


def test_repair_draft_requires_consent_and_token_is_one_time(client_bundle):
    client, _ = client_bundle
    session_id = create_conversation(client)
    invalid = client.post(
        "/api/faq/v1/handoffs",
        headers=WEB_HEADERS,
        json={"handoffType": "repair_draft", "faqSessionId": session_id, "consentConfirmed": False},
    )
    assert invalid.status_code == 422

    created = client.post(
        "/api/faq/v1/handoffs",
        headers=WEB_HEADERS,
        json={
            "handoffType": "repair_draft",
            "faqSessionId": session_id,
            "consentConfirmed": True,
            "consentUiVersion": "web-faq-v1",
            "repairDraft": {
                "modelCode": "FR-XS",
                "errorCodes": ["E102"],
                "symptomSummary": "开机后工作液报警",
                "attemptedSteps": ["确认液位正常"],
                "knowledgeReferences": [{"id": "KB-12", "title": "工作液检查", "version": "v3"}],
            },
        },
    )
    assert created.status_code == 201
    assert created.json()["expiresIn"] <= 300
    token = created.json()["token"]

    denied = client.post(f"/api/internal/v1/faq-handoffs/{token}/redeem", headers={"X-FAQ-Internal-Key": "wrong"})
    assert denied.status_code == 401

    redeemed = client.post(f"/api/internal/v1/faq-handoffs/{token}/redeem", headers={"X-FAQ-Internal-Key": "internal-test-key"})
    assert redeemed.status_code == 200
    body = redeemed.json()
    assert body["handoffType"] == "repair_draft"
    assert body["sourceChannel"] == "website_faq"
    assert body["modelCode"] == "FR-XS"
    assert body["symptomSummary"] == "开机后工作液报警"
    assert "difyConversationId" not in body

    replay = client.post(f"/api/internal/v1/faq-handoffs/{token}/redeem", headers={"X-FAQ-Internal-Key": "internal-test-key"})
    assert replay.status_code == 410


def test_continue_handoff_contains_no_repair_summary(client_bundle):
    client, _ = client_bundle
    session_id = create_conversation(client, "repair_portal")
    created = client.post(
        "/api/faq/v1/handoffs",
        headers=WEB_HEADERS,
        json={"handoffType": "continue_conversation", "faqSessionId": session_id},
    )
    token = created.json()["token"]
    redeemed = client.post(f"/api/internal/v1/faq-handoffs/{token}/redeem", headers={"X-FAQ-Internal-Key": "internal-test-key"})
    assert redeemed.status_code == 200
    assert redeemed.json()["sourceChannel"] == "repair_portal_faq"
    assert "symptomSummary" not in redeemed.json()


def test_think_filter_removes_split_reasoning_tags():
    filter_ = ThinkFilter()
    output = [
        filter_.feed("公开回答<th"),
        filter_.feed("ink>内部推理"),
        filter_.feed("</thi"),
        filter_.feed("nk>继续回答"),
        filter_.feed("", final=True),
    ]
    assert "".join(output) == "公开回答继续回答"
