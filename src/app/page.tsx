'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Spinner from '@/components/Spinner';
import Alert, { type AlertType } from '@/components/Alert';
import EmptyState from '@/components/EmptyState';
import MediaCard from '@/components/MediaCard';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  viewCount: string;
  url: string;
}

interface DownloadItem {
  id: string;
  videoInfo: VideoInfo;
  progress: number;
  status: 'waiting' | 'downloading' | 'completed' | 'error';
  error?: string;
}

interface HistoryItem {
  id: string;
  videoInfo: VideoInfo;
  downloadedAt: Date;
}

interface PlaylistInfo {
  title: string;
  videos: VideoInfo[];
  totalVideos: number;
}

interface Notice {
  type: AlertType;
  message: string;
}

type TabType = 'single' | 'album' | 'history';

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300 dark:disabled:bg-red-900/50 dark:focus-visible:ring-offset-zinc-950';

const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950';

const BTN_SECONDARY_SM =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950';

const BTN_GHOST_ICON =
  'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-red-400';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [progress, setProgress] = useState(0);

  // Liste indirme için - artık her zaman görünür
  const [downloadList, setDownloadList] = useState<DownloadItem[]>([]);
  const [isProcessingList, setIsProcessingList] = useState(false);

  // Albüm/Playlist indirme için
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [downloadingPlaylist, setDownloadingPlaylist] = useState(false);
  const [playlistNotice, setPlaylistNotice] = useState<Notice | null>(null);

  // Geçmiş için
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redownloadingIds, setRedownloadingIds] = useState<Set<string>>(new Set());

  // Geçmişi ve listeyi localStorage'dan yükle (mount'ta bir kez)
  useEffect(() => {
    const savedHistory = localStorage.getItem('download-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(parsedHistory.map((item: HistoryItem & { downloadedAt: string }) => ({
          ...item,
          downloadedAt: new Date(item.downloadedAt)
        })));
      } catch (error) {
        console.error('Geçmiş yüklenirken hata:', error);
      }
    }

    const savedList = localStorage.getItem('download-list');
    if (savedList) {
      try {
        const parsedList = JSON.parse(savedList);
        setDownloadList(parsedList);
      } catch (error) {
        console.error('Liste yüklenirken hata:', error);
      }
    }
  }, []);

  // Listeyi localStorage'a kaydet
  const saveListToStorage = (list: DownloadItem[]) => {
    localStorage.setItem('download-list', JSON.stringify(list));
  };

  // Geçmişi kaydet
  const saveToHistory = (videoInfo: VideoInfo) => {
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      videoInfo,
      downloadedAt: new Date()
    };

    const newHistory = [historyItem, ...history].slice(0, 50); // Son 50 indirme
    setHistory(newHistory);
    localStorage.setItem('download-history', JSON.stringify(newHistory));
  };

  const handleGetInfo = async () => {
    if (!url.trim()) {
      setNotice({ type: 'error', message: 'Lütfen bir YouTube URL\'si girin' });
      return;
    }

    setLoading(true);
    setNotice(null);
    setVideoInfo(null);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Video bilgileri alınamadı');
      }

      setVideoInfo({ ...data.videoDetails, url });
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Video bilgileri alınamadı' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim() || !videoInfo) {
      setNotice({ type: 'error', message: 'Lütfen bir YouTube URL\'si girin' });
      return;
    }

    setDownloading(true);
    setNotice(null);
    setProgress(0);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'İndirme başarısız');
      }

      const reader = response.body?.getReader();
      const contentLength = +response.headers.get('Content-Length')!;

      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader!.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        setProgress(Math.round((receivedLength / contentLength) * 100));
      }

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${videoInfo?.title || 'ses'}.m4a`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      // Geçmişe ekle
      saveToHistory(videoInfo);
      setProgress(100);
      setNotice({ type: 'success', message: `"${videoInfo.title}" indirildi.` });
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'İndirme başarısız' });
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  // Listeye video ekle
  const addToList = () => {
    if (!videoInfo) return;

    const newItem: DownloadItem = {
      id: Date.now().toString(),
      videoInfo,
      progress: 0,
      status: 'waiting'
    };

    const newList = [...downloadList, newItem];
    setDownloadList(newList);
    saveListToStorage(newList);
    setUrl('');
    setVideoInfo(null);
    setNotice({ type: 'success', message: 'Listeye eklendi.' });
  };

  // Listeyi temizle
  const clearList = () => {
    setDownloadList([]);
    saveListToStorage([]);
  };

  // Listeden öğe kaldır
  const removeFromList = (id: string) => {
    const newList = downloadList.filter(item => item.id !== id);
    setDownloadList(newList);
    saveListToStorage(newList);
  };

  // Tüm listeyi ZIP olarak indir
  const downloadAllAsZip = async () => {
    if (downloadList.length === 0) return;

    setIsProcessingList(true);
    setNotice(null);

    try {
      const urls = downloadList.map(item => item.videoInfo.url);
      const zipName = `YouTube_Audio_Liste_${new Date().toISOString().split('T')[0]}.zip`;

      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls, zipName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ZIP indirme başarısız');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      // Tüm öğeleri geçmişe ekle
      downloadList.forEach(item => saveToHistory(item.videoInfo));

      // Sonuç mesajı göster
      const completedCount = response.headers.get('X-Completed-Count');
      const failedCount = response.headers.get('X-Failed-Count');

      if (failedCount && parseInt(failedCount) > 0) {
        setNotice({ type: 'warning', message: `ZIP indirildi: ${completedCount} başarılı, ${failedCount} başarısız.` });
      } else {
        setNotice({ type: 'success', message: `ZIP indirildi: ${completedCount} şarkı.` });
      }

    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'ZIP indirme başarısız' });
    } finally {
      setIsProcessingList(false);
    }
  };

  // Playlist bilgilerini al
  const handleGetPlaylistInfo = async () => {
    if (!playlistUrl.trim()) {
      setPlaylistNotice({ type: 'error', message: 'Lütfen bir playlist URL\'si girin' });
      return;
    }

    setLoadingPlaylist(true);
    setPlaylistNotice(null);
    setPlaylistInfo(null);

    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: playlistUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Playlist bilgileri alınamadı');
      }

      setPlaylistInfo(data);
    } catch (err) {
      setPlaylistNotice({ type: 'error', message: err instanceof Error ? err.message : 'Playlist bilgileri alınamadı' });
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // Playlist'i ZIP olarak indir
  const downloadPlaylistAsZip = async () => {
    if (!playlistInfo) return;

    setDownloadingPlaylist(true);
    setPlaylistNotice(null);

    try {
      const urls = playlistInfo.videos.map(video => video.url);
      const zipName = `${playlistInfo.title.replace(/[<>:"/\\|?*]/g, '_')}.zip`;

      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls, zipName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Playlist ZIP indirme başarısız');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      // Tüm öğeleri geçmişe ekle
      playlistInfo.videos.forEach(video => saveToHistory(video));

      // Sonuç mesajı göster
      const completedCount = response.headers.get('X-Completed-Count');
      const failedCount = response.headers.get('X-Failed-Count');

      if (failedCount && parseInt(failedCount) > 0) {
        setPlaylistNotice({ type: 'warning', message: `Playlist ZIP indirildi: ${completedCount} başarılı, ${failedCount} başarısız.` });
      } else {
        setPlaylistNotice({ type: 'success', message: `Playlist ZIP indirildi: ${completedCount} şarkı.` });
      }

    } catch (err) {
      setPlaylistNotice({ type: 'error', message: err instanceof Error ? err.message : 'Playlist ZIP indirme başarısız' });
    } finally {
      setDownloadingPlaylist(false);
    }
  };

  // Geçmişten tek bir video tekrar indir
  const redownloadFromHistory = async (item: HistoryItem) => {
    setRedownloadingIds(prev => new Set(prev).add(item.id));
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: item.videoInfo.url }),
      });

      if (!response.ok) {
        throw new Error('İndirme başarısız');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${item.videoInfo.title}.m4a`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Tekrar indirme hatası:', error);
    } finally {
      setRedownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const formatDuration = (seconds: string) => {
    const mins = Math.floor(parseInt(seconds) / 60);
    const secs = parseInt(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M görüntülenme`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K görüntülenme`;
    }
    return `${num} görüntülenme`;
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'single',
      label: 'Tekli İndirme',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
      ),
    },
    {
      id: 'album',
      label: 'Albüm/Playlist',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <rect x="4" y="5" width="12" height="3" rx="1" />
          <rect x="4" y="10.5" width="16" height="3" rx="1" />
          <rect x="4" y="16" width="16" height="3" rx="1" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: `Geçmiş (${history.length})`,
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <circle cx="7" cy="17" r="2.5" />
                <circle cx="16" cy="15" r="2.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17V5.5L18.5 4v11" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              YouTube Ses İndirici
            </h1>
            <p className="mt-2 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
              YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin
            </p>
          </header>

          {/* Tabs */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Single Download Tab */}
            {activeTab === 'single' && (
              <>
                {/* Main Content - Left Column */}
                <div className="lg:col-span-2">
                  {/* Input Section */}
                  <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="url" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          YouTube URL
                        </label>
                        <input
                          type="url"
                          id="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !loading) {
                              handleGetInfo();
                            }
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleGetInfo}
                          disabled={loading}
                          className={BTN_SECONDARY}
                        >
                          {loading ? (
                            <>
                              <Spinner />
                              Yükleniyor...
                            </>
                          ) : (
                            'Video Bilgilerini Al'
                          )}
                        </button>

                        {videoInfo && (
                          <>
                            <button
                              onClick={handleDownload}
                              disabled={downloading}
                              className={BTN_PRIMARY}
                            >
                              {downloading ? (
                                <>
                                  <Spinner />
                                  İndiriliyor...
                                </>
                              ) : (
                                'Ses İndir'
                              )}
                            </button>
                            <button
                              onClick={addToList}
                              className={BTN_SECONDARY}
                            >
                              Listeye Ekle
                            </button>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {downloading && progress > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>İndiriliyor…</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-red-600 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notice */}
                  {notice && (
                    <div className="mb-6">
                      <Alert type={notice.type} message={notice.message} />
                    </div>
                  )}

                  {/* Video Info */}
                  {videoInfo && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          <Image
                            src={videoInfo.thumbnail}
                            alt={videoInfo.title}
                            width={200}
                            height={150}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                            {videoInfo.title}
                          </h3>
                          <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                            <p>Yazan: {videoInfo.author}</p>
                            <p>Süre: {formatDuration(videoInfo.duration)}</p>
                            <p>{formatViewCount(videoInfo.viewCount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Download List - Right Column */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        İndirme Listesi ({downloadList.length})
                      </h2>
                      {downloadList.length > 0 && (
                        <button
                          onClick={clearList}
                          aria-label="Listeyi temizle"
                          title="Listeyi Temizle"
                          className={BTN_GHOST_ICON}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {downloadList.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={downloadAllAsZip}
                          disabled={isProcessingList}
                          className={`w-full ${BTN_PRIMARY}`}
                        >
                          {isProcessingList ? (
                            <>
                              <Spinner />
                              ZIP İndiriliyor...
                            </>
                          ) : (
                            'Tümünü ZIP Olarak İndir'
                          )}
                        </button>
                      </div>
                    )}

                    {downloadList.length === 0 ? (
                      <EmptyState
                        icon={
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                            <rect x="4" y="5" width="12" height="3" rx="1" />
                            <rect x="4" y="10.5" width="16" height="3" rx="1" />
                            <rect x="4" y="16" width="16" height="3" rx="1" />
                          </svg>
                        }
                        title="Liste boş"
                        description={'Video bilgilerini aldıktan sonra "Listeye Ekle" butonunu kullanın'}
                      />
                    ) : (
                      <div className="thin-scrollbar max-h-96 space-y-3 overflow-y-auto pr-1">
                        {downloadList.map((item) => (
                          <MediaCard
                            key={item.id}
                            thumbnail={item.videoInfo.thumbnail}
                            title={item.videoInfo.title}
                            author={item.videoInfo.author}
                            durationLabel={formatDuration(item.videoInfo.duration)}
                            thumbWidth={60}
                            thumbHeight={45}
                            onRemove={() => removeFromList(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Album/Playlist Tab */}
            {activeTab === 'album' && (
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
                    Albüm/Playlist İndirme
                  </h2>

                  <div className="mb-6 space-y-4">
                    <div>
                      <label htmlFor="playlistUrl" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Playlist/Album URL
                      </label>
                      <input
                        type="url"
                        id="playlistUrl"
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !loadingPlaylist) {
                            handleGetPlaylistInfo();
                          }
                        }}
                        placeholder="https://www.youtube.com/playlist?list=..."
                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleGetPlaylistInfo}
                        disabled={loadingPlaylist}
                        className={BTN_SECONDARY}
                      >
                        {loadingPlaylist ? (
                          <>
                            <Spinner />
                            Yükleniyor...
                          </>
                        ) : (
                          'Playlist Bilgilerini Al'
                        )}
                      </button>

                      {playlistInfo && (
                        <button
                          onClick={downloadPlaylistAsZip}
                          disabled={downloadingPlaylist}
                          className={BTN_PRIMARY}
                        >
                          {downloadingPlaylist ? (
                            <>
                              <Spinner />
                              ZIP İndiriliyor...
                            </>
                          ) : (
                            'Playlist\'i ZIP Olarak İndir'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Playlist Notice */}
                  {playlistNotice && (
                    <div className="mb-6">
                      <Alert type={playlistNotice.type} message={playlistNotice.message} />
                    </div>
                  )}

                  {/* Playlist Info */}
                  {playlistInfo && (
                    <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
                      <div className="mb-4">
                        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-white">
                          {playlistInfo.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {playlistInfo.totalVideos} video bulundu
                        </p>
                      </div>

                      <div className="thin-scrollbar grid max-h-96 grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                        {playlistInfo.videos.map((video, index) => (
                          <MediaCard
                            key={index}
                            index={index + 1}
                            thumbnail={video.thumbnail}
                            title={video.title}
                            author={video.author}
                            durationLabel={formatDuration(video.duration)}
                            thumbWidth={80}
                            thumbHeight={60}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                      İndirme Geçmişi ({history.length})
                    </h2>
                    {history.length > 0 && (
                      <button
                        onClick={() => {
                          setHistory([]);
                          localStorage.removeItem('download-history');
                        }}
                        className={BTN_SECONDARY_SM}
                      >
                        Geçmişi Temizle
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <EmptyState
                      icon={
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <circle cx="12" cy="12" r="8.25" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
                        </svg>
                      }
                      title="Henüz indirme geçmişi bulunmuyor"
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {history.map((item) => (
                        <MediaCard
                          key={item.id}
                          thumbnail={item.videoInfo.thumbnail}
                          title={item.videoInfo.title}
                          author={item.videoInfo.author}
                          durationLabel={formatDuration(item.videoInfo.duration)}
                          thumbWidth={96}
                          thumbHeight={72}
                          meta={`İndirilme: ${item.downloadedAt.toLocaleDateString('tr-TR')} ${item.downloadedAt.toLocaleTimeString('tr-TR')}`}
                          actions={
                            <button
                              onClick={() => redownloadFromHistory(item)}
                              disabled={redownloadingIds.has(item.id)}
                              className={BTN_SECONDARY_SM}
                            >
                              {redownloadingIds.has(item.id) ? (
                                <>
                                  <Spinner size={12} />
                                  İndiriliyor...
                                </>
                              ) : (
                                'Tekrar İndir'
                              )}
                            </button>
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            <p>Lütfen telif hakkı yasalarına saygı gösterin ve yalnızca kullanım izniniz olan içerikleri indirin.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
