from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SourceChannel(StrEnum):
    WEBSITE = "website"
    REPAIR_PORTAL = "repair_portal"


class HandoffType(StrEnum):
    CONTINUE = "continue_conversation"
    REPAIR_DRAFT = "repair_draft"


class PageContext(BaseModel):
    page_type: Annotated[str, Field(alias="pageType", max_length=40)] = "general"
    page_slug: Annotated[str, Field(alias="pageSlug", max_length=120)] = ""
    model_code: Annotated[str, Field(alias="modelCode", max_length=80)] = ""

    model_config = {"populate_by_name": True, "extra": "forbid"}


class ConversationRequest(BaseModel):
    source_channel: Annotated[SourceChannel, Field(alias="sourceChannel")]
    context: PageContext = Field(default_factory=PageContext)
    faq_session_id: Annotated[str | None, Field(alias="faqSessionId", min_length=20, max_length=80)] = None

    model_config = {"populate_by_name": True, "extra": "forbid"}


class MessageRequest(BaseModel):
    faq_session_id: Annotated[str, Field(alias="faqSessionId", min_length=20, max_length=80)]
    message: Annotated[str, Field(min_length=1, max_length=2_000)]
    context: PageContext | None = None

    model_config = {"populate_by_name": True, "extra": "forbid"}

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


class FeedbackRequest(BaseModel):
    faq_session_id: Annotated[str, Field(alias="faqSessionId", min_length=20, max_length=80)]
    request_id: Annotated[str, Field(alias="requestId", min_length=8, max_length=80)]
    helpful: bool
    reason: Annotated[str, Field(max_length=120)] = ""
    escalate_to_human: Annotated[bool, Field(alias="escalateToHuman")] = False

    model_config = {"populate_by_name": True, "extra": "forbid"}


class KnowledgeReference(BaseModel):
    id: Annotated[str, Field(max_length=120)]
    title: Annotated[str, Field(max_length=240)]
    version: Annotated[str, Field(max_length=40)] = ""


class RepairDraft(BaseModel):
    model_code: Annotated[str, Field(alias="modelCode", max_length=80)] = ""
    error_codes: Annotated[list[str], Field(alias="errorCodes", max_length=20)] = Field(default_factory=list)
    symptom_summary: Annotated[str, Field(alias="symptomSummary", min_length=1, max_length=1_000)]
    attempted_steps: Annotated[list[str], Field(alias="attemptedSteps", max_length=20)] = Field(default_factory=list)
    knowledge_references: Annotated[list[KnowledgeReference], Field(alias="knowledgeReferences", max_length=20)] = Field(default_factory=list)

    model_config = {"populate_by_name": True, "extra": "forbid"}


class HandoffRequest(BaseModel):
    handoff_type: Annotated[HandoffType, Field(alias="handoffType")]
    faq_session_id: Annotated[str, Field(alias="faqSessionId", min_length=20, max_length=80)]
    consent_confirmed: Annotated[bool, Field(alias="consentConfirmed")] = False
    consent_ui_version: Annotated[str, Field(alias="consentUiVersion", max_length=40)] = ""
    repair_draft: Annotated[RepairDraft | None, Field(alias="repairDraft")] = None

    model_config = {"populate_by_name": True, "extra": "forbid"}

    @model_validator(mode="after")
    def validate_draft_consent(self) -> "HandoffRequest":
        if self.handoff_type == HandoffType.REPAIR_DRAFT:
            if not self.consent_confirmed or not self.consent_ui_version or self.repair_draft is None:
                raise ValueError("repair_draft requires explicit consent, UI version and a structured draft")
        elif self.repair_draft is not None:
            raise ValueError("continue_conversation cannot contain a repair draft")
        return self


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

