import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { urls, zipName } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'En az bir URL gereklidir' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maksimum 50 video indirilebilir' }, { status: 400 });
    }

    const zip = new JSZip();
    const failedDownloads: string[] = [];

    // Process downloads in smaller batches to avoid memory issues
    const batchSize = 3;
    let completedCount = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url: string, index: number) => {
        try {
          if (!ytdl.validateURL(url)) {
            failedDownloads.push(`Geçersiz URL: ${url}`);
            return null;
          }

          // Get video info first to get the title
          const info = await ytdl.getInfo(url, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            }
          });

          const title = info.videoDetails.title.replace(/[<>:"/\\|?*]/g, '_');
          
          // Get audio stream
          const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
          
          if (audioFormats.length === 0) {
            failedDownloads.push(`${title}: Ses formatı bulunamadı`);
            return null;
          }

          // Use best quality audio format
          const selectedFormat = audioFormats[0];

          const stream = ytdl.downloadFromInfo(info, { format: selectedFormat });
          const chunks: Buffer[] = [];

          return new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            stream.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const fileName = `${String(i + index + 1).padStart(2, '0')} - ${title}.m4a`;
              zip.file(fileName, buffer);
              completedCount++;
              resolve();
            });

            stream.on('error', (error: Error) => {
              failedDownloads.push(`${title}: ${error.message}`);
              reject(error);
            });
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
          failedDownloads.push(`URL ${i + index + 1}: ${errorMessage}`);
          return null;
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
