# Changelog — Virteon POS

## [2.60.05] — 2026-03-27

### Added
- Animacion de galgo corriendo durante carrera activa (sprite 33 frames, 38s desplazamiento L→R)
- Animacion de jinete/caballo para carreras horse (sprite 65 frames)
- Fade out suave del overlay de carrera (2s ease-out)
- Countdown del otro juego junto a rueda de settings (icono reloj + SEG + nombre juego)
- Botones de juego dinamicos: solo muestra juegos habilitados desde API
- Botones distribuidos con space-evenly, orden fijo: dos→doe→dot→hoc
- Loading opaco (fullScreen) hasta que relay tenga datos — evita ver interfaz incompleta
- Deteccion de datos stale (25s sin timeSync) — muestra overlay "Reconectando servidor de carreras"

### Changed
- Config POS Desktop simplificado: solo deviceId requerido
- simulatorUrl y games se resuelven desde /api/ws/discover
- Eliminados del config: mode, generatorSimulatorUrl, dsSimulatorUrl, simulatorUrl, games, apiUrl, _configVersion
- apiUrl hardcodeado a api.virtuales.bet
- Cierre de apuestas a 3 segundos (era 5)
- Overlay de carrera desaparece en countdown 205 (era al final del video)
- Race state: closing se mantiene hasta detectar runningRace (sin flash a betting)
- Version mostrada como 2.60.05

### Fixed
- Desfase entre dialogo "no mas apuestas" y overlay de carrera
- Overlay duraba mas de lo debido (ahora usa countdown >= 205)
- Primer frame del sprite cortado (skip frame 0, usa frames 1-32)
- Loading con timer en useEffect se cancelaba en cada re-render por dependencia countdown
- Papelera desplazada para alinear con boton de impresora
