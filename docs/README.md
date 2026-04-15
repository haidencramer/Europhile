# Europhile

A personal Eurorack modular and analog synthesizer gear catalogue, patch logger, and audio archive — built on Google Cloud Platform for CSCI Cloud Computing (Spring 2026).

**Live app:** https://europhile-cloud-hc.web.app  
**Backend API:** https://europhile-backend-126066338708.us-central1.run.app/docs  
**GCP Project:** `europhile-cloud-hc`

---

## What it does

Europhile solves a real problem for modular synthesizer musicians: tracking a large collection of hardware modules, documenting the patch configurations you build, and preserving audio recordings tied to those patches. The application lets you:

- Browse and manage your gear catalogue — modules, manufacturers, HP widths, signal types, and notes
- Create patch documents describing how your rack is wired at a given moment, with the specific modules involved
- Upload WAV recordings directly linked to a patch record
- Automatically extract and store audio metadata (duration, sample rate) from every uploaded WAV via a background pipeline — no manual data entry

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Firebase Hosting                      │
│              React SPA · europhile-cloud-hc.web.app      │
└────────────────────────┬────────────────────────────────┘
                         │ REST API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      Cloud Run                           │
│         FastAPI backend · europhile-backend              │
│         /gear  /patches  /uploads                        │
└──────────────┬──────────────────────┬───────────────────┘
               │ read/write           │ generate signed URL
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│      Firestore       │  │       Cloud Storage           │
│  modules/ patches/   │  │   europhile-cloud-hc-audio    │
│  gear + patch docs   │  │   .wav files                  │
└──────────────────────┘  └──────────────┬───────────────┘
         ▲                               │ finalize event
         │ write metadata                │ (Eventarc)
         │                               ▼
         │                  ┌────────────────────────────┐
         │                  │         Pub/Sub             │
         │                  │    topic: audio-uploaded    │
         │                  └──────────────┬─────────────┘
         │                                 │ invoke
         │                                 ▼
         │                  ┌────────────────────────────┐
         └──────────────────│    Cloud Function (2nd gen) │
                            │   extract-audio-metadata    │
                            │   mutagen · WAV headers     │
                            └────────────────────────────┘
```

### Data flow

1. The React SPA is served globally from **Firebase Hosting** via CDN. The frontend is a static bundle with zero server-side logic.

2. All data operations go through the **Cloud Run** FastAPI backend. The backend exposes three routers:
   - `GET/POST/PUT/DELETE /gear/` — gear catalogue CRUD
   - `GET/POST/PUT/DELETE /patches/` — patch document CRUD
   - `POST /uploads/presigned-url` — generates a signed GCS URL and writes a placeholder `audio_file` entry into Firestore

3. Gear and patch documents live in **Firestore** under `modules/` and `patches/` collections. Each patch document embeds an `audio_files` array that holds references to uploaded recordings along with extracted metadata.

4. When a user uploads a WAV, the React client requests a pre-signed URL from the backend, then PUTs the file **directly to Cloud Storage** — bypassing Cloud Run entirely. This keeps large binary uploads off the API container.

5. The Cloud Storage `finalize` event fires an **Eventarc** trigger that publishes to a **Pub/Sub** topic, which invokes the **Cloud Function**.

6. The Cloud Function downloads the WAV, reads its headers using `mutagen` without decoding the full audio stream, and writes `duration_seconds`, `sample_rate_hz`, and `uploaded_at` back into the matching Firestore patch document.

### GCP services

| Service | Role | Why this service |
|---|---|---|
| Firebase Hosting | Static SPA + CDN | Free tier, global edge, zero config HTTPS |
| Cloud Run | FastAPI REST backend | Scale-to-zero, no idle compute cost |
| Firestore | Gear + patch documents | Schemaless, real-time, free tier generous |
| Cloud Storage | WAV file storage | Cheap blob storage, signed URL uploads |
| Pub/Sub | Audio upload event bus | Decouples upload from processing pipeline |
| Cloud Function (2nd gen) | WAV metadata extraction | Event-driven, no always-on compute |
| Artifact Registry | Backend container images | Native GCP Docker registry |

### Firestore schema

```
modules/
  {gear_id}/
    name:          string
    manufacturer:  string
    module_type:   string      # "VCO", "VCF", "sequencer", etc.
    hp_width:      number|null
    notes:         string|null

patches/
  {patch_id}/
    title:         string
    description:   string|null
    wiring_notes:  string|null
    gear_ids:      string[]    # references to modules documents
    audio_files:   array
      - object_path:       string   # GCS key
        filename:          string
        duration_seconds:  number|null
        sample_rate_hz:    number|null
        uploaded_at:       string|null
```

---

## Screenshots

### Gear Catalogue
![Gear Catalogue](docs/screenshots/gear.png)

### Patches
![Patches](docs/screenshots/patches.png)

### Patch Detail with Audio Upload
![Patch Detail](docs/screenshots/patch_detail.png)

### GCP Console — Cloud Run + Functions
![Cloud Run + Functions](docs/screenshots/gcp_cloud_run.png)

### GCP Console — Firestore
![Firestore](docs/screenshots/gcp_firestore.png)



---

## Local development

### Prerequisites

- Python 3.10+
- Node.js 20+
- Google Cloud SDK (`gcloud`)
- Docker Desktop
- Terraform 1.5+

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

$env:PROJECT_ID = "europhile-cloud-hc"
$env:GCS_BUCKET = "europhile-cloud-hc-audio"

uvicorn app.main:app --reload --port 8081
```

API docs available at `http://localhost:8081/docs`

Authenticate with GCP for local Firestore access:

```powershell
gcloud auth application-default login
```

### Frontend

```powershell
cd frontend
npm install
node -e "require('fs').writeFileSync('.env.local', 'VITE_API_URL=http://localhost:8081', 'utf8')"
npm run dev
```

### Cloud Function (local test)

```powershell
cd functions
pip install -r requirements.txt functions-framework
functions-framework --target=extract_metadata --signature-type=cloudevent
```

---

## Deployment

### Infrastructure (Terraform)

All GCP resources are defined in `terraform/main.tf` and managed by Terraform.

```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

Resources provisioned:
- Artifact Registry repository
- Cloud Run service (scale-to-zero, 512Mi, max 3 instances)
- Cloud Storage bucket with 365-day lifecycle rule and CORS config
- Pub/Sub topic for audio upload events
- Cloud Function (2nd gen) with Eventarc GCS trigger
- Service accounts and IAM bindings for Cloud Run and Cloud Function
- All required GCP API enablements

### Backend container

```powershell
gcloud auth configure-docker us-central1-docker.pkg.dev
cd backend
docker build -t us-central1-docker.pkg.dev/europhile-cloud-hc/europhile/backend:latest .
docker push us-central1-docker.pkg.dev/europhile-cloud-hc/europhile/backend:latest
gcloud run services update europhile-backend --image=us-central1-docker.pkg.dev/europhile-cloud-hc/europhile/backend:latest --region=us-central1
```

### Frontend

```powershell
cd frontend
node -e "require('fs').writeFileSync('.env.production', 'VITE_API_URL=https://europhile-backend-126066338708.us-central1.run.app', 'utf8')"
npm run build
firebase deploy --only hosting
```

### Cloud Function

```powershell
cd functions
Compress-Archive -Path main.py, requirements.txt -DestinationPath function-source.zip -Force
gsutil cp function-source.zip gs://europhile-cloud-hc-function-source/function-source.zip
```

---

## Post-mortem: Issues encountered and resolved

### 1. GCP project ID case sensitivity
**Problem:** Initial project ID `europhile-cloud-HC` was rejected — GCP project IDs must be all lowercase.  
**Fix:** Renamed to `europhile-cloud-hc` and ran a global find-and-replace across all config files.

### 2. Firestore database not provisioned before Terraform
**Problem:** The backend hit `404 The database (default) does not exist` on the first API call because Terraform hadn't run yet.  
**Fix:** Created the Firestore database manually via `gcloud firestore databases create --location=us-central1` before running Terraform. Removed the `google_firestore_database` resource from Terraform to avoid conflicts with the pre-existing database.

### 3. Cloud Run image not found on first Terraform apply
**Problem:** Terraform tried to deploy Cloud Run before the Docker image existed in Artifact Registry, causing the service to fail.  
**Fix:** Used a public placeholder image (`us-docker.pkg.dev/cloudrun/container/hello:latest`) in Terraform for the initial apply, then updated Cloud Run to the real image after building and pushing it.

### 4. Cloud Function trigger region mismatch
**Problem:** Terraform failed with `Bucket is in location 'us', but the trigger location is 'us-central1'`. The Cloud Storage bucket was created in the multi-region `US` location but the Eventarc trigger was set to `us-central1`.  
**Fix:** Changed `trigger_region` in the Cloud Function Eventarc config from `var.region` to `"us"` to match the bucket's multi-region location.

### 5. Cloud Storage service agent missing Pub/Sub permissions
**Problem:** Terraform apply failed with `Creating trigger failed — Cloud Storage service agent not being able to read the Cloud Pub/Sub topic`.  
**Fix:** Fetched the GCS service agent email via `gcloud storage service-agent` and granted it `roles/pubsub.publisher` on the project before re-running apply.

### 6. Frontend `.env.production` UTF-16 BOM encoding
**Problem:** Vite was ignoring `.env.production` and falling back to `localhost:8080` in the production bundle. PowerShell's `echo` command saved the file as UTF-16 with a BOM character, which Vite cannot parse.  
**Fix:** Recreated the file using Node.js to guarantee clean UTF-8 encoding:
```powershell
node -e "require('fs').writeFileSync('.env.production', 'VITE_API_URL=...', 'utf8')"
```

---

## Teardown

```powershell
bash cleanup.sh
```

Prompts for project ID confirmation, then runs `terraform destroy` to remove all provisioned infrastructure and deletes container images from Artifact Registry. Always verify in the GCP Console that no services remain active after teardown.

---

## Repository structure

```
europhile/
├── terraform/              # All GCP infrastructure as code
│   ├── main.tf             # Resources: Cloud Run, Storage, Function, IAM
│   ├── variables.tf        # Project ID, region, image path
│   └── outputs.tf          # Backend URL, bucket name, registry path
├── backend/                # Cloud Run FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py         # FastAPI app, CORS, router registration
│       ├── routers/
│       │   ├── gear.py     # GET/POST/PUT/DELETE /gear/
│       │   ├── patches.py  # GET/POST/PUT/DELETE /patches/
│       │   └── uploads.py  # POST /uploads/presigned-url
│       ├── models/
│       │   └── schemas.py  # Pydantic models for all resources
│       └── db/
│           └── firestore.py # Firestore client singleton
├── functions/              # Cloud Function — WAV metadata extraction
│   ├── main.py             # Eventarc handler, mutagen, Firestore write
│   └── requirements.txt
├── frontend/               # React SPA
│   ├── src/
│   │   ├── App.jsx         # Router, nav
│   │   ├── api/client.js   # All fetch calls to Cloud Run
│   │   └── pages/
│   │       ├── GearPage.jsx
│   │       ├── PatchesPage.jsx
│   │       └── PatchDetail.jsx
│   ├── firebase.json
│   └── .firebaserc
├── .github/workflows/
│   └── deploy.yml          # CI/CD: build → Cloud Run → Function → Firebase
├── cleanup.sh              # terraform destroy + Artifact Registry cleanup
└── README.md
```