const fs = require('fs')
const path = require('path')
const { uploadFile, deleteFile, isR2Reference, accessUrl } = require('../services/r2Storage')

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads')

function localPath(reference) {
  if (!reference?.startsWith('/uploads/')) return null
  const relative = reference.replace(/^\/uploads\//, '')
  const resolved = path.resolve(uploadsRoot, relative)
  return resolved.startsWith(`${uploadsRoot}${path.sep}`) ? resolved : null
}

async function saveUploadedFile(file, folder, localReference) {
  const r2Reference = await uploadFile(file, folder)
  if (!r2Reference) return localReference
  if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
  return r2Reference
}

async function removeStoredFile(reference) {
  if (!reference) return
  if (isR2Reference(reference)) {
    await deleteFile(reference)
    return
  }
  const filePath = localPath(reference)
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

async function storedFileResponse(reference) {
  return {
    reference,
    access_url: await accessUrl(reference),
  }
}

module.exports = { localPath, saveUploadedFile, removeStoredFile, storedFileResponse }
