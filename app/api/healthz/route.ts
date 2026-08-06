import { NextResponse } from "next/server";

/** Fast liveness probe for Railway — no chain/RPC/config side effects. */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
