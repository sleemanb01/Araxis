/**
 * Resize raw iPhone screenshots into App Store Connect sizes.
 *
 * Usage:
 *   1. Put your raw screenshots (PNG/JPG) in:  screenshots/raw/
 *   2. Run:  node scripts/resize-screenshots.js
 *   3. Upload the results from:  screenshots/6.5-inch/  (and 6.7-inch/)
 *
 * 6.5-inch  -> 1242 x 2688  (required by App Store Connect)
 * 6.7-inch  -> 1290 x 2796  (optional, covers newer Pro Max sizes)
 */

const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const RAW_DIR = path.join(__dirname, '..', 'screenshots', 'raw');
const TARGETS = [
  { name: '6.5-inch', w: 1242, h: 2688 },
  { name: '6.7-inch', w: 1290, h: 2796 },
];

(async () => {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created ${RAW_DIR}. Put your raw screenshots there and re-run.`);
    return;
  }

  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  if (files.length === 0) {
    console.log(`No images found in ${RAW_DIR}. Add PNG/JPG screenshots and re-run.`);
    return;
  }

  for (const target of TARGETS) {
    const outDir = path.join(__dirname, '..', 'screenshots', target.name);
    fs.mkdirSync(outDir, { recursive: true });

    for (const file of files) {
      const img = await Jimp.read(path.join(RAW_DIR, file));
      // Cover-resize then crop to exact dimensions (no distortion, no letterbox).
      img.cover({ w: target.w, h: target.h });
      const outName = file.replace(/\.(jpg|jpeg)$/i, '.png');
      await img.write(path.join(outDir, outName));
      console.log(`✓ ${target.name}: ${outName}`);
    }
  }

  console.log('\nDone. Upload screenshots/6.5-inch/*.png to App Store Connect.');
})();
