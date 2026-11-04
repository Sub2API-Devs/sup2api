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
import { numberSchema, preprocess } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y9np9srf.js:410-439 placement
var MODEL_FACING_MESSAGE_KEY = "modelFacingMessage";
//@ chunk-y9np9srf.js:439-475 placement
function coercedNumberSchema(inner = numberSchema()) {
  return preprocess(coerceNumberString, inner);
}
//@ chunk-y9np9srf.js:475-620 placement
function coerceNumberString(offset) {
  if (typeof offset === "string") {
    let trimmed = offset.trim();
    if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
      let value = Number(trimmed);
      if (Number.isFinite(value)) return value;
    }
  }
  return offset;
}
//@ chunk-y9np9srf.js:620-631 placement
var MAX_PUBLISH_EDITS = 64;
//@ chunk-y9np9srf.js:631-1006 placement
function applyFindReplace(text, edits) {
  let current = text;
  for (let j = 0; j < edits.length; j++) {
    let { find, replace } = edits[j];
    if (!isWellFormedString(find) || !isWellFormedString(replace))
      return {
        ok: false,
        reason: "malformed",
        op: j,
      };
    let index = find === "" ? -1 : current.indexOf(find);
    if (index === -1)
      return {
        ok: false,
        reason: "not_found",
        op: j,
      };
    if (current.indexOf(find, index + 1) !== -1)
      return {
        ok: false,
        reason: "ambiguous",
        op: j,
      };
    current = current.slice(0, index) + replace + current.slice(index + find.length);
  }
  if (current === text)
    return {
      ok: false,
      reason: "noop",
    };
  return {
    ok: true,
    content: current,
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
function publishEditsDescription(options) {
  let lead = options.core
    ? "publish: small changes Claude makes to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after."
    : "publish: small changes to make to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after.";
  let surfaces = options.typesOn
    ? " Use it on a page (add `url` to update an artifact from another conversation) or on one data file of an artifact made from a type (its `url`, with that file as `file_path`)."
    : " Use it on a page (add `url` to update an artifact from another conversation).";
  let excluded = [...(options.typesOn ? ["`type_url`"] : []), ...(options.multiFileOn ? ["`files`"] : [])];
  let excludedNote =
    excluded.length === 0
      ? ""
      : ` Not allowed with ${excluded.length === 1 ? excluded[0] : `${excluded.slice(0, -1).join(", ")} or ${excluded.at(-1)}`}.`;
  return `${lead}${surfaces}${excludedNote} Each old_str is text copied exactly from the file as it now stands and must occur in it exactly once; new_str takes its place (empty deletes it). The edits apply in order, all or none: the file is published with them and then saved with them on disk, so it stays the source for later changes; on a miss nothing is changed or published, and the result says which edit failed and why.`;
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
function validateEdits(edits) {
  let totalChars = 0;
  for (let j = 0; j < edits.length; j++) {
    let { old_str: oldStr, new_str: newStr } = edits[j];
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
    totalChars += oldStr.length + newStr.length;
    if (totalChars > MAX_TOTAL_EDIT_CHARS)
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
function applyPublishEdits(text, edits, options = {}) {
  let invalid = validateEdits(edits);
  if (invalid !== undefined)
    return {
      ok: false,
      ...invalid,
    };
  if (edits.length * text.length > MAX_EDIT_WORK_CHARS)
    return {
      ok: false,
      reason: "too_much_work",
    };
  let crlf = detectLineEndingsForString_2(text) === "CRLF";
  let toLf = (value) =>
    crlf
      ? value.replaceAll(
          `\r
`,
          `
`,
        )
      : value;
  let normalized = toLf(text);
  let edits_2 = edits.map((edit) => ({
    find: toLf(edit.old_str),
    replace: toLf(edit.new_str),
  }));
  let result = applyFindReplace(normalized, edits_2);
  if (!result.ok)
    switch (result.reason) {
      case "noop":
        return {
          ok: false,
          reason: "noop",
        };
      case "ambiguous": {
        let partial = normalized;
        for (let j = 0; j < result.op; j++) {
          let { find, replace } = edits_2[j];
          let index = partial.indexOf(find);
          partial = partial.slice(0, index) + replace + partial.slice(index + find.length);
        }
        return {
          ok: false,
          reason: "ambiguous",
          edit: result.op,
          count: countOccurrencesCapped(partial, edits_2[result.op].find),
        };
      }
      default:
        return {
          ok: false,
          reason: result.reason,
          edit: result.op,
        };
    }
  if (options.json === true && isValidJsonText(normalized) && !isValidJsonText(result.content))
    return {
      ok: false,
      reason: "json_invalid",
    };
  return crlf
    ? {
        ...result,
        content: detectLineEndingsForString(result.content, "CRLF"),
      }
    : result;
}
//@ chunk-y9np9srf.js:4560-4651 placement
/**
 * 统计子串出现次数，最多数到上限为止。
 */
function countOccurrencesCapped(text, find) {
  let count = 0;
  for (
    let index = text.indexOf(find);
    index !== -1 && count < MAX_OCCURRENCE_SCAN;
    index = text.indexOf(find, index + 1)
  )
    count++;
  return count;
}
//@ chunk-y9np9srf.js:4651-4701 placement
/**
 * 文本能否解析为 JSON。
 */
function isValidJsonText(text) {
  try {
    jsonParse(text);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-y9np9srf.js:4701-5977 placement
function describeEditFailure(failure, edits, pathLabel) {
  switch (failure.reason) {
    case "empty_old_str":
      return `edits[${failure.edit}] old_str is empty`;
    case "malformed":
      return `edits[${failure.edit}] has a NUL character in new_str, or a broken character (an unpaired surrogate) in old_str or new_str`;
    case "too_large":
      return `old_str and new_str add up to more than ${MAX_TOTAL_EDIT_CHARS} characters over all the edits; make a change that large with Edit and publish without edits`;
    case "too_much_work":
      return `${edits} edits on a file of ${pathLabel} characters is more than one publish call will apply; send at most ${Math.max(1, Math.floor(MAX_EDIT_WORK_CHARS / Math.max(1, pathLabel)))} edits per call for a file this size, over as many calls as the change needs`;
    case "not_found":
      return `edits[${failure.edit}] old_str does not occur in the file`;
    case "ambiguous":
      return `edits[${failure.edit}] old_str occurs ${failure.count >= MAX_OCCURRENCE_SCAN ? "at least " : ""}${failure.count} times in the file; include more of the surrounding text so that it occurs once`;
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
function isNotFoundOrAmbiguousEdit(failure) {
  return failure.reason === "not_found" || failure.reason === "ambiguous";
}
//@ chunk-y9np9srf.js:6045-6435 placement
function editsFailedMessage(failure, edits, content, budget) {
  let lead = `No edits were applied and nothing was published: ${describeEditFailure(failure, edits.length, content.length)}.`;
  if (!isNotFoundOrAmbiguousEdit(failure)) return lead;
  let text = `${lead} The file's current text follows; copy old_str from it exactly and send the publish again.

${content}`;
  if (text.length <= budget) return text;
  return `${lead} The file is too long to show here: Read the file at file_path, copy old_str from it exactly and send the publish again.`;
}
//@ chunk-y9np9srf.js:6435-6482 placement
function editsBaseKey(path) {
  return `\x00edits-base\x00${path}`;
}
//@ chunk-y9np9srf.js:6482-6727 placement
var EDIT_PERMISSION_ASK_TEXT =
  "Applying `edits` changes the file at file_path, and an Edit permission check requires approval here: nothing was published and the file is unchanged. Retry the publish so it can be asked, or Edit the file and publish it without edits.";
//@ chunk-y9np9srf.js:6727-7994 placement
function editsWrittenNote(editsApplied, unitHint, editsNotWritten) {
  let what = unitHint === "page" ? "the published page" : "what was published";
  if (editsNotWritten === undefined)
    return editsApplied === 1
      ? `The edit was written to the file after it was published, so the file matches ${what}.`
      : `The ${editsApplied} edits were written to the file after it was published, so the file matches ${what}.`;
  let part = editsApplied === 1;
  let index = `Published \u2014 ${unitHint === "page" ? "the page" : "the artifact"} now has ${part ? "the edit" : `the ${editsApplied} edits`}, but the file at file_path does not`;
  if (editsNotWritten === "write_failed")
    return `${index}: writing it back failed, and the file may be partly written. Read it before anything else, restore it to the published text (${what}, ${part ? "the edit" : "the edits"} included), and only then publish it again; publishing it as it is could put damaged content ${unitHint === "page" ? "on the page" : "in the artifact"}.`;
  return `${index} (${editsNotWritten === "changed_during_publish" ? "it changed on disk while the publish ran, so it was left as it is" : editsNotWritten === "not_writable" ? "it could not be opened for writing (read-only), so it was left as it is" : "it has other names on disk (a hard link), so it was left as it is"}). Apply the same ${part ? "edit" : "edits"} to that file with Edit before you publish it again${editsNotWritten === "hard_linked" ? ", and publish it without `edits` while it has other names" : ""}; publishing it as it is would revert ${part ? "it" : "them"}.`;
}
//@ chunk-y9np9srf.js:7994-8234 placement
function encodeLikeOriginal(sample, text) {
  if (sample[0] === 255 && sample[1] === 254)
    return Buffer.concat([Buffer.from([255, 254]), Buffer.from(text, "utf16le")]);
  let hasBom = sample[0] === 239 && sample[1] === 187 && sample[2] === 191;
  return Buffer.concat([...(hasBom ? [Buffer.from([239, 187, 191])] : []), Buffer.from(text, "utf8")]);
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
function findFailedSameTurnEdit(context, paths) {
  let sameTurnErroredToolUseIds = context.sameTurnErroredToolUseIds;
  if (sameTurnErroredToolUseIds === undefined || sameTurnErroredToolUseIds.size === 0) return null;
  let failedByPath = new Map();
  for (let message of context.sameTurnToolUses ?? [])
    for (let block of message.message.content) {
      if (
        block.type !== "tool_use" ||
        (block.name !== FILE_EDIT_TOOL_NAME && block.name !== FILE_WRITE_TOOL_NAME) ||
        !isPlainObject(block.input)
      )
        continue;
      let rawPath = block.input.file_path ?? block.input.path ?? block.input.file;
      let absolutePath = typeof rawPath === "string" ? expandPathOrNull(rawPath) : null;
      if (absolutePath === null || !paths.includes(absolutePath)) continue;
      if (sameTurnErroredToolUseIds.has(block.id)) failedByPath.set(absolutePath, true);
      else if (block.name === FILE_WRITE_TOOL_NAME) failedByPath.set(absolutePath, false);
    }
  return paths.find((path) => failedByPath.get(path) === true) ?? null;
}
//@ chunk-8wvtd8sr.js:352268-352363 placement
/**
 * 在拒绝消息后追加写说明，并给出遥测类别（默认 write_denied）。
 */
function denyWithWriteNote(decision, sad = "write_denied") {
  return {
    kind: "deny",
    decision: {
      ...decision,
      message: decision.message + NOTHING_PUBLISHED_NOTE,
    },
    sad,
  };
}
//@ chunk-8wvtd8sr.js:352363-354927 placement
async function checkPublishEditPermission(filePath, toolPermissionContext, context, memoryPaths) {
  let shownPath = encodeControlChars(filePath);
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, FileEditTool);
  if (denyRuleForTool !== null)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Permission to edit ${shownPath} has been denied, so it can't be published with edits.`,
      decisionReason: {
        type: "rule",
        rule: denyRuleForTool,
      },
    });
  let probeInput = {
    file_path: filePath,
    old_string: "a",
    new_string: "b",
    replace_all: false,
  };
  let walked = walkPermissionCheckPaths(filePath);
  let writePermission = checkWritePermissionForTool(FileEditTool, probeInput, toolPermissionContext, walked);
  if (writePermission.behavior === "deny") return denyWithWriteNote(writePermission);
  let symlinkRefusal = leafSymlinkWriteRefusal(filePath, walked);
  if (symlinkRefusal !== null) return denyWithWriteNote(symlinkRefusal);
  if (walked.spellings.some(isClaudeSettingsPath))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: it is a Claude Code settings file. Edit it with Edit, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Claude Code settings file",
      },
    });
  let stats;
  try {
    stats = await lstat(filePath);
  } catch (error) {
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: the file could not be examined (${getErrnoCode(error) ?? "error"}). Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Write target not examined",
      },
    });
  }
  if (!stats.isFile())
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: it is not a regular file.`,
      decisionReason: {
        type: "other",
        reason: "Write target not a file",
      },
    });
  if (stats.nlink > 1)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: the file has other names on disk (a hard link), and writing it in place would change them all. Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "Write target is a hard link",
      },
    });
  if (isPerforceReadOnlyFile(stats.mode))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: ${PERFORCE_READ_ONLY_MESSAGE}`,
      decisionReason: {
        type: "other",
        reason: "Write target read-only",
      },
    });
  let isolationProblem = context === undefined ? null : checkWorktreeIsolation_2(filePath, context);
  if (isolationProblem !== null)
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: ${isolationProblem}`,
      decisionReason: {
        type: "other",
        reason: "Outside worktree isolation",
      },
    });
  for (let memoryPath of memoryPaths) {
    let memoryWarning =
      secretWarning(filePath, memoryPath) ?? lintMemoryFilePath(filePath, memoryPath, "interactive");
    if (memoryWarning !== null)
      return denyWithWriteNote({
        behavior: "deny",
        message: `Refusing to apply edits to ${shownPath}: ${memoryWarning}`,
        decisionReason: {
          type: "other",
          reason: "Memory file write check",
        },
      });
  }
  if (context !== undefined && hasEditPreToolHook(filePath, context))
    return denyWithWriteNote({
      behavior: "deny",
      message: `Refusing to apply edits to ${shownPath}: a hook is configured for file edits in this session, so a publish can't apply edits here. Edit the file, then publish it without edits.`,
      decisionReason: {
        type: "other",
        reason: "PreToolUse hook for file edits",
      },
    });
  let fileEditPermissionOutcome = getFileEditPermissionOutcome(
    writePermission,
    toolPermissionContext,
    context,
  );
  if (fileEditPermissionOutcome.kind === "unseen")
    return denyWithWriteNote(
      {
        behavior: "deny",
        message: `Refusing to apply edits to ${shownPath}: the automatic permission check that decides this publish cannot see the edits. Make the change with Edit, then publish the file without edits.`,
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
function editAskClassifierRoutable(reason, toolPermissionContext, context) {
  if (!isArbiterRole(getAutoModeClassifierRole(toolPermissionContext.mode))) return false;
  if (reason?.type === "safetyCheck")
    return reason.classifierApprovable || isClassifierRoutedCircuitBreaker(reason);
  if (reason?.type === "workingDir") return true;
  if (context === undefined) return true;
  let mainLoopModel = getMainLoopModel(context);
  return classifyEditsEnabled(mainLoopModel) || shouldClassifyEdits(mainLoopModel);
}
//@ chunk-8wvtd8sr.js:355640-355854 placement
/**
 * 判断在自动模式下对该文件的 Edit 是否会无需用户查看就放行（用于决定内嵌 edits 是否需要询问）。
 */
function editWouldBeUnseen(filePath, toolPermissionContext, context) {
  if (!isArbiterRole(getAutoModeClassifierRole(toolPermissionContext.mode))) return false;
  if (getDenyRuleForTool(toolPermissionContext, FileEditTool) !== null) return false;
  let walked = walkPermissionCheckPaths(filePath);
  let tool = checkWritePermissionForTool(
    FileEditTool,
    {
      file_path: filePath,
      old_string: "a",
      new_string: "b",
      replace_all: false,
    },
    toolPermissionContext,
    walked,
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
function hasEditPreToolHook(filePath, context) {
  let sessionId = registerAgent(context, "PreToolUse", context.session.id);
  let hookMatches = (toolName, toolInput) =>
    hasToolHookMatching({
      hookEvent: "PreToolUse",
      toolName,
      toolInput,
      tools: context.options.tools,
      toolAliases: context.options.toolAliases,
      sessionHooks: context.sessionHooksRegistry,
      sessionId,
      exceptInternal: true,
    });
  return (
    hookMatches(FileEditTool.name, {
      file_path: filePath,
      old_string: "",
      new_string: "",
    }) ||
    hookMatches(FILE_WRITE_TOOL_NAME, {
      file_path: filePath,
      content: "",
    }) ||
    hooksModuleMayCover(context, [FileEditTool.name, FILE_WRITE_TOOL_NAME])
  );
}
//@ chunk-8wvtd8sr.js:356238-356320 placement
/**
 * 两类 errno：目标已消失（ELOOP/ENXIO/EISDIR）与不可写（EACCES/EPERM/EROFS）。
 */
var GONE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOT_WRITABLE_ERRNOS;
deferInit("chunk-8wvtd8sr.js:356238", () => {
  GONE_ERRNOS = new Set(["ELOOP", "ENXIO", "EISDIR"]);
  NOT_WRITABLE_ERRNOS = new Set(["EACCES", "EPERM", "EROFS"]);
});
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
      let errnoCode = error.kind === "fs" ? getErrnoCode(error.error) : error.kind;
      if (error.kind === "absent" || (error.kind === "fs" && GONE_ERRNOS.has(errnoCode ?? "")))
        return {
          kind: "changed_during_publish",
        };
      if (error.kind === "fs" && NOT_WRITABLE_ERRNOS.has(errnoCode ?? ""))
        return {
          kind: "not_writable",
          code: errnoCode,
        };
      return {
        kind: "write_failed",
        code: errnoCode,
      };
    }
    let handle = fileNoFollow.value;
    try {
      let stats = await handle.stat({
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
      let exactBytes = await readExactBytes(handle, read.size);
      if (exactBytes === null || computeContentHash(exactBytes) !== read.sha256)
        return {
          kind: "changed_during_publish",
        };
      if (stats.nlink > 1n)
        return {
          kind: "hard_linked",
        };
      let offset = 0;
      while (offset < bytes.length) {
        let { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset, offset);
        if (bytesWritten <= 0)
          return {
            kind: "write_failed",
            code: "short_write",
          };
        offset += bytesWritten;
      }
      await handle.truncate(bytes.length);
      await handle.sync().catch(() => {});
      let stats_2 = await handle.stat();
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
      await handle.close().catch(() => {});
    }
  });
}
//@ chunk-8wvtd8sr.js:357363-357542 placement
/**
 * 为发布内嵌 edits 写回的文件记录文件历史检查点（失败只记调试日志）。
 */
async function trackEditHistory(toolUseContext, filePath, uuid) {
  await fileHistoryTrackEdit(
    toolUseContext.getFileHistoryState,
    toolUseContext.applyFileHistoryOp,
    filePath,
    uuid,
  ).catch((error) => {
    logForDebugging(
      `Artifact edits write-back: file history checkpoint failed (${getErrnoCode(error) ?? "error"})`,
    );
  });
}
//@ chunk-8wvtd8sr.js:357542-357769 placement
/**
 * 写回文件后更新 readFileState（新内容与时间戳，保留部分视图标记）。
 */
function refreshReadFileState(toolUseContext, filePath, content, timestamp) {
  let existing = toolUseContext.readFileState.get(filePath);
  toolUseContext.readFileState.set(filePath, {
    content: stripBomAndCarriageReturn(content),
    timestamp: Math.floor(timestamp),
    offset: undefined,
    limit: undefined,
    ...(existing?.isPartialView === true && {
      isPartialView: true,
    }),
    ...(!hasFullFileContent(existing) && {
      contentNotInModelContext: true,
    }),
  });
}
//@ chunk-8wvtd8sr.js:357769-358086 placement
/**
 * 发布内嵌 edits 改了文件后通知 LSP：清除该文件已送达/待送达的诊断，发送 change 与 save 通知，并记录文件修改。
 */
function notifyLspOfEdit(toolUseContext, filePath, oldContent, newContent) {
  let lspServerManager = getLspServerManager();
  if (lspServerManager) {
    clearDeliveredDiagnosticsForFile(toolUseContext.session, filePath);
    clearPendingDiagnosticsForFile(toolUseContext.session, filePath);
    lspServerManager.changeFile(filePath, newContent).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file change for ${filePath}: ${error.message}`, {
        level: "error",
      });
    });
    lspServerManager.saveFile(filePath).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file save for ${filePath}: ${error.message}`, {
        level: "error",
      });
    });
  }
  lintMemoryWrite(filePath, oldContent, newContent);
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
var publishShimModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var liveEditGateModule;
var artifactRoomsModule;
var artifactHandlersModuleSlot;
var handlersPromptModule;
var canonicalHandlerTargetModule;
var quickstartNotesModule;
deferInit("chunk-8wvtd8sr.js:358165", () => {
  publishShimModule = null;
  liveEditGateModule = null;
  artifactRoomsModule = null;
  artifactHandlersModuleSlot = null;
  handlersPromptModule = null;
  canonicalHandlerTargetModule = null;
  quickstartNotesModule = require("../../services/artifacts/quickstartNotes.js");
});
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
