import Footer from './Footer'
import type React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen min-h-0 w-full flex-col items-stretch overflow-hidden pb-4">
      {children}
      <Footer />
    </main>
  )
}
