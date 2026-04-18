const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Gear ────────────────────────────────────────────────────────────────────
export const listGear   = ()         => request('/gear/')
export const getGear    = (id)       => request(`/gear/${id}`)
export const createGear = (data)     => request('/gear/', { method: 'POST', body: JSON.stringify(data) })
export const updateGear = (id, data) => request(`/gear/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteGear = (id)       => request(`/gear/${id}`, { method: 'DELETE' })

// ── Patches ─────────────────────────────────────────────────────────────────
export const listPatches  = ()         => request('/patches/')
export const getPatch     = (id)       => request(`/patches/${id}`)
export const createPatch  = (data)     => request('/patches/', { method: 'POST', body: JSON.stringify(data) })
export const updatePatch  = (id, data) => request(`/patches/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deletePatch  = (id)       => request(`/patches/${id}`, { method: 'DELETE' })

// ── Audio ────────────────────────────────────────────────────────────────────
export const getStreamUrl = (objectPath) =>
  request(`/uploads/stream-url?object_path=${encodeURIComponent(objectPath)}`)

export const deleteAudio = (patchId, objectPath) =>
  request('/uploads/audio', {
    method: 'DELETE',
    body: JSON.stringify({ patch_id: patchId, object_path: objectPath }),
  })

export async function uploadAudio(patchId, file) {
  const { upload_url, object_path } = await request('/uploads/presigned-url', {
    method: 'POST',
    body: JSON.stringify({
      patch_id: patchId,
      filename: file.name,
      content_type: file.type || 'audio/wav',
    }),
  })

  const gcsRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'audio/wav' },
    body: file,
  })

  if (!gcsRes.ok) throw new Error('GCS upload failed')
  return object_path
}