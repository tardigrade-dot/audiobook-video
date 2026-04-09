#!/bin/bash

# Batch render audiobook videos
# Usage: ./render-batch.sh <wav-file> <srt-file> [output-name]

if [ $# -lt 2 ]; then
  echo "Usage: $0 <wav-file> <srt-file> [output-name] [title]"
  echo "Example: $0 audio.wav subtitles.srt my-video \"My Journey\""
  exit 1
fi

WAV_FILE="$1"
SRT_FILE="$2"
OUTPUT_NAME="${3:-audiobook}"
TITLE="${4:-有声书}"

# Check if files exist
if [ ! -f "$WAV_FILE" ]; then
  echo "❌ Error: Audio file not found: $WAV_FILE"
  exit 1
fi

if [ ! -f "$SRT_FILE" ]; then
  echo "❌ Error: SRT file not found: $SRT_FILE"
  exit 1
fi

# Copy audio to public directory
echo "📁 Copying audio file..."
cp "$WAV_FILE" public/input-audio.wav

# Read SRT content
echo "📝 Reading SRT file..."
SRT_CONTENT=$(cat "$SRT_FILE")

# Calculate duration from audio file (in seconds)
echo "⏱️  Calculating duration..."
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WAV_FILE" 2>/dev/null || echo "460")
DURATION_FRAMES=$(echo "$DURATION * 30" | bc | cut -d'.' -f1)

if [ -z "$DURATION_FRAMES" ] || [ "$DURATION_FRAMES" -eq 0 ]; then
  DURATION_FRAMES=13500
  echo "⚠️  Could not calculate duration, using default: $DURATION_FRAMES frames"
else
  echo "✅ Duration: $DURATION seconds ($DURATION_FRAMES frames)"
fi

# Create output directory
mkdir -p out

echo "🎬 Rendering video: $OUTPUT_NAME.mp4"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Render with props
REMOTION_AUDIO_PATH="input-audio.wav" \
REMOTION_SRT_CONTENT="$SRT_CONTENT" \
npx remotion render Audiobook "out/$OUTPUT_NAME.mp4" \
  --props "{\"audioPath\": \"input-audio.wav\", \"title\": \"$TITLE\", \"srtContent\": $(echo "$SRT_CONTENT" | node -e 'process.stdin.resume(); let data=""; process.stdin.on("data", c => data+=c); process.stdin.on("end", () => console.log(JSON.stringify(data)))')}"

if [ $? -eq 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Success: out/$OUTPUT_NAME.mp4"
  ls -lh "out/$OUTPUT_NAME.mp4"
else
  echo "❌ Render failed"
  exit 1
fi
