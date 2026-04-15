from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import gear, patches, uploads

app = FastAPI(
    title="Europhile API",
    description="Personal Eurorack gear catalogue and patch logger",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to Firebase Hosting URL after deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gear.router,    prefix="/gear",    tags=["gear"])
app.include_router(patches.router, prefix="/patches", tags=["patches"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "europhile-backend"}
