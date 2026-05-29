import { oklch, type Oklch } from 'culori';

function formatOkLchValue(value: number) {
  const formatted = value.toFixed(2).replace(/\.00$/, '');
  return Object.is(formatted, '-0') ? '0' : formatted;
}

/**
 * Format oklch mode color data into a CSS color string
 * @param oklchColor
 */
export function formatOklch(oklchColor: Oklch) {
  if (!oklchColor) {
    return oklchColor;
  }

  if (oklchColor.mode !== 'oklch') {
    throw new TypeError("Expected oklch color data with mode 'oklch'");
  }

  const alpha = oklchColor.alpha ?? 1;
  const alphaPart = alpha < 1 ? ` / ${formatOkLchValue(alpha)}` : '';

  return `oklch(${formatOkLchValue(oklchColor.l || 0)} ${formatOkLchValue(oklchColor.c || 0)} ${formatOkLchValue(oklchColor.h || 0)}${alphaPart})`;
}

/**
 * Mixin a CSS color for dark mode
 * @param cssColor the CSS color
 * @returns the mixin data
 */
export function mixinCssColorForDarkTheme(cssColor: string) {
  const okd = oklch(cssColor);

  if (!okd || okd.mode !== 'oklch') {
    return cssColor;
  }

  // get the maximum lightness for sRGB gamut for the given chroma and hue
  const baseLightness = okd.l || 0;

  // lift colors in dark mode so they remain readable on dark backgrounds.
  const liftedLightness = Math.min(0.95, baseLightness + 0.18);
  const targetLightness = baseLightness >= 0.95 ? baseLightness : Math.max(0.72, liftedLightness);

  return formatOklch({
    mode: 'oklch',
    l: targetLightness,
    c: okd.c || 0,
    h: okd.h || 0,
    alpha: okd.alpha || 1,
  });
}

export { oklch as intoOklch };
