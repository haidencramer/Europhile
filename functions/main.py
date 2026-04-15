import os
import functions_framework
from google.cloud import firestore, storage
from mutagen.wave import WAVE
import tempfile
import datetime


PROJECT_ID = os.environ.get("PROJECT_ID", "europhile-cloud-hc")


@functions_framework.cloud_event
def extract_metadata(cloud_event):
    """
    Triggered by a Cloud Storage finalize event via Eventarc.
    Downloads the WAV, reads its headers with mutagen, and writes
    duration + sample_rate back into the matching Firestore patch document.

    GCS object path convention: patches/{patch_id}/{filename}
    """
    data = cloud_event.data
    bucket_name = data["bucket"]
    object_path = data["name"]

    # Only process WAV files under patches/
    if not object_path.startswith("patches/") or not object_path.lower().endswith(".wav"):
        print(f"Skipping non-WAV or unexpected path: {object_path}")
        return

    parts = object_path.split("/")
    if len(parts) < 3:
        print(f"Unexpected object path format: {object_path}")
        return

    patch_id = parts[1]
    filename = parts[2]

    print(f"Processing: patch={patch_id}, file={filename}")

    # Download WAV to a temp file and extract metadata
    gcs_client = storage.Client()
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.blob(object_path)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        blob.download_to_filename(tmp.name)
        try:
            audio = WAVE(tmp.name)
            duration = audio.info.length          # seconds (float)
            sample_rate = audio.info.sample_rate  # Hz (int)
        except Exception as e:
            print(f"Failed to parse WAV metadata: {e}")
            return

    print(f"Extracted: duration={duration:.2f}s, sample_rate={sample_rate}Hz")

    # Update the matching audio_file entry in Firestore
    db = firestore.Client(project=PROJECT_ID)
    patch_ref = db.collection("patches").document(patch_id)
    patch_doc = patch_ref.get()

    if not patch_doc.exists:
        print(f"Patch document not found: {patch_id}")
        return

    audio_files = patch_doc.to_dict().get("audio_files", [])
    updated = False

    for entry in audio_files:
        if entry.get("object_path") == object_path:
            entry["duration_seconds"] = round(duration, 3)
            entry["sample_rate_hz"] = sample_rate
            entry["uploaded_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            updated = True
            break

    if updated:
        patch_ref.update({"audio_files": audio_files})
        print(f"Firestore updated for patch {patch_id}")
    else:
        print(f"No matching audio_file entry found for {object_path}")
