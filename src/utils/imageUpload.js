const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Não foi possível converter a imagem')),
      'image/webp',
      quality,
    )
  })
}

export async function optimizeUploadImage(file, options = {}) {
  if (!file || !IMAGE_TYPES.has(file.type)) return file

  const maxDimension = options.maxDimension || 1920
  const targetBytes = options.targetBytes || 900 * 1024
  let bitmap
  let objectUrl
  if (typeof createImageBitmap === 'function') {
    bitmap = await createImageBitmap(file)
  } else {
    objectUrl = URL.createObjectURL(file)
    bitmap = new Image()
    bitmap.src = objectUrl
    await bitmap.decode()
  }
  const sourceWidth = bitmap.width || bitmap.naturalWidth
  const sourceHeight = bitmap.height || bitmap.naturalHeight
  const ratio = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
  let width = Math.max(1, Math.round(sourceWidth * ratio))
  let height = Math.max(1, Math.round(sourceHeight * ratio))
  let quality = 0.82
  let blob

  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context.drawImage(bitmap, 0, 0, width, height)
    blob = await canvasToBlob(canvas, quality)

    if (blob.size <= targetBytes) break
    if (quality > 0.55) quality -= 0.09
    else {
      width = Math.max(1, Math.round(width * 0.82))
      height = Math.max(1, Math.round(height * 0.82))
    }
  }

  bitmap.close?.()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
}
