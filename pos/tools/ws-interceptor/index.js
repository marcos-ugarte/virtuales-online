/**
 * WebSocket Interceptor for Virtual Racing POS
 *
 * This proxy intercepts all WebSocket messages between the POS and the server,
 * logging them to console and optionally to a file.
 *
 * Usage:
 *   1. npm install
 *   2. node index.js
 *   3. Open browser to: http://localhost:3000
 *   4. The POS will load with WebSocket interception active
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  localPort: 3000,
  targetPosUrl: 'https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/',
  targetWsUrl: 'wss://vgcontrol.com:1229/pos',
  logFile: 'ws-messages.json'
};

// Message storage
const messages = [];
let messageId = 0;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function logMessage(direction, data) {
  const timestamp = new Date().toISOString();
  const id = ++messageId;

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    parsed = { raw: data };
  }

  const entry = {
    id,
    timestamp,
    direction,
    data: parsed
  };

  messages.push(entry);

  // Console output with colors
  const dirColor = direction === 'SENT' ? colors.green : colors.cyan;
  const msgType = parsed.msgType || 'unknown';

  console.log(`${colors.bright}[${id}]${colors.reset} ${timestamp}`);
  console.log(`  ${dirColor}${direction}${colors.reset} - ${colors.yellow}${msgType}${colors.reset}`);

  // Special handling for interesting message types
  if (msgType === 'ticket' || msgType === 'bet' || msgType === 'transaction') {
    console.log(`  ${colors.magenta}*** TICKET/BET MESSAGE ***${colors.reset}`);
    console.log(`  ${JSON.stringify(parsed, null, 2)}`);
  } else if (msgType === 'init' && direction === 'RECEIVED') {
    console.log(`  Session: ${parsed.sessionID}`);
  } else if (msgType === 'gameRound') {
    const gamepool = parsed.gamepool?.[0];
    if (gamepool) {
      console.log(`  Game: ${gamepool.id}`);
    }
  } else if (msgType !== 'time') {
    // Log full message for non-time messages
    console.log(`  ${JSON.stringify(parsed).slice(0, 200)}...`);
  }

  console.log('');

  // Save to file periodically
  if (messages.length % 10 === 0) {
    saveMessages();
  }
}

function saveMessages() {
  fs.writeFileSync(
    path.join(__dirname, CONFIG.logFile),
    JSON.stringify(messages, null, 2)
  );
}

// HTTP Server to serve the interceptor page
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getInterceptorPage());
  } else if (req.url === '/messages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages.slice(-100)));
  } else if (req.url === '/save') {
    saveMessages();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ saved: messages.length, file: CONFIG.logFile }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket Server for browser connections
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
  console.log(`${colors.bright}=== New browser connection ===${colors.reset}\n`);

  // Connect to target WebSocket server
  const serverWs = new WebSocket(CONFIG.targetWsUrl, {
    rejectUnauthorized: false
  });

  serverWs.on('open', () => {
    console.log(`${colors.green}Connected to target server: ${CONFIG.targetWsUrl}${colors.reset}\n`);
  });

  serverWs.on('message', (data) => {
    const strData = data.toString();
    logMessage('RECEIVED', strData);

    // Forward to browser
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(strData);
    }
  });

  serverWs.on('close', () => {
    console.log(`${colors.yellow}Server connection closed${colors.reset}\n`);
    clientWs.close();
  });

  serverWs.on('error', (err) => {
    console.error('Server WebSocket error:', err.message);
  });

  // Handle messages from browser
  clientWs.on('message', (data) => {
    const strData = data.toString();
    logMessage('SENT', strData);

    // Forward to server
    if (serverWs.readyState === WebSocket.OPEN) {
      serverWs.send(strData);
    }
  });

  clientWs.on('close', () => {
    console.log(`${colors.yellow}Browser connection closed${colors.reset}\n`);
    serverWs.close();
    saveMessages();
  });

  clientWs.on('error', (err) => {
    console.error('Client WebSocket error:', err.message);
  });
});

function getInterceptorPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>WS Interceptor - Virtual Racing POS</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Consolas', 'Monaco', monospace;
      background: #1a1a2e;
      color: #eee;
    }
    .container { display: flex; height: 100vh; }
    .pos-frame {
      flex: 1;
      border: none;
      border-right: 2px solid #16213e;
    }
    .sidebar {
      width: 500px;
      display: flex;
      flex-direction: column;
      background: #16213e;
    }
    .header {
      padding: 10px;
      background: #0f3460;
      border-bottom: 1px solid #1a1a2e;
    }
    .header h2 { margin: 0 0 10px 0; color: #e94560; }
    .controls { display: flex; gap: 10px; }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-primary { background: #e94560; color: white; }
    .btn-secondary { background: #0f3460; color: #eee; border: 1px solid #e94560; }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .message {
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .message.sent { background: #1e5128; border-left: 3px solid #4caf50; }
    .message.received { background: #1a1a4e; border-left: 3px solid #2196f3; }
    .message.ticket { background: #4a1942; border-left: 3px solid #e94560; }
    .msg-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      color: #aaa;
    }
    .msg-type {
      font-weight: bold;
      color: #ffd700;
    }
    .msg-body {
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
    }
    .filter {
      padding: 10px;
      background: #0f3460;
    }
    .filter input {
      width: 100%;
      padding: 8px;
      border: 1px solid #e94560;
      border-radius: 4px;
      background: #1a1a2e;
      color: #eee;
    }
    .stats {
      padding: 10px;
      background: #0f3460;
      font-size: 12px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="container">
    <iframe
      class="pos-frame"
      src="${CONFIG.targetPosUrl}"
      id="posFrame"
    ></iframe>
    <div class="sidebar">
      <div class="header">
        <h2>🔍 WS Interceptor</h2>
        <div class="controls">
          <button class="btn btn-primary" onclick="clearMessages()">Clear</button>
          <button class="btn btn-secondary" onclick="saveMessages()">Save JSON</button>
          <button class="btn btn-secondary" onclick="toggleAutoScroll()">Auto-scroll: ON</button>
        </div>
      </div>
      <div class="filter">
        <input type="text" id="filterInput" placeholder="Filter by msgType (e.g., ticket, gameRound)" oninput="filterMessages()">
      </div>
      <div class="messages" id="messagesContainer"></div>
      <div class="stats" id="stats">Messages: 0 | Sent: 0 | Received: 0</div>
    </div>
  </div>

  <script>
    let messages = [];
    let autoScroll = true;
    let filter = '';
    let stats = { total: 0, sent: 0, received: 0 };

    // Override WebSocket in the iframe
    const iframe = document.getElementById('posFrame');

    iframe.onload = function() {
      try {
        const iframeWindow = iframe.contentWindow;
        const OriginalWebSocket = iframeWindow.WebSocket;

        iframeWindow.WebSocket = function(url, protocols) {
          console.log('Intercepting WebSocket:', url);

          // Connect through our proxy instead
          const proxyUrl = 'ws://' + window.location.host;
          const ws = protocols
            ? new OriginalWebSocket(proxyUrl, protocols)
            : new OriginalWebSocket(proxyUrl);

          // Intercept send
          const originalSend = ws.send.bind(ws);
          ws.send = function(data) {
            addMessage('sent', data);
            return originalSend(data);
          };

          // Intercept receive
          ws.addEventListener('message', (event) => {
            addMessage('received', event.data);
          });

          return ws;
        };

        console.log('WebSocket interceptor installed in iframe');
      } catch (e) {
        console.error('Could not inject into iframe (CORS):', e.message);
        console.log('Using server-side interception instead');
      }
    };

    function addMessage(direction, data) {
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        parsed = { raw: data };
      }

      const msg = {
        id: messages.length + 1,
        timestamp: new Date().toISOString(),
        direction,
        type: parsed.msgType || 'unknown',
        data: parsed
      };

      messages.push(msg);
      stats.total++;
      stats[direction]++;

      renderMessage(msg);
      updateStats();

      if (autoScroll) {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderMessage(msg) {
      if (filter && !msg.type.toLowerCase().includes(filter.toLowerCase())) {
        return;
      }

      const container = document.getElementById('messagesContainer');
      const isTicket = ['ticket', 'bet', 'transaction'].includes(msg.type);

      const div = document.createElement('div');
      div.className = 'message ' + msg.direction + (isTicket ? ' ticket' : '');
      div.innerHTML = \`
        <div class="msg-header">
          <span>#\${msg.id} - \${msg.direction.toUpperCase()}</span>
          <span>\${msg.timestamp.split('T')[1].split('.')[0]}</span>
        </div>
        <div class="msg-type">\${msg.type}</div>
        <div class="msg-body">\${JSON.stringify(msg.data, null, 2)}</div>
      \`;
      container.appendChild(div);
    }

    function clearMessages() {
      messages = [];
      stats = { total: 0, sent: 0, received: 0 };
      document.getElementById('messagesContainer').innerHTML = '';
      updateStats();
    }

    function filterMessages() {
      filter = document.getElementById('filterInput').value;
      const container = document.getElementById('messagesContainer');
      container.innerHTML = '';
      messages.forEach(msg => renderMessage(msg));
    }

    function toggleAutoScroll() {
      autoScroll = !autoScroll;
      event.target.textContent = 'Auto-scroll: ' + (autoScroll ? 'ON' : 'OFF');
    }

    function updateStats() {
      document.getElementById('stats').textContent =
        \`Messages: \${stats.total} | Sent: \${stats.sent} | Received: \${stats.received}\`;
    }

    function saveMessages() {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ws-messages-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
    }

    // Poll server for messages (backup if iframe injection fails)
    setInterval(async () => {
      try {
        const res = await fetch('/messages');
        const serverMsgs = await res.json();

        serverMsgs.forEach(msg => {
          if (!messages.find(m => m.id === msg.id)) {
            messages.push({
              ...msg,
              type: msg.data?.msgType || 'unknown'
            });
            renderMessage({
              ...msg,
              type: msg.data?.msgType || 'unknown'
            });
            stats.total++;
            stats[msg.direction.toLowerCase()]++;
          }
        });

        updateStats();
      } catch (e) {}
    }, 1000);
  </script>
</body>
</html>`;
}

// Start server
server.listen(CONFIG.localPort, () => {
  console.log(`
${colors.bright}╔════════════════════════════════════════════════════════════╗
║       WebSocket Interceptor - Virtual Racing POS           ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.green}Server running at: http://localhost:${CONFIG.localPort}${colors.reset}

${colors.yellow}Instructions:${colors.reset}
1. Open http://localhost:${CONFIG.localPort} in your browser
2. The POS will load in the left panel
3. WebSocket messages will appear in the right panel
4. Login and make bets as normal
5. All messages are logged to: ${CONFIG.logFile}

${colors.cyan}Waiting for connections...${colors.reset}
`);
});

// Save on exit
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Saving ${messages.length} messages...${colors.reset}`);
  saveMessages();
  console.log(`${colors.green}Saved to ${CONFIG.logFile}${colors.reset}`);
  process.exit();
});
