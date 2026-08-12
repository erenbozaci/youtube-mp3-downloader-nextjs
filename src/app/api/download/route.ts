import { NextRequest, NextResponse } from 'next/server';
import { getInnertube, extractVideoId, AUDIO_FORMAT_OPTIONS, VIDEO_INFO_OPTIONS } from '@/lib/youtube';

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
    const title = (info.basic_info.title || 'ses').replace(/[^\w\s-]/gi, ''); // Remove special characters

    // chooseFormat mirrors download()'s internal selection so we can read content_length for the response headers
    const format = info.chooseFormat(AUDIO_FORMAT_OPTIONS);
    const stream = await info.download(AUDIO_FORMAT_OPTIONS);

    const headers = new Headers({
      'Content-Type': 'audio/mp4',
      'Content-Disposition': `attachment; filename="${title}.m4a"`,
    });
    if (format.content_length) {
      headers.set('Content-Length', String(format.content_length));
    }

    return new Response(stream, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({
      error: 'İndirme başarısız. YouTube sistemi güncellenmiş olabilir. Lütfen daha sonra tekrar deneyin.'
    }, { status: 500 });
  }
}
