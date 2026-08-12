'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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

type TabType = 'single' | 'album' | 'history';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  
  // Liste indirme için - artık her zaman görünür
  const [downloadList, setDownloadList] = useState<DownloadItem[]>([]);
  const [isProcessingList, setIsProcessingList] = useState(false);
  
  // Albüm/Playlist indirme için
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [downloadingPlaylist, setDownloadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState('');
  
  // Geçmiş için
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
      setError('Lütfen bir YouTube URL\'si girin');
      return;
    }

    setLoading(true);
    setError('');
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
      setError(err instanceof Error ? err.message : 'Video bilgileri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim() || !videoInfo) {
      setError('Lütfen bir YouTube URL\'si girin');
      return;
    }

    setDownloading(true);
    setError('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İndirme başarısız');
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
    setError('');

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
      
      // Başarı mesajı göster
      const completedCount = response.headers.get('X-Completed-Count');
      const failedCount = response.headers.get('X-Failed-Count');
      
      if (failedCount && parseInt(failedCount) > 0) {
        setError(`ZIP indirildi! ${completedCount} başarılı, ${failedCount} başarısız.`);
      } else {
        setError(''); // Başarılı olduğunda error'ı temizle
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'ZIP indirme başarısız');
    } finally {
      setIsProcessingList(false);
    }
  };

  // Playlist bilgilerini al
  const handleGetPlaylistInfo = async () => {
    if (!playlistUrl.trim()) {
      setPlaylistError('Lütfen bir playlist URL\'si girin');
      return;
    }

    setLoadingPlaylist(true);
    setPlaylistError('');
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
      setPlaylistError(err instanceof Error ? err.message : 'Playlist bilgileri alınamadı');
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // Playlist'i ZIP olarak indir
  const downloadPlaylistAsZip = async () => {
    if (!playlistInfo) return;
    
    setDownloadingPlaylist(true);
    setPlaylistError('');

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
      
      // Başarı mesajı göster
      const completedCount = response.headers.get('X-Completed-Count');
      const failedCount = response.headers.get('X-Failed-Count');
      
      if (failedCount && parseInt(failedCount) > 0) {
        setPlaylistError(`Playlist ZIP indirildi! ${completedCount} başarılı, ${failedCount} başarısız.`);
      }

    } catch (err) {
      setPlaylistError(err instanceof Error ? err.message : 'Playlist ZIP indirme başarısız');
    } finally {
      setDownloadingPlaylist(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
              YouTube Ses İndirici
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Tekli İndirme
              </button>
              <button
                onClick={() => setActiveTab('album')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'album'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Albüm/Playlist
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Geçmiş ({history.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Single Download Tab */}
            {activeTab === 'single' && (
              <>
                {/* Main Content - Left Column */}
                <div className="lg:col-span-2">
                  {/* Input Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleGetInfo}
                          disabled={loading}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                            >
                              {downloading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  İndiriliyor...
                                </>
                              ) : (
                                'Ses İndir'
                              )}
                            </button>
                            <button
                              onClick={addToList}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                            >
                              Listeye Ekle
                            </button>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {downloading && progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                            {progress}% tamamlandı
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                      {error}
                    </div>
                  )}

                  {/* Video Info */}
                  {videoInfo && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={videoInfo.thumbnail}
                            alt={videoInfo.title}
                            width={200}
                            height={150}
                            className="rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                            {videoInfo.title}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        İndirme Listesi ({downloadList.length})
                      </h2>
                      {downloadList.length > 0 && (
                        <button
                          onClick={clearList}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          title="Listeyi Temizle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {downloadList.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={downloadAllAsZip}
                          disabled={isProcessingList}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                          {isProcessingList ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                              ZIP İndiriliyor...
                            </>
                          ) : (
                            'Tümünü ZIP Olarak İndir'
                          )}
                        </button>
                      </div>
                    )}

                    {downloadList.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm">Liste boş</p>
                        <p className="text-xs mt-1">Video bilgilerini aldıktan sonra &quot;Listeye Ekle&quot; butonunu kullanın</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {downloadList.map((item) => (
                          <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <Image
                                  src={item.videoInfo.thumbnail}
                                  alt={item.videoInfo.title}
                                  width={60}
                                  height={45}
                                  className="rounded object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-800 dark:text-white text-sm truncate">
                                  {item.videoInfo.title}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {item.videoInfo.author}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {formatDuration(item.videoInfo.duration)}
                                </p>
                              </div>
                              <button
                                onClick={() => removeFromList(item.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                                title="Listeden Çıkar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    Albüm/Playlist İndirme
                  </h2>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label htmlFor="playlistUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleGetPlaylistInfo}
                        disabled={loadingPlaylist}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                      >
                        {loadingPlaylist ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          {downloadingPlaylist ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ZIP İndiriliyor...
                            </>
                          ) : (
                            'Playlist\'i ZIP Olarak İndir'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Playlist Error Message */}
                  {playlistError && (
                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                      {playlistError}
                    </div>
                  )}

                  {/* Playlist Info */}
                  {playlistInfo && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                          {playlistInfo.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {playlistInfo.totalVideos} video bulundu
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {playlistInfo.videos.map((video, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <Image
                                  src={video.thumbnail}
                                  alt={video.title}
                                  width={80}
                                  height={60}
                                  className="rounded object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-800 dark:text-white text-sm truncate">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {video.author}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {formatDuration(video.duration)}
                                </p>
                              </div>
                            </div>
                          </div>
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                      İndirme Geçmişi ({history.length})
                    </h2>
                    {history.length > 0 && (
                      <button
                        onClick={() => {
                          setHistory([]);
                          localStorage.removeItem('download-history');
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Geçmişi Temizle
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Henüz indirme geçmişi bulunmuyor.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {history.map((item) => (
                        <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center gap-4">
                            <Image
                              src={item.videoInfo.thumbnail}
                              alt={item.videoInfo.title}
                              width={120}
                              height={90}
                              className="rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 dark:text-white mb-1 line-clamp-2">
                                {item.videoInfo.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.videoInfo.author} • {formatDuration(item.videoInfo.duration)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                İndirilme: {item.downloadedAt.toLocaleDateString('tr-TR')} {item.downloadedAt.toLocaleTimeString('tr-TR')}
                              </p>
                              
                              <button
                                onClick={async () => {
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
                                  }
                                }}
                                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                Tekrar İndir
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
            <p>Lütfen telif hakkı yasalarına saygı gösterin ve yalnızca kullanım izniniz olan içerikleri indirin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
