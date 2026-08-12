import { NextRequest, NextResponse } from 'next/server';
import { YTNodes } from 'youtubei.js';
import { getInnertube, extractPlaylistId, toVideoDetails, type VideoDetails, getResilientBasicInfo } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL gereklidir' }, { status: 400 });
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return NextResponse.json({ error: 'Geçersiz playlist URL\'si' }, { status: 400 });
    }

    try {
      const innertube = await getInnertube();
      const playlist = await innertube.getPlaylist(playlistId);

      // Playlist items can come back as either shape depending on YouTube's rollout;
      // grab just the video id from each and re-fetch full details ourselves.
      const videoIds: string[] = [];
      for (const item of playlist.items) {
        if (item.is(YTNodes.PlaylistVideo)) {
          videoIds.push(item.id);
        } else if (item.is(YTNodes.LockupView) && item.content_type === 'VIDEO') {
          videoIds.push(item.content_id);
        }
      }

      const uniqueVideoIds = [...new Set(videoIds)].slice(0, 50);

      if (uniqueVideoIds.length === 0) {
        return NextResponse.json({ error: 'Playlist\'te video bulunamadı' }, { status: 400 });
      }

      const playlistTitle = playlist.info.title || 'Bilinmeyen Playlist';
      const videos: VideoDetails[] = [];

      // Get info for each video (limit concurrent requests)
      const batchSize = 5;
      for (let i = 0; i < uniqueVideoIds.length; i += batchSize) {
        const batch = uniqueVideoIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (videoId) => {
          try {
            const info = await getResilientBasicInfo(innertube, videoId);
            return toVideoDetails(info.basic_info, `https://www.youtube.com/watch?v=${videoId}`);
          } catch (error) {
            console.error(`Error fetching info for video ${videoId}:`, error);
            return null;
          }
        }));

        videos.push(...batchResults.filter((video): video is VideoDetails => video !== null));

        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < uniqueVideoIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (videos.length === 0) {
        return NextResponse.json({ error: 'Playlist\'teki hiçbir video için bilgi alınamadı' }, { status: 400 });
      }

      return NextResponse.json({
        title: playlistTitle,
        videos: videos,
        totalVideos: videos.length
      });

    } catch (error) {
      console.error('Playlist processing error:', error);
      return NextResponse.json({
        error: 'Playlist bilgileri alınamadı. Playlist genel erişime açık olduğundan emin olun.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Playlist bilgileri alınamadı'
    }, { status: 500 });
  }
}
