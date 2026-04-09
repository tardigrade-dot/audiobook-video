#!/bin/bash

# Batch render audiobook videos (wrapper)
# Usage: ./render-batch.sh <wav-file> [srt-file] [output-name] [--title "My Title"]
# Delegates to render-batch.js for actual rendering

node "$(dirname "$0")/render-batch.js" "$@"
