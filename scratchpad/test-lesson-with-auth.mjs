import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();

  // Inject fake auth BEFORE page load
  await context.addInitScript(() => {
    sessionStorage.setItem('satit-swu-hub:google-id-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksImVtYWlsIjoidGVzdEBnbWFpbC5jb20ifQ.test');
    sessionStorage.setItem('satit-swu-hub:access-granted', 'true');
  });

  const page = await context.newPage();

  try {
    console.log('🐛 Testing Lesson Page with Fake Auth\n');

    console.log('Loading main page...');
    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check if logged in
    const authStatus = await page.evaluate(() => {
      return {
        configExists: typeof window.config !== 'undefined',
        appInitExists: typeof window.AppInit !== 'undefined'
      };
    });

    console.log('Auth Status:');
    console.log(`  Config: ${authStatus.configExists ? '✓' : '✗'}`);
    console.log(`  AppInit: ${authStatus.appInitExists ? '✓' : '✗'}`);

    // Navigate to lesson
    console.log('\nNavigating to lesson #social/social-part01...');
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
        mainTextLength: main?.textContent.length || 0,
        isPending: isPending,
        hasVideoStage: !!videoStage,
        hasProse: !!prose,
        videoCount: document.querySelectorAll('.video').length,
        headingCount: document.querySelectorAll('h2, h3').length
      };
    });

    console.log('\nLesson Content Status:');
    console.log(`  Main element: ${lessonStatus.mainExists ? '✓' : '✗'}`);
    console.log(`  Content length: ${lessonStatus.mainTextLength} chars`);
    console.log(`  Still loading: ${lessonStatus.isPending ? 'YES ⚠️' : 'NO ✓'}`);
    console.log(`  Video stage: ${lessonStatus.hasVideoStage ? '✓' : '✗'}`);
    console.log(`  Prose content: ${lessonStatus.hasProse ? '✓' : '✗'}`);
    console.log(`  Videos: ${lessonStatus.videoCount}`);
    console.log(`  Headings: ${lessonStatus.headingCount}`);

    if (!lessonStatus.isPending && lessonStatus.hasVideoStage && lessonStatus.hasProse) {
      console.log('\n✅ SUCCESS: Lesson content loaded correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ ISSUE: Content still not loading properly');

      // Try waiting more
      console.log('\nWaiting 3 more seconds...');
      await page.waitForTimeout(3000);

      const retryStatus = await page.evaluate(() => {
        const main = document.getElementById('lesson-content');
        return {
          isPending: main?.textContent.includes('กำลังเปิดภารกิจ'),
          hasVideoStage: !!document.querySelector('.video-stage'),
          hasProse: !!document.querySelector('.prose')
        };
      });

      console.log('After retry:');
      console.log(`  Still loading: ${retryStatus.isPending ? 'YES' : 'NO'}`);
      console.log(`  Video stage: ${retryStatus.hasVideoStage ? '✓' : '✗'}`);
      console.log(`  Prose: ${retryStatus.hasProse ? '✓' : '✗'}`);

      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

test();
