// Shrinks a phone photo before upload: a 12MP camera shot is 4-8MB, which is slow
// (and costly) on campus mobile data. Output: JPEG, longest side <= maxSide.
export const MAX_PHOTO_MB = 8

export async function compressImage(file, { maxSide = 1600, quality = 0.82 } = {}) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    // Already small enough: don't re-encode (avoids making it bigger or blurrier).
    if (ratio === 1 && file.size < 600 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // unsupported format (e.g. HEIC on some browsers): let the server deal with it
  }
}

export const formatBytes = (n) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
