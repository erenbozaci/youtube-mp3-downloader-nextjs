# YouTube Ses İndirici

YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin. Tekli video, toplu liste, albüm/playlist ve ZIP olarak indirme desteğiyle tamamen Türkçe, modern ve kolay kullanımlı bir Next.js uygulaması.

## Özellikler

- 🎵 **Tekli Video İndirme**: YouTube videosunun sesini hızlıca indir.
- 📋 **Toplu Liste İndirme**: Birden fazla video ekle, hepsini ZIP dosyası olarak indir.
- 📚 **Albüm/Playlist İndirme**: Playlist/Albüm linki gir, tüm şarkıları ZIP olarak indir.
- ⏳ **İndirme İlerlemesi**: İndirme sırasında ilerleme çubuğu.
- 🕑 **İndirme Geçmişi**: Son 50 indirme kaydedilir, tekrar indirilebilir.
- 💾 **Otomatik Kayıt**: Liste ve geçmiş tarayıcıda saklanır, sayfa yenilense bile kaybolmaz.
- 🌙 **Karanlık Mod**: Modern ve responsive arayüz, Türkçe dil desteği.

## Kurulum

1. **Node.js** yüklü olmalı. [Node.js İndir](https://nodejs.org/)
2. Proje klasöründe terminal açın veya aşağıdaki .bat dosyalarını kullanın.

### Otomatik Başlatma (Tavsiye Edilen)

- `baslat.bat` dosyasına çift tıklayın.
  - Node.js ve bağımlılıkları kontrol eder.
  - Sunucu hazır olunca tarayıcıyı otomatik açar.
  - Kapatmak için pencereyi kapatın.

### Manuel Başlatma

```bash
npm install
npm run dev
```

ve tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Kullanım

- **Tekli İndirme:** YouTube video linkini girin, Enter'a basın veya "Video Bilgilerini Al" butonuna tıklayın. "Ses İndir" ile indirin.
- **Liste:** Video ekleyin, sağdaki listeden "Tümünü ZIP Olarak İndir" ile toplu indirin.
- **Albüm/Playlist:** Playlist/Albüm linki girin, Enter'a basın veya "Playlist Bilgilerini Al" butonuna tıklayın. "Playlist'i ZIP Olarak İndir" ile toplu indirin.
- **Geçmiş:** Önceki indirmelerinizi görüntüleyin ve tekrar indirin.

## Ekran Görüntüsü

> Modern, karanlık mod destekli ve mobil uyumlu arayüz.

## Geliştirici Notları

- Next.js 16, React 19, TailwindCSS, youtubei.js, jszip kullanır.
- Sadece M4A formatı desteklenir (daha kararlı ve hızlı).
- Playlist desteği için YouTube sayfa analiz yöntemi kullanılır (YouTube API anahtarı gerekmez).
- Tüm kod ve arayüz Türkçedir.

## API Endpoints

Uygulama aşağıdaki API endpoint'lerini kullanır:

### 1. Video Bilgileri Al - `/api/info`
```bash
POST /api/info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Yanıt:**
```json
{
  "videoDetails": {
    "title": "Video Başlığı",
    "thumbnail": "https://...",
    "duration": "240",
    "author": "Kanal Adı",
    "viewCount": "1000000"
  }
}
```

### 2. Tekli Video İndir - `/api/download`
```bash
POST /api/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Yanıt:** M4A ses dosyası stream'i

### 3. Playlist Bilgileri Al - `/api/playlist`
```bash
POST /api/playlist
Content-Type: application/json

{
  "url": "https://www.youtube.com/playlist?list=PLAYLIST_ID"
}
```

**Yanıt:**
```json
{
  "title": "Playlist Adı",
  "totalVideos": 15,
  "videos": [
    {
      "title": "Video 1",
      "thumbnail": "https://...",
      "duration": "180",
      "author": "Kanal",
      "viewCount": "500000",
      "url": "https://www.youtube.com/watch?v=..."
    }
  ]
}
```

### 4. Toplu ZIP İndir - `/api/download-zip`
```bash
POST /api/download-zip
Content-Type: application/json

{
  "urls": [
    "https://www.youtube.com/watch?v=VIDEO1",
    "https://www.youtube.com/watch?v=VIDEO2"
  ],
  "zipName": "playlist.zip"
}
```

**Yanıt:** ZIP dosyası (içinde M4A dosyaları)

**Headers:**
- `X-Completed-Count`: Başarılı indirme sayısı
- `X-Failed-Count`: Başarısız indirme sayısı
- `X-Failures`: Hata listesi (JSON)

