# Europhile

A personal Eurorack modular and analog synthesizer gear catalogue, patch logger, and audio archive — built on Google Cloud Platform.

## Architecture

```
Firebase Hosting (React SPA)
        │  REST API calls
        ▼
  Cloud Run (FastAPI)
   │              │
   ▼              ▼
Firestore    Cloud Storage (.wav files)
                   │
                   │ finalize event (Eventarc)
                   ▼
              Pub/Sub topic
                   │
                   ▼
          Cloud Function (2nd gen)
          extracts WAV metadata
          writes back to Firestore
```

### Data flow

1. The React SPA is served globally from **Firebase Hosting**.
2. All data operations go through the **Cloud Run** FastAPI backend (`/gear`, `/patches`, `/uploads`).
3. Gear and patch documents — including wiring notes and audio file references — live in **Firestore** under `modules/` and `patches/` collections.
4. When a user uploads a WAV recording, the client first requests a pre-signed URL from the backend, then PUTs the file directly to **Cloud Storage**, bypassing Cloud Run entirely.
5. The Cloud Storage `finalize` event fires an **Eventarc** trigger which publishes to a **Pub/Sub** topic, invoking the **Cloud Function**.
6. The Cloud Function downloads the WAV, reads its headers with `mutagen` (no full decode), and writes `duration_seconds` and `sample_rate_hz` back into the Firestore patch document.

### GCP services used

| Service | Role |
|---|---|
| Firebase Hosting | Static SPA hosting + CDN |
| Cloud Run | FastAPI REST backend |
| Firestore | Gear catalogue + patch documents |
| Cloud Storage | WAV file storage |
| Pub/Sub | Audio upload event bus |
| Cloud Function (2nd gen) | WAV metadata extraction |
| Artifact Registry | Backend container images |

## Local development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export PROJECT_