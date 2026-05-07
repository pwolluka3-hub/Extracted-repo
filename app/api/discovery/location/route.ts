export const dynamic = "force-dynamic";
// app/api/discovery/location/route.ts
import { NextResponse } from 'next/server';
import { getUserLocation } from '@/lib/services/ipStackService';

export async function GET(request: Request) {
  try {
    // In production, we'd get the client IP from headers
    // For now, we let ipStack handle the current request's IP
    const location = await getUserLocation();
    return NextResponse.json(location);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
