import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();

  // Inject fake auth
  await context.addInitScript(() => {
    sessionStorage.setItem('satit-swu-hub:google-id-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksImVtYWlsIjoidGVzdEBnbWFpbC5jb20ifQ.test');
    sessionStorage.setItem('satit-swu-hub:access-granted', 'true');
  });

  const page = await context.newPage();

  try {
    console.log('Checking script loading...\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check which objects are defined
    const status = await page.evaluate(() => {
      return {
        MissionSync: typeof window.MissionSync !== 'undefined',
        config: typeof window.config !== 'undefined',
        AppInit: typeof window.AppInit !== 'undefined',
        Catalog: typeof window.Catalog !== 'undefined',
        Tracker: typeof window.Tracker !== 'undefined',
        Dashboard: typeof window.Dashboard !== 'undefined'
      };
    });

    console.log('Available objects:');
    Object.entries(status).forEach(([key, val]) => {
      console.log(`  ${key}: ${val ? '✓' : '✗'}`);
    });

    if (status.MissionSync) {
      console.log('\n✓ MissionSync loaded, checking state...');
      const syncState = await page.evaluate(() => {
        return {
          configured: window.MissionSync.configured?.(),
          _decode: typeof window.MissionSync._decode === 'function' ? 'exists' : 'missing'
        };
      });
      console.log('  Configured:', syncState.configured);
      console.log('  Decode:', syncState._decode);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
