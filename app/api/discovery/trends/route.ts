export const dynamic = "force-dynamic";
// app/api/discovery/trends/route.ts
import { NextResponse } from 'next/server';
import { fetchTrendingNews } from '@/lib/services/mediaStackService';
import { searchTrends } from '@/lib/services/serpStackService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'AI trends';
  const country = searchParams.get('country') || 'us';

  try {
    const [news, search] = await Promise.all([
      fetchTrendingNews(query, country),
      searchTrends(query),
    ]);

    return NextResponse.json({
      trends: news,
      search: search,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
