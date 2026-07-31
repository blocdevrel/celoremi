import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function jsonOk<T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(data, {
    status,
    ...(extraHeaders ? { headers: extraHeaders } : {}),
  });
}

export function jsonError(error: unknown, fallbackStatus = 500) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.issues },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  const status =
    message.includes("not found") ||
    message.includes("Invalid address") ||
    message.includes("Invalid wallet") ||
    message.includes("Invalid recipient") ||
    message.includes("must sum") ||
    message.includes("must include") ||
    message.includes("AI policy parsing") ||
    message.includes("Provide plain English") ||
    message.includes("needs natural-language")
      ? 400
      : fallbackStatus;
  console.error("[remifi]", message);
  return NextResponse.json({ error: message }, { status });
}
