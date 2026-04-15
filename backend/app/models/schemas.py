from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Gear (modules / semi-modulars) ─────────────────────────────────────────

class GearBase(BaseModel):
    name: str
    manufacturer: str
    module_type: str
    category: Optional[str] = None
    hp_width: Optional[int] = None
    rack_row: Optional[int] = None
    rack_position: Optional[int] = None
    power_positive: Optional[int] = None
    power_negative: Optional[int] = None
    cv_inputs: Optional[int] = None
    cv_outputs: Optional[int] = None
    audio_inputs: Optional[int] = None
    audio_outputs: Optional[int] = None
    purchase_price: Optional[float] = None
    condition: Optional[str] = None
    notes: Optional[str] = None


class GearCreate(GearBase):
    pass


class GearResponse(GearBase):
    id: str


# ── Audio file sub-document ─────────────────────────────────────────────────

class AudioFile(BaseModel):
    object_path: str
    filename: str
    duration_seconds: Optional[float] = None
    sample_rate_hz: Optional[int] = None
    uploaded_at: Optional[str] = None


# ── Patches ─────────────────────────────────────────────────────────────────

class PatchBase(BaseModel):
    title: str
    description: Optional[str] = None
    gear_ids: list[str] = Field(default_factory=list)
    wiring_notes: Optional[str] = None
    bpm: Optional[int] = None
    key: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class PatchCreate(PatchBase):
    pass


class PatchResponse(PatchBase):
    id: str
    audio_files: list[AudioFile] = Field(default_factory=list)


# ── Upload ───────────────────────────────────────────────────────────────────

class PresignedUrlRequest(BaseModel):
    patch_id: str
    filename: str
    content_type: str = "audio/wav"


class PresignedUrlResponse(BaseModel):
    upload_url: str
    object_path: str


class StreamUrlResponse(BaseModel):
    stream_url: str