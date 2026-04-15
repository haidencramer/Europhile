#!/usr/bin/env bash
# cleanup.sh — destroys all Europhile GCP infrastructure
# Run this at the end of the semester to avoid ongoing charges.
# Usage: bash cleanup.sh

set -e

PROJECT_ID="europhile-cloud-hc"
REGION="us-central1"

echo "This will destroy ALL Europhile infrastructure in project: $PROJECT_ID"
read -p "Type the project ID to confirm: " CONFIRM

if [ "$CONFIRM" != "$PROJECT_ID" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "→ Running terraform destroy..."
cd "$(dirname "$0")/terraform"
terraform destroy -auto-approve -var="project_id=$PROJECT_ID"

echo ""
echo "→ Removing Docker images from Artifact Registry..."
gcloud artifacts docker images delete \
  "$REGION-docker.pkg.dev/$PROJECT_ID/europhile/backend" \
  --delete-tags \
  --quiet \
  --project "$PROJECT_ID" || true

echo ""
echo "✓ Teardown complete. All billable resources have been removed."
echo "  Double-check the GCP console to confirm no services remain active."
