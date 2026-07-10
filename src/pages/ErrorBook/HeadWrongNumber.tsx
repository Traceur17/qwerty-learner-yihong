import classNames from 'classnames'
import type { FC } from 'react'
import { useCallback } from 'react'
import DownIcon from '~icons/fa/sort-down'
import UPIcon from '~icons/fa/sort-up'

type IHeadWrongNumberProps = {
  className?: string
  sortType: ISortType
  setSortType: (sortType: ISortType) => void
}

export type ISortType = 'asc' | 'desc' | 'none'

const HeadWrongNumber: FC<IHeadWrongNumberProps> = ({ className, sortType, setSortType }) => {
  const onClick = useCallback(() => {
    const sortTypes: Record<ISortType, ISortType> = {
      asc: 'desc',
      desc: 'none',
      none: 'asc',
    }
    setSortType(sortTypes[sortType])
  }, [setSortType, sortType])

  return (
    <span className={`relative inline-block cursor-pointer whitespace-nowrap ${className ?? ''}`} onClick={onClick}>
      错误次数
      <span className="absolute -right-3 top-1/2 flex -translate-y-1/2 flex-col text-[10px] leading-none">
        <UPIcon
          className={classNames('-mb-2 ', {
            'text-indigo-500': sortType === 'asc',
            'text-gray-400': sortType !== 'asc',
          })}
        />
        <DownIcon
          className={classNames({
            'text-indigo-500': sortType === 'desc',
            'text-gray-400': sortType !== 'desc',
          })}
        />
      </span>
    </span>
  )
}

export default HeadWrongNumber
