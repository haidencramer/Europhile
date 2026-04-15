from fastapi import APIRouter, HTTPException
from app.db.firestore import get_db
from app.models.schemas import GearCreate, GearResponse

router = APIRouter()
COLLECTION = "modules"


@router.get("/", response_model=list[GearResponse])
def list_gear():
    db = get_db()
    docs = db.collection(COLLECTION).stream()
    return [GearResponse(id=doc.id, **doc.to_dict()) for doc in docs]


@router.get("/{gear_id}", response_model=GearResponse)
def get_gear(gear_id: str):
    db = get_db()
    doc = db.collection(COLLECTION).document(gear_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Gear not found")
    return GearResponse(id=doc.id, **doc.to_dict())


@router.post("/", response_model=GearResponse, status_code=201)
def create_gear(payload: GearCreate):
    db = get_db()
    ref = db.collection(COLLECTION).document()
    ref.set(payload.model_dump())
    return GearResponse(id=ref.id, **payload.model_dump())


@router.put("/{gear_id}", response_model=GearResponse)
def update_gear(gear_id: str, payload: GearCreate):
    db = get_db()
    ref = db.collection(COLLECTION).document(gear_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Gear not found")
    ref.set(payload.model_dump())
    return GearResponse(id=gear_id, **payload.model_dump())


@router.delete("/{gear_id}", status_code=204)
def delete_gear(gear_id: str):
    db = get_db()
    ref = db.collection(COLLECTION).document(gear_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Gear not found")
    ref.delete()