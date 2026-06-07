function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in backend/.env or Vercel project settings.`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getFrontendUrl(): string {
  return required("FRONTEND_URL").replace(/\/$/, "");
}

export function getJwtSecret(): string {
  return required("JWT_SECRET");
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function getPort(): number {
  const raw = optional("PORT") ?? "3000";
  const port = parseInt(raw, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return port;
}

export function getS3Region(): string {
  return required("S3_REGION");
}

export function getS3Bucket(): string {
  return required("S3_BUCKET");
}

export function getS3AccessKeyId(): string {
  return required("S3_ACCESS_KEY_ID");
}

export function getS3SecretAccessKey(): string {
  return required("S3_SECRET_ACCESS_KEY");
}

export function getS3Prefix(): string {
  return optional("S3_PREFIX") ?? "test-chatbot";
}

export function getMaxUploadBytes(): number {
  const raw = optional("MAX_UPLOAD_BYTES") ?? "26214400";
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid MAX_UPLOAD_BYTES value: ${raw}`);
  }
  return parsed;
}

export function getLiveKitApiKey(): string {
  return required("LIVEKIT_API_KEY");
}

export function getLiveKitApiSecret(): string {
  return required("LIVEKIT_API_SECRET");
}

export function getLiveKitUrl(): string {
  return required("LIVEKIT_URL").replace(/\/$/, "");
}

export function getVapidPublicKey(): string | undefined {
  return optional("VAPID_PUBLIC_KEY");
}

export function getVapidPrivateKey(): string | undefined {
  return optional("VAPID_PRIVATE_KEY");
}

export function getVapidSubject(): string | undefined {
  return optional("VAPID_SUBJECT");
}

export function getApiPublicUrl(): string {
  const explicit = optional("API_PUBLIC_URL");
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = optional("VERCEL_URL");
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  throw new Error(
    "Missing API_PUBLIC_URL. Set it in backend/.env or use Vercel deployment (VERCEL_URL is set automatically)."
  );
}
