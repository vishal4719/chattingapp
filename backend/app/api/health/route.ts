import { jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  return jsonResponse({ ok: true, service: "chatapp-backend" });
}
