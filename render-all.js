#!/usr/bin/env node

/**
 * Batch renderer for audiobook videos
 * Usage: node render-all.js <directory>
 * 
 * Finds all .wav + .srt pairs in directory and renders them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputDir = process.argv[2];

if (!inputDir) {
  console.log('Usage: node render-all.js <directory>');
  console.log('Example: node render-all.js /Users/larry/Downloads/audiobooks');
  process.exit(1);
}

if (!fs.existsSync(inputDir)) {
  console.error(`❌ Directory not found: ${inputDir}`);
  process.exit(1);
}

const projectDir = path.join(__dirname);
const publicDir = path.join(projectDir, 'public');
const outDir = path.join(projectDir, 'out');

// Create output directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find all wav files
const files = fs.readdirSync(inputDir);
const wavFiles = files.filter(f => f.endsWith('.wav'));

console.log(`📁 Found ${wavFiles.length} audio files in ${inputDir}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wavFiles.forEach((wavFile, index) => {
  const baseName = path.basename(wavFile, '.wav');
  const srtFile = path.join(inputDir, baseName + '.srt');
  
  if (!fs.existsSync(srtFile)) {
    console.log(`⚠️  Skip ${baseName} (no .srt file)`);
    return;
  }
  
  console.log(`\n▶️  [${index + 1}/${wavFiles.length}] ${baseName}`);
  
  // Copy to public
  fs.copyFileSync(
    path.join(inputDir, wavFile),
    path.join(publicDir, 'audio.wav')
  );
  fs.copyFileSync(
    path.join(inputDir, srtFile),
    path.join(publicDir, 'content.srt')
  );
  
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
  
  const durationFrames = Math.floor(duration * 30);
  console.log(`   Duration: ${duration.toFixed(1)}s (${durationFrames} frames)`);
  
  // Render
  const outputFile = path.join(outDir, `${baseName}.mp4`);
  
  try {
    console.log('   🎬 Rendering...');
    const propsArg = title ? `--props '{"title": "${title}"}'` : '';
    
    execSync(
      `npx remotion render Audiobook "${outputFile}" --codec h264 ${propsArg}`,
      { stdio: 'inherit', cwd: projectDir }
    );
    
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`✅ Success: ${outputFile} (${sizeMB} MB)`);
    }
  } catch (error) {
    console.error(`❌ Failed: ${baseName}`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

console.log('\n🎉 All done!');
console.log('📂 Output:');
execSync(`ls -lh "${outDir}"`, { stdio: 'inherit' });
