import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const testDir = '/tmp/test-phase-a';

async function test() {
  await fs.mkdir(testDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('📱 Testing Phase ก - Typography + Logo + Layout\n');

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Check for logo
    const logoCheck = await page.evaluate(() => {
      const brandLogo = document.querySelector('.brand-logo');
      const brandLink = document.querySelector('.brand');
      return {
        hasLogoElement: !!brandLogo,
        logoSrc: brandLogo?.src || 'none',
        logoWidth: brandLogo?.width || 0,
        logoHeight: brandLogo?.height || 0,
        brandFontSize: window.getComputedStyle(brandLink)?.fontSize || 'unknown'
      };
    });

    console.log('🎯 Logo Check:');
    console.log(`  Logo element: ${logoCheck.hasLogoElement ? '✓' : '✗'}`);
    console.log(`  Logo src: ${logoCheck.logoSrc}`);
    console.log(`  Brand font-size: ${logoCheck.brandFontSize}`);

    // Check typography
    const typographyCheck = await page.evaluate(() => {
      const body = document.body;
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const p = document.querySelector('p');

      return {
        bodyFontSize: window.getComputedStyle(body)?.fontSize || 'unknown',
        h1FontSize: window.getComputedStyle(h1)?.fontSize || 'unknown',
        h2FontSize: window.getComputedStyle(h2)?.fontSize || 'unknown',
        pFontSize: window.getComputedStyle(p)?.fontSize || 'unknown'
      };
    });

    console.log('\n📝 Typography Check:');
    console.log(`  Body: ${typographyCheck.bodyFontSize}`);
    console.log(`  H1: ${typographyCheck.h1FontSize}`);
    console.log(`  H2: ${typographyCheck.h2FontSize}`);
    console.log(`  P: ${typographyCheck.pFontSize}`);

    // Check button sizes
    const buttonCheck = await page.evaluate(() => {
      const btn = document.querySelector('button') || document.querySelector('a');
      if (!btn) return { minHeight: 'no buttons found' };
      return {
        minHeight: window.getComputedStyle(btn)?.minHeight || 'unknown'
      };
    });

    console.log('\n🔘 Button Check:');
    console.log(`  Min-height: ${buttonCheck.minHeight}`);

    // Take screenshots
    console.log('\n📸 Capturing screenshots...');
    await page.screenshot({ path: path.join(testDir, '01-desktop.png'), fullPage: false });

    // iPad view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(testDir, '02-ipad.png'), fullPage: false });

    console.log(`✓ Screenshots saved to ${testDir}\n`);
    console.log('='.repeat(50));
    console.log('Phase ก - Typography + Logo + Layout: READY FOR REVIEW');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

test();
