/**
 * utils/teleport/remoteTaskLabels.ts
 *
 * 远程任务标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { getPlatform as getPlatform_2 } from "../platform.js";
import { foldPathCase } from "../pathCaseFolding.js";

//@ chunk-s61vbvea.js:475422-475466 placement
var Xer = "Background task",
  Jer = "Remote task";
//@ chunk-s61vbvea.js:475466-475539 placement = setCwdState (1)
function nfcLowerNfc(cwd) {
  return cwd.normalize("NFC").toLowerCase().normalize("NFC");
}
//@ chunk-s61vbvea.js:475539-475576 placement
var EF = /[\u017f\u212a\ufb00-\ufb06]/;
//@ chunk-s61vbvea.js:475576-475637 placement
var WSL_MNT_DRIVE_PATTERN = /^\/mnt\/[a-z](?:\/|$)/i,
  xF = /^\/mnt(?:\/[a-z])?\/?$/i;
//@ chunk-s61vbvea.js:475637-475683 placement = execTmux (1)
function isWslMntRoot(e) {
  return getPlatform_2() === "wsl" && xF.test(e);
}
//@ chunk-s61vbvea.js:475804-475838 placement
function ati(e) {
  return EF.test(e);
}
//@ chunk-s61vbvea.js:475838-475919 placement
var aw = /\p{Default_Ignorable_Code_Point}/gu,
  regExp_10 = new RegExp(`(${aw.source}+)`, "u");
//@ chunk-s61vbvea.js:476087-476185 placement
function lti(e) {
  let parts = e.split(regExp_10);
  return parts.length === 1 ? null : parts.map((r, s) => (s % 2 === 1 ? r : foldPathCase(r))).join("");
}
//@ chunk-s61vbvea.js:476185-476278 placement
function dti(e) {
  let parts = e.split("/");
  return parts.slice(0, -1).map((r, s) => parts.slice(0, s + 1).join("/"));
}

export { Xer, Jer, nfcLowerNfc, dti, ati, lti, WSL_MNT_DRIVE_PATTERN, aw, isWslMntRoot };
