import { memo, useMemo } from 'react'
import classNames from 'classnames'
import { type Bet } from './index'
import { POSITIONS_IMAGE } from './constants'

interface Props {
  totalBet: number
  bets: Bet[]
  offset?: number
}

function SmallDisplay({ totalBet, bets, offset = 0 }: Props) {
  // Memoize styles to prevent object recreation on each render
  const headerStyle = useMemo(() => ({ paddingLeft: offset + 16 }), [offset])
  const betsAreaStyle = useMemo(() => ({ paddingLeft: offset + 6 }), [offset])
  const footerStyle = useMemo(() => ({ paddingLeft: offset + 16, backgroundColor: '#6c747c' }), [offset])
  return (
    <div className="flex flex-col h-full">
      <div
        className={classNames(
          'flex justify-between items-center bg-yellow-300 text-black',
          'px-4 uppercase w-full overflow-hidden'
        )}
        style={{ ...headerStyle, height: '2.8rem' }}
      >
        <span className="font-din-italic font-thin tracking-[4px] -translate-x-[0.80rem] text-[0.95rem] text-gray-800 shrink-0">Apuesta</span>
        {totalBet > 0 && (
          <span className="font-din font-bold text-[2rem] skew-x-[10deg] text-right whitespace-nowrap">
            {totalBet.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-row h-full">
        {/* Área de apuestas (transparente) */}
        <div
          className={classNames(
            'flex bg-gray-600/35 p-2 rounded-br-[0.5rem] relative overflow-hidden flex-1 items-stretch'
          )}
          style={betsAreaStyle}
        >
          {bets.map((bet) => (
            <div
              key={bet.id}
              className={classNames(
                'flex flex-col not-last:border-r-1 gap-2 border-white p-2 px-3 skew-x-10 min-w-1/5',
                'items-center justify-start'
              )}
            >
              <img
                src={POSITIONS_IMAGE[bet.first]}
                alt={`First: ${bet.first}`}
                className="w-6 h-6 aspect-square object-fill"
              />
              {bet.second !== undefined && (
                <img
                  src={POSITIONS_IMAGE[bet.second]}
                  alt={`Second: ${bet.second}`}
                  className="w-6 h-6"
                />
              )}
            </div>
          ))}
        </div>
        {/* Marco lateral derecho */}
        <div className="w-[5px]" style={{ backgroundColor: '#6c747c' }} />
      </div>
      <div
        style={footerStyle}
        className="uppercase font-din-italic font-normal pl-4 py-1 text-[10px] tracking-[3px] whitespace-nowrap text-gray-400 rounded-br-[2rem]"
      >
        Pulse para abrir el ticket
      </div>
    </div>
  )
}

export default memo(SmallDisplay)
