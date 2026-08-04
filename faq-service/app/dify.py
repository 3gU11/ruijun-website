from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from .config import Settings


class DifyUnavailableError(RuntimeError):
    pass


class ThinkFilter:
    """Remove model reasoning even when tags are split across stream chunks."""

    OPEN = "<think>"
    CLOSE = "</think>"

    def __init__(self) -> None:
        self.buffer = ""
        self.in_think = False

    def feed(self, text: str, final: bool = False) -> str:
        self.buffer += text
        output: list[str] = []
        while self.buffer:
            marker = self.CLOSE if self.in_think else self.OPEN
            position = self.buffer.lower().find(marker)
            if position >= 0:
                if not self.in_think:
                    output.append(self.buffer[:position])
                self.buffer = self.buffer[position + len(marker):]
                self.in_think = not self.in_think
                continue
            if final:
                if not self.in_think:
                    output.append(self.buffer)
                self.buffer = ""
                break
            keep = min(len(self.buffer), len(marker) - 1)
            if not self.in_think and len(self.buffer) > keep:
                output.append(self.buffer[:-keep])
            self.buffer = self.buffer[-keep:] if keep else ""
            break
        return "".join(output)


class DifyGateway:
    def __init__(self, client: httpx.AsyncClient, settings: Settings):
        self.client = client
        self.settings = settings

    async def stream(
        self,
        *,
        message: str,
        conversation_id: str,
        user_reference: str,
        context: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        if not self.settings.dify_configured:
            raise DifyUnavailableError("Dify is not configured")

        payload = {
            "inputs": {
                "source_channel": context.get("sourceChannel", ""),
                "page_type": context.get("pageType", ""),
                "page_slug": context.get("pageSlug", ""),
                "model_code": context.get("modelCode", ""),
            },
            "query": message,
            "response_mode": "streaming",
            "conversation_id": conversation_id,
            "user": user_reference,
        }
        headers = {"Authorization": f"Bearer {self.settings.dify_api_key}", "Content-Type": "application/json"}
        timeout = httpx.Timeout(
            connect=self.settings.dify_connect_timeout_seconds,
            read=self.settings.dify_stream_timeout_seconds,
            write=10.0,
            pool=5.0,
        )
        thought_filter = ThinkFilter()
        async with self.client.stream(
            "POST",
            f"{self.settings.dify_base_url}/chat-messages",
            headers=headers,
            json=payload,
            timeout=timeout,
        ) as response:
            if response.status_code >= 400:
                raise DifyUnavailableError(f"Dify returned HTTP {response.status_code}")
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    event = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                event_name = event.get("event")
                if event_name == "message":
                    clean = thought_filter.feed(str(event.get("answer") or ""))
                    if clean:
                        yield {"type": "delta", "text": clean}
                elif event_name == "message_end":
                    clean = thought_filter.feed("", final=True)
                    if clean:
                        yield {"type": "delta", "text": clean}
                    resources = (event.get("metadata") or {}).get("retriever_resources") or []
                    for resource in resources:
                        yield {
                            "type": "citation",
                            "citation": {
                                "id": str(resource.get("document_id") or resource.get("segment_id") or ""),
                                "title": str(resource.get("document_name") or "知识条目"),
                                "version": str(resource.get("version") or ""),
                            },
                        }
                    yield {
                        "type": "upstream_done",
                        "conversationId": str(event.get("conversation_id") or ""),
                        "messageId": str(event.get("message_id") or ""),
                    }
                elif event_name in {"error", "workflow_finished"} and event.get("status") == "failed":
                    raise DifyUnavailableError("Dify generation failed")

