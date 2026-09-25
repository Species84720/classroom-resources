import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const html = resolve('_site/resources/year-2-number-cards-1-to-100/index.html');
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: resolve('_site/resources/year-2-number-cards-1-to-100/number-cards-1-to-100.pdf'),
    format: 'A4',
    landscape: false,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
} finally {
  await browser.close();
}
