import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { MessageType } from "@prisma/client";
import {
  getMaxUploadBytes as getMaxUploadBytesFromEnv,
  getS3AccessKeyId,
  getS3Bucket,
  getS3Prefix,
  getS3Region,
  getS3SecretAccessKey,
} from "./env";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
]);

const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getS3Region(),
      credentials: {
        accessKeyId: getS3AccessKeyId(),
        secretAccessKey: getS3SecretAccessKey(),
      },
    });
  }
  return s3Client;
}

const EXTENSION_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

export function resolveMimeType(fileName: string, mimeType: string): string {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }

  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return EXTENSION_MIME[ext] ?? mimeType;
}

export function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "unknown";
}

export function inferMessageType(mimeType: string): MessageType {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

export function getMaxUploadBytes(): number {
  return getMaxUploadBytesFromEnv();
}

export function validateUploadFile(
  mimeType: string,
  fileSize: number
): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return "File type not allowed. Supported: images, videos, PDF, Office docs, text, zip.";
  }

  const maxBytes = getMaxUploadBytes();
  if (fileSize > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return `File too large. Maximum size is ${maxMb} MB.`;
  }

  return null;
}

export function buildS3Key(
  groupTitle: string,
  senderName: string,
  fileName: string
): string {
  const prefix = getS3Prefix();
  const safeGroup = sanitizePathSegment(groupTitle);
  const safeSender = sanitizePathSegment(senderName);
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${prefix}/${safeGroup}/${safeSender}/${randomUUID()}-${safeFileName}`;
}

export async function uploadChatFile(params: {
  groupTitle: string;
  senderName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ s3Key: string; fileName: string; mimeType: string; fileSize: number }> {
  const bucket = getS3Bucket();

  const validationError = validateUploadFile(params.mimeType, params.buffer.length);
  if (validationError) {
    throw new Error(validationError);
  }

  const s3Key = buildS3Key(params.groupTitle, params.senderName, params.fileName);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: params.buffer,
      ContentType: params.mimeType,
    })
  );

  return {
    s3Key,
    fileName: params.fileName,
    mimeType: params.mimeType,
    fileSize: params.buffer.length,
  };
}

export async function getAttachmentUrl(s3Key: string): Promise<string> {
  const bucket = getS3Bucket();

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
    { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
  );
}

export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface MessagePayload {
  id: string;
  content: string;
  type: MessageType;
  createdAt: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  attachmentUrl?: string;
  status?: MessageStatus;
  participant: { id: string; displayName: string };
}

export async function formatMessagePayload(message: {
  id: string;
  content: string;
  type: MessageType;
  createdAt: Date;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  s3Key: string | null;
  participant: { id: string; displayName: string };
}): Promise<MessagePayload> {
  const payload: MessagePayload = {
    id: message.id,
    content: message.content,
    type: message.type,
    createdAt: message.createdAt.toISOString(),
    participant: message.participant,
  };

  if (message.s3Key) {
    payload.fileName = message.fileName;
    payload.mimeType = message.mimeType;
    payload.fileSize = message.fileSize;
    payload.attachmentUrl = await getAttachmentUrl(message.s3Key);
  }

  return payload;
}

export function formatLastMessagePreview(message: {
  content: string;
  type: MessageType;
  fileName: string | null;
}): string {
  switch (message.type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "DOCUMENT":
      return message.fileName ? `📎 ${message.fileName}` : "Document";
    default:
      return message.content;
  }
}
