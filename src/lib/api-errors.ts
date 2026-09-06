import { NextResponse } from 'next/server';

export async function safeJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function internalServerErrorResponse() {
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
