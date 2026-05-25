/**
 * WebSocket Interceptor - Browser Console Script
 *
 * INSTRUCCIONES:
 * 1. Abre la POS en el navegador: https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/
 * 2. Abre DevTools (F12)
 * 3. Ve a la pestaña "Console"
 * 4. Copia y pega TODO este script
 * 5. Presiona Enter
 * 6. Ahora todos los mensajes WebSocket se mostrarán en la consola
 * 7. Haz login y crea tickets normalmente
 * 8. Los mensajes de ticket aparecerán resaltados
 */

(function() {
  // Storage for all messages
  window._wsMessages = [];
  window._wsMessageId = 0;

  // Styles for console output
  const styles = {
    sent: 'background: #1e5128; color: #4caf50; padding: 2px 8px; border-radius: 3px;',
    received: 'background: #1a1a4e; color: #2196f3; padding: 2px 8px; border-radius: 3px;',
    ticket: 'background: #4a1942; color: #e94560; padding: 4px 12px; border-radius: 3px; font-weight: bold; font-size: 14px;',
    type: 'color: #ffd700; font-weight: bold;',
    time: 'color: #888;'
  };

  // Override WebSocket
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function(url, protocols) {
    console.log('%c🔌 WebSocket Interceptor Active', 'background: #e94560; color: white; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
    console.log('Connecting to:', url);

    const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

    // Intercept send
    const originalSend = ws.send.bind(ws);
    ws.send = function(data) {
      logMessage('SENT', data);
      return originalSend(data);
    };

    // Intercept receive
    ws.addEventListener('message', (event) => {
      logMessage('RECEIVED', event.data);
    });

    return ws;
  };

  function logMessage(direction, data) {
    const id = ++window._wsMessageId;
    const timestamp = new Date().toISOString();

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      parsed = { raw: data };
    }

    const msgType = parsed.msgType || 'unknown';

    // Store message
    window._wsMessages.push({
      id,
      timestamp,
      direction,
      msgType,
      data: parsed
    });

    // Check if this is a ticket-related message
    const isTicket = ['ticket', 'bet', 'transaction', 'sellTicket', 'buyTicket'].includes(msgType);

    // Console output
    const dirStyle = direction === 'SENT' ? styles.sent : styles.received;

    if (isTicket) {
      console.log('%c🎫 TICKET MESSAGE DETECTED!', styles.ticket);
      console.log(`%c[${id}] ${direction}%c - %c${msgType}%c @ ${timestamp}`,
        dirStyle, '', styles.type, styles.time);
      console.log('Full message:', parsed);
      console.log('-------------------------------------------');
    } else if (msgType === 'time') {
      // Skip time messages (too noisy)
      // Uncomment next line to see time messages:
      // console.log(`%c[${id}] ${direction}%c - %c${msgType}`, dirStyle, '', styles.type);
    } else {
      console.log(`%c[${id}] ${direction}%c - %c${msgType}%c @ ${timestamp.split('T')[1]}`,
        dirStyle, '', styles.type, styles.time);

      // Log interesting data
      if (msgType === 'init' && direction === 'RECEIVED' && parsed.msgValue === 'ok') {
        console.log('  ✅ Login successful! Session:', parsed.sessionID);
      } else if (msgType === 'gameRound' && parsed.gamepool) {
        console.log('  🏁 Game:', parsed.gamepool[0]?.id);
      } else if (msgType === 'gameResult') {
        console.log('  🏆 Result:', parsed.gameresult?.id);
      } else {
        // Show truncated data for other messages
        const dataStr = JSON.stringify(parsed);
        if (dataStr.length > 150) {
          console.log('  ', dataStr.slice(0, 150) + '...');
        } else {
          console.log('  ', parsed);
        }
      }
    }
  }

  // Helper functions available in console
  window.wsGetMessages = function(filter) {
    if (filter) {
      return window._wsMessages.filter(m =>
        m.msgType.toLowerCase().includes(filter.toLowerCase())
      );
    }
    return window._wsMessages;
  };

  window.wsGetTickets = function() {
    return window._wsMessages.filter(m =>
      ['ticket', 'bet', 'transaction', 'sellTicket', 'buyTicket'].includes(m.msgType)
    );
  };

  window.wsSaveToFile = function() {
    const blob = new Blob([JSON.stringify(window._wsMessages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ws-messages-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    a.click();
    console.log('✅ Messages saved to file!');
  };

  window.wsClear = function() {
    window._wsMessages = [];
    window._wsMessageId = 0;
    console.clear();
    console.log('%c🔌 WebSocket Interceptor - Messages cleared', 'background: #e94560; color: white; padding: 5px 10px;');
  };

  // Print help
  console.log(`
%c📋 Comandos disponibles:%c
  wsGetMessages()      - Ver todos los mensajes
  wsGetMessages('tipo') - Filtrar por tipo (ej: 'gameRound')
  wsGetTickets()       - Ver solo mensajes de tickets
  wsSaveToFile()       - Guardar mensajes a archivo JSON
  wsClear()            - Limpiar mensajes

%c🎯 Ahora haz login y crea tickets. Los mensajes aparecerán aquí.%c
`, 'color: #ffd700; font-weight: bold;', '', 'color: #4caf50;', '');

})();
