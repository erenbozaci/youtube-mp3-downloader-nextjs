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

export const VIDEO_INFO_OPTIONS = IOS_CLIENT;

export const AUDIO_FORMAT_OPTIONS = {
  type: 'audio',
  format: 'mp4',
  quality: 'best',
  ...IOS_CLIENT,
} as const;
