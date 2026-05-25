import { useCallback, useRef, useEffect, useMemo } from 'react'
import numpadSvgRaw from '@/assets/svg/bg_459_sumBetsContain.svg?raw'
import styles from './DotNumpad.module.css'

interface DotNumpadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  onGemela?: () => void
  onTrio?: () => void
}

// SVG element IDs mapped to their values
const BUTTON_IDS: Record<string, string> = {
  numbutt_x5F_1: '1',
  numbutt_x5F_2: '2',
  numbutt_x5F_3: '3',
  numbutt_x5F_4: '4',
  numbutt_x5F_5: '5',
  numbutt_x5F_6: '6',
  numbutt_x5F_7: '7',
  numbutt_x5F_8: '8',
  numbutt_x5F_9: '9',
  numbutt_x5F_0: '0'
}

// Additional clickable elements for number buttons (number paths)
const NUMBER_IDS: Record<string, string> = {
  _x31_: '1',
  _x32_: '2',
  _x33_: '3',
  _x34_: '4',
  _x35_: '5',
  _x36_: '6',
  _x37_: '7',
  _x38_: '8',
  _x39_: '9',
  _x30_: '0'
}

export function DotNumpad({ value, onChange, maxLength = 6, onGemela, onTrio }: DotNumpadProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Process SVG content with cursor styles and proper rendering
  const svgContent = useMemo(() => {
    let modifiedSvg = numpadSvgRaw

    // Ensure SVG renders from top and scales properly
    modifiedSvg = modifiedSvg.replace(
      /<svg /,
      '<svg preserveAspectRatio="xMidYMin meet" '
    )

    // Add pointer cursor and hover states via CSS classes
    Object.keys(BUTTON_IDS).forEach(id => {
      modifiedSvg = modifiedSvg.replace(
        new RegExp(`id="${id}"`, 'g'),
        `id="${id}" class="numpad-btn" style="cursor:pointer"`
      )
    })

    // Also make backspace and clear buttons interactive
    modifiedSvg = modifiedSvg.replace(
      /id="butt_x5F_b"/g,
      'id="butt_x5F_b" class="numpad-btn" style="cursor:pointer"'
    )
    modifiedSvg = modifiedSvg.replace(
      /id="back"/g,
      'id="back" class="numpad-btn" style="cursor:pointer"'
    )
    modifiedSvg = modifiedSvg.replace(
      /id="c_1_"/g,
      'id="c_1_" class="numpad-btn" style="cursor:pointer"'
    )

    // Make top header buttons (GEMELA/CONTRA) interactive
    modifiedSvg = modifiedSvg.replace(
      /id="fcbutt_x5F_li"/g,
      'id="fcbutt_x5F_li" class="numpad-btn" style="cursor:pointer"'
    )
    modifiedSvg = modifiedSvg.replace(
      /id="fcbutt_x5F_re"/g,
      'id="fcbutt_x5F_re" class="numpad-btn" style="cursor:pointer"'
    )

    // Inject GEMELA, TRÍO and SUMA text labels directly into the SVG
    // These need to be added before the closing </svg> tag
    // Button positions from SVG: fcbutt_x5F_li (x≈79-243, center ~161), fcbutt_x5F_re (x≈250-405, center ~327)
    // Input field is around x=170-290, y=60-100
    // Numpad Row 1 (1,2,3) starts at y≈110
    // Original POS font: "DIN Next LT Pro", weight 400, size 9.75px (780px viewport)
    // Original POS transform: matrix(1, 0, -0.176327, 1, 0, 0) = skewX(-10deg)
    const gemelaText = '<text id="gemela-label" x="161" y="36" text-anchor="middle" font-size="24" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff" style="pointer-events:none" transform="skewX(-10)">GEMELA</text>'
    const trioText = '<text id="trio-label" x="327" y="36" text-anchor="middle" font-size="24" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff" style="pointer-events:none" transform="skewX(-10)">TRÍO</text>'
    // SUMA label: positioned left of input field, between GEMELA/TRÍO buttons and numpad row 1
    const sumaText = '<text id="suma-label" x="165" y="105" text-anchor="end" font-size="26" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="bold" font-style="italic" fill="#ffffff" style="pointer-events:none;letter-spacing:2px">SUMA</text>'

    modifiedSvg = modifiedSvg.replace(
      '</svg>',
      `${gemelaText}${trioText}${sumaText}</svg>`
    )

    return modifiedSvg
  }, [])

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1))
    } else if (key === 'clear') {
      onChange('')
    } else if (value.length < maxLength) {
      onChange(value + key)
    }
  }, [value, onChange, maxLength])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement

    // Find the closest group element with an ID we recognize
    let element: SVGElement | null = target
    let foundId: string | null = null

    while (element && !foundId) {
      const id = element.id || element.getAttribute?.('id')

      if (id) {
        // Check if it's a number button
        if (BUTTON_IDS[id]) {
          foundId = BUTTON_IDS[id]
          break
        }
        // Check if it's a number path
        if (NUMBER_IDS[id]) {
          foundId = NUMBER_IDS[id]
          break
        }
        // Check if it's backspace
        if (id === 'butt_x5F_b' || id === 'back') {
          handleKeyPress('backspace')
          return
        }
        // Check if it's clear (the C button at the end)
        if (id === 'c_1_' || id.includes('butt_x5F_b_00000011751720698885209040000013794321890742912923')) {
          handleKeyPress('clear')
          return
        }
        // Check if it's GEMELA button (left button in header)
        if (id === 'fcbutt_x5F_li') {
          onGemela?.()
          return
        }
        // Check if it's TRÍO button (right button in header)
        if (id === 'fcbutt_x5F_re') {
          onTrio?.()
          return
        }
      }

      element = element.parentElement as SVGElement | null
    }

    if (foundId) {
      handleKeyPress(foundId)
    }
  }, [handleKeyPress, onGemela, onTrio])

  // Update the input field text in SVG to show current value
  useEffect(() => {
    if (!containerRef.current) return

    const svg = containerRef.current.querySelector('svg')
    if (!svg) return

    // Find the input field area and update it
    // The input field is in the #inputfield group
    // We'll create a text element to display the value
    let textElement = svg.querySelector('#suma-value-text') as SVGTextElement

    if (!textElement) {
      textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      textElement.setAttribute('id', 'suma-value-text')
      textElement.setAttribute('x', '280')
      textElement.setAttribute('y', '102')
      textElement.setAttribute('text-anchor', 'end')
      textElement.setAttribute('font-size', '36')
      textElement.setAttribute('font-family', 'Arial, sans-serif')
      textElement.setAttribute('font-weight', 'bold')
      textElement.setAttribute('fill', '#06133c')

      const inputField = svg.querySelector('#inputfield')
      if (inputField) {
        inputField.appendChild(textElement)
      }
    }

    textElement.textContent = value || ''
  }, [value, svgContent])

  return (
    <div
      ref={containerRef}
      className={styles.dotNumpad}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

export default DotNumpad
