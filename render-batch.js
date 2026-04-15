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

// Resolve input file paths to absolute paths early for consistent logging
wavFile = path.resolve(wavFile);

// Auto-detect SRT file if not provided
let srtAutoDetected = false;
if (!srtFile) {
  const wavPath = path.parse(wavFile);
  srtFile = path.join(wavPath.dir, wavPath.name + '.srt');
  srtAutoDetected = true;
}

// Auto-detect TOC file if not provided (same directory, same name with -toc suffix)
let tocAutoDetected = false;
if (!tocFile) {
  const srtPath = path.parse(srtFile);
  const autoTocFile = path.join(srtPath.dir, srtPath.name + '-toc.srt');
  if (fs.existsSync(autoTocFile)) {
    tocFile = autoTocFile;
    tocAutoDetected = true;
  }
}

// Resolve to absolute paths
srtFile = path.resolve(srtFile);
if (tocFile) tocFile = path.resolve(tocFile);

// Print detailed file discovery logs
console.log('📂 File Discovery:');
console.log(`   Audio:    ${wavFile}`);
console.log(`   Subtitle: ${srtFile}${srtAutoDetected ? ' (auto-detected from wav name)' : ''}`);
if (tocFile) {
  console.log(`   TOC:      ${tocFile}${tocAutoDetected ? ' (auto-detected from srt name)' : ''}`);
} else {
  console.log('   TOC:      (none found)');
}
console.log('');

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
if (tocFile) {
  console.log(`   TOC:   ${path.basename(tocFile)}`);
}
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

// Print all render parameters
console.log('');
console.log('⚙️  Render Parameters:');
console.log(`   Title:          ${title}${!process.argv.includes('--title') ? ' (default)' : ''}`);
console.log(`   FPS:            ${fps}${!process.argv.includes('--fps') ? ' (default)' : ''}`);
console.log(`   Duration:       ${duration.toFixed(1)}s (${durationFrames} frames)`);
console.log(`   Codec:          h264`);
console.log(`   Preset:         veryfast`);
console.log(`   Concurrency:    100%`);
console.log(`   JPEG Quality:   80`);
console.log(`   Hardware Accel: if-possible`);
console.log(`   TOC Sidebar:    ${tocFile ? 'enabled' : 'disabled'}`);
console.log('');

// Copy files to public temporarily
fs.copyFileSync(wavFile, publicWavPath);
fs.copyFileSync(srtFile, publicSrtPath);
if (tocFile && publicTocPath) {
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

  console.log('📦 Remotion Props:');
  console.log(props);
  console.log('');
  console.log('   🎬 Rendering video...');
  console.log('');

  const renderCmd = `npx remotion render Audiobook "${outputFile}" --codec h264 --fps ${fps} --concurrency 100% --x264-preset veryfast --jpeg-quality 80 --hardware-acceleration if-possible --props '${props}'`;
  console.log('🔧 Render Command:');
  console.log(renderCmd);
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
