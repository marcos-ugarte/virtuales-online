import styles from './Results.module.css'

// Import beLiNumb SVGs for DOS (6 dogs) - these are the small colored indicators
import dosNumber1 from '@/assets/svg/bg_264_beLiNumb_dos_number1.svg'
import dosNumber2 from '@/assets/svg/bg_269_beLiNumb_dos_number2.svg'
import dosNumber3 from '@/assets/svg/bg_268_beLiNumb_dos_number3.svg'
import dosNumber4 from '@/assets/svg/bg_265_beLiNumb_dos_number4.svg'
import dosNumber5 from '@/assets/svg/bg_267_beLiNumb_dos_number5.svg'
import dosNumber6 from '@/assets/svg/bg_266_beLiNumb_dos_number6.svg'

// Import beLiNumb SVGs for DOE (8 dogs)
import doeNumber1 from '@/assets/svg/bg_188_beLiNumb_doe_number1.svg'
import doeNumber2 from '@/assets/svg/bg_172_beLiNumb_doe_number2.svg'
import doeNumber3 from '@/assets/svg/bg_176_beLiNumb_doe_number3.svg'
import doeNumber4 from '@/assets/svg/bg_169_beLiNumb_doe_number4.svg'
import doeNumber5 from '@/assets/svg/bg_171_beLiNumb_doe_number5.svg'
import doeNumber6 from '@/assets/svg/bg_170_beLiNumb_doe_number6.svg'
import doeNumber7 from '@/assets/svg/bg_180_beLiNumb_doe_number7.svg'
import doeNumber8 from '@/assets/svg/bg_183_beLiNumb_doe_number8.svg'

// Mapping of dog numbers to SVG assets by game type
const POSITION_INDICATORS: Record<string, Record<number, string>> = {
  dos: {
    1: dosNumber1,
    2: dosNumber2,
    3: dosNumber3,
    4: dosNumber4,
    5: dosNumber5,
    6: dosNumber6,
  },
  dot: {
    // DOT uses same assets as DOS for now
    1: dosNumber1,
    2: dosNumber2,
    3: dosNumber3,
    4: dosNumber4,
    5: dosNumber5,
    6: dosNumber6,
  },
  doe: {
    1: doeNumber1,
    2: doeNumber2,
    3: doeNumber3,
    4: doeNumber4,
    5: doeNumber5,
    6: doeNumber6,
    7: doeNumber7,
    8: doeNumber8,
  },
  hoc: {
    // HOC uses same assets as DOE for now (horses have similar colors)
    1: doeNumber1,
    2: doeNumber2,
    3: doeNumber3,
    4: doeNumber4,
    5: doeNumber5,
    6: doeNumber6,
    7: doeNumber7,
  },
}

interface PositionIndicatorProps {
  number: number
  gameType?: 'dos' | 'dot' | 'doe' | 'hoc'
  className?: string
}

export function PositionIndicator({
  number,
  gameType = 'dos',
  className = ''
}: PositionIndicatorProps) {
  const indicators = POSITION_INDICATORS[gameType] || POSITION_INDICATORS.dos
  const svgSrc = indicators[number]

  if (!svgSrc) {
    return null
  }

  return (
    <div className={`${styles.positionIndicator} ${className}`}>
      <img
        src={svgSrc}
        alt={`${number}`}
        className={styles.positionIndicatorImg}
      />
    </div>
  )
}
