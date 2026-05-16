const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function main() {
  const outputPath = path.resolve(__dirname, '..', 'public', 'logos', 'favicon.png');
  const svgPath = path
    .resolve(__dirname, '..', 'public', 'logos', 'favicon.svg')
    .replace(/\\/g, '/');

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 256, height: 256 },
    deviceScaleFactor: 1,
  });

  await page.setContent(
    `<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;width:256px;height:256px;background:transparent;"><img src="file:///${svgPath}" style="width:256px;height:256px;display:block;" /></body></html>`
  );

  await page.screenshot({ path: outputPath, omitBackground: true });
  await browser.close();

  if (!fs.existsSync(outputPath)) {
    throw new Error('favicon.png se nepodařilo vytvořit.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
