# Virtual Racing POS - Development Guide

## Server Configuration

### Port and Network Access

**IMPORTANT: This application MUST always run on port 4069 with external access enabled.**

| Setting | Value | Description |
|---------|-------|-------------|
| Port | `4069` | Fixed port for development and preview |
| Host | `0.0.0.0` | Allows connections from any network interface |
| Strict Port | `true` | Fails if port is already in use |

### Access URLs

- **Local**: http://localhost:4069
- **Network**: http://<server-ip>:4069

### Configuration Location

The server configuration is defined in `vite.config.ts`:

```typescript
server: {
  port: 4069,          // ALWAYS use port 4069
  host: '0.0.0.0',     // Allow external access
  strictPort: true,    // Fail if port is already in use
  open: false,         // Don't auto-open browser (server environment)
  cors: true,
},
```

## Quick Start

### Development Mode

```bash
npm run dev
```

This starts the development server on http://localhost:4069

### Production Build

```bash
npm run build
npm run preview
```

The preview server also runs on port 4069.

## Project Structure

```
src/
├── assets/           # Static assets (images, fonts, icons)
│   ├── fonts/        # DIN Next LT Pro fonts
│   ├── images/       # PNG/JPG images
│   └── login/        # Login-specific SVG assets
├── components/       # Reusable UI components
├── features/         # Feature-based modules
├── hooks/            # Custom React hooks
├── lib/              # Third-party configurations
├── pages/            # Page components
├── services/         # API and external services
├── store/            # State management
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Path Aliases

Import aliases are configured for clean imports:

```typescript
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
```

Available aliases:
- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/hooks/*` - src/hooks/*
- `@/utils/*` - src/utils/*
- `@/lib/*` - src/lib/*
- `@/types/*` - src/types/*
- `@/assets/*` - src/assets/*
- `@/features/*` - src/features/*
- `@/pages/*` - src/pages/*
- `@/store/*` - src/store/*
- `@/services/*` - src/services/*

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 4069 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build on port 4069 |
| `npm run lint` | Run ESLint |

## Environment Variables

Environment variables must be prefixed with `VITE_` to be exposed to the client.

Example `.env` file:
```env
VITE_API_URL=http://api.example.com
VITE_APP_NAME=Virtual Racing POS
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Firewall Configuration

To allow external access to port 4069, ensure your firewall allows incoming connections:

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 4069/tcp
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=4069/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### Port 4069 already in use

If you see an error about the port being in use:

```bash
# Find process using the port
lsof -i :4069

# Kill the process if needed
kill -9 <PID>
```

### Cannot access from external network

1. Check firewall rules
2. Verify the server shows `Network: http://<ip>:4069` in the console
3. Ensure no VPN or proxy is blocking connections
