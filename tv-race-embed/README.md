# odroid_a11_webapp_src

Aplicación web para visualización de eventos de deportes virtuales en tiempo real. Corre en navegadores embebidos de terminales de apuesta y dispositivos Android TV, y se sincroniza con un servidor central para mantener todos los dispositivos en el mismo punto del loop de juego.

---

## Índice

1. [Visión general](#visión-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Tipos de juego soportados](#tipos-de-juego-soportados)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Comandos de build](#comandos-de-build)
6. [Ciclo de vida de la aplicación](#ciclo-de-vida-de-la-aplicación)
7. [Sistema de sincronización de video](#sistema-de-sincronización-de-video)
8. [Comunicación con el servidor](#comunicación-con-el-servidor)
9. [Sistema de renderizado](#sistema-de-renderizado)
10. [Internacionalización](#internacionalización)
11. [Configuración por URL](#configuración-por-url)
12. [Tipos de dispositivo y modos](#tipos-de-dispositivo-y-modos)
13. [Notas de arquitectura](#notas-de-arquitectura)

---

## Visión general

La aplicación muestra loops de video de carreras virtuales o combates (intro → carrera → resultado), sincronizados con un servidor que controla el estado global de la ronda. Múltiples dispositivos (terminales de apuesta, pantallas de sala) reproducen el mismo video en el mismo momento, coordinados por el servidor.

**Flujo básico:**
```
Arranque
  └─ Obtiene URL del WebSocket (por deviceId desde la API)
  └─ Conecta al WebSocket del servidor de juego
  └─ Recibe configuración inicial (tipo de juego, skin, idioma, pool de rondas)
  └─ Calcula offset de tiempo para sincronizar el video con el servidor
  └─ Reproduce loop: Intro → Race → Result → (siguiente ronda)
       con overlays gráficos renderizados sobre el video
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React | 17.0.2 |
| Lenguaje | TypeScript | 5.2.2 |
| Gráficos | PIXI.js (WebGL 2D) | 7.3.3 |
| Estado | MobX + mobx-react-lite | 6.10.0 / 3.4.0 |
| Bundler | Webpack | 5.89.0 |
| Transpilador | Babel (`@babel/preset-env`) | 7.23.0 |
| Streaming | mediasoup-client (WebRTC) | 3.7.0 |
| HTTP | Axios | 1.6.0 |
| Caché local | idb (IndexedDB wrapper) | 7.1.1 |
| Fechas | dateformat | 5.0.3 |

**Target de compilación:** Chrome 72+ (dispositivos Android TV de generación 2019).

---

## Tipos de juego soportados

| `eventtype` (servidor) | `gameType` (interno) | Descripción | Competidores |
|---|---|---|---|
| `dog` | `dog6` | Carreras de galgos | 6 perros |
| `dog8` | `dog8` | Carreras de galgos | 8 perros |
| `dog63` | `dog63` | Carreras de galgos (modo italiano) | 6 perros |
| `horse` | `horse` | Carreras de caballos | variable |
| `sulky` | `sulky` | Carreras de trote (sulky) | variable |
| `kart` | `kart5` | Carreras de karts | 5 karts |
| `wgp` | `box` | Kickboxing (World Grand Prix) | 2 luchadores |
| `rtt` | `roulette` | Ruleta C4 | — |

### Skins disponibles

| `SkinType` | `SkinTypeDefinition` | Descripción |
|---|---|---|
| `10` | `MODERN` | Skin moderno (default) |
| `11` | `MODERN_ODDS_ALWAYS_ON` | Moderno con cuotas siempre visibles |
| `1` | `CLASSIC` | Skin clásico C4 (fondo oscuro, overlays diferentes) |

### Duraciones de loop soportadas (`GameLength` en segundos)

`60 | 120 | 180 | 240 | 300 | 320 | 360 | 384 | 432`

Cada combinación de tipo de juego + duración tiene valores precisos de `GAME_VIDEO_START_MS` e `INTRO_VIDEO_LENGTH` definidos en `LogicImplementation.ts`.

---

## Estructura del proyecto

```
odroid_a11_webapp_src/
│
├── client/
│   ├── assets/                        # Recursos estáticos (imágenes, fuentes)
│   │   ├── dog/, horse/, kart/, ...   # Assets por tipo de juego
│   │   ├── kickbox/                   # Fondos y hexágonos WGP
│   │   └── c4/                        # Assets skin clásico C4
│   │
│   ├── settings/                      # Configuraciones de UI por juego
│   │   ├── BottomBarSettings.ts       # Barra inferior (colores, posiciones)
│   │   ├── C4Settings.ts             # Parámetros skin Classic
│   │   ├── OddsAlwaysOnSettings.ts   # Cuotas siempre visibles
│   │   ├── RaceElementsSettings.ts   # Elementos durante la carrera
│   │   └── TrackPresentationSettings.ts  # Presentación del circuito
│   │
│   └── src/
│       ├── App.tsx                    # Componente raíz: inicializa settings, RTC y React
│       ├── main.ts                    # Entry point webpack + HMR
│       ├── MainHelper.tsx             # Helpers de montaje React
│       ├── PathUtil.ts                # Utilidades de rutas de assets
│       ├── globals.d.ts               # Declaraciones globales (webpackConfig)
│       ├── styles.css                 # Estilos globales
│       │
│       ├── Graphics/                  # Motor gráfico PIXI.js
│       │   ├── Engine.ts             # Inicialización del renderer WebGL
│       │   ├── Group.ts              # Contenedor de sprites con helpers
│       │   └── DynamicMesh.ts        # Geometría dinámica para animaciones
│       │
│       ├── Logic/                     # Capa de abstracción de lógica
│       │   ├── Logic.ts              # Singleton principal (estado MobX observable)
│       │   ├── LogicBase.ts          # Clase base con helpers de video y assets
│       │   ├── LogicDefinitions.ts   # Interfaces del dominio (IDriver, IRoundHistory, etc.)
│       │   ├── Logger.ts             # Sistema de logging (consola + HTTP remoto)
│       │   ├── ErrorHelper.ts        # Helpers de errores
│       │   ├── Messages.ts           # Tipos de mensajes React Native bridge
│       │   └── MessageBridge.ts      # Bridge WebView ↔ React Native
│       │
│       ├── LogicImplementation/       # Lógica de juego concreta
│       │   ├── LogicImplementation.ts # Core (~2650 líneas): loop, sincronización, estado
│       │   ├── GamesModel.ts         # Cola de rondas (pasadas, actual, futuras)
│       │   ├── SyncHelper.ts         # Interface ISyncInfo para cálculo de sincronización
│       │   ├── ErrorHandler.ts       # Definición y display de errores
│       │   ├── Localisation.ts       # Textos localizados por tipo de juego
│       │   ├── HardwareRelatedSettings.ts  # Ajustes por modelo de hardware
│       │   ├── HardcodedOddsDigits.ts      # Datos de cuotas hardcodeados
│       │   ├── Dog63Quotes.ts        # Textos específicos del juego dog63
│       │   ├── ModelDog.ts           # Datos estáticos del juego dog/dog8/dog63
│       │   ├── ModelHorse.ts         # Datos estáticos del juego horse
│       │   ├── ModelKart.ts          # Datos estáticos del juego kart
│       │   ├── ModelSulky.ts         # Datos estáticos del juego sulky
│       │   ├── ModelKickbox.ts       # Datos estáticos del juego WGP/kickbox
│       │   ├── ModelDog6C4.ts        # Datos dog variante Classic C4
│       │   ├── ModelHorseC4.ts       # Datos horse variante Classic C4
│       │   ├── ModelRouletteC4.ts    # Datos ruleta variante Classic C4
│       │   └── base/
│       │       ├── GamesModelBase.ts     # Clase base del modelo de rondas
│       │       ├── ErrorHandlerBase.ts   # Clase base del manejador de errores
│       │       └── LocalisationBase.ts   # Clase base de traducciones
│       │
│       ├── LogicImplementationDummy/  # Implementaciones de prueba (sin servidor)
│       │   ├── LogicImplementationDummy.ts  # Loop simulado para desarrollo
│       │   ├── DummyModelDog6.ts
│       │   ├── DummyModelDog63.ts
│       │   ├── DummyModelHorse.ts
│       │   ├── DummyModelKart5.ts
│       │   ├── DummyModelKickbox.ts
│       │   └── ...                   # Un dummy por tipo de juego
│       │
│       ├── Rtc/
│       │   └── RtcLogic.ts           # WebRTC via mediasoup (modo producer/consumer)
│       │
│       ├── ServerWebSocket/           # Comunicación WebSocket con el servidor de juego
│       │   ├── ServerSocketLogic.ts  # Obtiene URL del WS, gestiona reconexión
│       │   ├── ServerSocketClient.ts # Cliente WebSocket
│       │   └── base/
│       │       ├── ServerSocketLogicBase.ts  # Lógica de mensajes WS
│       │       └── ServerSocketClientBase.ts # Implementación base del cliente
│       │
│       ├── Ternimal/                  # Bridge con app de terminal nativa
│       │   └── IpcChannelInterface.ts # ISoftware (hideVideoLoadScreen), ISystem
│       │
│       ├── Ui/                        # Componentes React de UI
│       │   ├── ReactConsumer.tsx     # Vista modo consumer (pantalla de sala)
│       │   ├── ReactProducer.tsx     # Vista modo producer (panel de control)
│       │   ├── ReactProducerTools.tsx
│       │   ├── ReactHelper.ts
│       │   ├── StartOverlay.tsx      # Overlay de carga inicial
│       │   └── UpdateOverlay.tsx     # Overlay de actualización de contenido
│       │
│       ├── Update/                    # Sistema de caché de assets
│       │   ├── LocalCache.ts         # Cache API del navegador
│       │   └── IndexDB.ts            # IndexedDB para persistencia
│       │
│       └── VideoScreen/               # Renderizado PIXI.js de overlays
│           ├── VideoRef.ts           # Referencia al elemento <video>
│           ├── DoubleVideoSource.ts  # Doble fuente de video (intro/race)
│           ├── UIHelper.ts           # Helpers de UI para PIXI
│           ├── common/               # Componentes gráficos reutilizables
│           │   ├── Anim.ts           # Sistema de animaciones
│           │   ├── FadeVideo.ts      # Transiciones entre intro y race
│           │   ├── FontLoader.ts     # Carga de fuentes PIXI
│           │   ├── MultiStyleText.ts # Texto con múltiples estilos inline
│           │   ├── RunningNumber.ts  # Número animado (cuenta regresiva)
│           │   └── C4/               # Componentes exclusivos del skin Classic
│           │       ├── HistoryBar.ts
│           │       ├── TimerBar.ts
│           │       └── ...
│           ├── Util/
│           │   ├── ColorsHelper.ts   # Paleta de colores por juego
│           │   └── LayoutHelper.ts   # Posicionamiento responsivo
│           ├── dog/                  # Overlays carrera de perros
│           ├── dog63/                # Overlays dog63 (modo italiano)
│           ├── horse/                # Overlays carreras de caballos
│           ├── horseDog6C4/          # Overlays skin C4 (horse + dog)
│           ├── kart/                 # Overlays carreras de karts
│           ├── kickbox/              # Overlays WGP kickboxing
│           ├── rouletteC4/           # Overlays ruleta C4
│           └── pauseOverlay/         # Overlay de pausa por tipo de juego
│
├── common/
│   └── src/
│       ├── Definitions.ts            # Tipos y enums compartidos (GameType, SkinType, mensajes WS)
│       ├── Settings.ts               # URLs y timeouts de configuración global
│       ├── Util.ts                   # Utilidades generales (URL params, deepCopy, fechas)
│       ├── FadeDurations.ts          # Duración de transiciones por skin
│       └── Color.ts                  # Helpers de color (ARGB, hex)
│
├── rtclib/                            # Librería RTC local pre-compilada
│   ├── dist/
│   │   ├── index.js                  # Entry point CommonJS
│   │   ├── index.d.ts                # Declaraciones de tipos
│   │   ├── MediaSoupConsumer.js
│   │   ├── MediaSoupProducer.js
│   │   └── ...
│   └── package.json
│
├── webpack.config.js                  # Configuración de Webpack
├── tsconfig.json                      # Configuración de TypeScript
└── package.json
```

---

## Comandos de build

```bash
# Instalar dependencias
npm install

# Build de producción (minificado, con source map externo)
npm run build

# Build de desarrollo (no minificado, source maps inline, más rápido)
npm run build:dev

# Servidor de desarrollo con Hot Module Replacement en puerto 3000
npm start
```

### Alias de módulos (webpack + tsconfig paths)

```
client/*        →  client/src/*
client/assets/* →  client/assets/*
common/*        →  common/src/*
assets/*        →  client/assets/*
settings/*      →  client/settings/*
rtclib          →  rtclib/dist/index.js
```

### Nota sobre `transpileOnly: true`

El build usa `transpileOnly: true` en ts-loader: TypeScript transpila sin verificar tipos, lo que hace el build significativamente más rápido. Como consecuencia, los errores de tipos solo son visibles en el editor (VS Code). Los imports que son exclusivamente tipos de TypeScript se eliminan del output antes de que webpack los procese.

---

## Ciclo de vida de la aplicación

```
1. main.ts         → monta App
2. App.tsx         → lee parámetros de URL, configura settings, inicia RTC
3. LogicImplementation.onInit()
   ├── GET https://api.virtuales.bet/dsa4/?cmd=WebSocketRequest&deviceId=...
   │     → obtiene la URL del WebSocket + gameType
   └── init(firstSetUp: true)
       └── WebSocket conecta al servidor de juego
           └── Recibe mensaje "init":
               ├── Configuración del juego (skin, idioma, tipo de evento, duración)
               ├── Pool de rondas (gamepool: pasadas + actual + futuras)
               └── URLs de video de intro
                   └── initialSetUp()
                       ├── Calcula constantes de tiempo (GAME_VIDEO_START_MS, INTRO_VIDEO_LENGTH)
                       ├── Crea GameTimer (loop de 500ms)
                       ├── Carga textura de intro
                       ├── Configura internacionalización
                       └── Inicia renderizado PIXI
```

### Estados de video (`VideoState`)

```
Intro  →  (en GAME_VIDEO_START_MS)  →  Race  →  (al final del loop)  →  (siguiente Intro)
```

En `raceBreak` (no hay ronda programada), la aplicación entra en modo pausa y solicita nuevas rondas al servidor cada `RACE_BREAK_REQU_INTERVAL` segundos (default: 60s).

---

## Sistema de sincronización de video

El servidor define un loop de tiempo global. Cada dispositivo debe reproducir el video en el punto exacto que corresponde al momento actual dentro de ese loop.

### Constantes de tiempo clave

| Constante | Descripción |
|---|---|
| `GAME_LOOP_LENGTH` | Duración total del loop en segundos (ej: 240s) |
| `GAME_VIDEO_START_MS` | Milisegundo del video de intro en que la cuenta regresiva llega a 0 |
| `INTRO_VIDEO_LENGTH` | Segundo del video en que cambia de estado Intro → Race |
| `raceVideoDelay` | Delay del video de carrera respecto al tiempo del servidor (default: 2400ms) |
| `extraLoadTime` | Compensación de latencia de carga por hardware (0ms en standard, 250ms en ODROID M1S) |
| `MAX_START_OFFSET` | Offset máximo aceptable en arranque (200ms) |
| `MAX_INTRO_OFFSET` | Offset máximo en intro antes de corregir (400ms) |
| `MAX_RACE_OFFSET` | Offset máximo en carrera antes de corregir (800ms) |

### Mecanismo

1. **GameTimer** corre cada 500ms y calcula el segundo actual dentro del loop comparando con el tiempo del servidor.
2. `calcSyncInfo()` compara `videoTime` (tiempo de reproducción local) con `serverVideoTime` (tiempo del servidor). La diferencia `diff` determina si hay que adelantar, retrasar o dejar el video.
3. Si `continiousSync = true` (activado desde el servidor o por URL), la corrección se aplica continuamente. Si es false, solo al inicio del loop.
4. `maxRaceSyncUpdates` limita las correcciones durante la carrera para no interrumpir la fluidez.

### Hardware soportado

| `hardwareType` | `extraLoadTime` |
|---|---|
| `standard` | 0 ms |
| `odroidm1s` | 250 ms |

Se configura con el parámetro de URL `hardwareType`.

---

## Comunicación con el servidor

### REST API (`https://api.virtuales.bet`)

| Endpoint | Descripción |
|---|---|
| `GET /dsa4/?cmd=WebSocketRequest&deviceId=...&deviceType=AndroidTv2` | Obtiene la URL del WebSocket para el dispositivo + gameType |
| `GET /dsa4/?cmd=logoRequest&type=videooverlay&name=...` | Textura del logo de la empresa (skin Modern) |
| `GET /dsa4/?cmd=logoRequest&type=videooverlayTv2&name=...` | Textura del logo (skin Classic) |
| `GET /dsa4/?cmd=geonamesRequest&lat=...&lng=...` | Datos de zona horaria por geolocalización |

### WebSocket (servidor de juego)

El servidor envía mensajes tipados (`SockServMessageType`):

| Tipo de mensaje | Descripción |
|---|---|
| `init` | Configuración completa + pool inicial de rondas |
| `gameRound` | Nuevas rondas para mantener el pool actualizado |
| `gameResult` | Resultado detallado de una ronda (posiciones, tiempos, cuotas) |
| `time` | Tiempo del servidor para sincronización |
| `translation` | Actualización de textos localizados |
| `reconnect` | Instrucción de reconexión |
| `sendLog` | Confirmación de log recibido |
| `error` | Error del servidor |

El dispositivo se identifica por `deviceId` (MAC address del dispositivo, ej: `90:00:00:00:00:01`).

### Reconexión

Si la conexión WebSocket se interrumpe, `ServerSocketLogicBase` implementa lógica de reconexión automática con `socketClosedRetryTime` (default: 10 segundos).

---

## Sistema de renderizado

La aplicación usa **dos capas** superpuestas:

```
┌─────────────────────────────────┐
│  React UI (HTML/CSS)            │  ← Overlays de carga, error, debug
│  ┌───────────────────────────┐  │
│  │  PIXI.js Canvas (WebGL)   │  │  ← Gráficos del juego (cuotas, nombres, resultados)
│  │  ┌─────────────────────┐  │  │
│  │  │  Elemento <video>   │  │  │  ← Video de intro/carrera
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### PIXI.js

Cada tipo de juego tiene su propia clase `VideoScreen*` que hereda del engine gráfico:
- Gestiona `Sprite`, `Text`, `Graphics` de PIXI
- Anima cuotas, nombres de corredores, cuenta regresiva, historial
- `FadeVideo` maneja las transiciones entre intro y carrera (2 segundos de fade)
- `FadeDurations` configura la duración según el skin activo

### Doble fuente de video

`DoubleVideoSource` mantiene dos elementos `<video>` para hacer crossfade suave entre el video de intro y el video de carrera sin interrupción de reproducción.

---

## Internacionalización

El sistema de idiomas carga traducciones desde el servidor al inicializarse (en el mensaje `init`). Las traducciones son tokens con texto, tamaño de fuente y espaciado de caracteres.

```typescript
Languages.instance.setText("lapLength")       // devuelve texto en el idioma activo
Languages.instance.updateLanguage("it", false) // cambia al italiano
```

Idiomas soportados dependen de la configuración del servidor. El parámetro `forceLanguage` en la URL permite forzar un idioma específico independientemente de la configuración del servidor.

Los textos del juego dog63 en italiano tienen un sistema adicional de citas (`Dog63Quotes.ts`) con frases especiales según el resultado.

---

## Configuración por URL

La aplicación se configura completamente por parámetros en la URL:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `deviceid` | `string` | ID del dispositivo (MAC address). Default: `90:00:00:00:00:01` |
| `deviceType` | `string` | `terminal` para terminales de apuesta, `androidtv2` para pantallas |
| `hardwareType` | `string` | `standard` (default) o `odroidm1s` (añade 250ms de extraLoadTime) |
| `width` | `number` | Ancho de pantalla en píxeles (se calcula alto en proporción 16:9) |
| `gameType` | `string` | Forzar tipo de juego (ignora lo que diga el servidor) |
| `gameSkin` | `number` | Forzar skin (`1`=Classic, `10`=Modern, `11`=Modern Odds Always On) |
| `gameLength` | `number` | Forzar duración del loop de juego en segundos |
| `eventType` | `string` | Forzar tipo de evento |
| `languageId` | `string` | ID de idioma inicial |
| `forceLanguage` | `string` | Forzar idioma (ej: `it`, `en`) sobrescribiendo la config del servidor |
| `contsync` | `boolean` | Sincronización continua de video (default: según servidor) |
| `extraload` | `number` | Tiempo extra de carga en ms (sobrescribe el valor de hardware) |
| `maxraceupd` | `number` | Máximo de correcciones de sync durante la carrera |
| `showUI` | `boolean` | Mostrar UI de debug |
| `showDebug` | `boolean` | Mostrar información de sincronización en pantalla |
| `showDebugTextColor` | `boolean` | Debug de colores de texto |
| `showText` | `boolean` | Mostrar textos de debug |
| `showBonus` | `boolean` | Forzar visualización de bonus |
| `useOverlays` | `boolean` | Habilitar overlays de video (default: `true`) |
| `sdCardPath` | `string` | Ruta base a videos en almacenamiento local (ej: `/sdcard/`) |
| `streamScreen` | `boolean` | Modo pantalla de stream (sin audio) |
| `speed` | `number` | Factor de velocidad de reproducción (default: `1.0`) |
| `videoStartTime` | `number` | Tiempo de inicio de video forzado |
| `stopAfterSeek` | `boolean` | Detener video después de buscar posición |
| `syncStartTimeParameter` | `boolean` | Sincronizar tiempo de inicio por parámetro |
| `useCache` | `boolean` | Usar caché local de assets (Service Worker / IndexedDB) |
| `forceReloadContent` | `boolean` | Forzar recarga de contenido cacheado |
| `startImmediately` | `boolean` | Iniciar reproducción sin esperar a `canplay` |
| `forceDummyLogic` | `boolean` | Usar lógica dummy (sin servidor, para desarrollo) |
| `inGameRender` | `boolean` | Modo in-game render (envía eventos al parent frame) |
| `screenId` | `string` | ID de pantalla para identificación |
| `devUser` | `string` | Usuario de desarrollo |
| `id` | `string` | ID de sesión RTC (para modo producer/consumer) |
| `roomId` | `string` | ID de sala RTC |
| `type` | `string` | Rol RTC: `producer` para emisor, consumer si se omite |
| `fileLogLevel` | `string` | Nivel de log remoto (`debug`, `info`, `warn`, `error`) |
| `logServerUrl` | `string` | URL del servidor de logs HTTP remoto |
| `autoDisconnect` | `number` | Tiempo en ms antes de auto-desconexión RTC |

---

## Tipos de dispositivo y modos

### Modo `androidtv2` (pantalla de sala)
Dispositivo Android TV que muestra el video directamente. Se conecta al servidor vía WebSocket y reproduce el loop de video de forma autónoma.

### Modo `terminal`
Terminal de apuesta que corre la webapp embebida en una aplicación nativa. La app nativa expone la interfaz `window.software` (con `hideVideoLoadScreen()`) para comunicarse con la webapp. Los videos se reproducen desde la SD card local (`sdCardPath`).

### Modo producer/consumer (RTC)
Permite que un dispositivo `producer` transmita el stream de video en tiempo real a múltiples `consumer` via WebRTC (mediasoup). El producer genera el video y lo emite; los consumers lo reciben y muestran.

### Modo in-game render (`inGameRender=true`)
La webapp corre dentro de un iframe de otra aplicación y envía eventos `postMessage` al parent (para cerrar la pantalla de carga, indicar estado, etc.). El `targetOrigin` de los mensajes se configura en `Settings.terminalSettings.targetOrigin`.

---

## Notas de arquitectura

### MobX como fuente de verdad
`Logic.ts` es el singleton observable de MobX. Los componentes React se suscriben reactivamente a sus propiedades. Cambios en el estado del juego (VideoState, modelo actual) disparan re-renders automáticos.

### GamesModel: cola de rondas
Mantiene una ventana deslizante de rondas:
- `INIT_NUMB_PAST = 8` rondas pasadas (para mostrar historial)
- 1 ronda actual
- `INIT_NUMB_FUTURE = 2` rondas futuras (para preparar el siguiente video)

Cuando el servidor envía nuevas rondas (`gameRound`), se insertan en la cola desplazando las más antiguas.

### Caché de assets
`LocalCache` (Cache API del browser) guarda los videos de intro para que el siguiente ciclo no requiera descarga. Se activa con `useCache=true`. `IndexDB` almacena datos persistentes entre sesiones.

### Geolocalización de zona horaria
Al iniciarse, la app obtiene la zona horaria del dispositivo usando la IP pública (via `ip-api.com`) para mostrar horarios locales correctos en el UI. El resultado se cachea y se reintenta cada `geolocIntervalTryTime` (60s) hasta `geolocIntervalMaxCount` veces.

### Versión
La versión actual de la aplicación es **1.029.11** (definida en `Settings.versionNumber` y `package.json`).
