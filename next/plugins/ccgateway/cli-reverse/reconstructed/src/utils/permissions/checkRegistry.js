/**
 * utils/permissions/checkRegistry.ts
 *
 * 2.1.316 新增：权限检查登记与 XML 转义
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2c3jp4kn.js (13)
 * attribution: placement 13
 */
import { escapeAngleBrackets, stripInvisibleChars } from "../sanitization.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isDiskless } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2c3jp4kn.js:4069-4106 placement
function escapeXmlInline(text) {
  return escapeAngleBrackets(stripInvisibleChars(text, " "));
}
//@ chunk-2c3jp4kn.js:4106-4136 placement
function escapeXmlKeepJoiners(text) {
  return escapeAngleBrackets(normalizeKeepJoiners(text));
}
//@ chunk-2c3jp4kn.js:4136-4191 placement
function normalizeKeepJoiners(text) {
  return stripInvisibleChars(text, " ", {
    keepSpelledJoiners: true,
  });
}
//@ chunk-2c3jp4kn.js:4191-4246 placement
function escapeXmlAttribute(uri) {
  return escapeXmlInline(uri).replaceAll('"', "&quot;");
}
//@ chunk-2c3jp4kn.js:4246-4341 placement
function escapeXmlControlChars(text) {
  return escapeAngleBrackets(
    text.replace(/[\p{Cc}\p{Cs}]/gu, (char) =>
      char === "\t" ||
      char ===
        `
` ||
      char === "\r"
        ? char
        : "",
    ),
  );
}
//@ chunk-2c3jp4kn.js:4341-4455 placement
var CHECK_NO_DECISION; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var pendingCheckResults;
var registeredChecks;
var pendingCheckToolUseIds;
var MAX_PENDING_CHECKS;
deferInit("chunk-2c3jp4kn.js:4341", () => {
  CHECK_NO_DECISION = Symbol("check does not decide");
  pendingCheckResults = new SessionRootSlot(() => new Map());
  registeredChecks = new SessionRootSlot(() => new Map());
  pendingCheckToolUseIds = new SessionRootSlot(() => new Set());
  MAX_PENDING_CHECKS = 256;
});
//@ chunk-2c3jp4kn.js:4455-4575 placement
function rememberPendingCheck(session, toolUseId) {
  if (session === undefined || toolUseId === "") return;
  let pendingIds = pendingCheckToolUseIds.of(session);
  pendingIds.add(toolUseId);
  if (pendingIds.size > MAX_PENDING_CHECKS) {
    let [oldestId] = pendingIds;
    if (oldestId !== undefined) pendingIds.delete(oldestId);
  }
}
//@ chunk-2c3jp4kn.js:4575-4634 placement
function hasRegisteredCheck(session, name) {
  return session !== undefined && (registeredChecks.peek(session)?.has(name) ?? false);
}
//@ chunk-2c3jp4kn.js:4634-4698 placement
function forgetPendingCheck(session, toolUseID) {
  return session !== undefined && (pendingCheckToolUseIds.peek(session)?.delete(toolUseID) ?? false);
}
//@ chunk-2c3jp4kn.js:4698-4788 placement
function getRegisteredCheck(session, name) {
  let registered = session && registeredChecks.peek(session)?.get(name);
  return registered && getCheckRunner(session, name) === registered.runner ? registered.check : undefined;
}
//@ chunk-2c3jp4kn.js:4788-4835 placement
function getCheckRunner(session, name) {
  return session && pendingCheckResults.peek(session)?.get(name);
}
//@ chunk-2c3jp4kn.js:4835-4889 placement
var DISKLESS_CHECK_TOOL_NAMES; // deferred: uses GLOB_TOOL_NAME (../../tools/GlobTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var DISKLESS_CHECK_TOOL_NAME_SET;
deferInit("chunk-2c3jp4kn.js:4835", () => {
  DISKLESS_CHECK_TOOL_NAMES = [
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    READ,
    FILE_WRITE_TOOL_NAME,
    EDIT,
    NOTEBOOK_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    SEND_USER_FILE_TOOL_NAME,
    MONITOR,
  ];
  DISKLESS_CHECK_TOOL_NAME_SET = new Set(DISKLESS_CHECK_TOOL_NAMES);
});
//@ chunk-2c3jp4kn.js:4889-4926 placement
function isRemoteOnlyCheck(toolName) {
  return DISKLESS_CHECK_TOOL_NAME_SET.has(toolName) && isDiskless();
}
export {
  getRegisteredCheck,
  CHECK_NO_DECISION,
  rememberPendingCheck,
  getCheckRunner,
  escapeXmlInline,
  isRemoteOnlyCheck,
  escapeXmlKeepJoiners,
  normalizeKeepJoiners,
  hasRegisteredCheck,
  escapeXmlAttribute,
  forgetPendingCheck,
  escapeXmlControlChars,
};
