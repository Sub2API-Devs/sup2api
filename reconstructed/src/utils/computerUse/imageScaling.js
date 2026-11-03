/**
 * utils/computerUse/imageScaling.ts
 *
 * 2.1.316 新增：computer use 截图缩放计算
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hrs3dad1.js (6)
 * attribution: placement 6
 */

//@ chunk-hrs3dad1.js:4874-4934 placement
var IMAGE_SCALING_DEFAULTS = {
  pxPerToken: 28,
  maxTargetPx: 1568,
  maxTargetTokens: 1568,
};
//@ chunk-hrs3dad1.js:4934-4979 placement
/**
 * 向上取整的除法（计算每边分块数）。
 */
function ceilDiv(o, r) {
  return Math.floor((o - 1) / r) + 1;
}
//@ chunk-hrs3dad1.js:4979-5018 placement
/**
 * 按每 token 像素数计算图片的 token 数。
 */
function tokenCountForImage(o, r, pxPerToken) {
  return ceilDiv(o, pxPerToken) * ceilDiv(r, pxPerToken);
}
//@ chunk-hrs3dad1.js:5018-5331 placement
/**
 * 按每 token 像素与最大边长/最大 token 计算截图缩放后的尺寸。
 */
function scaledImageSize(o, r, s) {
  let { pxPerToken, maxTargetPx, maxTargetTokens } = s;
  if (o <= maxTargetPx && r <= maxTargetPx && tokenCountForImage(o, r, pxPerToken) <= maxTargetTokens)
    return [o, r];
  if (r > o) {
    let [n, i] = scaledImageSize(r, o, s);
    return [i, n];
  }
  let f = o / r;
  let g = o;
  let e = 1;
  for (;;) {
    if (e + 1 === g) return [e, Math.max(Math.round(e / f), 1)];
    let floored = Math.floor((e + g) / 2);
    let max = Math.max(Math.round(floored / f), 1);
    if (floored <= maxTargetPx && tokenCountForImage(floored, max, pxPerToken) <= maxTargetTokens)
      e = floored;
    else g = floored;
  }
}
//@ chunk-hrs3dad1.js:5331-5345 placement
/**
 * 图片缩放因子的下限（0.1）。
 */
var MIN_IMAGE_SCALE = 0.1;
var MAX_IMAGE_SCALE = 1;
//@ chunk-hrs3dad1.js:5345-5672 placement
var SCALE_PARAM_DESCRIPTION = `Scale factor in [${MIN_IMAGE_SCALE}, ${MAX_IMAGE_SCALE}] for the returned image; 1 (default) uses the full image token budget, 0.5 returns an image at half the width and height (~quarter of the tokens). Coordinates are ALWAYS in the full-resolution coordinate frame (reported with every scaled screenshot), never in the scaled image's own pixels.`;
export { scaledImageSize, IMAGE_SCALING_DEFAULTS };
