import { publicUrl } from '@/utils/publicUrl'
import type React from 'react'

type BiscuitIconProps = {
  className?: string
  title?: string
}

const BiscuitIcon: React.FC<BiscuitIconProps> = ({ className, title = 'Empress Biscuit' }) => {
  return (
    <img
      src={publicUrl('/favicon-biscuit-transparent.png')}
      alt={title}
      className={className}
      width={64}
      height={64}
      decoding="async"
      draggable={false}
    />
  )
}

export default BiscuitIcon
