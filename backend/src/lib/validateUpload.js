// src/lib/validateUpload.js — Validação de magic bytes em uploads
import { fileTypeFromBuffer } from 'file-type'
import fs from 'fs'

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',   // xlsx
  'application/vnd.ms-excel',                                              // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

/**
 * Valida o magic byte de um arquivo no disco.
 * Retorna { valid, detectedType } ou throw.
 */
export async function validateFileMagicBytes(filePath) {
  const buffer = fs.readFileSync(filePath)
  return validateBufferMagicBytes(buffer)
}

/**
 * Valida o magic byte a partir de um Buffer (para memoryStorage / S3 mode).
 * Retorna { valid, detectedType }.
 */
export async function validateBufferMagicBytes(buffer) {
  const fileType = await fileTypeFromBuffer(buffer)

  // Arquivos de texto puro (txt, csv) não possuem magic bytes
  if (!fileType) {
    return { valid: true, detectedType: null }
  }

  if (!ALLOWED_MIMES.has(fileType.mime)) {
    return { valid: false, detectedType: fileType.mime }
  }

  return { valid: true, detectedType: fileType.mime }
}
