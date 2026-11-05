/**
 * utils/permissions/permissionPromptHost.ts
 *
 * 2.1.316 新增：权限提示宿主
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8), chunk-7jxyna5q.js (4)
 * attribution: placement 12
 */
import { identity as identity_2 } from "../identity.js";
import { isVsCodeOrDesktop } from "../sessionShape.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:16926-16961 placement
/**
 * PERMISSION_PROMPT_HOST_KINDS：权限提示宿主的两种取值。
 */
var PERMISSION_PROMPT_HOST_KINDS = ["host", "none"];
var NONE = "none";
//@ chunk-7jxyna5q.js:16961-16995 placement
/**
 * isNoPromptHost：宿主为 “none”。
 */
function isNoPromptHost(permissionPrompts) {
  return permissionPrompts === "none";
}
//@ chunk-7jxyna5q.js:16995-17062 placement
/**
 * effectivePermissionPromptTool：有效的权限提示工具（stdio 优先）。
 */
function effectivePermissionPromptTool({ permissionPromptTool, sdkUrl }) {
  return sdkUrl ? "stdio" : permissionPromptTool;
}
//@ chunk-7jxyna5q.js:17062-17107 placement
/**
 * hasPermissionPromptTool：指定了非 none 的权限提示工具。
 */
function hasPermissionPromptTool(permissionPromptToolName) {
  return permissionPromptToolName !== undefined && permissionPromptToolName !== "none";
}
//@ chunk-5xgkngpb.js:51212-51279 placement
/**
 * updatedInputOrOriginal：拒绝时保留原输入，否则用更新后的输入。
 */
function updatedInputOrOriginal(decided, originalInput) {
  return decided?.behavior === "deny" ? originalInput : (decided?.updatedInput ?? originalInput);
}
//@ chunk-5xgkngpb.js:51279-51350 placement
var permissionPromptHostState; // deferred: uses emptyPermissionPromptHost of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:51279", () => {
  permissionPromptHostState = identity_2(
    {
      person: null,
      host: emptyPermissionPromptHost(),
    },
    (state) => {
      state.person = null;
      state.host = emptyPermissionPromptHost();
    },
  );
});
//@ chunk-5xgkngpb.js:51350-51388 placement
/**
 * setPermissionPromptPerson：设置提示宿主为“人”。
 */
function setPermissionPromptPerson(person) {
  permissionPromptHostState.person = person;
  return person;
}
//@ chunk-5xgkngpb.js:51388-51421 placement
/**
 * getPermissionPromptPerson：取提示宿主的人。
 */
function getPermissionPromptPerson() {
  return permissionPromptHostState.person;
}
//@ chunk-5xgkngpb.js:51421-51464 placement
/**
 * setPermissionPromptHostProbe：登记某类宿主的探测函数。
 */
function setPermissionPromptHostProbe(kind, value, probe) {
  permissionPromptHostState.host[kind] = probe;
  return value;
}
//@ chunk-5xgkngpb.js:51464-51626 placement
function getPermissionPromptHostKind(preference) {
  if (preference === "served") return isPermissionPromptHostKind("servedCall") ? "servedCall" : null;
  if (isPermissionPromptHostKind("promptTool")) return "promptTool";
  return isPermissionPromptHostKind("callback") && !isVsCodeOrDesktop() ? "callback" : null;
}
//@ chunk-5xgkngpb.js:51626-51670 placement
function isPermissionPromptHostKind(kind) {
  return permissionPromptHostState.host[kind]?.() === true;
}
//@ chunk-5xgkngpb.js:51670-51739 placement
function emptyPermissionPromptHost() {
  return {
    callback: null,
    promptTool: null,
    servedCall: null,
  };
}
export {
  hasPermissionPromptTool,
  getPermissionPromptPerson,
  effectivePermissionPromptTool,
  isNoPromptHost,
  setPermissionPromptHostProbe,
  setPermissionPromptPerson,
  NONE,
  PERMISSION_PROMPT_HOST_KINDS,
  getPermissionPromptHostKind,
  updatedInputOrOriginal,
};
