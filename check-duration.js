#!/usr/bin/env node
const { execSync } = require('child_process');
const wav = '/content/drive/MyDrive/wenhuaquanliyuguojia/wenhuaquanliyuguojia-0_0.wav';
try {
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${wav}"`, { encoding: 'utf-8' }).trim();
  console.log(`ffprobe duration: ${dur} seconds`);
  console.log(`Math.floor(dur * 5) = ${Math.floor(parseFloat(dur) * 5)} frames → ${(Math.floor(parseFloat(dur) * 5) / 5).toFixed(1)}s`);
  console.log(`Math.ceil(dur * 5)  = ${Math.ceil(parseFloat(dur) * 5)} frames → ${(Math.ceil(parseFloat(dur) * 5) / 5).toFixed(1)}s`);
} catch (e) {
  console.error('ffprobe error:', e.message);
}
