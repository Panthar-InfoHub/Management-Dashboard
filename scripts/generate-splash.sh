#!/usr/bin/env bash
# Generates the PWA launch images and maskable icons from the logo, with ffmpeg.
#   bash scripts/generate-splash.sh
# Output: public/splash/*.png (iOS launch screens, light and dark) and
# public/icon-maskable-{192,512}.png (Android icons with safe-zone padding).
# The list of screens must match SPLASH_SCREENS in lib/pwa/splash.ts.
set -euo pipefail
cd "$(dirname "$0")/.."

LOGO=public/images/black_logo.webp
OUT=public/splash
LIGHT_BG="0xffffff"
DARK_BG="0x0a0a0a"
mkdir -p "$OUT"

# Logo converted once to PNG with alpha.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
ffmpeg -v error -y -i "$LOGO" -pix_fmt rgba "$TMP/logo.png"

# width height pixel-ratio (CSS points), portrait.
SCREENS=(
  "440 956 3" "402 874 3" "430 932 3" "393 852 3" "428 926 3" "390 844 3"
  "375 812 3" "414 896 3" "414 896 2" "414 736 3" "375 667 2" "320 568 2"
  "1024 1366 2" "834 1194 2" "820 1180 2" "834 1112 2" "810 1080 2" "768 1024 2" "744 1133 2"
)

render() { # w h logo-size bg negate out
  local w=$1 h=$2 size=$3 bg=$4 neg=$5 out=$6
  local logo="[1]scale=${size}:${size}:flags=lanczos"
  [ "$neg" = 1 ] && logo="$logo,negate=negate_alpha=0"
  # The canvas must be RGB: ffmpeg's default (yuv420p) only allows even sizes and
  # would round 1125 and 1179 down by a pixel; iOS ignores a launch image that
  # isn't the screen's exact size and shows black instead.
  ffmpeg -v error -y -f lavfi -i "color=c=${bg}:s=${w}x${h},format=rgb24" -i "$TMP/logo.png" \
    -filter_complex "${logo}[l];[0][l]overlay=(W-w)/2:(H-h)/2:format=auto,format=rgb24" \
    -frames:v 1 -compression_level 9 "$out"
}

for s in "${SCREENS[@]}"; do
  read -r cw ch r <<<"$s"
  w=$((cw * r)); h=$((ch * r))
  # Logo about a quarter of the short side, as most native launch screens.
  size=$(( (cw < ch ? cw : ch) * r * 28 / 100 ))
  render "$w" "$h" "$size" "$LIGHT_BG" 0 "$OUT/launch-${w}x${h}.png"
  render "$w" "$h" "$size" "$DARK_BG" 1 "$OUT/launch-${w}x${h}-dark.png"
done

# Maskable icons: logo inside the 80% safe zone, on white.
for px in 192 512; do
  render "$px" "$px" $((px * 62 / 100)) "$LIGHT_BG" 0 "public/icon-maskable-${px}.png"
done

echo "Generated $(ls "$OUT" | wc -l) launch images in $OUT and 2 maskable icons."
