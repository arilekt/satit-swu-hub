import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🐛 Debugging Lesson Page Content Loading\n');

    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Inject fake auth for testing
    console.log('✓ Loaded main page\n');

    // Navigate to lesson
    console.log('📍 Navigating to lesson...');
    await page.goto('http://localhost:8000/#social/social-part01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Check lesson content
    const lessonStatus = await page.evaluate(() => {
      const main = document.getElementById('lesson-content');
      const videoStage = document.querySelector('.video-stage');
      const prose = document.querySelector('.prose');
      const isPending = main?.textContent.includes('กำลังเปิดภารกิจ');

      return {
        mainExists: !!main,
        mainHTML: main?.innerHTML.substring(0, 200) || 'none',
        mainTextLength: main?.textContent.length || 0,
        hasVideoStage: !!videoStage,
        hasProse: !!prose,
        isPending: isPending,
        videoCount: document.querySelectorAll('.video').length,
        headingCount: document.querySelectorAll('h2, h3').length
      };
    });

    console.log('\nLesson Content Status:');
    console.log(`  Main element exists: ${lessonStatus.mainExists ? '✓' : '✗'}`);
    console.log(`  Content length: ${lessonStatus.mainTextLength} chars`);
    console.log(`  Still loading: ${lessonStatus.isPending ? 'YES ⚠️' : 'NO ✓'}`);
    console.log(`  Video stage: ${lessonStatus.hasVideoStage ? '✓' : '✗'}`);
    console.log(`  Prose content: ${lessonStatus.hasProse ? '✓' : '✗'}`);
    console.log(`  Video elements: ${lessonStatus.videoCount}`);
    console.log(`  Headings: ${lessonStatus.headingCount}`);
    console.log('\n  Main HTML (first 200 chars):');
    console.log(`  ${lessonStatus.mainHTML}`);

    if (lessonStatus.isPending) {
      console.log('\n⚠️  ISSUE: Content still shows "กำลังเปิดภารกิจ…"');
      console.log('   Waiting another 2 seconds...');
      await page.waitForTimeout(2000);

      const retryStatus = await page.evaluate(() => {
        const main = document.getElementById('lesson-content');
        const isPending = main?.textContent.includes('กำลังเปิดภารกิจ');
        return {
          isPending: isPending,
          hasVideoStage: !!document.querySelector('.video-stage'),
          hasProse: !!document.querySelector('.prose')
        };
      });

      console.log('\n   After 2 more seconds:');
      console.log(`   Still loading: ${retryStatus.isPending ? 'YES ❌' : 'NO ✓'}`);
      console.log(`   Video stage: ${retryStatus.hasVideoStage ? '✓' : '✗'}`);
      console.log(`   Prose: ${retryStatus.hasProse ? '✓' : '✗'}`);

      if (retryStatus.isPending) {
        console.log('\n❌ CONFIRMED: Content not loading after timeout');
        console.log('   Checking browser console for errors...\n');

        // Try to catch any errors
        page.on('console', msg => {
          console.log(`   [${msg.type()}] ${msg.text()}`);
        });

        page.on('error', err => {
          console.log(`   [error] ${err.message}`);
        });

        // Try to trigger route manually
        console.log('   Attempting manual route() call...');
        const manualRoute = await page.evaluate(() => {
          return {
            configExists: typeof window.config !== 'undefined',
            catalogExists: typeof window.Catalog !== 'undefined'
          };
        });

        console.log(`   Config available: ${manualRoute.configExists ? '✓' : '✗'}`);
        console.log(`   Catalog available: ${manualRoute.catalogExists ? '✓' : '✗'}`);
      }
    } else {
      console.log('\n✅ Content loaded successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

test();
