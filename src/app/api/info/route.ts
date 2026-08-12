import { NextRequest, NextResponse } from 'next/server';
import { getInnertube, extractVideoId, toVideoDetails, VIDEO_INFO_OPTIONS } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL gereklidir' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Geçersiz YouTube URL\'si' }, { status: 400 });
    }

    const innertube = await getInnertube();
    const info = await innertube.getBasicInfo(videoId, VIDEO_INFO_OPTIONS);

    return NextResponse.json({ videoDetails: toVideoDetails(info.basic_info, url) });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Video bilgileri alınamadı. YouTube sistemi güncellenmiş olabilir. Lütfen daha sonra tekrar deneyin.'
    }, { status: 500 });
  }
}
