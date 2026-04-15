variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "europhile-cloud-hc"
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-central1"
}

variable "backend_image" {
  description = "Full Artifact Registry image path for the Cloud Run backend"
  type        = string
  default     = "us-central1-docker.pkg.dev/europhile-cloud-hc/europhile/backend:latest"
}
