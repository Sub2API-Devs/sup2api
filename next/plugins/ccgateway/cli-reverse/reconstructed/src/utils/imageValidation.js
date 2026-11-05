/**
 * utils/imageValidation.ts
 *
 * 图片块校验（base64 大小上限 ImageSizeError、tengu_image_api_validation_failed），另含提示缓存区域定位辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/imageValidation.ts
 * pieces: chunk-ma8ytfb3.js (1), chunk-vr5v4gzz.js (3)
 * attribution: fingerprint 3, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { formatFileSize } from "./format.js";
import { isPlainObject as isPlainObject_2 } from "./isPlainObject.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-vr5v4gzz.js:1496-1880 fingerprint (2.1.88 match: ImageSizeError, 0.92)
class ImageSizeError extends Error {
  constructor(oversizedImages, maxSize) {
    let message;
    let firstImage = oversizedImages[0];
    if (oversizedImages.length === 1 && firstImage)
      message = `Image base64 size (${formatFileSize(firstImage.size)}) exceeds API limit (${formatFileSize(maxSize)}). Please resize the image before sending.`;
    else
      message =
        `${oversizedImages.length} images exceed the API limit (${formatFileSize(maxSize)}): ` +
        oversizedImages.map((img) => `Image ${img.index}: ${formatFileSize(img.size)}`).join(", ") +
        ". Please resize these images before sending.";
    super(message);
    this.name = "ImageSizeError";
  }
}
//@ chunk-vr5v4gzz.js:1880-2052 placement
function isBase64ImageBlock(block) {
  if (!isPlainObject_2(block) || !("source" in block)) return false;
  let source = block.source;
  if (!isPlainObject_2(source)) return false;
  if (!("type" in source) || source.type !== "base64") return false;
  return "data" in source && typeof source.data === "string";
}
//@ chunk-vr5v4gzz.js:2321-2474 fingerprint (2.1.88 match: validateImagesForAPI, 1)
function validateImagesForAPI(block, index, maxBytes, tooLarge) {
  let base64Size = block.source.data.length;
  if (base64Size > maxBytes) {
    logEvent("tengu_image_api_validation_failed", {
      base64_size_bytes: base64Size,
      max_bytes: maxBytes,
    });
    tooLarge.push({
      index,
      size: base64Size,
    });
  }
}
//@ chunk-ma8ytfb3.js:45388-45506 fingerprint (2.1.88 match: isBase64ImageBlock, 1)
function isBase64ImageBlock_2(block) {
  return block.type === "image" && block.source.type === "base64"
    ? block.source.data.length
    : block.type === "text"
      ? block.text.length
      : 0;
}
export { isBase64ImageBlock, ImageSizeError, isBase64ImageBlock_2, validateImagesForAPI };
