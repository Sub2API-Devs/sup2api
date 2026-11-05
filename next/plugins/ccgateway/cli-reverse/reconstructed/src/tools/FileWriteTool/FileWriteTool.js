/**
 * tools/FileWriteTool/FileWriteTool.ts
 *
 * Write 工具：整文件创建/覆盖（先读、只读过开头时拒绝、子代理禁写报告 md、暂存审阅）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileWriteTool/FileWriteTool.ts
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 2, fingerprint 2, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, isAbsolute, sep } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectKeysArray,
  SKILL_SAVE_SURFACES,
  SKILL_SAVE_OUTCOMES,
  parsedToolInputOrNull,
  createToolContextView,
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
  pushUnique,
} from "../../utils/filePathValidation.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  _enum,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  HOST_TOOL_INPUT_FIELD,
  hostContextMeta,
  hasHostField,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { hunkSchema, gitDiffSchema } from "../../../vendor/diff/lib/index.mjs";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isNotebookPath, expandPathOrNull, expandStablePath } from "../../utils/path.js";
import {
  matchesContentDigest,
  stripBom as stripBom_2,
  fileModifiedErrorFor,
  isFullFileView,
  matchesContentHash,
  REMOTE_FILE_MODIFIED_ERROR,
  matchesNormalizedContent,
  stripBomAndCarriageReturn,
} from "../../utils/remoteFileState.js";
import { FileStateError, fileWriteRefusalMessage } from "../FileEditTool/fileStateErrors.js";
import {
  FILE_NOT_READ_ERROR,
  FILE_UNEXPECTEDLY_MODIFIED_ERROR,
  DENIED_DIRECTORY_ERROR,
  READ_DENY_RULE_WRITE_ERROR,
  PARTIAL_READ_WRITE_ERROR,
} from "../FileEditTool/constants.js";
import {
  getFileModificationTimeAsync,
  runWithFileWriteContext,
  writeTextContentVerified,
} from "../../utils/file.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { FILE_WRITE_TOOL_NAME, getWriteToolDescription } from "./prompt.js";
import { userFacingName, renderToolUseMessage_2 } from "./UI.js";
import { getToolUseSummary_2 } from "../FileEditTool/UI.js";
import { logFileChanged, getPatchFromContents, countLinesChanged } from "../../utils/diff.js";
import { normalizeWriteInputAliases } from "./inputAliases.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
import {
  lintMemoryTextIfEnabled,
  memoryWriteSource,
  lintMemoryFilePath,
  lintBackgroundMemoryWrite,
  forgetLintedWrite,
  lintMemoryWrite,
} from "../../memdir/memoryWriteLint.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import {
  matchesPathRule,
  checkWritePermissionForTool,
  leafSymlinkWriteRefusal,
  matchingRuleForInput,
  readDenyRuleForPath,
  readAutoAllowedForMutation,
  hasReadDenyRuleForPath,
  writeBlockRefusal,
} from "../../utils/permissions/filesystem.js";
import { buildUnfinishedCheckDecision } from "../../utils/permissions/unfinishedWriteCheck.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { logEvent } from "../../services/analytics/index.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "../FileEditTool/perforce.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isLegacyPromptModelOrOverride } from "../../utils/model/promptBundles.js";
import { compareWithDisk } from "../FileEditTool/fileStaleness.js";
import {
  telemetryBucketForModelPair,
  telemetryBucketForCallerModel,
} from "../../utils/model/telemetryModelName.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { detectTextEncoding, preserveBomPrefix } from "../../utils/fileRead.js";
import {
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  MAX_SETTINGS_FILE_BYTES,
  stripBomAndCarriageReturns,
  settingsWriteRoute,
} from "../../utils/settings/settingsReview.js";
import { FILE_STATE_CURRENT_SUFFIX } from "../FileReadTool/prompt.js";
import { syncedSkillSaveHint, skillSaveMode } from "../../utils/skillFileWrites.js";
import { consumeWritePermission } from "../../utils/fsSafety/atomicWriteStaging.js";
import { discoverSkillsForPath, isInSyncedSkillsDir } from "../../skills/loadSkillsDir.js";
import { diagnosticTrackingSlot } from "../../services/diagnosticTracking.js";
import { fileHistoryTrackEdit } from "../../utils/fileHistory.js";
import { pinWriteTarget, rethrowWithPath } from "../../utils/fsSafety/pathRevalidation.js";
import {
  mapToMirrorPath,
  memoryItemStampContext,
  logMemoryItemBlock,
  noteMemoryItemWritten,
} from "../MemoryTool/memoryWrite.js";
import { prepareMemoryContent } from "../../services/memoryStore/memoryFrontmatter.js";
import { notePlanFileForgotten, notePlanFileWritten } from "../../utils/plans.js";
import { getLspServerManager } from "../../services/lsp/manager.js";
import {
  clearDeliveredDiagnosticsForFile,
  clearPendingDiagnosticsForFile,
} from "../../services/lsp/LSPDiagnosticRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { shouldSendToolDiff, fetchSingleFileGitDiff, isPatchWithinSizeLimit } from "../../utils/gitDiff.js";
import { logFileOperation } from "../../utils/fileOperationAnalytics.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1367204-1367423 placement
/**
 * Write 输出 schema 的扩展部分：同步技能结果（syncedSkillNext）。
 */
var stagedWordingSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var fileWriteOutputSchemaExtension;
deferInit("chunk-5xgkngpb.js:1367204", () => {
  stagedWordingSchema = DoctorLazy(() =>
    objectKeysArray(SKILL_SAVE_SURFACES)
      .optional()
      .catch(undefined)
      .describe(
        "@internal Which message a staged result gave (see stagedResultWording); absent unless staged",
      ),
  );
  fileWriteOutputSchemaExtension = DoctorLazy(() => ({
    syncedSkillNext: objectKeysArray(SKILL_SAVE_OUTCOMES).optional().catch(undefined),
  }));
});
//@ chunk-5xgkngpb.js:1412049-1413243 fingerprint (2.1.88 match: outputSchema, 0.542)
/**
 * Write 的 zod schema：输入 file_path/content；输出 type(create|update)/filePath/content/structuredPatch/originalFile/gitDiff/userModified/staged；跨进程版附 memdirStamped。
 */
var fileWriteInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var fileWriteOutputSchema;
var fileWriteOutputSchemaAcrossProcesses;
deferInit("chunk-5xgkngpb.js:1412049", () => {
  fileWriteInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: stringSchema().describe(
        "The absolute path to the file to write (must be absolute, not relative)",
      ),
      content: stringSchema().describe("The content to write to the file"),
      ...attachedMachineInputField(),
    }),
  );
  fileWriteOutputSchema = DoctorLazy(() =>
    objectSchema({
      type: _enum(["create", "update"]).describe(
        "Whether a new file was created or an existing file was updated",
      ),
      filePath: stringSchema().describe("The path to the file that was written"),
      content: stringSchema().describe("The content that was written to the file"),
      structuredPatch: array(hunkSchema()).describe(
        "Diff patch showing the changes (empty when nothing changed, the diff timed out, or \u2014 with originalFile null on an update \u2014 the previous content was too large to diff)",
      ),
      originalFile: stringSchema()
        .nullable()
        .describe(
          "The original file content before the write (null for new files, or when the previous content was too large to include)",
        ),
      gitDiff: gitDiffSchema().optional(),
      userModified: booleanSchema()
        .optional()
        .describe("True when the user edited the proposed content in the permission dialog before accepting"),
      staged: booleanSchema()
        .optional()
        .describe(
          "True when the write was held for the machine owner to review instead of written; the file is unchanged",
        ),
      stagedWording: stagedWordingSchema(),
    }),
  );
  fileWriteOutputSchemaAcrossProcesses = DoctorLazy(() =>
    fileWriteOutputSchema().extend({
      memdirStamped: booleanSchema().optional().catch(undefined),
      ...fileWriteOutputSchemaExtension(),
    }),
  );
});
//@ chunk-5xgkngpb.js:1413243-1413294 layout
/**
 * GrowthBook tengu_noble_mountain（默认 true）：是否允许 Write 的 coerceInput 修正输入。
 */
function isWriteInputCoercionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_mountain", true);
}
//@ chunk-5xgkngpb.js:1413294-1413344 layout
/**
 * 去掉结尾点和空格后是否为 .ipynb。
 */
function isNotebookPathIgnoringTrailingDots(filePath) {
  return isNotebookPath(filePath.replace(/[. ]+$/, ""));
}
//@ chunk-5xgkngpb.js:1413344-1413686 layout
/**
 * 写入前（锁内）再次校验读状态：未读或只读了部分时报未读错误（除非无预读守卫且自动允许，此时比对 readBaseline）；mtime 新于读取时间且内容不同时报文件已变。
 */
async function assertWriteReadStateFresh({
  fullFilePath,
  ioPath,
  diskContent,
  lastRead,
  preReadGuard,
  readBaseline,
  servedOn,
  readNotAutoAllowed,
}) {
  if (!lastRead || lastRead.isPartialView) {
    if (
      !lastRead &&
      !isNotebookPathIgnoringTrailingDots(fullFilePath) &&
      !preReadGuard &&
      !readNotAutoAllowed()
    ) {
      if (readBaseline !== undefined && !matchesContentDigest(readBaseline, stripBom_2(diskContent)))
        throw new FileStateError(fileModifiedErrorFor(servedOn));
      return;
    }
    throw new FileStateError(FILE_NOT_READ_ERROR);
  }
  if (!((await getFileModificationTimeAsync(ioPath)) > lastRead.timestamp)) return;
  if (isFullFileView(lastRead) && matchesContentHash(lastRead, stripBom_2(diskContent))) return;
  throw new FileStateError(FILE_UNEXPECTEDLY_MODIFIED_ERROR);
}
//@ chunk-5xgkngpb.js:1413686-1419241 fingerprint (2.1.88 match: FileWriteTool, 0.426)
/**
 * Write 工具定义（name "Write"）。validateInput：空字节、不稳定路径、用户电脑路径、工作树隔离、子代理禁止写 REPORT/SUMMARY/FINDINGS/ANALYSIS*.md、记忆目录 lint、deny/Read deny、目录/非普通文件、Perforce 只读、只读过开头、必须先读且未被修改。
 */
var FileWriteTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1413686", () => {
  FileWriteTool = buildTool({
    name: FILE_WRITE_TOOL_NAME,
    ruleContentField: "file_path",
    searchHint: "create or overwrite files",
    remoteExecution: {
      supported: true,
      decidingInputFields: ["file_path", "content"],
    },
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    strict: true,
    async description() {
      return "Write a file to the local filesystem.";
    },
    userFacingName,
    getToolUseSummary: getToolUseSummary_2,
    getActivityDescription(input) {
      let toolUseSummary = getToolUseSummary_2(input);
      return toolUseSummary ? `Writing ${toolUseSummary}` : "Writing file";
    },
    async prompt({ model, leanPrompt }) {
      return getWriteToolDescription(model, leanPrompt);
    },
    get inputSchema() {
      return fileWriteInputSchema();
    },
    get outputSchema() {
      return fileWriteOutputSchema();
    },
    get outputSchemaAcrossProcesses() {
      return fileWriteOutputSchemaAcrossProcesses();
    },
    fromAnotherProcess(result, input, callOptions, toolUseId) {
      if (toolUseId !== undefined && !result.staged)
        if (result.type === "create") logFileChanged([], toolUseId, String(input.content ?? ""));
        else logFileChanged(result.structuredPatch, toolUseId);
      return {
        data: {
          ...result,
          filePath: String(input.file_path ?? ""),
          userModified: callOptions?.userModified === true,
        },
      };
    },
    coerceInput(rawInput) {
      let normalizedInput = normalizeWriteInputAliases(rawInput);
      return normalizedInput !== null && isWriteInputCoercionEnabled()
        ? parsedToolInputOrNull(fileWriteInputSchema(), normalizedInput)
        : null;
    },
    stripForStorage(output) {
      if (typeof output !== "object" || output === null) return output;
      if (output.type !== "update") return output;
      if (output.content === "" && (output.originalFile ?? "") === "") return output;
      if (
        Array.isArray(output.structuredPatch) &&
        output.structuredPatch.length === 0 &&
        output.originalFile === null
      )
        return output;
      return {
        ...output,
        content: "",
        originalFile: null,
      };
    },
    toAutoClassifierInput(input) {
      let hostRouting = remoteRoutingCandidate(input);
      return hostRouting === undefined
        ? `${input.file_path}: ${input.content}`
        : {
            file_path: input.file_path,
            content: input.content,
            [HOST_TOOL_INPUT_FIELD]: hostRouting,
            ...hostContextMeta(input),
          };
    },
    suppressesAllPermissionUpdates(input) {
      return hasHostField(input);
    },
    getPath(input) {
      return input.file_path;
    },
    inputsEquivalent(leftInput, rightInput) {
      if (leftInput.file_path !== rightInput.file_path) return false;
      if (leftInput.content === rightInput.content) return true;
      let expandedPath = expandPathOrNull(leftInput.file_path);
      let normalizeContent = (content) =>
        (expandedPath === null ? content : lintMemoryTextIfEnabled(expandedPath, content)).replace(
          /\n+$/,
          "",
        );
      return normalizeContent(leftInput.content) === normalizeContent(rightInput.content);
    },
    backfillObservableInput(input) {
      if (typeof input.file_path === "string" && !isRemoteOnlyCheck(FILE_WRITE_TOOL_NAME))
        input.file_path = expandStablePath(input.file_path);
    },
    async preparePermissionMatcher({ file_path }) {
      return (pattern) => matchesPathRule(pattern, file_path);
    },
    extractSearchText() {
      return "";
    },
    create(toolContext) {
      return {
        permissionCheckFailureDecision(input) {
          return buildUnfinishedCheckDecision(
            FILE_WRITE_TOOL_NAME,
            isPlainObject_6(input) ? input.file_path : undefined,
            toolContext.permissions(),
          );
        },
        async checkPermissions(input, callOptions) {
          let stablePath = expandStablePath(input.file_path);
          let pathSpellings = walkPermissionCheckPaths(stablePath);
          toolContext.session.writePermissionStash.stash(
            callOptions.toolUseId,
            stablePath,
            pathSpellings.spellings,
          );
          let writeDecision = checkWritePermissionForTool(
            FileWriteTool,
            input,
            toolContext.permissions(),
            pathSpellings,
          );
          let permissionResult =
            writeDecision.behavior === "deny"
              ? writeDecision
              : (leafSymlinkWriteRefusal(stablePath, pathSpellings) ?? writeDecision);
          if (
            permissionResult.behavior === "deny" ||
            (permissionResult.updatedInput !== undefined && permissionResult.updatedInput !== input)
          )
            return permissionResult;
          let updated = renderToolUseMessage_2(input, "content", memoryWriteSource(toolContext), {
            host: toolContext.session.host,
            toolUseId: callOptions.toolUseId,
          });
          return updated === input
            ? permissionResult
            : {
                ...permissionResult,
                updatedInput: updated,
              };
        },
        async validateInput(input, callOptions) {
          let callContext = createToolContextView(toolContext, callOptions);
          let { file_path: filePath, content } = input;
          if (canRunToolsOnThisMachine() && hasHostField(input))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 14,
            };
          let nullByteRefusal = rejectNullBytes(FILE_WRITE_TOOL_NAME, [["file_path", filePath]]);
          if (nullByteRefusal) return nullByteRefusal;
          let trailingWhitespaceRefusal = rejectTrailingWhitespace(FILE_WRITE_TOOL_NAME, [
            ["file_path", filePath],
          ]);
          if (trailingWhitespaceRefusal) return trailingWhitespaceRefusal;
          let foreignPathRefusal = checkForeignFilePath(FILE_WRITE_TOOL_NAME, [["file_path", filePath]]);
          if (foreignPathRefusal) return foreignPathRefusal;
          let absolutePath = expandStablePath(filePath);
          let worktreeRefusal = checkWorktreeIsolation_2(absolutePath, callContext);
          if (worktreeRefusal)
            return {
              result: false,
              message: worktreeRefusal,
              errorCode: 7,
            };
          if (
            callContext.agentId &&
            /^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i.test(basename(absolutePath))
          ) {
            logEvent("tengu_subagent_md_report_blocked", {
              contentBytes: Buffer.byteLength(content),
            });
            return {
              result: false,
              message:
                "Subagents should return findings as text, not write report files. Include this content in your final response instead.",
              errorCode: 5,
            };
          }
          let secretRefusal = secretWarning(absolutePath, content);
          if (secretRefusal)
            return {
              result: false,
              message: secretRefusal,
              errorCode: 0,
            };
          let memoryLintRefusal = lintMemoryFilePath(absolutePath, content, memoryWriteSource(callContext));
          if (memoryLintRefusal)
            return {
              result: false,
              message: memoryLintRefusal,
              errorCode: 0,
            };
          let denyRule = matchingRuleForInput(absolutePath, callContext.permissions(), "edit", "deny");
          if (denyRule !== null)
            return {
              result: false,
              message: DENIED_DIRECTORY_ERROR,
              errorCode: 1,
              deniedByPermissionRule: true,
              denyRule,
            };
          let denyRuleForPath = readDenyRuleForPath(absolutePath, callContext.permissions());
          if (denyRuleForPath !== undefined)
            return {
              result: false,
              message: READ_DENY_RULE_WRITE_ERROR,
              errorCode: 13,
              deniedByPermissionRule: true,
              denyRule: denyRuleForPath,
            };
          if (isUntouchableSpelling(absolutePath))
            return {
              result: true,
            };
          let fsImplementation = getFsImplementation();
          let fileMtimeMs;
          try {
            let stats = await fsImplementation.stat(absolutePath);
            fileMtimeMs = stats.mtimeMs;
            if (stats.isDirectory())
              return {
                result: false,
                message: `${encodeControlChars(filePath)} is a directory, not a file. To create a file inside it, include the file name in file_path.`,
                errorCode: 17,
              };
            if (!stats.isFile())
              return {
                result: false,
                message: `${encodeControlChars(filePath)} exists but is not a regular file (a device, FIFO or socket). Write only creates or overwrites regular files.`,
                errorCode: 18,
              };
            if (isPerforceReadOnlyFile(stats.mode))
              return {
                result: false,
                message: PERFORCE_READ_ONLY_MESSAGE,
                errorCode: 6,
              };
          } catch (error) {
            if (isENOENT(error))
              return {
                result: true,
              };
            throw error;
          }
          if (callContext.readFileState.holdsOnlyStartOf(absolutePath))
            return {
              result: false,
              message: PARTIAL_READ_WRITE_ERROR,
              errorCode: 19,
            };
          let readState = callContext.readFileState.get(absolutePath);
          if (!readState || readState.isPartialView) {
            let modelName = callContext.model();
            let canonicalName = getCanonicalName(modelName);
            let guardSkipped =
              !readState &&
              !isNotebookPathIgnoringTrailingDots(absolutePath) &&
              !isLegacyPromptModelOrOverride(canonicalName, callContext.remoteCall) &&
              readAutoAllowedForMutation(
                FILE_WRITE_TOOL_NAME,
                absolutePath,
                callContext,
                callContext.permissions(),
              );
            let readBaseline = guardSkipped ? callContext.readBaseline : undefined;
            let baselineState =
              readBaseline === undefined
                ? "absent"
                : await compareWithDisk(absolutePath, readBaseline, () =>
                    readAutoAllowedForMutation(
                      FILE_WRITE_TOOL_NAME,
                      absolutePath,
                      callContext,
                      callContext.permissions(),
                    ),
                  );
            let modelBucket = telemetryBucketForModelPair(canonicalName, modelName);
            logEvent("tengu_write_tool_not_read_hypothetical", {
              wouldHaveResult:
                readState && Math.floor(fileMtimeMs) > readState.timestamp
                  ? lit_2("errorCode3")
                  : lit_2("success"),
              isPartialView: readState?.isPartialView === true,
              isFilePathAbsolute: isAbsolute(filePath),
              guardSkipped,
              modelBucket,
              servedCall: callContext.remoteCall !== undefined,
              ...(callContext.remoteCall?.model !== undefined && {
                callerModelBucket: telemetryBucketForCallerModel(callContext.remoteCall.model),
              }),
              readBaseline: fromEnum(baselineState),
            });
            if (!guardSkipped)
              return {
                result: false,
                message: FILE_NOT_READ_ERROR,
                errorCode: 2,
              };
            if (baselineState === "mismatch")
              return {
                result: false,
                message: REMOTE_FILE_MODIFIED_ERROR(callContext.remoteCall?.origin.hostName),
                errorCode: 3,
              };
            return {
              result: true,
            };
          }
          if (Math.floor(fileMtimeMs) > readState.timestamp) {
            let isFullView = isFullFileView(readState);
            let contentMatches = false;
            if (isFullView) {
              let fileBytes = await fsImplementation.readFileBytes(absolutePath);
              contentMatches = matchesNormalizedContent(
                readState,
                fileBytes.toString(detectTextEncoding(fileBytes).encoding),
              );
            }
            if (!contentMatches)
              return {
                result: false,
                message: REMOTE_FILE_MODIFIED_ERROR(),
                errorCode: 3,
              };
          }
          return {
            result: true,
          };
        },
        async call(input, callOptions) {
          let { parentMessage } = callOptions;
          if (parentMessage === undefined) throw Error("Write: a call needs the message that issued it");
          return callFileWrite(input, createToolContextView(toolContext, callOptions), parentMessage);
        },
      };
    },
    mapToolResultToToolResultBlockParam(
      { filePath, type: resultType, userModified, memdirStamped, staged, stagedWording, syncedSkillNext },
      toolUseId,
    ) {
      if (staged)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: settingsNotAppliedMessage(filePath, stagedWording ?? "review"),
        };
      let modifiedNote = userModified ? " The user modified your proposed content before accepting it." : "";
      let fileStateNote = userModified || memdirStamped ? "" : FILE_STATE_CURRENT_SUFFIX;
      let skillSaveHint = syncedSkillSaveHint(syncedSkillNext);
      switch (resultType) {
        case "create":
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: `File created successfully at: ${filePath}${modifiedNote}${fileStateNote}${skillSaveHint}`,
          };
        case "update":
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: `The file ${filePath} has been updated successfully.${modifiedNote}${fileStateNote}${skillSaveHint}`,
          };
      }
    },
  });
});
//@ chunk-5xgkngpb.js:1419241-1423262 placement
/**
 * Write 工具的执行：权限与写入阻止检查、读状态新鲜度校验、记忆文件处理、写入或暂存审阅，之后通知 LSP、计算 diff 并返回 create/update 结果。
 */
async function callFileWrite({ file_path: filePath, content }, toolContextView, parentMessage) {
  let { readFileState, userModified, getFileHistoryState, applyFileHistoryOp, dynamicSkillDirTriggers } =
    toolContextView;
  let absolutePath = expandStablePath(filePath);
  let writePermission = consumeWritePermission(toolContextView, absolutePath);
  if (hasReadDenyRuleForPath(absolutePath, toolContextView.permissions()))
    throw new FileStateError(READ_DENY_RULE_WRITE_ERROR);
  let blockRefusal = writeBlockRefusal(absolutePath, toolContextView.permissions(), writePermission);
  if (blockRefusal !== undefined) throw new FileStateError(blockRefusal);
  if (toolContextView.remoteCall === undefined)
    await discoverSkillsForPath(
      toolContextView.session.host,
      absolutePath,
      dynamicSkillDirTriggers,
      toolContextView.storageV5,
    );
  if (toolContextView.remoteCall === undefined)
    await diagnosticTrackingSlot.of(toolContextView.session).beforeFileEdited(absolutePath);
  let stagingTarget = await checkSettingsWrite(toolContextView, writePermission, {
    toolName: FILE_WRITE_TOOL_NAME,
    absolutePath,
    input: {
      file_path: filePath,
      content,
    },
  });
  let syncedSkillNext = skillSaveMode(
    toolContextView,
    writePermission,
    await isInSyncedSkillsDir(toolContextView.session.host, writePermission),
  );
  if (stagingTarget === undefined)
    await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, parentMessage.uuid);
  let writeOutcome = await runWithFileWriteContext(absolutePath, async () => {
    let target = await pinWriteTarget(absolutePath, writePermission, {
      createParents: stagingTarget === undefined,
    }).catch((error) => {
      if (stagingTarget !== undefined && isENOENT(error)) return null;
      throw error;
    });
    try {
      let existing = target === null ? null : await target.readExisting();
      if (target !== null && existing !== null) {
        if (readFileState.holdsOnlyStartOf(absolutePath)) throw new FileStateError(PARTIAL_READ_WRITE_ERROR);
        await assertWriteReadStateFresh({
          fullFilePath: absolutePath,
          ioPath: target.ioPath,
          diskContent: existing.content,
          lastRead: readFileState.get(absolutePath),
          preReadGuard: isLegacyPromptModelOrOverride(
            getCanonicalName(toolContextView.model()),
            toolContextView.remoteCall,
          ),
          readBaseline: toolContextView.readBaseline,
          servedOn: toolContextView.remoteCall?.origin.hostName,
          readNotAutoAllowed: () =>
            !readAutoAllowedForMutation(
              FILE_WRITE_TOOL_NAME,
              absolutePath,
              toolContextView,
              toolContextView.permissions(),
            ),
        });
      }
      if (existing?.notText) throw new FileStateError(fileWriteRefusalMessage(existing.notText));
      let encoding = existing?.encoding ?? "utf8";
      let content_2 = existing?.content ?? null;
      let originalContent = content;
      let memorySource = memoryWriteSource(toolContextView);
      let writeRefusal =
        lintMemoryFilePath(absolutePath, content, memorySource) ?? secretWarning(absolutePath, content);
      if (writeRefusal !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          writeRefusal,
          "memory-directory write refused at call time",
        );
      content = lintBackgroundMemoryWrite(absolutePath, content, memorySource);
      let staleLintCleared = forgetLintedWrite(toolContextView.session.host, toolContextView.toolUseId);
      let filePath = await mapToMirrorPath(absolutePath);
      let syncOutcome =
        stagingTarget !== undefined || target === null
          ? undefined
          : await memoryItemStampContext(toolContextView, filePath, content_2, content, {
              remote: toolContextView.remoteCall !== undefined,
            });
      let memoryContent = prepareMemoryContent(filePath, content, syncOutcome?.context);
      logMemoryItemBlock(memoryContent.sharedItemBlock, "team");
      content = memoryContent.content;
      let contentAdjusted = content !== originalContent || staleLintCleared;
      if (stagingTarget !== undefined || target === null) {
        await stageSettingsWrite({
          writeCtx: toolContextView,
          tool: "Write",
          absolutePath: stagingTarget?.path ?? absolutePath,
          currentContent: content_2,
          proposedContent: content,
        });
        return {
          oldContent: content_2,
          memdirStamped: contentAdjusted,
          staged: true,
        };
      }
      let timestamp;
      content = preserveBomPrefix(content_2, content);
      await target.recheckBeforeWrite();
      try {
        timestamp = await writeTextContentVerified(target.ioPath, content, encoding, "LF");
      } catch (error) {
        notePlanFileForgotten(absolutePath);
        throw error;
      }
      await noteMemoryItemWritten(filePath, content, memoryContent.item, syncOutcome?.rev);
      readFileState.set(absolutePath, {
        content: stripBomAndCarriageReturn(content),
        timestamp,
        offset: undefined,
        limit: undefined,
        ...((userModified || contentAdjusted) && {
          contentNotInModelContext: true,
        }),
      });
      if (encoding === "utf8") notePlanFileWritten(absolutePath, content);
      else notePlanFileForgotten(absolutePath);
      return {
        oldContent: content_2,
        memdirStamped: contentAdjusted,
        staged: false,
      };
    } catch (error) {
      if (target === null) throw error;
      rethrowWithPath(error, target, absolutePath);
    } finally {
      await target?.close();
    }
  });
  let { oldContent, memdirStamped, staged } = writeOutcome;
  let isOldContentLarge = oldContent !== null && oldContent.length > MAX_SETTINGS_FILE_BYTES;
  if (staged) {
    let isRemoteOrForeign =
      toolContextView.remoteCall !== undefined || toolContextView.inputFromAnotherMachine === true;
    let structuredPatch =
      isRemoteOrForeign || oldContent === null || isOldContentLarge
        ? []
        : getPatchFromContents({
            filePath,
            oldContent,
            newContent: preserveBomPrefix(oldContent, stripBomAndCarriageReturns(content)),
            convertTabs: true,
          });
    return {
      data: {
        type: oldContent === null ? "create" : "update",
        filePath,
        content,
        structuredPatch,
        originalFile: isRemoteOrForeign || isOldContentLarge ? null : oldContent,
        userModified: userModified ?? false,
        staged: true,
        stagedWording: settingsWriteRoute({
          session: toolContextView.session,
          served: toolContextView.remoteCall !== undefined,
          cause: stagingTarget?.cause ?? "unapproved",
        }),
      },
      remedy: {
        kind: "staged_for_review",
        path: stagingTarget?.path ?? absolutePath,
      },
    };
  }
  if (toolContextView.remoteCall === undefined)
    pushUnique(toolContextView.nestedMemoryAttachmentTriggers, absolutePath);
  let lspManager = toolContextView.remoteCall === undefined ? getLspServerManager() : undefined;
  if (lspManager) {
    clearDeliveredDiagnosticsForFile(toolContextView.session, absolutePath);
    clearPendingDiagnosticsForFile(toolContextView.session, absolutePath);
    lspManager.changeFile(absolutePath, content).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file change for ${absolutePath}: ${error.message}`, {
        level: "error",
      });
    });
    lspManager.saveFile(absolutePath).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file save for ${absolutePath}: ${error.message}`, {
        level: "error",
      });
    });
  }
  lintMemoryWrite(absolutePath, isOldContentLarge ? null : oldContent, content);
  if (absolutePath.endsWith(`${sep}CLAUDE.md`)) logEvent("tengu_write_claudemd", {});
  let gitDiff;
  if (shouldSendToolDiff(toolContextView) && !isOldContentLarge) {
    let now = Date.now();
    let singleFileGitDiff = await fetchSingleFileGitDiff(absolutePath);
    if (singleFileGitDiff && isPatchWithinSizeLimit(singleFileGitDiff)) gitDiff = singleFileGitDiff;
    logEvent("tengu_tool_use_diff_computed", {
      isWriteTool: true,
      durationMs: Date.now() - now,
      hasDiff: !!singleFileGitDiff,
    });
  }
  let logChangedLines = toolContextView.callerLogsSharedEvents ? countLinesChanged : logFileChanged;
  if (oldContent) {
    let structuredPatch = isOldContentLarge
      ? []
      : getPatchFromContents({
          filePath,
          oldContent,
          newContent: content,
          convertTabs: true,
          isForToolResult: stagingTarget === undefined,
        });
    let data = {
      type: "update",
      filePath,
      content,
      structuredPatch,
      originalFile: isOldContentLarge ? null : oldContent,
      userModified: userModified ?? false,
      ...(memdirStamped && {
        memdirStamped: true,
      }),
      ...(syncedSkillNext && {
        syncedSkillNext,
      }),
      ...(gitDiff && {
        gitDiff,
      }),
    };
    logChangedLines(
      structuredPatch,
      parentMessage.message.model,
      isOldContentLarge ? content : undefined,
      isOldContentLarge ? oldContent : undefined,
    );
    logFileOperation({
      operation: "write",
      tool: "FileWriteTool",
      filePath: absolutePath,
      type: "update",
    });
    return {
      data,
    };
  }
  let createdResult = {
    type: "create",
    filePath,
    content,
    structuredPatch: [],
    originalFile: null,
    userModified: userModified ?? false,
    ...(memdirStamped && {
      memdirStamped: true,
    }),
    ...(syncedSkillNext && {
      syncedSkillNext,
    }),
    ...(gitDiff && {
      gitDiff,
    }),
  };
  logChangedLines([], parentMessage.message.model, content);
  logFileOperation({
    operation: "write",
    tool: "FileWriteTool",
    filePath: absolutePath,
    type: "create",
  });
  return {
    data: createdResult,
  };
}
export { fileWriteOutputSchemaExtension, FileWriteTool, stagedWordingSchema };
