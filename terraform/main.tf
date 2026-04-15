terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── Enable required APIs ────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "pubsub.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "eventarc.googleapis.com",
    "firebase.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ── Artifact Registry ───────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "europhile" {
  repository_id = "europhile"
  location      = var.region
  format        = "DOCKER"
  description   = "Europhile backend container images"
  depends_on    = [google_project_service.apis]
}

# ── Service account for Cloud Run ──────────────────────────────────────────
resource "google_service_account" "cloud_run" {
  account_id   = "europhile-cloud-run"
  display_name = "Europhile Cloud Run SA"
}

resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ── Cloud Run (FastAPI backend) ─────────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend" {
  name     = "europhile-backend"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.audio.name
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated access to Cloud Run (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Firestore database was created manually via gcloud before Terraform apply.
# It is intentionally not managed here to avoid conflicts.


# ── Cloud Storage bucket (WAV files) ───────────────────────────────────────
resource "google_storage_bucket" "audio" {
  name                        = "${var.project_id}-audio"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition { age = 365 }
    action    { type = "Delete" }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# ── Pub/Sub topic (audio upload events) ────────────────────────────────────
resource "google_pubsub_topic" "audio_uploaded" {
  name       = "audio-uploaded"
  depends_on = [google_project_service.apis]
}

# ── Service account for Cloud Function ─────────────────────────────────────
resource "google_service_account" "function" {
  account_id   = "europhile-function"
  display_name = "Europhile Cloud Function SA"
}

resource "google_project_iam_member" "function_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.function.email}"
}

resource "google_project_iam_member" "function_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.function.email}"
}

# ── Cloud Function source bundle in GCS ────────────────────────────────────
resource "google_storage_bucket" "function_source" {
  name          = "${var.project_id}-function-source"
  location      = "US"
  force_destroy = true
}

resource "google_storage_bucket_object" "function_zip" {
  name   = "function-source.zip"
  bucket = google_storage_bucket.function_source.name
  source = "${path.module}/../functions/function-source.zip"
}

# ── Cloud Function (2nd gen) ────────────────────────────────────────────────
resource "google_cloudfunctions2_function" "extract_metadata" {
  name     = "extract-audio-metadata"
  location = var.region

  build_config {
    runtime     = "python311"
    entry_point = "extract_metadata"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_zip.name
      }
    }
  }

  service_config {
    min_instance_count    = 0
    max_instance_count    = 5
    available_memory      = "256M"
    timeout_seconds       = 60
    service_account_email = google_service_account.function.email

    environment_variables = {
      PROJECT_ID = var.project_id
    }
  }

  event_trigger {
    trigger_region = "us"
    event_type     = "google.cloud.storage.object.v1.finalized"
    retry_policy   = "RETRY_POLICY_RETRY"

    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.audio.name
    }
  }

  depends_on = [google_project_service.apis]
}
