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

//@ chunk-g54kbxqw.js:35166-35203 placement
function escapeXmlInline(e) {
  return escapeAngleBrackets(stripInvisibleChars(e, " "));
}
//@ chunk-g54kbxqw.js:35203-35235 placement
function escapeXmlKeepJoiners(e) {
  return escapeAngleBrackets(normalizeKeepJoiners(e));
}
//@ chunk-g54kbxqw.js:35235-35291 placement
function normalizeKeepJoiners(e) {
  return stripInvisibleChars(e, " ", {
    keepSpelledJoiners: true,
  });
}
//@ chunk-g54kbxqw.js:35291-35346 placement
function escapeXmlAttribute(uri) {
  return escapeXmlInline(uri).replaceAll('"', "&quot;");
}
//@ chunk-g54kbxqw.js:35346-35441 placement
function escapeXmlControlChars(e) {
  return escapeAngleBrackets(
    e.replace(/[\p{Cc}\p{Cs}]/gu, (n) =>
      n === "\t" ||
      n ===
        `
` ||
      n === "\r"
        ? n
        : "",
    ),
  );
}
//@ chunk-g54kbxqw.js:35441-35557 placement
var CHECK_NO_DECISION = Symbol("check does not decide");
var pendingCheckResults = new SessionRootSlot(() => new Map());
var registeredChecks = new SessionRootSlot(() => new Map());
var pendingCheckToolUseIds = new SessionRootSlot(() => new Set());
var MAX_PENDING_CHECKS = 256;
//@ chunk-g54kbxqw.js:35557-35678 placement
function rememberPendingCheck(session, n) {
  if (session === undefined || n === "") return;
  let s = pendingCheckToolUseIds.of(session);
  s.add(n);
  if (s.size > MAX_PENDING_CHECKS) {
    let [r] = s;
    if (r !== undefined) s.delete(r);
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
  let s = session && registeredChecks.peek(session)?.get(name);
  return s && getCheckRunner(session, name) === s.runner ? s.check : undefined;
}
//@ chunk-g54kbxqw.js:35895-35942 placement
function getCheckRunner(session, name) {
  return session && pendingCheckResults.peek(session)?.get(name);
}
//@ chunk-g54kbxqw.js:35942-35996 placement
var DISKLESS_CHECK_TOOL_NAMES = [
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
var DISKLESS_CHECK_TOOL_NAME_SET = new Set(DISKLESS_CHECK_TOOL_NAMES);
//@ chunk-g54kbxqw.js:35996-36033 placement
function isRemoteOnlyCheck(e) {
  return DISKLESS_CHECK_TOOL_NAME_SET.has(e) && isDiskless();
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
