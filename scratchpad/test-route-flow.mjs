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
    console.log('Checking route() flow...\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('1️⃣  Main page loaded');
    console.log(`    Config: ${(await page.evaluate(() => typeof window.config)).substring(0, 10)}`);

    // Now navigate to lesson
    console.log('\n2️⃣  Navigating to lesson #social/social-part01...');
    await page.goto('http://localhost:8000/#social/social-part01', { waitUntil: 'domcontentloaded' });

    // Check for route execution
    console.log('\n3️⃣  Checking if route() executed...');

    // Wait for route to complete
    await page.waitForTimeout(3000);

    const routeStatus = await page.evaluate(() => {
      const main = document.getElementById('lesson-content');
      const isPending = main?.textContent.includes('กำลังเปิดภารกิจ');
      const hasContent = main && main.children.length > 0;

      return {
        mainExists: !!main,
        isPending,
        hasContent,
        childrenCount: main?.children.length || 0,
        firstChildTag: main?.firstChild?.tagName || 'none',
        mainHTML: main?.innerHTML.substring(0, 150) || 'none'
      };
    });

    console.log('\nRoute Execution Status:');
    console.log(`  Main element: ${routeStatus.mainExists ? '✓' : '✗'}`);
    console.log(`  Still pending: ${routeStatus.isPending ? 'YES' : 'NO'}`);
    console.log(`  Has content: ${routeStatus.hasContent ? '✓' : '✗'}`);
    console.log(`  Children count: ${routeStatus.childrenCount}`);
    console.log(`  First child: ${routeStatus.firstChildTag}`);
    console.log(`  Content: ${routeStatus.mainHTML}`);

    if (!routeStatus.isPending && routeStatus.hasContent) {
      console.log('\n✅ Route executed successfully!');
    } else {
      console.log('\n❌ Route did not execute or timed out');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
