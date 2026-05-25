import { type CSSProperties, useEffect, useRef, useState, useMemo, useCallback } from 'react'
import classNames from 'classnames'
import SmallDisplay from './SmallDisplay'
import Expanded from './Expanded'
import type { Bet } from '@/types/bet'
import BetsZoneSvg from '@/assets/svg/BetsZone.svg'

export interface BetsAltProps {
  ankerPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
  style?: CSSProperties
  bets: Bet[]
  onExpandChange?: (expanded: boolean) => void
}

export default function BetsAlt({ bets, style, ankerPosition = 'bottom-left', className, onExpandChange }: BetsAltProps) {
  const [open, setOpen] = useState<boolean>(false)
  const [baseDisplacement, setBaseDisplacement] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)

  const ref = useRef<HTMLDivElement>(null)

  // Derived state using useMemo instead of useEffect + useState
  const totalBet = useMemo(() =>
    bets?.reduce((acc, { amount }) => acc + amount, 0) ?? 0
  , [bets])

  useEffect(() => {
    // Defer DOM measurement to avoid synchronous setState during render
    requestAnimationFrame(() => {
      const calc = ((ref.current?.getBoundingClientRect().height ?? 0) * Math.tan(10 * Math.PI / 180)) / 2
      setBaseDisplacement(calc)
      if (ref.current?.getBoundingClientRect().width)
        setWidth(ref.current?.getBoundingClientRect().width + calc * 2 + 16)
    })
  }, [open, bets])

  // Memoized click handler
  const handleClick = useCallback(() => {
    const newOpen = !open
    setOpen(newOpen)
    onExpandChange?.(newOpen)
  }, [open, onExpandChange])

  // Memoized computed style for closed state
  const closedStyle = useMemo(() => ({
    ...style,
    marginLeft: -baseDisplacement,
    width: style?.width ?? (width ? `calc(${width}px)` : undefined)
  }), [style, baseDisplacement, width])

  return (
    <div
      ref={ref}
      className={classNames(
        className,
        'absolute font-din cursor-pointer',
        'transition-all duration-300',
        {
          'max-w-[250px]': !open,
          'left-0 bottom-0': !open && ankerPosition === 'bottom-left',
          'right-0 bottom-0': !open && ankerPosition === 'bottom-right',
          'left-0 top-0': !open && ankerPosition === 'top-left',
          'right-0 top-0': !open && ankerPosition === 'top-right',
          'top-0': !open && ankerPosition === 'top',
          'bottom-0': !open && ankerPosition === 'bottom',
          'left-0': !open && ankerPosition === 'left',
          'right-0': !open && ankerPosition === 'right'
        }
      )}
      style={open ? undefined : closedStyle}
      onClick={handleClick}
    >
      {open ? (
        <div
          className="fixed inset-0 z-50"
          style={{
            top: '22.14vh',
            bottom: '3.3vh',
            left: 0,
            right: 0
          }}
        >
          {/* SVG Background */}
          <img
            src={BetsZoneSvg}
            alt=""
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            style={{
              objectPosition: 'left top'
            }}
          />

          {/* Content overlay */}
          <div className="relative z-10 h-full flex flex-col">
            <Expanded totalBet={totalBet} bets={bets} offset={baseDisplacement} />
          </div>
        </div>
      ) : (
        <SmallDisplay totalBet={totalBet} bets={bets} offset={baseDisplacement} />
      )}
    </div>
  )
}
