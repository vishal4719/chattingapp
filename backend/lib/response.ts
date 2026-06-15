import { NextResponse } from "next/server";

/** CORS is applied in middleware.ts — do not set ACAO here or it overwrites Capacitor origins. */
export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return jsonResponse({ error: message }, status);
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
