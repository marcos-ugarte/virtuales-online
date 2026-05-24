# tv-race-embed — Fork de streaming_kit_webapp

## Origen
- Repo: https://github.com/Virtual-Software-Development/streaming_kit_webapp
- Commit base: `4edfe4d` ("opciones de compilacion mejoradas para diferentes targets")
- Vendored el: 2026-05-23
- Versión upstream: videoserver v1.029.11 (PIXI 7.3.3 / React 17 / MobX 6)

## Propósito
Bundle del webview customizado para embeber **solo la fase RACE** en el
LiveMonitor del web-lobby (virtuales-online), sin la matriz de odds,
history panel, runner stats, etc.

## Patches aplicados sobre el upstream
1. `client/src/App.tsx`: agregar lectura del URL param `?raceOnly=true` → setea `settings.raceOnly`
2. `client/src/VideoScreen/dog/VideoScreenDog.ts`: guards `if (!settings.raceOnly)` en los `this.add()` de componentes de intro:
   - oddsScreen, oddsUI, bottomBar, racingHistory, driverPresentation, bonusHistory, topBarLeft, trackPresentation
   - **MANTIENE**: raceBar, raceIntervals, winnerDogs, bonusInfoBar, animatedBonusBar, topBarLeftInfo
3. `client/src/LogicImplementation/LogicImplementation.ts`: si `settings.raceOnly`, saltar fase intro seteando `currentTime = Logic.getIntroLength()` al cargar el video

## Build
```bash
cd tv-race-embed
npm install
npm run build          # genera dist/ con bundle a11 production
```

## Deploy
Servido por un `serve_webapp.py` standalone en puerto **8890** del VPS
(rango firewall 8000:8889 ampliado a 8890 si hace falta). El consumidor
es `web-lobby/src/components/LiveMonitor.tsx` vía `<iframe>`.

## Sincronizar con upstream
Si el upstream `streaming_kit_webapp` recibe mejoras (nuevos gametypes,
fixes), traerlo así:

```bash
git clone https://github.com/Virtual-Software-Development/streaming_kit_webapp /tmp/upstream
rsync -av --delete --exclude=.git /tmp/upstream/ ./tv-race-embed/
# luego reaplicar los 3 patches arriba (manual o vía git stash/apply)
```
