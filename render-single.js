#!/usr/bin/env node

/**
 * Single file renderer for debugging
 * Usage: node render-single.js <wav-file> <srt-file> [output-name]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
let wavFile, srtFile, outputName, title, customFps;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title' && args[i+1]) {
    title = args[i+1];
    i++;
  } else if (args[i] === '--fps' && args[i+1]) {
    customFps = parseInt(args[i+1], 10);
    i++;
  } else if (!wavFile) {
    wavFile = args[i];
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
  console.log('Usage: node render-single.js <wav-file> [srt-file] [output-name] [--title "My Title"] [--fps 10]');
  console.log('');
  console.log('Examples:');
  console.log('  node render-single.js example.wav subtitles.srt');
  console.log('  node render-single.js example.wav (auto-detects audio.srt)');
  console.log('  node render-single.js example.wav subtitles.srt my-video --title "My Journey"');
  console.log('  node render-single.js example.wav --fps 5');
  process.exit(1);
}

// Auto-detect SRT file if not provided
if (!srtFile) {
  const wavPath = path.parse(wavFile);
  srtFile = path.join(wavPath.dir, wavPath.name + '.srt');
}

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

console.log('🎬 Rendering audiobook video');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Audio: ${path.basename(wavFile)}`);
console.log(`   Subs:  ${path.basename(srtFile)}`);
console.log(`   Output: out/${outputName}.mp4`);

// Copy files to public
fs.copyFileSync(wavFile, path.join(publicDir, 'example.wav'));
fs.copyFileSync(srtFile, path.join(publicDir, 'example.srt'));
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

const durationFrames = Math.floor(duration * fps);
console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s (${durationFrames} frames @ ${fps}fps)`);

// Temporarily update Root.tsx with correct duration
const rootFilePath = path.join(projectDir, 'src', 'Root.tsx');
const originalRoot = fs.readFileSync(rootFilePath, 'utf-8');
const modifiedRoot = originalRoot.replace(
  /durationInFrames=\{13500\}/,
  `durationInFrames={${durationFrames}}`
);
fs.writeFileSync(rootFilePath, modifiedRoot);

// Render
const outputFile = path.join(outDir, `${outputName}.mp4`);

try {
  console.log('');
  console.log('   🎬 Rendering video...');
  console.log('');
  
  execSync(
    `npx remotion render Audiobook "${outputFile}" --codec h264 --fps ${fps} --concurrency 100% --x264-preset veryfast --jpeg-quality 80 --hardware-acceleration if-possible --props '${JSON.stringify({ title })}'`,
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
  // Restore original Root.tsx
  fs.writeFileSync(rootFilePath, originalRoot);
}
