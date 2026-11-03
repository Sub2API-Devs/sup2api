/**
 * tools/ArtifactTool/publishEdits.ts
 *
 * 2.1.316 新增：Artifact 发布的 edits（查找替换）应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (14), chunk-y9np9srf.js (20)
 * attribution: placement 34
 */
import { lstat } from "fs/promises";
import { constants } from "fs";
import { E, preprocess } from "../../../vendor/zod/v4/classic/schemas.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import { detectLineEndingsForString as detectLineEndingsForString_2 } from "../../utils/fileRead.js";
import { detectLineEndingsForString, runWithFileWriteContext } from "../../utils/file.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { expandPathOrNull } from "../../utils/path.js";
import { NOTHING_PUBLISHED_NOTE } from "./prompt.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import {
  getDenyRuleForTool,
  getFileEditPermissionOutcome,
  classifyEditsEnabled,
  shouldClassifyEdits,
} from "../../utils/permissions/permissions.js";
import { FileEditTool } from "../FileEditTool/FileEditTool.js";
import { walkPermissionCheckPaths } from "../../utils/fsOperations.js";
import {
  checkWritePermissionForTool,
  leafSymlinkWriteRefusal,
  isClaudeSettingsPath,
} from "../../utils/permissions/filesystem.js";
import { getErrnoCode } from "../../utils/errors.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "../FileEditTool/perforce.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { lintMemoryFilePath, lintMemoryWrite } from "../../memdir/memoryWriteLint.js";
import {
  isArbiterRole,
  getAutoModeClassifierRole,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { isClassifierRoutedCircuitBreaker } from "../../types/permissions.js";
import { getMainLoopModel } from "../../utils/permissions/toolPermissionContext.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { hasToolHookMatching } from "../../utils/hooks.js";
import { hooksModuleMayCover } from "../../services/artifacts/hookCoverage.js";
import { openFileNoFollow } from "../../utils/fsSafety/hardenedRead.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { readExactBytes } from "../../services/artifacts/artifactUrl.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fileHistoryTrackEdit } from "../../utils/fileHistory.js";
import { logForDebugging } from "../../utils/debug.js";
import { stripBomAndCarriageReturn, hasFullFileContent } from "../../utils/remoteFileState.js";
import { getLspServerManager } from "../../services/lsp/manager.js";
import {
  clearDeliveredDiagnosticsForFile,
  clearPendingDiagnosticsForFile,
} from "../../services/lsp/LSPDiagnosticRegistry.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

//@ chunk-y9np9srf.js:410-439 placement
var MODEL_FACING_MESSAGE_KEY = "modelFacingMessage";
//@ chunk-y9np9srf.js:439-475 placement
function coercedNumberSchema(e = E()) {
  return preprocess(coerceNumberString, e);
}
//@ chunk-y9np9srf.js:475-620 placement
function coerceNumberString(offset) {
  if (typeof offset === "string") {
    let trimmed = offset.trim();
    if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
      let t = Number(trimmed);
      if (Number.isFinite(t)) return t;
    }
  }
  return offset;
}
//@ chunk-y9np9srf.js:620-631 placement
var MAX_PUBLISH_EDITS = 64;
//@ chunk-y9np9srf.js:631-1006 placement
function applyFindReplace(e, n) {
  let t = e;
  for (let j = 0; j < n.length; j++) {
    let { find, replace } = n[j];
    if (!isWellFormedString(find) || !isWellFormedString(replace))
      return {
        ok: false,
        reason: "malformed",
        op: j,
      };
    let d = find === "" ? -1 : t.indexOf(find);
    if (d === -1)
      return {
        ok: false,
        reason: "not_found",
        op: j,
      };
    if (t.indexOf(find, d + 1) !== -1)
      return {
        ok: false,
        reason: "ambiguous",
        op: j,
      };
    t = t.slice(0, d) + replace + t.slice(d + find.length);
  }
  if (t === e)
    return {
      ok: false,
      reason: "noop",
    };
  return {
    ok: true,
    content: t,
  };
}
//@ chunk-y9np9srf.js:1006-1046 placement
/**
 * 发布 edits 的上限：总字符、工作量与出现次数扫描上限。
 */
var PUBLISH_EDIT_LIMITS = MAX_PUBLISH_EDITS;
var MAX_TOTAL_EDIT_CHARS = 65536;
var MAX_EDIT_WORK_CHARS = 268435456;
var MAX_OCCURRENCE_SCAN = 100;
//@ chunk-y9np9srf.js:1046-1109 placement
function isPublishEditsEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_PUBLISH_EDITS ?? true;
}
//@ chunk-y9np9srf.js:1109-2266 placement
function publishEditsDescription(e) {
  let n = e.core
    ? "publish: small changes Claude makes to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after."
    : "publish: small changes to make to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after.";
  let t = e.typesOn
    ? " Use it on a page (add `url` to update an artifact from another conversation) or on one data file of an artifact made from a type (its `url`, with that file as `file_path`)."
    : " Use it on a page (add `url` to update an artifact from another conversation).";
  let s = [...(e.typesOn ? ["`type_url`"] : []), ...(e.multiFileOn ? ["`files`"] : [])];
  let o =
    s.length === 0
      ? ""
      : ` Not allowed with ${s.length === 1 ? s[0] : `${s.slice(0, -1).join(", ")} or ${s.at(-1)}`}.`;
  return `${n}${t}${o} Each old_str is text copied exactly from the file as it now stands and must occur in it exactly once; new_str takes its place (empty deletes it). The edits apply in order, all or none: the file is published with them and then saved with them on disk, so it stays the source for later changes; on a miss nothing is changed or published, and the result says which edit failed and why.`;
}
//@ chunk-y9np9srf.js:2266-3621 placement
/**
 * 发布 edits 的字段说明与三处「下次小改动可直接用 edits」的提示文案。
 */
var EDIT_FIELD_DESCRIPTIONS = "Text copied exactly from the file; must occur once.";
var NEW_STR_FIELD_DESCRIPTION = "Its replacement; empty deletes old_str.";
var PUBLISH_EDITS_INLINE_HINT =
  " For a small change to a page published from a file in this conversation, Claude can send the change as `edits` on the publish call itself (old_str/new_str pairs copied exactly from the file as it now stands) instead of editing the file first.";
var PUBLISH_EDITS_AFTER_PUBLISH_HINT =
  "The files you sent are still on disk. For the next small change to this file, send it as `edits` on a publish of the same file_path (old_str/new_str pairs copied exactly from the file as it now stands): that one call changes the file and what is published together, with no Read and no Edit. To change several files, or to rewrite most of the page, Edit the files and publish them in the same response; if an Edit reports that it did not apply, correct it and publish again. If the file's text is no longer in this conversation, Read it first.";
var PUBLISH_EDITS_AFTER_EDITS_HINT =
  "Once that file has these edits too, the next small change to it can go as `edits` on a publish of the same file_path (old_str/new_str pairs copied exactly from the file as it then stands). To change several files, or to rewrite most of the page, Edit the files and publish them in the same response; if an Edit reports that it did not apply, correct it and publish again. If the file's text is no longer in this conversation, Read it first.";
//@ chunk-y9np9srf.js:3621-3871 placement
function validateEdits(e) {
  let n = 0;
  for (let j = 0; j < e.length; j++) {
    let { old_str: oldStr, new_str: newStr } = e[j];
    if (oldStr === "")
      return {
        reason: "empty_old_str",
        edit: j,
      };
    if (newStr.includes("\x00"))
      return {
        reason: "malformed",
        edit: j,
      };
    n += oldStr.length + newStr.length;
    if (n > MAX_TOTAL_EDIT_CHARS)
      return {
        reason: "too_large",
      };
  }
  return;
}
//@ chunk-y9np9srf.js:3871-4560 placement
/**
 * 把 publish 的 edits（old_str/new_str）应用到文件：必须唯一出现、大小与工作量受限，返回新内容或失败原因。
 */
function applyPublishEdits(e, edits, t = {}) {
  let s = validateEdits(edits);
  if (s !== undefined)
    return {
      ok: false,
      ...s,
    };
  if (edits.length * e.length > MAX_EDIT_WORK_CHARS)
    return {
      ok: false,
      reason: "too_much_work",
    };
  let o = detectLineEndingsForString_2(e) === "CRLF";
  let a = (l) =>
    o
      ? l.replaceAll(
          `\r
`,
          `
`,
        )
      : l;
  let d = a(e);
  let mapped = edits.map((l) => ({
    find: a(l.old_str),
    replace: a(l.new_str),
  }));
  let r = applyFindReplace(d, mapped);
  if (!r.ok)
    switch (r.reason) {
      case "noop":
        return {
          ok: false,
          reason: "noop",
        };
      case "ambiguous": {
        let l = d;
        for (let j = 0; j < r.op; j++) {
          let { find, replace } = mapped[j];
          let index = l.indexOf(find);
          l = l.slice(0, index) + replace + l.slice(index + find.length);
        }
        return {
          ok: false,
          reason: "ambiguous",
          edit: r.op,
          count: countOccurrencesCapped(l, mapped[r.op].find),
        };
      }
      default:
        return {
          ok: false,
          reason: r.reason,
          edit: r.op,
        };
    }
  if (t.json === true && isValidJsonText(d) && !isValidJsonText(r.content))
    return {
      ok: false,
      reason: "json_invalid",
    };
  return o
    ? {
        ...r,
        content: detectLineEndingsForString(r.content, "CRLF"),
      }
    : r;
}
//@ chunk-y9np9srf.js:4560-4651 placement
/**
 * 统计子串出现次数，最多数到上限为止。
 */
function countOccurrencesCapped(e, find) {
  let t = 0;
  for (
    let index = e.indexOf(find);
    index !== -1 && t < MAX_OCCURRENCE_SCAN;
    index = e.indexOf(find, index + 1)
  )
    t++;
  return t;
}
//@ chunk-y9np9srf.js:4651-4701 placement
/**
 * 文本能否解析为 JSON。
 */
function isValidJsonText(e) {
  try {
    jsonParse(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-y9np9srf.js:4701-5977 placement
function describeEditFailure(e, n, t) {
  switch (e.reason) {
    case "empty_old_str":
      return `edits[${e.edit}] old_str is empty`;
    case "malformed":
      return `edits[${e.edit}] has a NUL character in new_str, or a broken character (an unpaired surrogate) in old_str or new_str`;
    case "too_large":
      return `old_str and new_str add up to more than ${MAX_TOTAL_EDIT_CHARS} characters over all the edits; make a change that large with Edit and publish without edits`;
    case "too_much_work":
      return `${n} edits on a file of ${t} characters is more than one publish call will apply; send at most ${Math.max(1, Math.floor(MAX_EDIT_WORK_CHARS / Math.max(1, t)))} edits per call for a file this size, over as many calls as the change needs`;
    case "not_found":
      return `edits[${e.edit}] old_str does not occur in the file`;
    case "ambiguous":
      return `edits[${e.edit}] old_str occurs ${e.count >= MAX_OCCURRENCE_SCAN ? "at least " : ""}${e.count} times in the file; include more of the surrounding text so that it occurs once`;
    case "noop":
      return "the edits leave the file unchanged (it already reads that way); publish the file without edits if it should go out as it is";
    case "json_invalid":
      return "after these edits the file would no longer be valid JSON, which the page that reads it needs; correct the edit that breaks it (a missing comma, quote or bracket) and send this publish again with all of its edits";
  }
}
//@ chunk-y9np9srf.js:5977-6045 placement
/**
 * 编辑失败原因是否为「找不到」或「有多处匹配」。
 */
function isNotFoundOrAmbiguousEdit(e) {
  return e.reason === "not_found" || e.reason === "ambiguous";
}
//@ chunk-y9np9srf.js:6045-6435 placement
function editsFailedMessage(e, edits, t, s) {
  let o = `No edits were applied and nothing was published: ${describeEditFailure(e, edits.length, t.length)}.`;
  if (!isNotFoundOrAmbiguousEdit(e)) return o;
  let a = `${o} The file's current text follows; copy old_str from it exactly and send the publish again.

${t}`;
  if (a.length <= s) return a;
  return `${o} The file is too long to show here: Read the file at file_path, copy old_str from it exactly and send the publish again.`;
}
//@ chunk-y9np9srf.js:6435-6482 placement
function editsBaseKey(e) {
  return `\x00edits-base\x00${e}`;
}
//@ chunk-y9np9srf.js:6482-6727 placement
var EDIT_PERMISSION_ASK_TEXT =
  "Applying `edits` changes the file at file_path, and an Edit permission check requires approval here: nothing was published and the file is unchanged. Retry the publish so it can be asked, or Edit the file and publish it without edits.";
//@ chunk-y9np9srf.js:6727-7994 placement
function editsWrittenNote(editsApplied, n, editsNotWritten) {
  let s = n === "page" ? "the published page" : "what was published";
  if (editsNotWritten === undefined)
    return editsApplied === 1
      ? `The edit was written to the file after it was published, so the file matches ${s}.`
      : `The ${editsApplied} edits were written to the file after it was published, so the file matches ${s}.`;
  let o = editsApplied === 1;
  let a = `Published \u2014 ${n === "page" ? "the page" : "the artifact"} now has ${o ? "the edit" : `the ${editsApplied} edits`}, but the file at file_path does not`;
  if (editsNotWritten === "write_failed")
    return `${a}: writing it back failed, and the file may be partly written. Read it before anything else, restore it to the published text (${s}, ${o ? "the edit" : "the edits"} included), and only then publish it again; publishing it as it is could put damaged content ${n === "page" ? "on the page" : "in the artifact"}.`;
  return `${a} (${editsNotWritten === "changed_during_publish" ? "it changed on disk while the publish ran, so it was left as it is" : editsNotWritten === "not_writable" ? "it could not be opened for writing (read-only), so it was left as it is" : "it has other names on disk (a hard link), so it was left as it is"}). Apply the same ${o ? "edit" : "edits"} to that file with Edit before you publish it again${editsNotWritten === "hard_linked" ? ", and publish it without `edits` while it has other names" : ""}; publishing it as it is would revert ${o ? "it" : "them"}.`;
}
//@ chunk-y9np9srf.js:7994-8234 placement
function encodeLikeOriginal(e, n) {
  if (e[0] === 255 && e[1] === 254)
    return Buffer.concat([Buffer.from([255, 254]), Buffer.from(n, "utf16le")]);
  let t = e[0] === 239 && e[1] === 187 && e[2] === 191;
  return Buffer.concat([...(t ? [Buffer.from([239, 187, 191])] : []), Buffer.from(n, "utf8")]);
}
//@ chunk-8wvtd8sr.js:313449-313768 placement
/**
 * 同一响应中先前的 Edit/Write 未生效时拒绝发布的说明：未发布、已有 Artifact 不变，先处理该修改再重新发布。
 */
function sameTurnEditFailedMessage(failedSameTurnEdit) {
  return `The Edit or Write of ${failedSameTurnEdit} sent earlier in the same response as this publish did not apply (its own result says why), so nothing was published and any existing artifact is unchanged. Settle that change first (correct it, or leave the file as it is if the change was declined), then publish again.`;
}
//@ chunk-8wvtd8sr.js:313768-314231 placement
/**
 * 找出同一回复中先于本次发布、写同一文件且失败的 Edit/Write 调用对应的路径（之后成功的 Write 会覆盖），没有返回 null。
 */
function findFailedSameTurnEdit(e, n) {
  let sameTurnErroredToolUseIds = e.sameTurnErroredToolUseIds;
  if (sameTurnErroredToolUseIds === undefined || sameTurnErroredToolUseIds.size === 0) return null;
  let r = new Map();
  for (let h of e.sameTurnToolUses ?? [])
    for (let y of h.message.content) {
      if (
        y.type !== "tool_use" ||
        (y.name !== FILE_EDIT_TOOL_NAME && y.name !== FILE_WRITE_TOOL_NAME) ||
        !isPlainObject(y.input)
      )
        continue;
      let p = y.input.file_path ?? y.input.path ?? y.input.file;
      let w = typeof p === "string" ? expandPathOrNull(p) : null;
      if (w === null || !n.includes(w)) continue;
      if (sameTurnErroredToolUseIds.has(y.id)) r.set(w, true);
      else if (y.name === FILE_WRITE_TOOL_NAME) r.set(w, false);
    }
  return n.find((h) => r.get(h) === true) ?? null;
}
//@ chunk-8wvtd8sr.js:352268-352363 placement
/**
 * 在拒绝消息后追加写说明，并给出遥测类别（默认 write_denied）。
 */
function denyWithWriteNote(e, sad = "write_denied") {
  return {
    kind: "deny",
    decision: {
      ...e,
      message: e.message + NOTHING_PUBLISHED_NOTE,
    },
    sad,
  };
}
//@ chunk-8wvtd8sr.js:352363-354927 placement
async function checkPublishEditPermission(filePath, toolPermissionContext, context, r) {
  let h = encodeControlChars(filePath);
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, FileEditTool);
  if (denyRuleForTool !== null)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Permission to edit ${h} has been denied, so it can't be published with edits.`,
      decisionReason: {
        type: "rule",
        rule: denyRuleForTool,
      },
    });
  let p = {
    file_path: filePath,
    old_string: "a",
    new_string: "b",
    replace_all: false,
  };
  let w = walkPermissionCheckPaths(filePath);
  let tool = checkWritePermissionForTool(FileEditTool, p, toolPermissionContext, w);
  if (tool.behavior === "deny") return denyWithWriteNote(tool);
  let S = leafSymlinkWriteRefusal(filePath, w);
  if (S !== null) return denyWithWriteNote(S);
  if (w.spellings.some(isClaudeSettingsPath))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: it is a Claude Code settings file. Edit it with Edit, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Claude Code settings file",
      },
    });
  let R;
  try {
    R = await lstat(filePath);
  } catch (error) {
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: the file could not be examined (${getErrnoCode(error) ?? "error"}). Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Write target not examined",
      },
    });
  }
  if (!R.isFile())
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: it is not a regular file.`,
      decisionReason: {
        type: "other",
        reason: "Write target not a file",
      },
    });
  if (R.nlink > 1)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: the file has other names on disk (a hard link), and writing it in place would change them all. Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Write target is a hard link",
      },
    });
  if (isPerforceReadOnlyFile(R.mode))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: ${PERFORCE_READ_ONLY_MESSAGE}`,
      decisionReason: {
        type: "other",
        reason: "Write target read-only",
      },
    });
  let T = context === undefined ? null : checkWorktreeIsolation_2(filePath, context);
  if (T !== null)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: ${T}`,
      decisionReason: {
        type: "other",
        reason: "Outside worktree isolation",
      },
    });
  for (let L of r) {
    let V = secretWarning(filePath, L) ?? lintMemoryFilePath(filePath, L, "interactive");
    if (V !== null)
      return denyWithWriteNote({
        behavior: "deny",
        message: `Refusing to apply edits to ${h}: ${V}`,
        decisionReason: {
          type: "other",
          reason: "Memory file write check",
        },
      });
  }
  if (context !== undefined && hasEditPreToolHook(filePath, context))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: a hook is configured for file edits in this session, so a publish can't apply edits here. Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "PreToolUse hook for file edits",
      },
    });
  let fileEditPermissionOutcome = getFileEditPermissionOutcome(tool, toolPermissionContext, context);
  if (fileEditPermissionOutcome.kind === "unseen")
    return denyWithWriteNote(
      {
        behavior: "deny",
        message: `Refusing to apply edits to ${h}: the automatic permission check that decides this publish cannot see the edits. Make the change with Edit, then publish the file without edits.`,
        decisionReason: {
          type: "other",
          reason: "Automatic check cannot see the edits",
        },
      },
      "write_unshown",
    );
  return fileEditPermissionOutcome;
}
//@ chunk-8wvtd8sr.js:355436-355640 placement
/**
 * 判断发布内嵌 edits 的询问能否交给自动模式分类器处理（安全检查可批准、工作目录类，或模型支持）。
 */
function editAskClassifierRoutable(e, n, context) {
  if (!isArbiterRole(getAutoModeClassifierRole(n.mode))) return false;
  if (e?.type === "safetyCheck") return e.classifierApprovable || isClassifierRoutedCircuitBreaker(e);
  if (e?.type === "workingDir") return true;
  if (context === undefined) return true;
  let mainLoopModel = getMainLoopModel(context);
  return classifyEditsEnabled(mainLoopModel) || shouldClassifyEdits(mainLoopModel);
}
//@ chunk-8wvtd8sr.js:355640-355854 placement
/**
 * 判断在自动模式下对该文件的 Edit 是否会无需用户查看就放行（用于决定内嵌 edits 是否需要询问）。
 */
function editWouldBeUnseen(e, toolPermissionContext, context) {
  if (!isArbiterRole(getAutoModeClassifierRole(toolPermissionContext.mode))) return false;
  if (getDenyRuleForTool(toolPermissionContext, FileEditTool) !== null) return false;
  let r = walkPermissionCheckPaths(e);
  let tool = checkWritePermissionForTool(
    FileEditTool,
    {
      file_path: e,
      old_string: "a",
      new_string: "b",
      replace_all: false,
    },
    toolPermissionContext,
    r,
  );
  return (
    tool.behavior !== "deny" &&
    getFileEditPermissionOutcome(tool, toolPermissionContext, context).kind === "unseen"
  );
}
//@ chunk-8wvtd8sr.js:355854-356206 placement
/**
 * 判断是否有会作用于该文件 Edit/Write 的 PreToolUse hook（含会话 hook 与 hooks 模块），用于决定发布内嵌 edits 时是否需要走 hook。
 */
function hasEditPreToolHook(filePath, n) {
  let sessionId = registerAgent(n, "PreToolUse", n.session.id);
  let r = (toolName, toolInput) =>
    hasToolHookMatching({
      hookEvent: "PreToolUse",
      toolName,
      toolInput,
      tools: n.options.tools,
      toolAliases: n.options.toolAliases,
      sessionHooks: n.sessionHooksRegistry,
      sessionId,
      exceptInternal: true,
    });
  return (
    r(FileEditTool.name, {
      file_path: filePath,
      old_string: "",
      new_string: "",
    }) ||
    r(FILE_WRITE_TOOL_NAME, {
      file_path: filePath,
      content: "",
    }) ||
    hooksModuleMayCover(n, [FileEditTool.name, FILE_WRITE_TOOL_NAME])
  );
}
//@ chunk-8wvtd8sr.js:356238-356320 placement
/**
 * 两类 errno：目标已消失（ELOOP/ENXIO/EISDIR）与不可写（EACCES/EPERM/EROFS）。
 */
var GONE_ERRNOS = new Set(["ELOOP", "ENXIO", "EISDIR"]);
var NOT_WRITABLE_ERRNOS = new Set(["EACCES", "EPERM", "EROFS"]);
//@ chunk-8wvtd8sr.js:356320-357363 placement
/**
 * 把 edits 结果写回本地源文件：以读写方式打开，核对大小、inode 身份与内容哈希未变（否则 changed_during_publish），拒绝多硬链接，原地覆写并截断、fsync，返回 {kind, mtimeMs?}。
 */
async function writeBackEditedFile(request) {
  let { path, read, identity, bytes, onWritten } = request;
  return runWithFileWriteContext(path, async () => {
    let fileNoFollow = await openFileNoFollow(path, constants.O_RDWR | READ_LIMITS);
    if (!fileNoFollow.ok) {
      let { error } = fileNoFollow;
      let S = error.kind === "fs" ? getErrnoCode(error.error) : error.kind;
      if (error.kind === "absent" || (error.kind === "fs" && GONE_ERRNOS.has(S ?? "")))
        return {
          kind: "changed_during_publish",
        };
      if (error.kind === "fs" && NOT_WRITABLE_ERRNOS.has(S ?? ""))
        return {
          kind: "not_writable",
          code: S,
        };
      return {
        kind: "write_failed",
        code: S,
      };
    }
    let w = fileNoFollow.value;
    try {
      let stats = await w.stat({
        bigint: true,
      });
      if (
        !stats.isFile() ||
        stats.size !== BigInt(read.size) ||
        (identity !== undefined && (stats.dev !== identity.dev || stats.ino !== identity.ino))
      )
        return {
          kind: "changed_during_publish",
        };
      let exactBytes = await readExactBytes(w, read.size);
      if (exactBytes === null || computeContentHash(exactBytes) !== read.sha256)
        return {
          kind: "changed_during_publish",
        };
      if (stats.nlink > 1n)
        return {
          kind: "hard_linked",
        };
      let R = 0;
      while (R < bytes.length) {
        let { bytesWritten } = await w.write(bytes, R, bytes.length - R, R);
        if (bytesWritten <= 0)
          return {
            kind: "write_failed",
            code: "short_write",
          };
        R += bytesWritten;
      }
      await w.truncate(bytes.length);
      await w.sync().catch(() => {});
      let stats_2 = await w.stat();
      onWritten?.(stats_2.mtimeMs);
      return {
        kind: "written",
        mtimeMs: stats_2.mtimeMs,
      };
    } catch (error) {
      return {
        kind: "write_failed",
        code: getErrnoCode(error),
      };
    } finally {
      await w.close().catch(() => {});
    }
  });
}
//@ chunk-8wvtd8sr.js:357363-357542 placement
/**
 * 为发布内嵌 edits 写回的文件记录文件历史检查点（失败只记调试日志）。
 */
async function trackEditHistory(e, n, uuid) {
  await fileHistoryTrackEdit(e.getFileHistoryState, e.applyFileHistoryOp, n, uuid).catch((error) => {
    logForDebugging(
      `Artifact edits write-back: file history checkpoint failed (${getErrnoCode(error) ?? "error"})`,
    );
  });
}
//@ chunk-8wvtd8sr.js:357542-357769 placement
/**
 * 写回文件后更新 readFileState（新内容与时间戳，保留部分视图标记）。
 */
function refreshReadFileState(e, n, s, r) {
  let h = e.readFileState.get(n);
  e.readFileState.set(n, {
    content: stripBomAndCarriageReturn(s),
    timestamp: Math.floor(r),
    offset: undefined,
    limit: undefined,
    ...(h?.isPartialView === true && {
      isPartialView: true,
    }),
    ...(!hasFullFileContent(h) && {
      contentNotInModelContext: true,
    }),
  });
}
//@ chunk-8wvtd8sr.js:357769-358086 placement
/**
 * 发布内嵌 edits 改了文件后通知 LSP：清除该文件已送达/待送达的诊断，发送 change 与 save 通知，并记录文件修改。
 */
function notifyLspOfEdit(e, n, s, r) {
  let lspServerManager = getLspServerManager();
  if (lspServerManager) {
    clearDeliveredDiagnosticsForFile(e.session, n);
    clearPendingDiagnosticsForFile(e.session, n);
    lspServerManager.changeFile(n, r).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file change for ${n}: ${error.message}`, {
        level: "error",
      });
    });
    lspServerManager.saveFile(n).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file save for ${n}: ${error.message}`, {
        level: "error",
      });
    });
  }
  lintMemoryWrite(n, s, r);
}
//@ chunk-8wvtd8sr.js:358086-358165 placement
/**
 * 工具是否属于 remote-devices 且不是 sdk 类型。
 */
function isRemoteDeviceMcpTool(tool) {
  return tool.mcpInfo?.serverName === REMOTE_DEVICES && tool.mcpInfo.serverType !== "sdk";
}
//@ chunk-8wvtd8sr.js:358165-358250 placement
/**
 * 可发布编辑模块对外暴露的注入槽（垫片、live 编辑、房间、处理器、提示词、quickstart 说明）。
 */
var publishShimModule = null;
var liveEditGateModule = null;
var artifactRoomsModule = null;
var artifactHandlersModuleSlot = null;
var handlersPromptModule = null;
var canonicalHandlerTargetModule = null;
var quickstartNotesModule = require("./chunk-chsmq3nc.js");
export {
  editAskClassifierRoutable,
  coerceNumberString,
  MODEL_FACING_MESSAGE_KEY,
  coercedNumberSchema,
  PUBLISH_EDITS_AFTER_EDITS_HINT,
  PUBLISH_EDITS_AFTER_PUBLISH_HINT,
  publishShimModule,
  artifactRoomsModule,
  validateEdits,
  editsFailedMessage,
  artifactHandlersModuleSlot,
  checkPublishEditPermission,
  liveEditGateModule,
  MAX_TOTAL_EDIT_CHARS,
  PUBLISH_EDIT_LIMITS,
  handlersPromptModule,
  findFailedSameTurnEdit,
  sameTurnEditFailedMessage,
  editsWrittenNote,
  EDIT_PERMISSION_ASK_TEXT,
  applyPublishEdits,
  encodeLikeOriginal,
  editsBaseKey,
  isRemoteDeviceMcpTool,
  trackEditHistory,
  writeBackEditedFile,
  refreshReadFileState,
  notifyLspOfEdit,
  editWouldBeUnseen,
  canonicalHandlerTargetModule,
  quickstartNotesModule,
  MAX_PUBLISH_EDITS,
  applyFindReplace,
  EDIT_FIELD_DESCRIPTIONS,
  NEW_STR_FIELD_DESCRIPTION,
  publishEditsDescription,
  isPublishEditsEnabled,
  PUBLISH_EDITS_INLINE_HINT,
};
