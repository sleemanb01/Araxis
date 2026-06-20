/**
 * Convert raw app-preview videos into App Store Connect 6.5" format.
 *
 * Usage:
 *   1. Put raw .mp4 files in:  screenshots/raw/
 *   2. Run:  node scripts/resize-previews.js
 *   3. Upload results from:  screenshots/previews-6.5/
 *
 * Output spec (6.5" app preview):
 *   886 x 1920, 30 fps, H.264 high / yuv420p, AAC audio.
 *   (App previews use 886x1920 for 6.5" — different from the 1242x2688
 *    screenshot size.) Apple requires app previews to be 15-30 seconds.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const RAW_DIR = path.join(__dirname, '..', 'screenshots', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'screenshots', 'previews-6.5');
const W = 886, H = 1920;

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(RAW_DIR).filter((f) => /\.(mp4|mov|m4v)$/i.test(f));
if (files.length === 0) {
  console.log(`No video files (.mp4/.mov/.m4v) in ${RAW_DIR}.`);
  process.exit(0);
}

for (const file of files) {
  const input = path.join(RAW_DIR, file);
  const output = path.join(
    OUT_DIR,
    file.replace(/\s+/g, '_').replace(/\.(mov|m4v)$/i, '.mp4')
  );
  console.log(`Converting ${file} ...`);
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i', input,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30`,
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-b:v', '8M',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', '30', // hard cap at 30s (Apple max)
      output,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  console.log(`✓ ${path.basename(output)}`);
}

console.log(`\nDone. Files in ${OUT_DIR}`);
