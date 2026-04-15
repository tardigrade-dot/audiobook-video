#!/usr/bin/env node

/**
 * Single file renderer for debugging
 * Usage: node render-single.js <wav-file> <srt-file> [output-name]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
let wavFile, srtFile, tocFile, outputName, title, customFps, customDuration;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title' && args[i+1]) {
    title = args[i+1];
    i++;
  } else if (args[i] === '--fps' && args[i+1]) {
    customFps = parseInt(args[i+1], 10);
    i++;
  } else if (args[i] === '--duration' && args[i+1]) {
    customDuration = parseInt(args[i+1], 10);
    i++;
  } else if (args[i] === '--toc' && args[i+1]) {
    tocFile = args[i+1];
    i++;
  } else if (!wavFile) {
    wavFile = args[i];
    // Auto-add .wav extension if not present and file doesn't exist
    if (!fs.existsSync(wavFile) && !path.extname(wavFile)) {
      wavFile = wavFile + '.wav';
    }
  } else if (!srtFile) {
    srtFile = args[i];
  } else if (!outputName) {
    outputName = args[i];
  }
}

outputName = outputName || 'output';
title = title || '有声书';
const fps = customFps || 10; // Default 10fps for audiobook (static content)

if (!wavFile) {
  console.log('Usage: node render-single.js <wav-file> [srt-file] [output-name] [--title "My Title"] [--fps 10] [--duration 300] [--toc toc-file.srt]');
  console.log('');
  console.log('Examples:');
  console.log('  node render-single.js example.wav subtitles.srt');
  console.log('  node render-single.js example.wav (auto-detects audio.srt)');
  console.log('  node render-single.js example.wav subtitles.srt my-video --title "My Journey"');
  console.log('  node render-single.js example.wav --fps 5');
  console.log('  node render-single.js example.wav --duration 300  (render first 5 minutes)');
  console.log('  node render-single.js example.wav subtitles.srt --toc example-toc.srt  (with TOC sidebar)');
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

if (!fs.existsSync(wavFile)) {
  console.error(`❌ Audio file not found: ${wavFile}`);
  process.exit(1);
}

if (!fs.existsSync(srtFile)) {
  console.error(`❌ SRT file not found: ${srtFile}`);
  process.exit(1);
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

const projectDir = path.join(__dirname);
const publicDir = path.join(projectDir, 'public');

// Output directory defaults to the same directory as the WAV file
const wavDir = path.dirname(path.resolve(wavFile));
const outDir = outputName ? path.join(wavDir) : wavDir;

// Create output directory if needed
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outputFile = path.join(outDir, `${outputName || 'output'}.mp4`);

console.log('🎬 Rendering audiobook video');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Audio: ${path.basename(wavFile)}`);
console.log(`   Subs:  ${path.basename(srtFile)}`);
if (tocFile) {
  console.log(`   TOC:   ${path.basename(tocFile)}`);
}
console.log(`   Output: ${outputFile}`);

// Copy files to public with unique names
const tempWavName = `single-${Date.now()}.wav`;
const tempSrtName = `single-${Date.now()}.srt`;
const tempTocName = tocFile ? `single-${Date.now()}-toc.srt` : null;
fs.copyFileSync(wavFile, path.join(publicDir, tempWavName));
fs.copyFileSync(srtFile, path.join(publicDir, tempSrtName));
if (tocFile && tempTocName) {
  fs.copyFileSync(tocFile, path.join(publicDir, tempTocName));
}
console.log('   ✅ Copied files to public/');

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

// Apply custom duration limit if specified
if (customDuration && customDuration < duration) {
  duration = customDuration;
  console.log(`   ⏱️  Duration limited to: ${duration}s (--duration)`);
}

const durationFrames = Math.ceil(duration * fps);

// Print all render parameters
console.log('');
console.log('⚙️  Render Parameters:');
console.log(`   Title:          ${title}${!process.argv.includes('--title') ? ' (default)' : ''}`);
console.log(`   FPS:            ${fps}${!process.argv.includes('--fps') ? ' (default)' : ''}`);
console.log(`   Duration:       ${duration.toFixed(1)}s (${durationFrames} frames)`);
console.log(`   Duration Limit: ${customDuration ? customDuration + 's' : '(none)'}`);
console.log(`   Codec:          h264`);
console.log(`   Preset:         veryfast`);
console.log(`   Concurrency:    100%`);
console.log(`   JPEG Quality:   80`);
console.log(`   Hardware Accel: if-possible`);
console.log(`   TOC Sidebar:    ${tocFile ? 'enabled' : 'disabled'}`);
console.log('');

const props = JSON.stringify({
  title,
  audioPath: tempWavName,
  srtPath: tempSrtName,
  tocPath: tempTocName || undefined,
  durationFrames: durationFrames
});

console.log('📦 Remotion Props:');
console.log(props);
console.log('');

try {
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
} finally {
  // Cleanup temp files
  try {
    const tempWavPath = path.join(publicDir, tempWavName);
    const tempSrtPath = path.join(publicDir, tempSrtName);
    if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);
    if (fs.existsSync(tempSrtPath)) fs.unlinkSync(tempSrtPath);
    if (tempTocName) {
      const tempTocPath = path.join(publicDir, tempTocName);
      if (fs.existsSync(tempTocPath)) fs.unlinkSync(tempTocPath);
    }
  } catch (e) {
    // ignore
  }
}
