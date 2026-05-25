import { type CSSProperties, useEffect, useRef, useState, useMemo, useCallback, memo } from 'react'
import classNames from 'classnames'
import SmallDisplay from './SmallDisplay'
import Expanded from './Expanded'
import type { Bet } from '@/types/bet'

export type { Bet }
export { default as BetsAlt } from './BetsAlt'

export interface BetsProps {
  ankerPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
  style?: CSSProperties
  bets: Bet[]
  onExpandChange?: (expanded: boolean) => void
  /** Force-close the panel from parent (e.g. when race starts). */
  forceClose?: boolean
}

function Bets({ bets, style, ankerPosition = 'bottom-left', className, onExpandChange, forceClose }: BetsProps) {
  const [open, setOpen] = useState<boolean>(false)

  // Auto-close when forceClose flips to true (e.g. race starts)
  useEffect(() => {
    if (forceClose && open) {
      setOpen(false)
      onExpandChange?.(false)
    }
  }, [forceClose, open, onExpandChange])
  const [baseDisplacement, setBaseDisplacement] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)

  const ref = useRef<HTMLDivElement>(null)

  // Derived state using useMemo instead of useEffect + useState
  const totalBet = useMemo(() =>
    bets?.reduce((acc, { amount }) => acc + amount, 0) ?? 0
  , [bets])

  // Only recalculate layout when open state changes, NOT on every bet
  // This prevents layout thrashing (getBoundingClientRect) on each bet placement
  // Use useLayoutEffect would be better but this runs on mount only when open changes
  useEffect(() => {
    // Defer DOM measurement to avoid synchronous setState during render
    requestAnimationFrame(() => {
      const calc = ((ref.current?.getBoundingClientRect().height ?? 0) * Math.tan(10 * Math.PI / 180)) / 2
      setBaseDisplacement(calc)
      if (ref.current?.getBoundingClientRect().width)
        setWidth(ref.current?.getBoundingClientRect().width + calc * 2 + 16)
    })
  }, [open])

  // Memoized click handler
  const handleClick = useCallback(() => {
    const newOpen = !open
    setOpen(newOpen)
    onExpandChange?.(newOpen)
  }, [open, onExpandChange])

  // Memoized computed style — remove skew when expanded (data should be straight)
  const computedStyle = useMemo(() => ({
    ...style,
    marginLeft: open ? 0 : -baseDisplacement,
    width: open ? undefined : (style?.width ?? (width ? `calc(${width}px)` : undefined)),
    transform: open ? 'none' : style?.transform
  }), [style, baseDisplacement, open, width])

  return (
    <div
      ref={ref}
      className={classNames(
        className,
        'absolute font-din cursor-pointer',
        'transition-all',
        {
          'max-w-[250px]': !open,
          'w-[57vw] !left-0 !top-[22.14vh] !bottom-[3.3vh] !h-auto': open,
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
      style={computedStyle}
      onClick={handleClick}
    >
      {open ? (
        <Expanded totalBet={totalBet} bets={bets} offset={baseDisplacement} />
      ) : (
        <SmallDisplay totalBet={totalBet} bets={bets} offset={baseDisplacement} />
      )}
    </div>
  )
}

export default memo(Bets)
