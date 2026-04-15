from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Gear (modules / semi-modulars) ─────────────────────────────────────────

class GearBase(BaseModel):
    name: str
    manufacturer: str
    module_type: str                  # e.g. "VCO", "VCF", "sequencer", "semi-modular"
    hp_width: Optional[int] = None    # Eurorack panel width in HP; None for desktop gear
    notes: Optional[str] = None


class GearCreate(GearBase):
    pass


class GearResponse(GearBase):
    id: str


# ── Audio file sub-document ─────────────────────────────────────────────────

class AudioFile(BaseModel):
    object_path: str               # GCS object key
    filename: str
    duration_seconds: Optional[float] = None
    sample_rate_hz: Optional[int] = None
    uploaded_at: Optional[str] = None


# ── Patches ─────────────────────────────────────────────────────────────────

class PatchBase(BaseModel):
    title: str
    description: Optional[str] = None
    gear_ids: list[str] = Field(default_factory=list)   # references to gear docs
    wiring_notes: Optional[str] = None


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