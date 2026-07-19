import Loading from './components/Loading'
import UpdateAnnouncement from './components/UpdateAnnouncement'
import './index.css'
import { ErrorBook } from './pages/ErrorBook'
import { FriendLinks } from './pages/FriendLinks'
import MobilePage from './pages/Mobile'
import TypingPage from './pages/Typing'
import { isOpenDarkModeAtom } from '@/store'
import { getAppBuildId } from '@/utils/cacheBust'
import { checkForAppUpdate } from '@/utils/deployServiceWorker'
import { publicUrl } from '@/utils/publicUrl'
import { Analytics } from '@vercel/analytics/react'
import 'animate.css'
import { useAtomValue } from 'jotai'
import mixpanel from 'mixpanel-browser'
import process from 'process'
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import 'react-app-polyfill/stable'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

if (process.env.NODE_ENV === 'production') {
  // for prod
  mixpanel.init('bdc492847e9340eeebd53cc35f321691')
} else {
  // for dev
  mixpanel.init('5474177127e4767124c123b2d7846e2a', { debug: true })
}

function Root() {
  const darkMode = useAtomValue(isOpenDarkModeAtom)
  useEffect(() => {
    darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    void checkForAppUpdate()
  }, [])

  useEffect(() => {
    const href = publicUrl(`/favicon-biscuit-transparent.png?v=${getAppBuildId()}`)
    document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach((link) => {
      link.href = href
      link.type = 'image/png'
    })
    document.querySelectorAll<HTMLLinkElement>("link[rel='apple-touch-icon']").forEach((link) => {
      link.href = publicUrl(`/apple-touch-icon.png?v=${getAppBuildId()}`)
    })
  }, [])

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)
  const wasMobileRef = useRef(isMobile)

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 600
      // 仅在"移动布局 → 桌面布局"切换时整页回首页；全屏等普通 resize 不跳转。
      // 注意带上部署子路径（GitHub Pages），否则会跳到域名根导致 404
      if (wasMobileRef.current && !nextIsMobile) {
        window.location.href = publicUrl('/')
        return
      }
      wasMobileRef.current = nextIsMobile
      setIsMobile(nextIsMobile)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <React.StrictMode>
      <BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner-yihong' : ''}>
        <Suspense fallback={<Loading />}>
          <Routes>
            {isMobile ? (
              <Route path="/*" element={<Navigate to="/mobile" />} />
            ) : (
              <>
                <Route index element={<TypingPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/error-book" element={<ErrorBook />} />
                <Route path="/friend-links" element={<FriendLinks />} />
                <Route path="/*" element={<Navigate to="/" />} />
              </>
            )}
            <Route path="/mobile" element={<MobilePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {!isMobile && <UpdateAnnouncement />}
      <Analytics />
    </React.StrictMode>
  )
}

const container = document.getElementById('root')

container && createRoot(container).render(<Root />)
