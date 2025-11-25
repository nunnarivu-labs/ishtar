#!/bin/bash

# Script to prepare commons package for Firebase Functions deployment
# This copies the built commons package into functions/node_modules to avoid symlink issues

set -e

echo "Building @ishtar/commons package..."
npm run build --workspace=packages/commons

echo "Ensuring functions/node_modules/@ishtar directory exists..."
mkdir -p functions/node_modules/@ishtar

echo "Copying commons package to functions/node_modules/@ishtar/commons..."
rm -rf functions/node_modules/@ishtar/commons
cp -r packages/commons functions/node_modules/@ishtar/commons

echo "✓ Commons package prepared for deployment"
