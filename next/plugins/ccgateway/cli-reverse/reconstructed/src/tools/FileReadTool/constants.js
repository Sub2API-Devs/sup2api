/**
 * tools/FileReadTool/constants.ts
 *
 * 2.1.316 新增：Read 工具名、allow_large 参数与图像/PDF 扩展名判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r2j5awry.js (2)
 * attribution: placement 2
 */
import path from "path";

//@ chunk-r2j5awry.js:211-290 placement (2.1.88 match: IMAGE_EXTENSIONS, 0.825)
/**
 * Read 工具名 "Read"、参数名 "allow_large"、图片扩展名集合（png/jpg/jpeg/gif/webp）。
 */
var FILE_READ_TOOL_NAME = "Read";
var ALLOW_LARGE_PARAM = "allow_large";
var IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
//@ chunk-r2j5awry.js:290-377 placement
/**
 * 判断扩展名是否为受支持的图片格式或 pdf（大小写不敏感）。
 */
function isImageOrPdfExtension(filePath) {
  let sliced = path.extname(filePath).toLowerCase().slice(1);
  return IMAGE_EXTENSIONS.has(sliced) || sliced === "pdf";
}
export { FILE_READ_TOOL_NAME, ALLOW_LARGE_PARAM, isImageOrPdfExtension, IMAGE_EXTENSIONS };
