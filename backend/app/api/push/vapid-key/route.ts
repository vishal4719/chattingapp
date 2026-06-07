import { getPublicVapidKey, isPushConfigured } from "@/lib/push";
import { jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  if (!isPushConfigured()) {
    return jsonResponse({ enabled: false, publicKey: null });
  }

  return jsonResponse({
    enabled: true,
    publicKey: getPublicVapidKey(),
  });
}
