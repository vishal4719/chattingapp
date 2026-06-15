import { NextResponse } from "next/server";
import { resolveCorsOrigin } from "./env";

export function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(requestOrigin),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Participant-Token",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function jsonResponse(
  data: unknown,
  status = 200,
  requestOrigin?: string | null
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(requestOrigin),
  });
}

export function errorResponse(
  message: string,
  status = 400,
  requestOrigin?: string | null
): NextResponse {
  return jsonResponse({ error: message }, status, requestOrigin);
}

export function optionsResponse(requestOrigin?: string | null): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(requestOrigin) });
}
