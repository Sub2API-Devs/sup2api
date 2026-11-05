/**
 * tools/FileReadTool/constants.ts
 *
 * 2.1.316 新增：Read 工具名、allow_large 参数与图像/PDF 扩展名判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmsrw1pw.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import path from "path";

//@ chunk-fmsrw1pw.js:211-290 placement (2.1.88 match: IMAGE_EXTENSIONS, 0.825)
/**
 * Read 工具名 "Read"、参数名 "allow_large"、图片扩展名集合（png/jpg/jpeg/gif/webp）。
 */
var READ = "Read";
var ALLOW_LARGE_PARAM = "allow_large";
var IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
//@ chunk-fmsrw1pw.js:290-377 placement
/**
 * 判断扩展名是否为受支持的图片格式或 pdf（大小写不敏感）。
 */
function isImageOrPdfExtension(filePath) {
  let sliced = path.extname(filePath).toLowerCase().slice(1);
  return IMAGE_EXTENSIONS.has(sliced) || sliced === "pdf";
}
export { READ, isImageOrPdfExtension, IMAGE_EXTENSIONS, ALLOW_LARGE_PARAM };
