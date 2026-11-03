/**
 * utils/pathCaseFolding.ts
 *
 * 2.1.316 新增：路径大小写折叠（NFKD 归一、去零宽、统一希腊 sigma 等）与平台是否大小写不敏感的判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (2)
 * attribution: placement 2
 */
import { getPlatform as getPlatform_2 } from "./platform.js";
import { WSL_MNT_DRIVE_PATTERN, DEFAULT_IGNORABLE_RE } from "./teleport/remoteTaskLabels.js";

//@ chunk-s61vbvea.js:475683-475804 placement
function isCaseInsensitivePlatform(e) {
  switch (getPlatform_2()) {
    case "macos":
    case "windows":
      return true;
    case "wsl":
      return e !== undefined && WSL_MNT_DRIVE_PATTERN.test(e);
    default:
      return false;
  }
}
//@ chunk-s61vbvea.js:475919-476087 placement
function foldPathCase(e) {
  return e
    .replace(DEFAULT_IGNORABLE_RE, "")
    .normalize("NFKD")
    .toLowerCase()
    .toUpperCase()
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .replace(/\u03c2/g, "\u03C3")
    .normalize("NFC");
}
export { foldPathCase, isCaseInsensitivePlatform };
