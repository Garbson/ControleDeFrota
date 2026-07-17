const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const R2_PREFIX = 'r2://'

let client = null

function isConfigured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_FILES_BUCKET
  )
}

function getClient() {
  if (!isConfigured()) return null
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}

function isR2Reference(value) {
  return typeof value === 'string' && value.startsWith(R2_PREFIX)
}

function keyFromReference(value) {
  return isR2Reference(value) ? value.slice(R2_PREFIX.length) : null
}

function createObjectKey(folder, filename) {
  const extension = path.extname(filename || '').toLowerCase() || '.bin'
  const date = new Date()
  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${folder}/${year}/${month}/${randomUUID()}${extension}`
}

async function uploadFile(file, folder) {
  const s3 = getClient()
  if (!s3) return null

  const key = createObjectKey(folder, file.originalname || file.filename)
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_FILES_BUCKET,
    Key: key,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype || 'application/octet-stream',
    Metadata: {
      originalname: encodeURIComponent(file.originalname || file.filename || ''),
    },
  }))
  await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_FILES_BUCKET, Key: key }))
  return `${R2_PREFIX}${key}`
}

async function deleteFile(reference) {
  if (!isR2Reference(reference)) return false
  const s3 = getClient()
  if (!s3) throw new Error('R2 não configurado')
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.R2_FILES_BUCKET,
    Key: keyFromReference(reference),
  }))
  return true
}

async function accessUrl(reference, expiresIn = 900) {
  if (!reference) return null
  if (!isR2Reference(reference)) return reference
  const s3 = getClient()
  if (!s3) return null
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.R2_FILES_BUCKET,
      Key: keyFromReference(reference),
    }),
    { expiresIn }
  )
}

async function attachAccessUrls(rows, fields) {
  await Promise.all(rows.map(async row => {
    await Promise.all(fields.map(async field => {
      row[`${field.replace('_url', '')}_access_url`] = await accessUrl(row[field])
    }))
  }))
  return rows
}

function resetClientForTests() {
  client = null
}

module.exports = {
  R2_PREFIX,
  isConfigured,
  getClient,
  isR2Reference,
  keyFromReference,
  createObjectKey,
  uploadFile,
  deleteFile,
  accessUrl,
  attachAccessUrls,
  resetClientForTests,
}
