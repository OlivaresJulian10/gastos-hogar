import { supabase } from './supabase'

/**
 * Upload a factura file to Storage with real XHR progress.
 * Returns { url, path } on success.
 */
export async function uploadFactura(gastoId, file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${gastoId}.${ext}`

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const uploadUrl = `${supabaseUrl}/storage/v1/object/facturas/${path}`

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`))
    }
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.send(file)
  })

  const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
  return { url: `${publicUrl}?t=${Date.now()}`, path }
}

/** Extract storage path from a factura public URL */
export function facturaPath(url) {
  if (!url) return null
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/facturas/')
    return parts.length >= 2 ? parts[1] : null
  } catch {
    return null
  }
}

/** Delete a factura from Storage given its public URL */
export async function deleteFactura(url) {
  const path = facturaPath(url)
  if (!path) return
  await supabase.storage.from('facturas').remove([path])
}

export const FACTURA_MAX_MB = 10
export const FACTURA_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

export function validateFactura(file) {
  if (!file) return null
  const ok = file.type.startsWith('image/') || file.type === 'application/pdf'
  if (!ok) return 'Solo se permiten imágenes (JPG, PNG, WebP) o PDF.'
  if (file.size > FACTURA_MAX_MB * 1024 * 1024) return `El archivo no puede superar ${FACTURA_MAX_MB} MB.`
  return null
}

export function isImage(url) {
  if (!url) return false
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)
}
