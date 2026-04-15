import os
import datetime
from fastapi import APIRouter, HTTPException
from google.cloud import storage

from app.db.firestore import get_db
from app.models.schemas import PresignedUrlRequest, PresignedUrlResponse

router = APIRouter()

BUCKET = os.environ.get("GCS_BUCKET", "europhile-cloud-hc-audio")


@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_url(payload: PresignedUrlRequest):
    """
    Returns a signed GCS URL the client can PUT a WAV file to directly.
    Also creates a placeholder audio_file entry in the patch document so the
    Cloud Function knows which patch to update once metadata is extracted.
    """
    db = get_db()
    patch_ref = db.collection("patches").document(payload.patch_id)
    if not patch_ref.get().exists:
        raise HTTPException(status_code=404, detail="Patch not found")

    object_path = f"patches/{payload.patch_id}/{payload.filename}"

    # Generate signed URL (valid for 15 minutes)
    client = storage.Client()
    bucket = client.bucket(BUCKET)
    blob = bucket.blob(object_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="PUT",
        content_type=payload.content_type,
    )

    # Write placeholder into Firestore so the Cloud Function can look it up
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