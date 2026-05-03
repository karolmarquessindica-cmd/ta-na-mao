// src/lib/storage.js — Factory de armazenamento: S3/R2 em prod, /uploads/ local em dev
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

// ─── Detecção do modo ──────────────────────────────────────────────────────────
export const isS3Enabled = !!process.env.S3_BUCKET

// ─── Cliente S3 (criado apenas se configurado) ────────────────────────────────
let s3 = null
if (isS3Enabled) {
  s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    // S3_ENDPOINT permite compatibilidade com Cloudflare R2 / MinIO
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    // forcePathStyle necessário para R2 / MinIO (endpoint customizado)
    forcePathStyle: !!process.env.S3_ENDPOINT,
  })
}

// ─── Multer: memoryStorage (S3) ou diskStorage (local) ───────────────────────
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

// ─── uploadFile ───────────────────────────────────────────────────────────────
/**
 * Faz upload de um arquivo para S3/R2 ou mantém no disco local.
 *
 * S3 mode : file deve ter { buffer, originalname, mimetype, size }  (memoryStorage)
 * Local   : file deve ter { filename }                               (diskStorage)
 *
 * @param {object} file   - objeto multer
 * @param {string} folder - pasta no bucket (ex: 'docs', 'fotos', 'comprovantes')
 * @returns {{ key: string, url: string }}
 *   key : identificador de armazenamento (usado em deleteFile / getSignedUrl)
 *   url : URL relativa (local) ou chave S3 — use getSignedUrl(key) para download
 */
export async function uploadFile(file, folder = 'docs') {
  if (!isS3Enabled) {
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
    })
  )

  // Em S3 mode, o campo `url` armazena a chave S3 (sem "/uploads/")
  // O frontend deve chamar GET /download para obter a URL pré-assinada
  return { key, url: key }
}

// ─── getSignedUrl ─────────────────────────────────────────────────────────────
/**
 * Gera URL pré-assinada válida por 1 hora.
 * Retorna null se S3 não estiver habilitado.
 *
 * @param {string} key - chave S3 (ex: 'docs/123.pdf')
 * @returns {Promise<string|null>}
 */
export async function getSignedUrl(key) {
  if (!isS3Enabled) return null
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
  return s3GetSignedUrl(s3, command, { expiresIn: 3600 })
}

// ─── deleteFile ───────────────────────────────────────────────────────────────
/**
 * Remove um arquivo do S3 ou do disco local.
 *
 * @param {string} key
 *   S3   : chave do objeto (ex: 'docs/123.pdf')
 *   Local: caminho relativo ao processo (ex: 'uploads/123.pdf')
 */
export async function deleteFile(key) {
  if (!key) return

  if (!isS3Enabled) {
    if (fs.existsSync(key)) fs.unlinkSync(key)
    return
  }

  await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Extrai a chave de armazenamento a partir da url salva no banco.
 *   Local: '/uploads/file.pdf'  → 'uploads/file.pdf'
 *   S3   : 'docs/file.pdf'      → 'docs/file.pdf'
 */
export function storageKeyFromUrl(url) {
  if (!url) return null
  if (url.startsWith('/uploads/')) return url.slice(1) // remove leading '/'
  return url // já é chave S3
}
