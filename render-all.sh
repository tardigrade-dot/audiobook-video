#!/bin/bash

# Simple batch renderer for audiobook videos
# Usage: ./render-all.sh <directory> [--fps 10] [title]
# Finds all .wav + .srt pairs and renders them

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <directory> [--fps N] [title]"
  echo "Example: $0 /Users/larry/Downloads/wenhuaquanliyuguojia \"My Audiobook\""
  echo "Example: $0 /path/to/audiobooks --fps 5"
  exit 1
fi

INPUT_DIR="$1"
shift

FPS=10
TITLE="有声书"

while [ $# -gt 0 ]; do
  case "$1" in
    --fps) FPS="$2"; shift 2 ;;
    *) TITLE="$1"; shift ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "❌ Directory not found: $INPUT_DIR"
  exit 1
fi

# Create output directory
mkdir -p "$PROJECT_DIR/out"

# Count files
WAV_COUNT=$(find "$INPUT_DIR" -name "*.wav" | wc -l | tr -d ' ')
echo "📁 Found $WAV_COUNT audio files in $INPUT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Process each wav file
find "$INPUT_DIR" -name "*.wav" | sort | while read -r WAV_FILE; do
  BASE_NAME=$(basename "$WAV_FILE" .wav)
  SRT_FILE="${WAV_FILE%.wav}.srt"

  if [ ! -f "$SRT_FILE" ]; then
    echo "⚠️  Skip $BASE_NAME (no .srt)"
    continue
  fi

  echo ""
  echo "▶️  $BASE_NAME"

  # Copy to public
  cp "$WAV_FILE" "$PROJECT_DIR/public/render-example.wav"
  cp "$SRT_FILE" "$PROJECT_DIR/public/render-example.srt"

  # Get duration
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WAV_FILE" 2>/dev/null || echo "460")
  DURATION_FRAMES=$(awk "BEGIN {printf \"%d\", $DURATION * $FPS}")
  [ "$DURATION_FRAMES" -eq 0 ] 2>/dev/null && DURATION_FRAMES=13500

  # Render
  cd "$PROJECT_DIR"
  npx remotion render Audiobook "out/${BASE_NAME}.mp4" \
    --codec h264 --fps $FPS \
    --concurrency 100% --x264-preset veryfast --jpeg-quality 80 --hardware-acceleration if-possible \
    --duration-in-frames "$DURATION_FRAMES"

  echo "✅ out/${BASE_NAME}.mp4"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
done

echo ""
echo "🎉 All done!"
ls -lh "$PROJECT_DIR/out/" | head -20
