/**
 * utils/permissions/permissionPromptHost.ts
 *
 * 2.1.316 新增：权限提示宿主
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { ge } from "../identity.js";
import { isVsCodeOrDesktop } from "../sessionShape.js";

//@ chunk-e6aww6q8.js:48613-48680 placement
function lyt(e, n) {
  return e?.behavior === "deny" ? n : (e?.updatedInput ?? n);
}
//@ chunk-e6aww6q8.js:48680-48715 placement
var U4s = ["host", "none"],
  NONE = "none";
//@ chunk-e6aww6q8.js:48715-48749 placement
function Z_e(e) {
  return e === "none";
}
//@ chunk-e6aww6q8.js:48749-48816 placement
function i8n({ permissionPromptTool: permissionPromptTool, sdkUrl: sdkUrl }) {
  return sdkUrl ? "stdio" : permissionPromptTool;
}
//@ chunk-e6aww6q8.js:48816-48862 placement
function zue(e) {
  return e !== void 0 && e !== "none";
}
//@ chunk-e6aww6q8.js:48862-48933 placement
var dle = ge({ person: null, host: dyt() }, (e) => {
  ((e.person = null), (e.host = dyt()));
});
//@ chunk-e6aww6q8.js:48933-48971 placement
function v8n(e) {
  return ((dle.person = e), e);
}
//@ chunk-e6aww6q8.js:48971-49004 placement
function zjt() {
  return dle.person;
}
//@ chunk-e6aww6q8.js:49004-49047 placement
function Fet(e, n, r) {
  return ((dle.host[e] = r), n);
}
//@ chunk-e6aww6q8.js:49047-49209 placement
function getPermissionPromptHostKind(e) {
  if (e === "served") return KLe("servedCall") ? "servedCall" : null;
  if (KLe("promptTool")) return "promptTool";
  return KLe("callback") && !isVsCodeOrDesktop() ? "callback" : null;
}
//@ chunk-e6aww6q8.js:49209-49253 placement
function KLe(e) {
  return dle.host[e]?.() === !0;
}
//@ chunk-e6aww6q8.js:49253-49322 placement
function dyt() {
  return { callback: null, promptTool: null, servedCall: null };
}

export { zue, zjt, Z_e, NONE, U4s, i8n, Fet, v8n, getPermissionPromptHostKind, lyt };
