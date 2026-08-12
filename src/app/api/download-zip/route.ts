import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getInnertube, extractVideoId, AUDIO_FORMAT_OPTIONS, VIDEO_INFO_OPTIONS } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { urls, zipName } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'En az bir URL gereklidir' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maksimum 50 video indirilebilir' }, { status: 400 });
    }

    const innertube = await getInnertube();
    const zip = new JSZip();
    const failedDownloads: string[] = [];

    // Process downloads in smaller batches to avoid memory issues
    const batchSize = 3;
    let completedCount = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      const batchPromises = batch.map(async (url: string, index: number) => {
        try {
          const videoId = extractVideoId(url);
          if (!videoId) {
            failedDownloads.push(`Geçersiz URL: ${url}`);
            return;
          }

          const info = await innertube.getBasicInfo(videoId, VIDEO_INFO_OPTIONS);
          const title = (info.basic_info.title || 'ses').replace(/[<>:"/\\|?*]/g, '_');

          const stream = await info.download(AUDIO_FORMAT_OPTIONS);
          const buffer = Buffer.from(await new Response(stream).arrayBuffer());

          const fileName = `${String(i + index + 1).padStart(2, '0')} - ${title}.m4a`;
          zip.file(fileName, buffer);
          completedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
          failedDownloads.push(`URL ${i + index + 1}: ${errorMessage}`);
        }
      });

      // Wait for current batch to complete
      await Promise.allSettled(batchPromises);

      // Add a small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (completedCount === 0) {
      return NextResponse.json({
        error: 'Hiçbir video indirilemedi',
        failures: failedDownloads
      }, { status: 400 });
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const fileName = zipName || `YouTube_Audio_${new Date().toISOString().split('T')[0]}.zip`;

    // Return the ZIP file
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Completed-Count': completedCount.toString(),
        'X-Failed-Count': failedDownloads.length.toString(),
        'X-Failures': JSON.stringify(failedDownloads)
      }
    });

  } catch (error) {
    console.error('ZIP download error:', error);
    return NextResponse.json({
      error: 'ZIP dosyası oluşturulurken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata')
    }, { status: 500 });
  }
}
