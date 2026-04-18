import os
from fastapi import APIRouter, HTTPException
from google.cloud import storage
from app.db.firestore import get_db
from app.models.schemas import PatchCreate, PatchResponse

router = APIRouter()
COLLECTION = "patches"
BUCKET = os.environ.get("GCS_BUCKET", "europhile-cloud-hc-audio")


def delete_patch_audio(patch_id: str):
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET)
        blobs = list(bucket.list_blobs(prefix=f"patches/{patch_id}/"))
        if blobs:
            bucket.delete_blobs(blobs)
    except Exception as e:
        print(f"Warning: failed to delete GCS files for patch {patch_id}: {e}")


@router.get("/", response_model=list[PatchResponse])
def list_patches():
    db = get_db()
    docs = db.collection(COLLECTION).stream()
    return [PatchResponse(id=doc.id, **doc.to_dict()) for doc in docs]


@router.get("/{patch_id}", response_model=PatchResponse)
def get_patch(patch_id: str):
    db = get_db()
    doc = db.collection(COLLECTION).document(patch_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Patch not found")
    return PatchResponse(id=doc.id, **doc.to_dict())


@router.post("/", response_model=PatchResponse, status_code=201)
def create_patch(payload: PatchCreate):
    db = get_db()
    data = payload.model_dump()
    data["audio_files"] = []
    ref = db.collection(COLLECTION).document()
    ref.set(data)
    return PatchResponse(id=ref.id, **data)


@router.put("/{patch_id}", response_model=PatchResponse)
def update_patch(patch_id: str, payload: PatchCreate):
    db = get_db()
    ref = db.collection(COLLECTION).document(patch_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Patch not found")
    existing = doc.to_dict()
    data = payload.model_dump()
    data["audio_files"] = existing.get("audio_files", [])
    ref.set(data)
    return PatchResponse(id=patch_id, **data)


@router.delete("/{patch_id}", status_code=204)
def delete_patch(patch_id: str):
    db = get_db()
    ref = db.collection(COLLECTION).document(patch_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Patch not found")
    delete_patch_audio(patch_id)
    ref.delete()