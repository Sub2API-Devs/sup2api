/**
 * utils/permissions/checkRegistry.ts
 *
 * 2.1.316 新增：权限检查登记与 XML 转义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (13)
 * attribution: placement 13
 */
import { escapeAngleBrackets, stripInvisibleChars } from "../sanitization.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isDiskless } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:35166-35203 placement
function escapeXmlInline(text) {
  return escapeAngleBrackets(stripInvisibleChars(text, " "));
}
//@ chunk-g54kbxqw.js:35203-35235 placement
function escapeXmlKeepJoiners(text) {
  return escapeAngleBrackets(normalizeKeepJoiners(text));
}
//@ chunk-g54kbxqw.js:35235-35291 placement
function normalizeKeepJoiners(text) {
  return stripInvisibleChars(text, " ", {
    keepSpelledJoiners: true,
  });
}
//@ chunk-g54kbxqw.js:35291-35346 placement
function escapeXmlAttribute(uri) {
  return escapeXmlInline(uri).replaceAll('"', "&quot;");
}
//@ chunk-g54kbxqw.js:35346-35441 placement
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
//@ chunk-g54kbxqw.js:35441-35557 placement
var CHECK_NO_DECISION; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var pendingCheckResults;
var registeredChecks;
var pendingCheckToolUseIds;
var MAX_PENDING_CHECKS;
deferInit("chunk-g54kbxqw.js:35441", () => {
  CHECK_NO_DECISION = Symbol("check does not decide");
  pendingCheckResults = new SessionRootSlot(() => new Map());
  registeredChecks = new SessionRootSlot(() => new Map());
  pendingCheckToolUseIds = new SessionRootSlot(() => new Set());
  MAX_PENDING_CHECKS = 256;
});
//@ chunk-g54kbxqw.js:35557-35678 placement
function rememberPendingCheck(session, toolUseId) {
  if (session === undefined || toolUseId === "") return;
  let pendingIds = pendingCheckToolUseIds.of(session);
  pendingIds.add(toolUseId);
  if (pendingIds.size > MAX_PENDING_CHECKS) {
    let [oldestId] = pendingIds;
    if (oldestId !== undefined) pendingIds.delete(oldestId);
  }
}
//@ chunk-g54kbxqw.js:35678-35739 placement
function hasRegisteredCheck(session, name) {
  return session !== undefined && (registeredChecks.peek(session)?.has(name) ?? false);
}
//@ chunk-g54kbxqw.js:35739-35804 placement
function forgetPendingCheck(session, toolUseID) {
  return session !== undefined && (pendingCheckToolUseIds.peek(session)?.delete(toolUseID) ?? false);
}
//@ chunk-g54kbxqw.js:35804-35895 placement
function getRegisteredCheck(session, name) {
  let registered = session && registeredChecks.peek(session)?.get(name);
  return registered && getCheckRunner(session, name) === registered.runner ? registered.check : undefined;
}
//@ chunk-g54kbxqw.js:35895-35942 placement
function getCheckRunner(session, name) {
  return session && pendingCheckResults.peek(session)?.get(name);
}
//@ chunk-g54kbxqw.js:35942-35996 placement
var DISKLESS_CHECK_TOOL_NAMES; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var DISKLESS_CHECK_TOOL_NAME_SET;
deferInit("chunk-g54kbxqw.js:35942", () => {
  DISKLESS_CHECK_TOOL_NAMES = [
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    SEND_USER_FILE_TOOL_NAME,
    MONITOR,
  ];
  DISKLESS_CHECK_TOOL_NAME_SET = new Set(DISKLESS_CHECK_TOOL_NAMES);
});
//@ chunk-g54kbxqw.js:35996-36033 placement
function isRemoteOnlyCheck(toolName) {
  return DISKLESS_CHECK_TOOL_NAME_SET.has(toolName) && isDiskless();
}
export {
  getRegisteredCheck,
  CHECK_NO_DECISION,
  rememberPendingCheck,
  getCheckRunner,
  isRemoteOnlyCheck,
  escapeXmlInline,
  escapeXmlAttribute,
  forgetPendingCheck,
  escapeXmlKeepJoiners,
  normalizeKeepJoiners,
  hasRegisteredCheck,
  escapeXmlControlChars,
};
