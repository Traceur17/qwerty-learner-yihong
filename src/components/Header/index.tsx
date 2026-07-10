import BiscuitIcon from '@/components/BiscuitIcon'
import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <header className="z-20 mx-auto w-full max-w-[1600px] shrink-0 px-4 py-4 xl:px-8 xl:py-5">
      <div className="flex w-full flex-col items-stretch justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <NavLink
          className="flex shrink-0 items-center text-xl font-bold text-indigo-500 no-underline hover:no-underline md:text-2xl xl:text-3xl"
          to="/"
        >
          <BiscuitIcon className="mr-2 h-11 w-11 shrink-0 md:mr-3 md:h-12 md:w-12 xl:h-14 xl:w-14" />
          <h1 className="truncate">Empress Biscuit</h1>
        </NavLink>
        <nav className="my-card flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-3 transition-colors duration-300 dark:bg-gray-800 md:w-auto md:justify-end md:gap-2.5 md:p-3.5">
          {children}
        </nav>
      </div>
    </header>
  )
}

export default Header
