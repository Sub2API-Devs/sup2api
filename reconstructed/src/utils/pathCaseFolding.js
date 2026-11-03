/**
 * utils/pathCaseFolding.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (2)
 * attribution: placement 2
 */
import { getPlatform as getPlatform_2 } from "./platform.js";
import { WSL_MNT_DRIVE_PATTERN, aw } from "./teleport/remoteTaskLabels.js";

//@ chunk-s61vbvea.js:475683-475804 placement
function isCaseInsensitivePlatform(e) {
  switch (getPlatform_2()) {
    case "macos":
    case "windows":
      return !0;
    case "wsl":
      return e !== void 0 && WSL_MNT_DRIVE_PATTERN.test(e);
    default:
      return !1;
  }
}
//@ chunk-s61vbvea.js:475919-476087 placement
function foldPathCase(e) {
  return e
    .replace(aw, "")
    .normalize("NFKD")
    .toLowerCase()
    .toUpperCase()
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .replace(/\u03c2/g, "\u03C3")
    .normalize("NFC");
}

export { foldPathCase, isCaseInsensitivePlatform };
