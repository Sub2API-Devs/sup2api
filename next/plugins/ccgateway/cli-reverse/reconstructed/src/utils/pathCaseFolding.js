/**
 * utils/pathCaseFolding.ts
 *
 * 2.1.316 新增：路径大小写折叠（NFKD 归一、去零宽、统一希腊 sigma 等）与平台是否大小写不敏感的判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (2)
 * attribution: placement 2
 */
import { getPlatform as getPlatform_2 } from "./platform.js";
import { WSL_MNT_DRIVE_PATTERN, DEFAULT_IGNORABLE_RE } from "./teleport/remoteTaskLabels.js";

//@ chunk-7jxyna5q.js:393161-393282 placement (2.1.88 match: SUPPORTED_PLATFORMS, 1)
function isCaseInsensitivePlatform(inputPath) {
  switch (getPlatform_2()) {
    case "macos":
    case "windows":
      return true;
    case "wsl":
      return inputPath !== undefined && WSL_MNT_DRIVE_PATTERN.test(inputPath);
    default:
      return false;
  }
}
//@ chunk-7jxyna5q.js:393397-393565 placement
function foldPathCase(path) {
  return path
    .replace(DEFAULT_IGNORABLE_RE, "")
    .normalize("NFKD")
    .toLowerCase()
    .toUpperCase()
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .replace(/\u03c2/g, "\u03C3")
    .normalize("NFC");
}
export { isCaseInsensitivePlatform, foldPathCase };
