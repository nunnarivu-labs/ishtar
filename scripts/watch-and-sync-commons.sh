#!/bin/bash

# Watch script to automatically sync commons when files change
# Used during local development

# Change to project root
cd "$(dirname "$0")/.."

echo "👀 Watching packages/commons/src for changes..."
echo "Will automatically sync to functions/src/commons"
echo ""

# Run initial sync
bash scripts/sync-commons-to-functions.sh

# Watch for changes and sync
# Using fswatch (built-in on macOS, install with 'brew install fswatch' if missing)
fswatch -o packages/commons/src | while read; do
  echo ""
  echo "📝 Changes detected in commons, syncing..."
  bash scripts/sync-commons-to-functions.sh
done
