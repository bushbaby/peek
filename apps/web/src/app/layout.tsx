import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Peek',
  description: 'Monitor web page changes with CSS selectors.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint to apply saved theme and avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('peek-theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch{}`,
          }}
        />
      </head>
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  )
}
