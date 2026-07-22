import BiscuitIcon from '@/components/BiscuitIcon'
import CollectBiscuitOverlay from '@/components/CollectBiscuitOverlay'
import CollectJarAnimation from '@/components/CollectJarAnimation'
import { collectedWordCountAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { PropsWithChildren } from 'react'
import type React from 'react'
import { useCallback, useState } from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  const [collectOpen, setCollectOpen] = useState(false)
  const [jarPlayToken, setJarPlayToken] = useState(0)
  const [lastAdded, setLastAdded] = useState(0)
  const count = useAtomValue(collectedWordCountAtom)

  const openCollect = useCallback(() => setCollectOpen(true), [])
  const closeCollect = useCallback(() => setCollectOpen(false), [])

  const onSaved = useCallback((added: number) => {
    setLastAdded(added)
    setJarPlayToken((n) => n + 1)
  }, [])

  return (
    <header className="z-20 mx-auto w-full max-w-[1600px] shrink-0 px-4 py-4 xl:px-8 xl:py-5">
      <div className="flex w-full flex-col items-stretch justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 shrink-0 items-center">
          <button type="button" onClick={openCollect} title="收集小饼干" className="mr-2 shrink-0 outline-none md:mr-3">
            <BiscuitIcon className="h-11 w-11 md:h-12 md:w-12 xl:h-14 xl:w-14" title="收集小饼干" />
          </button>
          <NavLink className="truncate text-xl font-bold text-indigo-500 no-underline hover:no-underline md:text-2xl xl:text-3xl" to="/">
            <h1 className="truncate">Empress Biscuit</h1>
          </NavLink>
        </div>
        <nav className="my-card flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-3 transition-colors duration-300 dark:bg-gray-800 md:w-auto md:justify-end md:gap-2.5 md:p-3.5">
          {children}
        </nav>
      </div>

      <CollectBiscuitOverlay open={collectOpen} onClose={closeCollect} onSaved={onSaved} />
      <CollectJarAnimation playToken={jarPlayToken} addedCount={lastAdded} totalCount={count} />
    </header>
  )
}

export default Header
