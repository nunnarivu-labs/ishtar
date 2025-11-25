#!/bin/bash

# Script to sync commons source files from packages/commons/src to functions/src/commons
# Run this whenever you make changes to the commons package

set -e

# Change to project root (parent of scripts directory)
cd "$(dirname "$0")/.."

echo "Syncing commons from packages/commons/src to functions/src/commons..."

# Use rsync to sync files (deletes files in destination that don't exist in source)
rsync -av --delete packages/commons/src/ functions/src/commons/

echo "✓ Commons synced successfully"
