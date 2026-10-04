import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();

  // Inject fake auth and logging
  await context.addInitScript(() => {
    sessionStorage.setItem('satit-swu-hub:google-id-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksImVtYWlsIjoidGVzdEBnbWFpbC5jb20ifQ.test');
    sessionStorage.setItem('satit-swu-hub:access-granted', 'true');

    // Add logging
    window._testLog = [];
    window.addEventListener('DOMContentLoaded', () => {
      window._testLog.push('DOMContentLoaded fired');
    });
  });

  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    if (msg.text().includes('init') || msg.text().includes('config')) {
      console.log(`[console] ${msg.text()}`);
    }
  });

  try {
    console.log('Checking init() flow...\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');

    await page.waitForTimeout(1000);

    // Check state
    const state = await page.evaluate(() => {
      const gating = document.getElementById('login-gating');
      return {
        gatingExists: !!gating,
        gatingHidden: gating?.hidden,
        gatingShouldTrigger: gating?.hidden !== false,
        configExists: typeof window.config !== 'undefined',
        AppInitExists: typeof window.AppInit !== 'undefined'
      };
    });

    console.log('Initial State:');
    console.log(`  Login-gating element: ${state.gatingExists ? '✓' : '✗'}`);
    console.log(`  Login-gating.hidden: ${state.gatingHidden}`);
    console.log(`  Should trigger init(): ${state.gatingShouldTrigger ? 'YES' : 'NO'}`);
    console.log(`  Config loaded: ${state.configExists ? '✓' : '✗'}`);
    console.log(`  AppInit set: ${state.AppInitExists ? '✓' : '✗'}`);

    if (!state.configExists && state.AppInitExists) {
      console.log('\n⚠️ AppInit was deferred, calling it now...');
      await page.evaluate(() => {
        if (window.AppInit) window.AppInit();
      });

      await page.waitForTimeout(2000);

      const afterInit = await page.evaluate(() => ({
        configExists: typeof window.config !== 'undefined'
      }));

      console.log('After manual AppInit call:');
      console.log(`  Config: ${afterInit.configExists ? '✓' : '✗'}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
