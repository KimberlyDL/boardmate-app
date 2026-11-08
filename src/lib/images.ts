/**
 * Shrinking big photos before they are uploaded. A phone camera photo is often
 * 4–12 MB, over the server's 5 MB limit and slow on mobile data; resized to at
 * most 2560 px on its longest side as a JPEG it is a few hundred KB and still
 * sharp enough for a receipt or a repair. PDFs and small files are left as they are.
 */

/** Photos above this size are resized. */
export const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024
export const MAX_SIDE = 2560
const QUALITY = 0.85
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** A smaller JPEG of a big photo, or the same file when it is small, not a photo, or cannot be read. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!PHOTO_TYPES.includes(file.type) || file.size <= SHRINK_ABOVE_BYTES || typeof createImageBitmap !== 'function') return file
  try {
    // Turned the way the camera held it (EXIF orientation), as the photo is shown.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // A see-through PNG gets a white background instead of black.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}

/** The same form with every big photo shrunk; other fields keep their order and values. */
export async function shrinkPhotosIn(form: FormData): Promise<FormData> {
  const entries: [string, FormDataEntryValue][] = []
  form.forEach((value, key) => entries.push([key, value]))
  if (!entries.some(([, v]) => v instanceof File && v.size > SHRINK_ABOVE_BYTES)) return form
  const out = new FormData()
  for (const [key, value] of entries) {
    if (value instanceof File) {
      const file = await shrinkPhoto(value)
      out.append(key, file, file.name)
    } else {
      out.append(key, value)
    }
  }
  return out
}
