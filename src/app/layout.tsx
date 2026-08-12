import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouTube Ses İndirici - M4A Audio Downloader",
  description: "YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin. Tekli video, playlist ve toplu indirme desteği. Ücretsiz ve kolay kullanım.",
  keywords: [
    "youtube",
    "audio downloader",
    "mp3",
    "m4a",
    "ses indirici",
    "youtube downloader",
    "playlist downloader",
    "toplu indirme",
    "ücretsiz"
  ],
  authors: [{ name: "YouTube Ses İndirici" }],
  creator: "YouTube Ses İndirici",
  publisher: "YouTube Ses İndirici",
  robots: "index, follow",
  openGraph: {
    title: "YouTube Ses İndirici",
    description: "YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin",
    type: "website",
    locale: "tr_TR",
    siteName: "YouTube Ses İndirici"
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Ses İndirici",
    description: "YouTube videolarından yüksek kaliteli M4A ses dosyaları indirin"
  },
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ef4444",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
