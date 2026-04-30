#!/usr/bin/env bash
# Sync canonical PBFOverlay.html (AI Scripts/) into this repo's overlay/ mirror,
# then stage + commit. Run from anywhere.
set -e

SRC="/g/My Drive/3-Rynexx/6-PBF/AI Scripts/PBFOverlay.html"
REPO="/g/My Drive/3-Rynexx/2-Website/profitbyfaith"
DST="$REPO/overlay/PBFOverlay.html"

[ -f "$SRC" ] || { echo "missing: $SRC"; exit 1; }

cp "$SRC" "$DST"
cd "$REPO"

if git diff --quiet -- overlay/PBFOverlay.html; then
  echo "overlay already in sync — nothing to commit"
  exit 0
fi

git add overlay/PBFOverlay.html
git commit -m "chore: sync overlay/PBFOverlay.html from AI Scripts canonical"
echo "committed. run 'git push' when ready."
