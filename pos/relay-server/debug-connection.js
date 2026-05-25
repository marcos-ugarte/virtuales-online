import { chromium } from 'playwright';

async function debugConnection() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    // Print relay-related messages immediately
    if (text.includes('Relay') || text.includes('relay') || text.includes('WebSocket') ||
        text.includes('useRealRaceData') || text.includes('allGamesUpdate') ||
        text.includes('Connected') || text.includes('Disconnected')) {
      console.log(`CONSOLE: ${text}`);
    }
  });

  try {
    console.log('Navigating to POS...');
    await page.goto('http://localhost:4069/');

    // Wait for app to load and connect
    console.log('Waiting 10 seconds for connections...');
    await page.waitForTimeout(10000);

    // Login
    console.log('Logging in...');
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill('001-001-001-004');
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill('123401');
    await page.locator('[class*="loginInputField"][class*="loginButton"]').click();

    await page.waitForTimeout(5000);

    // Dismiss modal
    try {
      await page.getByRole('button', { name: 'OK' }).click({ timeout: 3000 });
    } catch (e) {}

    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/debug-connection.png' });

    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== RELAY-RELATED LOGS ===');
    consoleLogs.filter(log =>
      log.includes('Relay') || log.includes('relay') ||
      log.includes('WebSocket') || log.includes('useRealRaceData') ||
      log.includes('allGames') || log.includes('gameUpdate') ||
      log.includes('Connected') || log.includes('connect')
    ).forEach(log => console.log(log));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugConnection();
