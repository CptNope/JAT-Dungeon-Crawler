#!/bin/bash
# Packs the hosted build into dist/hearthdeep-itch.zip for itch.io (Kind of project: HTML; "This file will be played in the browser").
# The web app manifest link is left out, so no service worker is registered inside itch's frame.
set -e
cd "$(dirname "$0")/.."
./build.sh
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/vendor" "$tmp/icons"
sed -e 's|<link rel="manifest" href="manifest.webmanifest">||' -e 's|<link rel="canonical"[^>]*>||' index.html > "$tmp/index.html"
cp game.js "$tmp/"; cp vendor/three.module.js vendor/three.core.js vendor/THREE-LICENSE "$tmp/vendor/"; cp icons/icon.svg icons/icon-192.png icons/apple-touch-icon.png "$tmp/icons/"
rm -f dist/hearthdeep-itch.zip
(cd "$tmp" && zip -q -r -9 out.zip .) && mv "$tmp/out.zip" dist/hearthdeep-itch.zip
echo "packed: dist/hearthdeep-itch.zip ($(du -h dist/hearthdeep-itch.zip | cut -f1))"
