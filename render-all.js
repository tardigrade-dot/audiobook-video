#!/usr/bin/env node

/**
 * Batch renderer for audiobook videos
 * Finds all .wav + .srt pairs in a directory and renders them
 * Usage: node render-all.js <directory>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputDir = process.argv[2];
const customFps = (() => {
  const idx = process.argv.indexOf('--fps');
  return idx !== -1 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : 10;
})();
const customTitle = (() => {
  const idx = process.argv.indexOf('--title');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : '有声书';
})();
const fps = customFps || 10;

if (!inputDir) {
  console.log(`Usage: node render-all.js <directory> [--fps 10] [--title "My Title"]`);
  console.log('Example: node render-all.js /Users/larry/Downloads/audiobooks');
  console.log('Example: node render-all.js /path/to/audiobooks --fps 5 --title "My Audiobook"');
  process.exit(1);
}

if (!fs.existsSync(inputDir)) {
  console.error(`❌ Directory not found: ${inputDir}`);
  process.exit(1);
}

const projectDir = path.join(__dirname);
const publicDir = path.join(projectDir, 'public');

// Output to the same directory as input files
const resolvedInputDir = path.resolve(inputDir);
const outDir = resolvedInputDir;

// Create output directory if needed
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find all wav files
const files = fs.readdirSync(inputDir);
const wavFiles = files.filter(f => f.endsWith('.wav'));

console.log(`📁 Found ${wavFiles.length} audio files in ${inputDir}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Track success/failure
let successCount = 0;
let failCount = 0;
const tempFiles = [];

wavFiles.forEach((wavFile, index) => {
  const baseName = path.basename(wavFile, '.wav');
  const srtFile = path.join(inputDir, baseName + '.srt');

  if (!fs.existsSync(srtFile)) {
    console.log(`⚠️  Skip ${baseName} (no .srt file)`);
    return;
  }

  console.log(`\n▶️  [${index + 1}/${wavFiles.length}] ${baseName}`);

  // Use unique temp names to avoid conflicts
  const tempWavName = `batch-${Date.now()}-${index}.wav`;
  const tempSrtName = `batch-${Date.now()}-${index}.srt`;
  const tempWavPath = path.join(publicDir, tempWavName);
  const tempSrtPath = path.join(publicDir, tempSrtName);

  // Copy to public
  fs.copyFileSync(path.join(inputDir, wavFile), tempWavPath);
  fs.copyFileSync(srtFile, tempSrtPath);
  tempFiles.push(tempWavPath, tempSrtPath);

  // Get duration using ffprobe
  let duration = 460;
  try {
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${path.join(inputDir, wavFile)}"`,
      { encoding: 'utf-8' }
    ).trim();
    duration = parseFloat(durationStr) || 460;
  } catch (e) {
    console.log('⚠️  Could not get duration, using default');
  }

  const durationFrames = Math.floor(duration * fps);
  console.log(`   Duration: ${duration.toFixed(1)}s (${durationFrames} frames @ ${fps}fps)`);

  // Render
  const outputFile = path.join(outDir, `${baseName}.mp4`);

  try {
    console.log('   🎬 Rendering...');

    // Temporarily update Root.tsx with correct duration and file names
    const rootFilePath = path.join(projectDir, 'src', 'Root.tsx');
    const originalRoot = fs.readFileSync(rootFilePath, 'utf-8');
    const modifiedRoot = originalRoot
      .replace(
        /durationInFrames=\{13500\}/,
        `durationInFrames={${durationFrames}}`
      )
      .replace(
        /staticFile\("audio\.wav"\)/,
        `staticFile("${tempWavName}")`
      )
      .replace(
        /staticFile\("content\.srt"\)/,
        `staticFile("${tempSrtName}")`
      );
    fs.writeFileSync(rootFilePath, modifiedRoot);

    execSync(
      `npx remotion render Audiobook "${outputFile}" --codec h264 --fps ${fps} --concurrency 100% --x264-preset veryfast --jpeg-quality 80 --hardware-acceleration if-possible --props '${JSON.stringify({ title: customTitle })}'`,
      { stdio: 'inherit', cwd: projectDir }
    );

    // Restore Root.tsx
    fs.writeFileSync(rootFilePath, originalRoot);

    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`✅ Success: ${outputFile} (${sizeMB} MB)`);
      successCount++;
    }
  } catch (error) {
    console.error(`❌ Failed: ${baseName}`);
    failCount++;

    // Restore Root.tsx even on failure
    const rootFilePath = path.join(projectDir, 'src', 'Root.tsx');
    try {
      const originalRoot = fs.readFileSync(rootFilePath, 'utf-8');
      fs.writeFileSync(rootFilePath, originalRoot);
    } catch (e) {
      // ignore
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Cleanup temp files
console.log('\n🧹 Cleaning up temporary files...');
tempFiles.forEach(f => {
  try {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  } catch (e) {
    // ignore
  }
});

console.log(`\n🎉 All done!`);
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`📂 Output directory: ${outDir}`);
execSync(`ls -lh "${outDir}"`, { stdio: 'inherit' });
