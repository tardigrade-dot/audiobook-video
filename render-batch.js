#!/usr/bin/env node

/**
 * Batch renderer - no visible file copying
 * Temporarily copies files to public/ for rendering, then cleans up
 * Usage: node render-batch.js <wav-file> [srt-file] [output-name] [--title "My Title"]
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
let wavFile, srtFile, tocFile, outputName, title, customFps;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title' && args[i + 1]) {
    title = args[i + 1];
    i++;
  } else if (args[i] === '--fps' && args[i + 1]) {
    customFps = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--toc' && args[i + 1]) {
    tocFile = args[i + 1];
    i++;
  } else if (!wavFile) {
    wavFile = args[i];
  } else if (!srtFile) {
    srtFile = args[i];
  } else if (!outputName) {
    outputName = args[i];
  }
}

outputName = outputName || 'audiobook';
title = title || '有声书';
const fps = customFps || 10; // Default 10fps for audiobook (static content)

if (!wavFile) {
  console.log('Usage: node render-batch.js <wav-file> [srt-file] [output-name] [--title "My Title"] [--fps 10] [--toc toc-file.srt]');
  console.log('');
  console.log('Examples:');
  console.log('  node render-batch.js example.wav subtitles.srt');
  console.log('  node render-batch.js example.wav (auto-detects audio.srt)');
  console.log('  node render-batch.js example.wav subtitles.srt my-video --title "My Journey"');
  console.log('  node render-batch.js example.wav --fps 5  (slower but higher quality)');
  console.log('  node render-batch.js example.wav subtitles.srt --toc example-toc.srt  (with TOC sidebar)');
  process.exit(1);
}

// Auto-detect SRT file if not provided
if (!srtFile) {
  const wavPath = path.parse(wavFile);
  srtFile = path.join(wavPath.dir, wavPath.name + '.srt');
}

// Auto-detect TOC file if not provided (same directory, same name with -toc suffix)
if (!tocFile) {
  const srtPath = path.parse(srtFile);
  const autoTocFile = path.join(srtPath.dir, srtPath.name + '-toc.srt');
  if (fs.existsSync(autoTocFile)) {
    tocFile = autoTocFile;
    console.log(`   📑 Auto-detected TOC: ${path.basename(tocFile)}`);
  }
}

// Resolve to absolute paths
wavFile = path.resolve(wavFile);
srtFile = path.resolve(srtFile);
if (tocFile) tocFile = path.resolve(tocFile);

if (!fs.existsSync(wavFile)) {
  console.error(`❌ Audio file not found: ${wavFile}`);
  process.exit(1);
}

if (!fs.existsSync(srtFile)) {
  console.error(`❌ SRT file not found: ${srtFile}`);
  process.exit(1);
}

const projectDir = path.join(__dirname);
const publicDir = path.join(projectDir, 'public');
const outDir = path.join(projectDir, 'out');

// Create output directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Use unique names to avoid conflicts
const publicWavName = `batch-audio-${Date.now()}.wav`;
const publicSrtName = `batch-subs-${Date.now()}.srt`;
const publicTocName = tocFile ? `batch-toc-${Date.now()}.srt` : null;
const publicWavPath = path.join(publicDir, publicWavName);
const publicSrtPath = path.join(publicDir, publicSrtName);
const publicTocPath = tocFile ? path.join(publicDir, publicTocName) : null;

console.log('🎬 Rendering audiobook video');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Audio: ${path.basename(wavFile)}`);
console.log(`   Subs:  ${path.basename(srtFile)}`);
console.log(`   Output: out/${outputName}.mp4`);

// Get duration
let duration = 460;
try {
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${wavFile}"`,
    { encoding: 'utf-8' }
  ).trim();
  duration = parseFloat(durationStr) || 460;
} catch (e) {
  console.log('   ⚠️  Could not get duration, using default (460s)');
}

const durationFrames = Math.floor(duration * fps);
console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s (${durationFrames} frames @ ${fps}fps)`);

// Copy files to public temporarily
fs.copyFileSync(wavFile, publicWavPath);
fs.copyFileSync(srtFile, publicSrtPath);
if (tocFile && publicTocPath) {
  if (!fs.existsSync(tocFile)) {
    console.error(`❌ TOC file not found: ${tocFile}`);
    process.exit(1);
  }
  fs.copyFileSync(tocFile, publicTocPath);
}

// Cleanup function
function cleanup() {
  try {
    if (fs.existsSync(publicWavPath)) fs.unlinkSync(publicWavPath);
    if (fs.existsSync(publicSrtPath)) fs.unlinkSync(publicSrtPath);
    if (publicTocPath && fs.existsSync(publicTocPath)) fs.unlinkSync(publicTocPath);
  } catch (e) {
    // Ignore cleanup errors
  }
}

try {
  // Render - pass all config through props (calculateMetadata handles duration)
  const outputFile = path.join(outDir, `${outputName}.mp4`);
  const props = JSON.stringify({
    title,
    audioPath: publicWavName,
    srtPath: publicSrtName,
    tocPath: publicTocName || undefined,
    durationFrames: durationFrames
  });

  console.log('');
  console.log('   🎬 Rendering video...');
  console.log('');

  execSync(
    `npx remotion render Audiobook "${outputFile}" --codec h264 --fps ${fps} --concurrency 100% --x264-preset veryfast --jpeg-quality 80 --hardware-acceleration if-possible --props '${props}'`,
    { stdio: 'inherit', cwd: projectDir }
  );

  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Success: ${outputFile}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log('');
    console.log('Play with:');
    console.log(`   open "${outputFile}"`);
  }
} catch (error) {
  console.error('');
  console.error('❌ Render failed');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Clean up temporary files
  cleanup();
}
