import type React from 'react'

type BiscuitIconProps = {
  className?: string
  title?: string
}

const BiscuitIcon: React.FC<BiscuitIconProps> = ({ className, title = 'Empress Biscuit' }) => {
  return (
    <svg className={className} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title}>
      <circle cx="32" cy="32" r="30" fill="#F5CF6A" />
      <circle cx="32" cy="32" r="28" fill="#FADE94" />
      <circle cx="22" cy="24" r="2.2" fill="#C9923E" />
      <circle cx="32" cy="20" r="2.2" fill="#C9923E" />
      <circle cx="42" cy="24" r="2.2" fill="#C9923E" />
      <circle cx="18" cy="34" r="2.2" fill="#C9923E" />
      <circle cx="46" cy="34" r="2.2" fill="#C9923E" />
      <circle cx="22" cy="44" r="2.2" fill="#C9923E" />
      <circle cx="32" cy="48" r="2.2" fill="#C9923E" />
      <circle cx="42" cy="44" r="2.2" fill="#C9923E" />
    </svg>
  )
}

export default BiscuitIcon
