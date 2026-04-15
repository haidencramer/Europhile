output "backend_url" {
  description = "Cloud Run backend service URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "audio_bucket" {
  description = "Cloud Storage bucket name for WAV files"
  value       = google_storage_bucket.audio.name
}

output "artifact_registry" {
  description = "Artifact Registry repo path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/europhile"
}
