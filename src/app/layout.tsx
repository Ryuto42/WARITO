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
  themeColor: '#050811',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            const savedTheme = localStorage.getItem('waritoTheme');
            if (savedTheme === 'light') {
              document.documentElement.classList.add('theme-light');
            }
          `}
        </Script>
      </head>
      <body>
        <div id="root">{children}</div>
        <Script id="sw-script" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
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
