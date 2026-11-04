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
import { identity as identity_2 } from "../identity.js";
import { isVsCodeOrDesktop } from "../sessionShape.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:48613-48680 placement
/**
 * updatedInputOrOriginal：拒绝时保留原输入，否则用更新后的输入。
 */
function updatedInputOrOriginal(decided, originalInput) {
  return decided?.behavior === "deny" ? originalInput : (decided?.updatedInput ?? originalInput);
}
//@ chunk-e6aww6q8.js:48680-48715 placement
/**
 * PERMISSION_PROMPT_HOST_KINDS：权限提示宿主的两种取值。
 */
var PERMISSION_PROMPT_HOST_KINDS = ["host", "none"];
var NONE = "none";
//@ chunk-e6aww6q8.js:48715-48749 placement
/**
 * isNoPromptHost：宿主为 “none”。
 */
function isNoPromptHost(permissionPrompts) {
  return permissionPrompts === "none";
}
//@ chunk-e6aww6q8.js:48749-48816 placement
/**
 * effectivePermissionPromptTool：有效的权限提示工具（stdio 优先）。
 */
function effectivePermissionPromptTool({ permissionPromptTool, sdkUrl }) {
  return sdkUrl ? "stdio" : permissionPromptTool;
}
//@ chunk-e6aww6q8.js:48816-48862 placement
/**
 * hasPermissionPromptTool：指定了非 none 的权限提示工具。
 */
function hasPermissionPromptTool(permissionPromptToolName) {
  return permissionPromptToolName !== undefined && permissionPromptToolName !== "none";
}
//@ chunk-e6aww6q8.js:48862-48933 placement
var permissionPromptHostState; // deferred: uses emptyPermissionPromptHost of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:48862", () => {
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
//@ chunk-e6aww6q8.js:48933-48971 placement
/**
 * setPermissionPromptPerson：设置提示宿主为“人”。
 */
function setPermissionPromptPerson(person) {
  permissionPromptHostState.person = person;
  return person;
}
//@ chunk-e6aww6q8.js:48971-49004 placement
/**
 * getPermissionPromptPerson：取提示宿主的人。
 */
function getPermissionPromptPerson() {
  return permissionPromptHostState.person;
}
//@ chunk-e6aww6q8.js:49004-49047 placement
/**
 * setPermissionPromptHostProbe：登记某类宿主的探测函数。
 */
function setPermissionPromptHostProbe(kind, value, probe) {
  permissionPromptHostState.host[kind] = probe;
  return value;
}
//@ chunk-e6aww6q8.js:49047-49209 placement
function getPermissionPromptHostKind(preference) {
  if (preference === "served") return isPermissionPromptHostKind("servedCall") ? "servedCall" : null;
  if (isPermissionPromptHostKind("promptTool")) return "promptTool";
  return isPermissionPromptHostKind("callback") && !isVsCodeOrDesktop() ? "callback" : null;
}
//@ chunk-e6aww6q8.js:49209-49253 placement
function isPermissionPromptHostKind(kind) {
  return permissionPromptHostState.host[kind]?.() === true;
}
//@ chunk-e6aww6q8.js:49253-49322 placement
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
  isNoPromptHost,
  NONE,
  PERMISSION_PROMPT_HOST_KINDS,
  effectivePermissionPromptTool,
  setPermissionPromptHostProbe,
  setPermissionPromptPerson,
  getPermissionPromptHostKind,
  updatedInputOrOriginal,
};
