# Plan de Optimizacion de Rendimiento - Virtual Racing POS

## Resumen del Problema

La aplicacion presenta lentitud en dos momentos:
1. **Carga inicial** - Los graficos aparecen lentamente
2. **Al apostar** - Hay lag al hacer click en las apuestas

---

## Diagnostico

### Problemas Identificados

| Problema | Severidad | Impacto |
|----------|-----------|---------|
| 9.0 MB de SVGs cargados al inicio | CRITICO | 2-3 segundos de carga |
| Sin React.memo en componentes | ALTO | 500-800ms lag por apuesta |
| Layout thrashing en Bets | ALTO | 100-200ms extra por apuesta |
| Timer re-renderiza todo cada segundo | MEDIO | Re-renders innecesarios |
| Assets de juegos no usados cargados | MEDIO | 25-50% de bloat |

---

## FASE 1: Optimizaciones Rapidas (1-2 horas)

### 1.1 Agregar React.memo a Componentes

**Archivos a modificar:**
- `src/components/Bets/SmallDisplay.tsx`
- `src/components/Bets/Expanded.tsx`

**Cambio:**
```tsx
// Antes
export default function SmallDisplay({ ... }) { ... }

// Despues
import { memo } from 'react'
function SmallDisplay({ ... }) { ... }
export default memo(SmallDisplay)
```

**Impacto esperado:** Reducir lag de apuestas en 40-60%

---

### 1.2 Optimizar useEffect en Bets

**Archivo:** `src/components/Bets/index.tsx`

**Problema actual (lineas 31-34):**
```tsx
useEffect(() => {
  const calc = ((ref.current?.getBoundingClientRect().height ?? 0) * Math.tan(10 * Math.PI / 180)) / 2
  setBaseDisplacement(calc)
  if (ref.current?.getBoundingClientRect().width)
    setWidth(ref.current?.getBoundingClientRect().width + calc * 2 + 16)
}, [open, bets])  // Se ejecuta en CADA apuesta!
```

**Solucion:**
```tsx
// Usar useMemo para el calculo y solo recalcular cuando cambia 'open'
const baseDisplacement = useMemo(() => {
  if (!ref.current) return 0
  return (ref.current.getBoundingClientRect().height * Math.tan(10 * Math.PI / 180)) / 2
}, [open])

// Remover 'bets' de las dependencias del width
useEffect(() => {
  if (!ref.current) return
  const calc = (ref.current.getBoundingClientRect().height * Math.tan(10 * Math.PI / 180)) / 2
  setWidth(ref.current.getBoundingClientRect().width + calc * 2 + 16)
}, [open])  // Solo cuando se abre/cierra, NO en cada apuesta
```

**Impacto esperado:** Eliminar layout thrashing, reducir 100-200ms por apuesta

---

### 1.3 Memoizar Timer para Evitar Re-renders

**Archivo:** `src/pages/Dashboard/Dashboard.tsx`

**Solucion:** Extraer el timer a un componente separado memoizado

```tsx
// Nuevo archivo: src/components/TimerDisplay/TimerDisplay.tsx
import { memo } from 'react'

interface TimerDisplayProps {
  countdown: number
  progress: number
}

function TimerDisplay({ countdown, progress }: TimerDisplayProps) {
  return (
    <div className={styles.timerContainer}>
      {/* Solo este componente se re-renderiza cada segundo */}
    </div>
  )
}

export default memo(TimerDisplay)
```

**Impacto esperado:** Evitar re-render de todo el Dashboard cada segundo

---

## FASE 2: Optimizacion de Imagenes (2-3 horas)

### 2.1 Optimizar SVGs con SVGO

**Comando para instalar:**
```bash
npm install -D svgo
```

**Script para optimizar todos los SVGs:**
```bash
npx svgo -f src/assets/svg -o src/assets/svg-optimized --multipass
```

**Reduccion esperada:** 30-50% del tamano de SVGs

---

### 2.2 Convertir JPEGs a WebP

**Archivos afectados:**
- `bg_00X_background_*.jpg` (180KB cada uno)

**Comando:**
```bash
# Instalar cwebp
sudo apt install webp

# Convertir
for f in src/assets/svg/*.jpg; do
  cwebp -q 80 "$f" -o "${f%.jpg}.webp"
done
```

**Reduccion esperada:** 25-35% del tamano

---

### 2.3 Crear Sprite Sheet o Data URLs

**Opcion A: CSS Sprite Sheet**
Combinar todos los iconos pequenos en una sola imagen y usar background-position.

**Opcion B: Data URLs (Base64) para iconos pequenos**
Para imagenes < 4KB, embeber como data URL evita peticiones HTTP.

```tsx
// vite.config.ts - ya configurado para assets < 4KB
build: {
  assetsInlineLimit: 4096  // 4KB
}
```

**Nota:** Base64 aumenta el tamano 33%, pero elimina peticiones HTTP.
Para 50+ iconos pequenos, puede ser mas rapido.

---

## FASE 3: Lazy Loading por Juego (3-4 horas)

### 3.1 Separar Assets por Tipo de Juego

**Estructura propuesta:**
```
src/assets/
  games/
    dos/
      background.webp
      selections/
        1-row1.svg
        2-row1.svg
        ...
    doe/
      ...
    hoc/
      ...
    dot/
      ...
  common/
    coins/
    buttons/
    icons/
```

---

### 3.2 Implementar Carga Dinamica

**Archivo:** `src/hooks/useGameAssets.ts`

```tsx
import { useState, useEffect } from 'react'

type GameType = 'dos' | 'doe' | 'hoc' | 'dot'

interface GameAssets {
  background: string
  selections: Record<string, string>
  // ...
}

export function useGameAssets(gameType: GameType) {
  const [assets, setAssets] = useState<GameAssets | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    // Importacion dinamica - solo carga el juego seleccionado
    import(`@/assets/games/${gameType}/index.ts`)
      .then((module) => {
        setAssets(module.default)
        setLoading(false)
      })
  }, [gameType])

  return { assets, loading }
}
```

**Impacto esperado:**
- Carga inicial: Solo 1 juego (~2MB) en vez de 4 (~9MB)
- Reduccion de 75% en carga inicial

---

### 3.3 Precargar Juego Siguiente

```tsx
// Precargar otros juegos en background despues de la carga inicial
useEffect(() => {
  const preloadOtherGames = async () => {
    const otherGames = ['dos', 'doe', 'hoc', 'dot'].filter(g => g !== currentGame)
    for (const game of otherGames) {
      await import(`@/assets/games/${game}/index.ts`)
    }
  }

  // Esperar 3 segundos despues de la carga inicial
  const timer = setTimeout(preloadOtherGames, 3000)
  return () => clearTimeout(timer)
}, [])
```

---

## FASE 4: Optimizaciones Avanzadas (Opcional)

### 4.1 Code Splitting del Dashboard

Separar el Dashboard en chunks mas pequenos:

```tsx
// Lazy load de componentes pesados
const Results = lazy(() => import('@/components/Results'))
const Bets = lazy(() => import('@/components/Bets'))

function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <Results />
      <Bets />
    </Suspense>
  )
}
```

---

### 4.2 Virtual List para Apuestas

Si hay muchas apuestas, usar virtualizacion:

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

// Solo renderiza las apuestas visibles en pantalla
```

---

### 4.3 Web Workers para Calculos

Mover calculos pesados a un Web Worker:

```tsx
// worker.ts
self.onmessage = (e) => {
  const result = heavyCalculation(e.data)
  self.postMessage(result)
}
```

---

## Metricas de Exito

| Metrica | Actual (estimado) | Objetivo |
|---------|-------------------|----------|
| Tiempo de carga inicial | 3-4 segundos | < 1 segundo |
| Lag al apostar | 500-800ms | < 100ms |
| Tamano del bundle | ~9MB | < 3MB |
| Re-renders por segundo | 10+ | 1-2 |

---

## Orden de Implementacion Recomendado

1. **Dia 1 (2 horas)**
   - [ ] React.memo en SmallDisplay y Expanded
   - [ ] Optimizar useEffect en Bets
   - [ ] Medir mejora

2. **Dia 2 (3 horas)**
   - [ ] Optimizar SVGs con SVGO
   - [ ] Convertir JPEGs a WebP
   - [ ] Medir mejora

3. **Dia 3 (4 horas)**
   - [ ] Reorganizar assets por juego
   - [ ] Implementar lazy loading
   - [ ] Medir mejora final

---

## Herramientas de Medicion

```bash
# Analizar bundle
npm run build
npx vite-bundle-visualizer

# Medir rendimiento en Chrome DevTools
# Performance tab > Record > Interactuar con la app
```

---

## Notas sobre Base64

**Pregunta:** La aplicacion original usa imagenes en base64, es para que sean mas ligeras?

**Respuesta:** NO. Base64 aumenta el tamano ~33%. Las razones para usar base64 son:

1. **Eliminar peticiones HTTP** - Cada imagen separada requiere una peticion HTTP. Con 72 imagenes, son 72 peticiones. Base64 embebe las imagenes en el JS/CSS, eliminando esas peticiones.

2. **Critico para conexiones lentas** - En conexiones lentas, muchas peticiones pequenas son peor que una grande.

3. **Cache mas simple** - Todo el bundle se cachea junto.

**Cuando usar base64:**
- Imagenes pequenas (< 4KB)
- Muchos iconos pequenos
- Conexiones con alta latencia

**Cuando NO usar base64:**
- Imagenes grandes (> 10KB)
- Imagenes que cambian frecuentemente
- Cuando el bundle ya es muy grande

**Recomendacion para este proyecto:**
- Iconos pequenos (< 4KB): Usar base64 (Vite ya lo hace automaticamente)
- Backgrounds grandes: Mantener como archivos separados pero convertir a WebP
- Implementar lazy loading por juego
