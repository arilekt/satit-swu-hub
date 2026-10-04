import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();

  // Inject logging to catch init() call
  await context.addInitScript(() => {
    const originalFetch = window.fetch;
    window._fetchLog = [];
    window.fetch = async function(...args) {
      window._fetchLog.push(args[0]);
      return originalFetch.apply(this, args);
    };
  });

  const page = await context.newPage();

  try {
    console.log('Checking if init() is called...\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check if fetch was called (init loads config.json)
    const fetchLog = await page.evaluate(() => window._fetchLog || []);

    console.log('Fetch calls made:');
    fetchLog.forEach((url, i) => {
      console.log(`  ${i+1}. ${url}`);
    });

    const hasConfigFetch = fetchLog.some(url => url.includes('config.json'));
    console.log(`\nConfig.json fetched: ${hasConfigFetch ? '✓' : '✗'}`);

    // Check final state
    const finalState = await page.evaluate(() => ({
      configExists: typeof window.config !== 'undefined',
      configSubjects: window.config?.subjects?.length || 0
    }));

    console.log(`Config loaded: ${finalState.configExists ? '✓' : '✗'}`);
    if (finalState.configExists) {
      console.log(`  Subjects: ${finalState.configSubjects}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
