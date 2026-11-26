// iOS launch screens for the installed app (Android builds its own from the
// manifest). Images are made by scripts/generate-splash.sh; keep the two lists
// in sync. [width, height, pixel ratio] in CSS points, portrait.
const SPLASH_SCREENS: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [834, 1112, 2], [810, 1080, 2], [768, 1024, 2], [744, 1133, 2],
];

/** `appleWebApp.startupImage` entries: a light and a dark screen per device size. */
export const splashStartupImages = SPLASH_SCREENS.flatMap(([w, h, r]) => {
  const size = `${w * r}x${h * r}`;
  const device = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
  return [
    { url: `/splash/launch-${size}.png`, media: `${device} and (prefers-color-scheme: light)` },
    { url: `/splash/launch-${size}-dark.png`, media: `${device} and (prefers-color-scheme: dark)` },
  ];
});
