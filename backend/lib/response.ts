import { NextResponse } from "next/server";
import { getFrontendUrl } from "./env";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getFrontendUrl(),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Participant-Token",
  };
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return jsonResponse({ error: message }, status);
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
