import os
import datetime
from fastapi import APIRouter, HTTPException
from google.cloud import storage
from pydantic import BaseModel
import google.auth
from google.auth import impersonated_credentials

from app.db.firestore import get_db
from app.models.schemas import PresignedUrlRequest, PresignedUrlResponse, StreamUrlResponse

router = APIRouter()

BUCKET = os.environ.get("GCS_BUCKET", "europhile-cloud-hc-audio")
SERVICE_ACCOUNT = "europhile-cloud-run@europhile-cloud-hc.iam.gserviceaccount.com"


def get_signing_credentials():
    source_credentials, project = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    target_credentials = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=SERVICE_ACCOUNT,
        target_scopes=["https://www.googleapis.com/auth/devstorage.read_write"],
        lifetime=300,
    )
    return target_credentials, project


@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_url(payload: PresignedUrlRequest):
    db = get_db()
    patch_ref = db.collection("patches").document(payload.patch_id)
    if not patch_ref.get().exists:
        raise HTTPException(status_code=404, detail="Patch not found")

    object_path = f"patches/{payload.patch_id}/{payload.filename}"

    target_credentials, project = get_signing_credentials()
    client = storage.Client(credentials=target_credentials, project=project)
    bucket = client.bucket(BUCKET)
    blob = bucket.blob(object_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="PUT",
        content_type=payload.content_type,
        credentials=target_credentials,
    )

    from google.cloud import firestore as _fs
    patch_ref.update({
        "audio_files": _fs.ArrayUnion([{
            "object_path": object_path,
            "filename": payload.filename,
            "duration_seconds": None,
            "sample_rate_hz": None,
            "uploaded_at": None,
        }])
    })

    return PresignedUrlResponse(upload_url=url, object_path=object_path)


@router.get("/stream-url", response_model=StreamUrlResponse)
def get_stream_url(object_path: str):
    target_credentials, project = get_signing_credentials()
    client = storage.Client(credentials=target_credentials, project=project)
    bucket = client.bucket(BUCKET)
    blob = bucket.blob(object_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=60),
        method="GET",
        credentials=target_credentials,
    )

    return StreamUrlResponse(stream_url=url)


class DeleteAudioRequest(BaseModel):
    patch_id: str
    object_path: str


@router.delete("/audio", status_code=204)
def delete_audio(payload: DeleteAudioRequest):
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET)
        blob = bucket.blob(payload.object_path)
        if blob.exists():
            blob.delete()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GCS delete failed: {e}")

    db = get_db()
    patch_ref = db.collection("patches").document(payload.patch_id)
    doc = patch_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Patch not found")

    audio_files = doc.to_dict().get("audio_files", [])
    updated = [af for af in audio_files if af.get("object_path") != payload.object_path]
    patch_ref.update({"audio_files": updated})