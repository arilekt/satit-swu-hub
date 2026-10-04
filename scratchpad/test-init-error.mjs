import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();

  const messages = [];
  const errors = [];

  page.on('console', msg => {
    messages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('error', err => {
    errors.push(err.message);
  });

  try {
    console.log('Checking for init() errors...\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Console messages:');
    messages.forEach(msg => console.log(`  ${msg}`));

    if (errors.length) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  ${err}`));
    } else {
      console.log('\nNo errors logged');
    }

    // Check state
    const state = await page.evaluate(() => ({
      configExists: typeof window.config !== 'undefined',
      dailyMissionHTML: document.getElementById('daily-mission')?.innerHTML?.substring(0, 100) || 'none'
    }));

    console.log('\nFinal state:');
    console.log(`  Config: ${state.configExists ? '✓' : '✗'}`);
    console.log(`  Daily mission HTML: ${state.dailyMissionHTML}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
