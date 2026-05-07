export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getServerProviderStatus } from '@/lib/server/aiProviderProxy';


export async function GET() {
  return NextResponse.json({
    providers: getServerProviderStatus().map(({ id, configured }) => ({ id, configured })),
  });
}
