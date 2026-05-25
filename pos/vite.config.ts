import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Virtual Racing POS - Vite Configuration
 *
 * IMPORTANT: This application MUST always run on:
 * - Port: 4069
 * - Host: 0.0.0.0 (allows external access from any network interface)
 *
 * Access URLs:
 * - Local: http://localhost:4069
 * - Network: http://<server-ip>:4069
 */
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:4500'
  console.log('[Vite Config] API URL:', apiUrl)

  return {
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],

  // Path aliases for clean imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/services': path.resolve(__dirname, './src/services'),
    },
  },

  // Development server configuration
  server: {
    port: 4069,          // ALWAYS use port 4069
    host: '0.0.0.0',     // Allow external access
    strictPort: true,    // Fail if port is already in use
    open: false,         // Don't auto-open browser (server environment)
    cors: true,
    allowedHosts: true,  // Allow access from any host (IP, localhost, subdomains)
    // HTTPS with self-signed cert (needed so browser allows fetch to localhost print server)
    https: fs.existsSync(path.resolve(__dirname, 'certs/key.pem')) ? {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
    } : undefined,
    // Proxy API requests to backend
    // Use VITE_API_URL env var or default to localhost:4500
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
        secure: apiUrl.startsWith('https'),
      },
      '/hubs': {
        target: apiUrl,
        changeOrigin: true,
        ws: true,  // Enable WebSocket proxying
        secure: apiUrl.startsWith('https'),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Proxy Error]', err)
          })
          proxy.on('proxyReqWs', (_proxyReq, req, _socket) => {
            console.log('[WS Proxy]', req.url)
          })
        },
      },
      '/_es': {
        target: env.VITE_ELASTICSEARCH_URL || 'https://ae319f18a66e435b83902ee29c5b66aa.westus2.azure.elastic-cloud.com:443',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/_es/, ''),
      },
    },
  },

  // Preview server (production build testing)
  preview: {
    port: 4069,
    host: '0.0.0.0',
    strictPort: true,
  },

  // Build options
  build: {
    outDir: 'dist',
    target: 'esnext',
    chunkSizeWarningLimit: 500,
    sourcemap: mode !== 'production',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor'
            }
            return 'vendor'
          }
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          let extType = info[info.length - 1]

          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            extType = 'images'
          } else if (/woff|woff2|ttf|otf|eot/i.test(extType)) {
            extType = 'fonts'
          } else if (/css/i.test(extType)) {
            extType = 'css'
          }

          return `assets/${extType}/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },

  // CSS options
  css: {
    modules: {
      generateScopedName: mode === 'production'
        ? '[hash:base64:5]'
        : '[name]__[local]__[hash:base64:5]',
      localsConvention: 'camelCaseOnly',
    },
    devSourcemap: true,
  },

  // Environment variables prefix
  envPrefix: 'VITE_',
  base: '/',

  define: {
    __APP_VERSION__: JSON.stringify((() => {
      try {
        return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../pos-desktop/package.json'), 'utf-8')).version
      } catch {
        return process.env.APP_VERSION || '2.6.3'
      }
    })()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
}})
