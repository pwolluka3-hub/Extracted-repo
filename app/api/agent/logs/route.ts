export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { logService } from '@/lib/services/logService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent_id, status, message, plan_id, step_id, metadata, secret } = body;

    // 1. Basic Security Check
    if (secret !== process.env.N8N_BRIDGE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!agent_id || !status || !message) {
      return NextResponse.json({ error: 'Missing required fields (agent_id, status, message)' }, { status: 400 });
    }

    // 2. Log the event
    await logService.logEvent({
      agent_id,
      status,
      message,
      plan_id,
      step_id,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/agent/logs] Error processing log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
