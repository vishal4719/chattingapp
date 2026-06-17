import { getPushProjectId, isPushConfigured } from "@/lib/push";
import { jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  return jsonResponse({
    enabled: isPushConfigured(),
    provider: "fcm",
    firebaseProjectId: getPushProjectId(),
    expectedAndroidProjectId: "chatapp-692a7",
  });
}
