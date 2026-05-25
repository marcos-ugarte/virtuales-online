import { chromium } from 'playwright';

async function createTickets() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Navigate to POS
    console.log('Navigating to POS...');
    await page.goto('http://localhost:4069/');
    await page.waitForTimeout(3000);

    // 2. Login
    console.log('Logging in...');
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill('001-001-001-004');
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill('123401');
    await page.locator('[class*="loginInputField"][class*="loginButton"]').click();

    await page.waitForTimeout(3000);

    // Dismiss printer modal if it appears
    try {
      await page.getByRole('button', { name: 'OK' }).click({ timeout: 3000 });
      console.log('Dismissed printer modal');
    } catch (e) {
      // Modal didn't appear
    }

    await page.waitForTimeout(2000);

    // Make sure we're on JUGADA tab
    console.log('Going to JUGADA tab...');
    await page.getByRole('button', { name: 'JUGADA' }).click();
    await page.waitForTimeout(1000);

    // Select DOE game (perros de 8) - click on button with alt="doe"
    console.log('Selecting DOE game (perros de 8)...');
    const doeButton = page.locator('button img[alt="doe"]').locator('..');
    if (await doeButton.count() > 0) {
      await doeButton.click();
      console.log('DOE game selected');
      await page.waitForTimeout(1000);
    } else {
      console.log('DOE button not found, trying alternative...');
      // Try clicking by game selector position (doe is 3rd: dos, dot, doe, hoc)
      const gameButtons = await page.locator('[class*="gameSelectorBtn"]').all();
      console.log(`Found ${gameButtons.length} game selector buttons`);
      if (gameButtons.length >= 3) {
        await gameButtons[2].click(); // Index 2 = doe (0=dos, 1=dot, 2=doe, 3=hoc)
        console.log('Clicked 3rd game selector (DOE)');
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: '/tmp/pos-doe-selected.png' });

    // Verify we have 8 runners (DOE has 8)
    const selectionBtns = await page.locator('[class*="selectionButton"]:not([class*="selectionButtons"])').all();
    console.log(`Found ${selectionBtns.length} selection buttons (DOE should have 16 = 8 + 8)`);

    // Create 3 tickets of $25
    for (let i = 0; i < 3; i++) {
      console.log(`\n=== Creating ticket ${i + 1} ===`);

      // Make sure we're on JUGADA
      await page.getByRole('button', { name: 'JUGADA' }).click();
      await page.waitForTimeout(300);

      // Select random runner for 1st place (1-8 for DOE)
      // Only get VISIBLE selection buttons
      const allBtns = await page.locator('[class*="selectionButton"]:not([class*="selectionButtons"]):visible').all();
      console.log(`  Found ${allBtns.length} visible selection buttons`);
      const runnersPerRow = Math.floor(allBtns.length / 2); // Should be 8 for DOE
      const runnerIndex = Math.floor(Math.random() * runnersPerRow);

      console.log(`  Selecting runner ${runnerIndex + 1} for 1st place`);
      await allBtns[runnerIndex].click();
      await page.waitForTimeout(300);

      // Select $25 (first denomination button)
      console.log('  Selecting $25');
      const denomBtns = await page.locator('[class*="denominationButtons"] button').all();
      if (denomBtns.length > 0) {
        await denomBtns[0].click();
        await page.waitForTimeout(300);
      }

      await page.screenshot({ path: `/tmp/pos-before-print-${i+1}.png` });

      // Click print
      console.log('  Clicking print...');
      await page.getByRole('button', { name: 'Imprimir' }).click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `/tmp/pos-after-print-${i+1}.png` });
      console.log(`  Ticket ${i + 1} submitted`);
    }

    // Check VENTAS
    console.log('\n=== Checking VENTAS ===');
    await page.getByRole('button', { name: 'VENTAS' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/tickets-result.png' });
    console.log('Screenshot saved to /tmp/tickets-result.png');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/tickets-error.png' });
  } finally {
    await browser.close();
  }
}

createTickets();
