// src/lib/storage.js — Factory de armazenamento: S3/R2 em produção, /uploads/ somente em desenvolvimento
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const isProduction = process.env.NODE_ENV === 'production'
const requiredS3Variables = ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']
const missingS3Variables = requiredS3Variables.filter(name => !String(process.env[name] || '').trim())

// Só considera o armazenamento permanente ativo quando todas as credenciais essenciais existem.
export const isS3Enabled = missingS3Variables.length === 0
export const isPersistentStorageReady = isS3Enabled

let s3 = null
if (isS3Enabled) {
  s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  })
} else if (isProduction) {
  console.error(
    `[storage] Armazenamento persistente não configurado. Variáveis ausentes: ${missingS3Variables.join(', ')}. ` +
    'Uploads serão recusados para impedir perda de arquivos após reinícios do servidor.'
  )
}

const UPLOAD_DIR = 'uploads'

if (!isS3Enabled && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export const multerUpload = isS3Enabled
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })
  : multer({
      storage: multer.diskStorage({
        destination: (_, __, cb) => cb(null, UPLOAD_DIR),
        filename: (_, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, unique + path.extname(file.originalname))
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    })

function persistentStorageError(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path) } catch {}
  }
  const error = new Error(
    'O armazenamento permanente de imagens ainda não foi configurado. Tente novamente após a ativação do armazenamento.'
  )
  error.status = 503
  error.code = 'PERSISTENT_STORAGE_NOT_CONFIGURED'
  return error
}

/**
 * Envia um arquivo para S3/R2. O disco local só é permitido em desenvolvimento.
 * Em produção sem S3/R2, a requisição é recusada para que nenhum arquivo seja
 * aceito e posteriormente perdido no filesystem temporário do Render.
 */
export async function uploadFile(file, folder = 'docs') {
  if (!isS3Enabled) {
    if (isProduction) throw persistentStorageError(file)
    return {
      key: `${UPLOAD_DIR}/${file.filename}`,
      url: `/uploads/${file.filename}`,
    }
  }

  const ext = path.extname(file.originalname)
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
  const key = `${folder}/${unique}${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      Metadata: {
        originalName: Buffer.from(file.originalname || 'arquivo').toString('base64').slice(0, 512),
      },
    })
  )

  return { key, url: key }
}

export async function getSignedUrl(key) {
  if (!isS3Enabled) return null
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
  return s3GetSignedUrl(s3, command, { expiresIn: 3600 })
}

export async function deleteFile(key) {
  if (!key) return

  if (!isS3Enabled) {
    if (fs.existsSync(key)) fs.unlinkSync(key)
    return
  }

  await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
}

export function storageKeyFromUrl(url) {
  if (!url) return null
  if (url.startsWith('/uploads/')) return url.slice(1)
  return url
}
