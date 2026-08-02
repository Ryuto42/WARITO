import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'WARITO',
  description: 'WARITO application',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // ブラウザ/PWA のクロームもテーマに追従させる
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#050811' },
  ],
  colorScheme: 'dark light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            // 未設定なら端末のダーク/ライト設定に追従する
            var saved = localStorage.getItem('waritoTheme');
            var light = saved === 'light' ||
              ((!saved || saved === 'system') &&
                window.matchMedia('(prefers-color-scheme: light)').matches);
            if (light) document.documentElement.classList.add('theme-light');
            document.documentElement.style.colorScheme = light ? 'light' : 'dark';
          `}
        </Script>
      </head>
      <body>
        <div id="root">{children}</div>
        <Script id="sw-script" strategy="afterInteractive">
          {`
            // Capacitor（iOS/Android）ネイティブでは Service Worker を使わない。
            // アセットはアプリバンドルに同梱済みで、SW の controllerchange が
            // 起動直後のリロードループを起こすため。
            var isNativeShell = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            if (isNativeShell) {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (rs) {
                  rs.forEach(function (r) { r.unregister(); });
                }).catch(function () {});
              }
            } else if ('serviceWorker' in navigator) {
              let refreshing = false;
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                  window.location.reload();
                  refreshing = true;
                }
              });

              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                  reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                      }
                    });
                  });

                  setInterval(() => {
                    reg.update();
                  }, 60 * 60 * 1000);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
