/**
 * utils/computerUse/imageScaling.ts
 *
 * 2.1.316 新增：computer use 截图缩放计算
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p57a7983.js (6)
 * attribution: placement 6
 */

//@ chunk-p57a7983.js:5098-5158 placement
var IMAGE_SCALING_DEFAULTS = {
  pxPerToken: 28,
  maxTargetPx: 1568,
  maxTargetTokens: 1568,
};
//@ chunk-p57a7983.js:5158-5203 placement
/**
 * 向上取整的除法（计算每边分块数）。
 */
function ceilDiv(numerator, denominator) {
  return Math.floor((numerator - 1) / denominator) + 1;
}
//@ chunk-p57a7983.js:5203-5242 placement
/**
 * 按每 token 像素数计算图片的 token 数。
 */
function tokenCountForImage(width, height, denominator) {
  return ceilDiv(width, denominator) * ceilDiv(height, denominator);
}
//@ chunk-p57a7983.js:5242-5555 placement
/**
 * 按每 token 像素与最大边长/最大 token 计算截图缩放后的尺寸。
 */
function scaledImageSize(width, height, limits) {
  let { pxPerToken, maxTargetPx, maxTargetTokens } = limits;
  if (
    width <= maxTargetPx &&
    height <= maxTargetPx &&
    tokenCountForImage(width, height, pxPerToken) <= maxTargetTokens
  )
    return [width, height];
  if (height > width) {
    let [scaledHeight, scaledWidth] = scaledImageSize(height, width, limits);
    return [scaledWidth, scaledHeight];
  }
  let aspectRatio = width / height;
  let high = width;
  let low = 1;
  for (;;) {
    if (low + 1 === high) return [low, Math.max(Math.round(low / aspectRatio), 1)];
    let floored = Math.floor((low + high) / 2);
    let max = Math.max(Math.round(floored / aspectRatio), 1);
    if (floored <= maxTargetPx && tokenCountForImage(floored, max, pxPerToken) <= maxTargetTokens)
      low = floored;
    else high = floored;
  }
}
//@ chunk-p57a7983.js:5555-5569 placement
/**
 * 图片缩放因子的下限（0.1）。
 */
var MIN_IMAGE_SCALE = 0.1;
var MAX_IMAGE_SCALE = 1;
//@ chunk-p57a7983.js:5569-5896 placement
var SCALE_PARAM_DESCRIPTION = `Scale factor in [${MIN_IMAGE_SCALE}, ${MAX_IMAGE_SCALE}] for the returned image; 1 (default) uses the full image token budget, 0.5 returns an image at half the width and height (~quarter of the tokens). Coordinates are ALWAYS in the full-resolution coordinate frame (reported with every scaled screenshot), never in the scaled image's own pixels.`;
export { scaledImageSize, IMAGE_SCALING_DEFAULTS };
