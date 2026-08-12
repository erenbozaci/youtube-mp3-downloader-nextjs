import { Innertube, Platform } from 'youtubei.js';

// youtubei.js ships a stub JS evaluator that throws by default (deciphering
// streaming URLs means running YouTube's own obfuscated player script).
// `new Function` is the library's own documented way to opt in; the script
// being evaluated always originates from YouTube's player, not user input.
Platform.shim.eval = (data) => new Function(data.output)();

let innertubePromise: Promise<Innertube> | null = null;

// Innertube.create() fetches YouTube's player config; caching the instance
// avoids repeating that on every request while a serverless function stays warm.
export function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create().catch((error) => {
      innertubePromise = null;
      throw error;
    });
  }
  return innertubePromise;
}

// The WEB/ANDROID clients now require a BotGuard-issued PoToken to fetch actual
// media bytes (YouTube's SABR rollout); IOS still serves direct, playable URLs
// without one, so we use it for every call that touches streaming data.
const IOS_CLIENT = { client: 'IOS' } as const;

export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

export interface VideoDetails {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  viewCount: string;
  url: string;
}

interface BasicInfoLike {
  title?: string;
  duration?: number;
  author?: string;
  view_count?: number;
  channel?: { name: string } | null;
  thumbnail?: { url: string }[];
}

export function toVideoDetails(basicInfo: BasicInfoLike, url: string): VideoDetails {
  const thumbnails = basicInfo.thumbnail ?? [];
  const thumbnail = thumbnails[thumbnails.length - 1]?.url ?? thumbnails[0]?.url ?? '/placeholder-thumbnail.jpg';

  return {
    title: basicInfo.title || 'Bilinmeyen Video',
    thumbnail,
    duration: String(basicInfo.duration ?? 0),
    author: basicInfo.author || basicInfo.channel?.name || 'Bilinmeyen',
    viewCount: String(basicInfo.view_count ?? 0),
    url,
  };
}

interface VideoInfoLike {
  basic_info: BasicInfoLike;
  playability_status?: { status: string; reason: string } | null;
}

// YouTube sometimes answers a request with a stripped-down, technically-successful
// response (empty title/duration) instead of an error — seen from datacenter IPs
// like those Netlify Functions run from. Treat that as a failure instead of quietly
// showing placeholder text as if it were the real video.
export function assertVideoAvailable(info: VideoInfoLike, videoId: string): void {
  if (info.basic_info.title) return;

  const status = info.playability_status;
  console.error('Empty basic_info from youtubei.js for video', videoId, 'playability_status:', status);
  throw new Error(
    status?.reason
      ? `Video bilgisi alınamadı (${status.status}: ${status.reason})`
      : 'Video bilgisi alınamadı: YouTube boş yanıt döndürdü'
  );
}

export const VIDEO_INFO_OPTIONS = IOS_CLIENT;

// Metadata (unlike streaming) doesn't need IOS specifically — if IOS looks
// suspicious from a given IP and comes back empty, try other clients before
// giving up. Only used where we don't also need a downloadable stream from
// the same response (i.e. not the download routes).
const METADATA_CLIENT_FALLBACKS = ['IOS', 'ANDROID', 'WEB'] as const;

export async function getResilientBasicInfo(innertube: Innertube, videoId: string) {
  let lastError: unknown;

  for (const client of METADATA_CLIENT_FALLBACKS) {
    try {
      const info = await innertube.getBasicInfo(videoId, { client });
      if (info.basic_info.title) return info;
      lastError = new Error(`${client}: boş yanıt (${info.playability_status?.status ?? 'bilinmeyen'})`);
    } catch (error) {
      lastError = error;
    }
  }

  console.error('All clients returned empty/failed for video', videoId, lastError);
  throw lastError instanceof Error ? lastError : new Error('Video bilgisi alınamadı');
}

export const AUDIO_FORMAT_OPTIONS = {
  type: 'audio',
  format: 'mp4',
  quality: 'best',
  ...IOS_CLIENT,
} as const;
