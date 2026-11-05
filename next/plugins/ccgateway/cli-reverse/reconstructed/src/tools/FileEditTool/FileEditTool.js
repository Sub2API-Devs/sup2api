/**
 * tools/FileEditTool/FileEditTool.ts
 *
 * Edit 工具：精确字符串替换（先读、修改检测、引号与转义保真、暂存审阅、fileHistory、LSP 通知）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/FileEditTool.ts
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 1, affinity 2, fingerprint 2, layout 1, sole-consumer 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, sep } from "path";
import {
  normalizeFileEditInput,
  normalizeEditInputAliases,
  areFileEditInputsIdentical,
  areFileEditsInputsEquivalent,
  findActualString,
  hasUnicodeOrEscapes,
  preserveEscapeStyle,
  preserveQuoteStyle,
  getPatchForEdit,
  recordEditFingerprint,
  maybeRecordEditFingerprint,
} from "./utils.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  EDIT,
  DENIED_DIRECTORY_ERROR,
  READ_DENY_RULE_EDIT_ERROR,
  FILE_NOT_READ_ERROR,
  FILE_UNEXPECTEDLY_MODIFIED_ERROR,
} from "./constants.js";
import { getEditToolDescription } from "./prompt.js";
import { userFacingName_2 } from "./UI.js";
import { getToolUseSummary_4, renderToolUseMessage_2 } from "../FileWriteTool/UI.js";
import { fileEditInputSchema, fileEditOutputSchema } from "../../../vendor/diff/lib/index.mjs";
import { SDKUserMessageSchema_3 } from "../../entrypoints/sdk/coreSchemas.js";
import { logFileChanged, getPatchFromContents, countLinesChanged } from "../../utils/diff.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
import { editRemovalVisibilityValue, editRemovalCapValue } from "../../utils/envFlagValues.js";
import {
  HOST_TOOL_INPUT_FIELD,
  hostContextMeta,
  hasHostField,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { expandStablePath, expandPathOrNull } from "../../utils/path.js";
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
import {
  lintMemoryTextIfEnabled,
  memoryWriteSource,
  lintMemoryFilePath,
  lintBackgroundMemoryWrite,
  forgetLintedWrite,
  lintMemoryWrite,
} from "../../memdir/memoryWriteLint.js";
import { buildUnfinishedCheckDecision } from "../../utils/permissions/unfinishedWriteCheck.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import {
  createToolContextView,
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
  pushUnique,
} from "../../utils/filePathValidation.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { formatFileSize } from "../../utils/format.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "./perforce.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { detectTextEncoding, preserveBomPrefix } from "../../utils/fileRead.js";
import {
  stripBomAndCarriageReturn,
  REMOTE_FILE_MODIFIED_ERROR,
  isFullFileView,
  matchesContentHash,
  hasFullFileContent,
  matchesReadContent,
  stripBom as stripBom_2,
  matchesContentDigest,
  fileModifiedErrorFor,
} from "../../utils/remoteFileState.js";
import {
  findSimilarFile,
  normalizePathForComparison,
  FILE_NOT_FOUND_CWD_NOTE,
  getFileModificationTimeAsync,
  runWithFileWriteContext,
  writeTextContentVerified,
} from "../../utils/file.js";
import { getCwd } from "../../utils/cwd.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { logEvent } from "../../services/analytics/index.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isLegacyPromptModelOrOverride } from "../../utils/model/promptBundles.js";
import { compareWithDisk } from "./fileStaleness.js";
import {
  telemetryBucketForModelPair,
  telemetryBucketForCallerModel,
} from "../../utils/model/telemetryModelName.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { fileWriteRefusalMessage, FileStateError } from "./fileStateErrors.js";
import { validateInputForSettingsFileEdit } from "../../utils/settings/validateEditTool.js";
import {
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  settingsWriteRoute,
} from "../../utils/settings/settingsReview.js";
import { FILE_STATE_CURRENT_SUFFIX } from "../FileReadTool/prompt.js";
import { syncedSkillSaveHint, skillSaveMode } from "../../utils/skillFileWrites.js";
import { consumeWritePermission } from "../../utils/fsSafety/atomicWriteStaging.js";
import { env } from "../../utils/env.js";
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
import { logFileOperation } from "../../utils/fileOperationAnalytics.js";
import { shouldSendToolDiff, fetchSingleFileGitDiff, isPatchWithinSizeLimit } from "../../utils/gitDiff.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4757486-4757505 placement
/**
 * 可编辑文件的大小上限（1 GiB）。
 */
var MAX_EDITABLE_FILE_BYTES = 1073741824;
//@ chunk-5xgkngpb.js:4757505-4757557 affinity
/**
 * 判断读取记录是否在模型之后刷新过。
 */
function isRefreshedBehindModel(editResult) {
  return editResult?.refreshedBehindModel === true;
}
//@ chunk-5xgkngpb.js:4757695-4758014 affinity (2.1.88 match: areFileEditsInputsEquivalent, 0.819)
/**
 * 仅在远程调用或跨机器输入时对 Edit 的 old/new_string 运行 normalizeFileEditInput；本地调用原样返回。
 */
function normalizeEditInputForRemote(input1, input2) {
  if (input2.remoteCall === undefined && input2.inputFromAnotherMachine !== true) return input1;
  let { file_path: filePath, edits } = normalizeFileEditInput({
    file_path: input1.file_path,
    edits: [
      {
        old_string: input1.old_string,
        new_string: input1.new_string,
        replace_all: input1.replace_all ?? false,
      },
    ],
  });
  let [normalizedEdit] = edits;
  return normalizedEdit === undefined
    ? input1
    : {
        ...input1,
        file_path: filePath,
        old_string: normalizedEdit.old_string,
        new_string: normalizedEdit.new_string,
      };
}
//@ chunk-5xgkngpb.js:4758014-4765372 fingerprint (2.1.88 match: FileEditTool, 0.559)
/**
 * Edit 工具定义（name "Edit"）。精确字符串替换：validateInput 依次查空字节/不稳定路径/用户电脑路径/工作树隔离/记忆目录 lint、old==new、deny 规则、Read deny、1GiB 上限、Perforce 只读、文件不存在/已存在、.ipynb、必须先 Read 且未被外部修改（可自动恢复）、匹配唯一性、settings 文件校验；call 交给 editFileToolCall。
 */
var FileEditTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4758014", () => {
  FileEditTool = buildTool({
    name: EDIT,
    ruleContentField: "file_path",
    searchHint: "modify file contents in place",
    remoteExecution: {
      supported: true,
      decidingInputFields: ["file_path", "old_string", "new_string", "replace_all"],
    },
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    strict: true,
    async description() {
      return "A tool for editing files";
    },
    async prompt({ model, leanPrompt }) {
      return getEditToolDescription(model, leanPrompt);
    },
    userFacingName: userFacingName_2,
    getToolUseSummary: getToolUseSummary_4,
    getActivityDescription(input) {
      let summary = getToolUseSummary_4(input);
      return summary ? `Editing ${summary}` : "Editing file";
    },
    get inputSchema() {
      return fileEditInputSchema();
    },
    get outputSchema() {
      return fileEditOutputSchema();
    },
    get outputSchemaAcrossProcesses() {
      return SDKUserMessageSchema_3();
    },
    fromAnotherProcess(result, input, callOptions, toolUseId) {
      if (toolUseId !== undefined && !result.staged) logFileChanged(result.structuredPatch, toolUseId);
      return {
        data: {
          ...result,
          filePath: String(input.file_path ?? ""),
          userModified: callOptions?.userModified === true,
        },
      };
    },
    coerceInput: normalizeEditInputAliases,
    stripForStorage(output) {
      if (typeof output !== "object" || output === null) return output;
      if ((output.originalFile ?? "") === "") return output;
      return {
        ...output,
        originalFile: "",
      };
    },
    toAutoClassifierInput(input) {
      let hostRouting = remoteRoutingCandidate(input);
      if (!editRemovalVisibilityValue())
        return hostRouting === undefined
          ? `${input.file_path}: ${input.new_string}`
          : {
              file_path: input.file_path,
              new_string: input.new_string,
              [HOST_TOOL_INPUT_FIELD]: hostRouting,
              ...hostContextMeta(input),
            };
      let removalCap = editRemovalCapValue();
      let oldString = input.old_string;
      let removesTruncated = removalCap > 0 && typeof oldString === "string" && oldString.length > removalCap;
      return {
        file_path: input.file_path,
        adds: input.new_string,
        removes: removesTruncated ? oldString.slice(0, removalCap) : oldString,
        ...(removalCap > 0 && {
          removesTruncated,
        }),
        ...(input.replace_all === true && {
          replaceAll: true,
        }),
        ...(hostRouting !== undefined && {
          [HOST_TOOL_INPUT_FIELD]: hostRouting,
          ...hostContextMeta(input),
        }),
      };
    },
    suppressesAllPermissionUpdates(input) {
      return hasHostField(input);
    },
    getPath(input) {
      return input.file_path;
    },
    backfillObservableInput(input) {
      if (typeof input.file_path === "string" && !isRemoteOnlyCheck(EDIT))
        input.file_path = expandStablePath(input.file_path);
    },
    async preparePermissionMatcher({ file_path }) {
      return (pattern) => matchesPathRule(pattern, file_path);
    },
    inputsEquivalent(leftInput, rightInput) {
      let expandedPath = expandPathOrNull(leftInput.file_path);
      let toComparable = (editInput) => ({
        file_path: editInput.file_path,
        edits: [
          {
            old_string: editInput.old_string,
            new_string:
              expandedPath === null
                ? editInput.new_string
                : lintMemoryTextIfEnabled(expandedPath, editInput.new_string),
            replace_all: editInput.replace_all ?? false,
          },
        ],
      });
      return isRemoteOnlyCheck(EDIT)
        ? areFileEditInputsIdentical(toComparable(leftInput), toComparable(rightInput))
        : areFileEditsInputsEquivalent(toComparable(leftInput), toComparable(rightInput));
    },
    create(toolContext) {
      return {
        permissionCheckFailureDecision(input) {
          return buildUnfinishedCheckDecision(
            EDIT,
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
            FileEditTool,
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
          let updated = renderToolUseMessage_2(input, "new_string", memoryWriteSource(toolContext), {
            host: toolContext.session.host,
            toolUseId: callOptions.toolUseId,
          });
          return updated === input || updated.new_string === input.old_string
            ? permissionResult
            : {
                ...permissionResult,
                updatedInput: updated,
              };
        },
        async validateInput(input1, callOptions) {
          let callContext = createToolContextView(toolContext, callOptions);
          if (canRunToolsOnThisMachine() && hasHostField(input1))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 14,
            };
          let { file_path, replace_all: replaceAll = false } = input1;
          let { old_string, new_string: newString } = input1;
          let nullByteRefusal = rejectNullBytes(EDIT, [["file_path", file_path]]);
          if (nullByteRefusal) return nullByteRefusal;
          let trailingWhitespaceRefusal = rejectTrailingWhitespace(EDIT, [["file_path", file_path]]);
          if (trailingWhitespaceRefusal) return trailingWhitespaceRefusal;
          let foreignPathRefusal = checkForeignFilePath(EDIT, [["file_path", file_path]]);
          if (foreignPathRefusal) return foreignPathRefusal;
          let absolutePath = expandStablePath(file_path);
          let worktreeRefusal = checkWorktreeIsolation_2(absolutePath, callContext);
          if (worktreeRefusal)
            return {
              result: false,
              message: worktreeRefusal,
              errorCode: 12,
            };
          let secretRefusal = secretWarning(absolutePath, newString);
          if (secretRefusal)
            return {
              result: false,
              message: secretRefusal,
              errorCode: 0,
            };
          let memoryLintRefusal = lintMemoryFilePath(absolutePath, newString, memoryWriteSource(callContext));
          if (memoryLintRefusal)
            return {
              result: false,
              message: memoryLintRefusal,
              errorCode: 0,
            };
          if (old_string === newString)
            return {
              result: false,
              behavior: "ask",
              message: "No changes to make: old_string and new_string are exactly the same.",
              errorCode: 1,
            };
          let denyRule = matchingRuleForInput(absolutePath, callContext.permissions(), "edit", "deny");
          if (denyRule !== null)
            return {
              result: false,
              behavior: "ask",
              message: DENIED_DIRECTORY_ERROR,
              errorCode: 2,
              deniedByPermissionRule: true,
              denyRule,
            };
          let denyRuleForPath = readDenyRuleForPath(absolutePath, callContext.permissions());
          if (denyRuleForPath !== undefined)
            return {
              result: false,
              behavior: "ask",
              message: READ_DENY_RULE_EDIT_ERROR,
              errorCode: 13,
              deniedByPermissionRule: true,
              denyRule: denyRuleForPath,
            };
          if (isUntouchableSpelling(absolutePath))
            return {
              result: true,
            };
          let fsImplementation = getFsImplementation();
          try {
            let { size, mode } = await fsImplementation.stat(absolutePath);
            if (size > MAX_EDITABLE_FILE_BYTES)
              return {
                result: false,
                behavior: "ask",
                message: `File is too large to edit (${formatFileSize(size)}). Maximum editable file size is ${formatFileSize(MAX_EDITABLE_FILE_BYTES)}.`,
                errorCode: 10,
              };
            if (isPerforceReadOnlyFile(mode))
              return {
                result: false,
                behavior: "ask",
                message: PERFORCE_READ_ONLY_MESSAGE,
                errorCode: 11,
              };
          } catch (e) {
            if (!isENOENT(e)) throw e;
          }
          ({ old_string, new_string: newString } = normalizeEditInputForRemote(input1, callContext));
          let fileContent;
          let notTextReason;
          try {
            let fileBytes = await fsImplementation.readFileBytes(absolutePath);
            let encoding = detectTextEncoding(fileBytes);
            notTextReason = encoding.notText;
            fileContent = stripBomAndCarriageReturn(fileBytes.toString(encoding.encoding));
          } catch (e) {
            if (isENOENT(e)) fileContent = null;
            else throw e;
          }
          if (fileContent === null) {
            if (old_string === "")
              return {
                result: true,
              };
            let similarFilename = await findSimilarFile(absolutePath);
            let cwdSuggestion = await normalizePathForComparison(absolutePath);
            let message = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`;
            if (cwdSuggestion) message += ` Did you mean ${cwdSuggestion}?`;
            else if (similarFilename) message += ` Did you mean ${similarFilename}?`;
            return {
              result: false,
              behavior: "ask",
              message: encodeControlChars(message),
              errorCode: 4,
            };
          }
          if (old_string === "") {
            if (fileContent.trim() !== "")
              return {
                result: false,
                behavior: "ask",
                message: "Cannot create new file - file already exists.",
                errorCode: 3,
              };
            return {
              result: true,
            };
          }
          if (absolutePath.endsWith(".ipynb"))
            return {
              result: false,
              behavior: "ask",
              message: `File is a Jupyter Notebook. Use the ${NOTEBOOK_EDIT_TOOL_NAME} to edit this file.`,
              errorCode: 5,
            };
          let readState = callContext.readFileState.get(absolutePath);
          let tryRecoverStaleRead = (trigger) => {
            let matchKind = classifyEditMatch(fileContent, old_string, replaceAll);
            let canRecover =
              matchKind === "applies" &&
              readAutoAllowedForMutation(EDIT, absolutePath, callContext, callContext.permissions());
            logEvent("tengu_edit_tool_stale_read", {
              wouldHaveResult: editMatchResultCode(matchKind),
              recovered: canRecover,
              trigger,
            });
            return canRecover;
          };
          let staleReadError = (host) => ({
            result: false,
            behavior: "ask",
            message: REMOTE_FILE_MODIFIED_ERROR(host),
            errorCode: 7,
          });
          if (!readState || readState.isPartialView) {
            let modelName = callContext.model();
            let canonicalName = getCanonicalName(modelName);
            let guardSkipped =
              !isLegacyPromptModelOrOverride(canonicalName, callContext.remoteCall) &&
              readAutoAllowedForMutation(EDIT, absolutePath, callContext, callContext.permissions());
            let readBaseline = guardSkipped && readState === undefined ? callContext.readBaseline : undefined;
            let baselineState =
              readBaseline === undefined
                ? "absent"
                : await compareWithDisk(absolutePath, readBaseline, () =>
                    readAutoAllowedForMutation(EDIT, absolutePath, callContext, callContext.permissions()),
                  );
            let modelBucket = telemetryBucketForModelPair(canonicalName, modelName);
            logEvent("tengu_edit_tool_not_read_hypothetical", {
              wouldHaveResult: editMatchResultCode(classifyEditMatch(fileContent, old_string, replaceAll)),
              isPartialView: readState?.isPartialView === true,
              isFilePathAbsolute: isAbsolute(file_path),
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
                behavior: "ask",
                message: FILE_NOT_READ_ERROR,
                meta: {
                  isFilePathAbsolute: String(isAbsolute(file_path)),
                },
                errorCode: 6,
              };
            if (baselineState === "mismatch" && !tryRecoverStaleRead(lit_2("baseline")))
              return staleReadError(callContext.remoteCall?.origin.hostName);
          }
          if (readState) {
            if (isRefreshedBehindModel(readState) && !tryRecoverStaleRead(lit_2("refreshed")))
              return staleReadError();
            if ((await getFileModificationTimeAsync(absolutePath)) > readState.timestamp) {
              if (
                !(isFullFileView(readState) && matchesContentHash(readState, fileContent)) &&
                !tryRecoverStaleRead(lit_2("mtime"))
              )
                return staleReadError();
            }
          }
          if (notTextReason)
            return {
              result: false,
              message: fileWriteRefusalMessage(notTextReason),
              errorCode: 15,
            };
          let file = fileContent;
          let actualOldString = findActualString(file, old_string);
          if (!actualOldString) {
            let unicodeMismatchNote = hasUnicodeOrEscapes(old_string)
              ? `
(note: Edit also tried swapping \\uXXXX escapes and their characters; neither form matched, so the mismatch is likely elsewhere in old_string. Re-read the file and copy the exact surrounding text.)`
              : "";
            return {
              result: false,
              behavior: "ask",
              message: `String to replace not found in file.
String: ${old_string}${unicodeMismatchNote}`,
              meta: {
                isFilePathAbsolute: String(isAbsolute(file_path)),
              },
              errorCode: 8,
            };
          }
          let matches = file.split(actualOldString).length - 1;
          if (matches > 1 && !replaceAll)
            return {
              result: false,
              behavior: "ask",
              message: `Found ${matches} matches of the string to replace, but replace_all is false. To replace all occurrences, set replace_all to true. To replace only one occurrence, please provide more context to uniquely identify the instance.
String: ${old_string}`,
              meta: {
                isFilePathAbsolute: String(isAbsolute(file_path)),
                actualOldString,
              },
              errorCode: 9,
            };
          let settingsValidationResult = validateInputForSettingsFileEdit(absolutePath, file, () =>
            replaceAll
              ? file.replaceAll(actualOldString, newString)
              : file.replace(actualOldString, newString),
          );
          if (settingsValidationResult !== null) return settingsValidationResult;
          return {
            result: true,
            meta: {
              actualOldString,
            },
          };
        },
        async call(input, callOptions) {
          let { parentMessage } = callOptions;
          if (parentMessage === undefined) throw Error("Edit: a call needs the message that issued it");
          return editFileToolCall(input, createToolContextView(toolContext, callOptions), parentMessage);
        },
      };
    },
    mapToolResultToToolResultBlockParam(data, toolUseID) {
      let {
        filePath,
        userModified,
        replaceAll,
        staleRecovered,
        contentNotInModelContext,
        staged,
        stagedWording,
        syncedSkillNext,
      } = data;
      if (staged)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: settingsNotAppliedMessage(filePath, stagedWording ?? "review"),
        };
      let modifiedNote = userModified
        ? ".  The user modified your proposed changes before accepting them. "
        : "";
      let staleOrModifiedNote = staleRecovered
        ? " (note: the file had been modified on disk since you last read it \u2014 the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)"
        : userModified || contentNotInModelContext
          ? ""
          : FILE_STATE_CURRENT_SUFFIX;
      let skillSaveHint = syncedSkillSaveHint(syncedSkillNext);
      if (replaceAll)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: `The file ${filePath} has been updated${modifiedNote}. All occurrences were successfully replaced.${staleOrModifiedNote}${skillSaveHint}`,
        };
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: `The file ${filePath} has been updated successfully${modifiedNote}.${staleOrModifiedNote}${skillSaveHint}`,
      };
    },
  });
});
//@ chunk-5xgkngpb.js:4765372-4770300 layout
/**
 * Edit 的 call 实现：拒绝 Read deny 与不可写目标，记录 fileHistory 检查点，在文件锁内读取（编码/行尾）、findActualString 匹配并保留引号与 \uXXXX 风格、生成 patch，写入或暂存给机主审阅；更新 readFileState、通知 LSP、记 tengu_edit_string_lengths，可选计算 gitDiff。
 */
async function editFileToolCall(input, context, parentMessage) {
  let { readFileState, userModified, getFileHistoryState, applyFileHistoryOp, dynamicSkillDirTriggers } =
    context;
  let { file_path: filePath, replace_all: replaceAll = false } = input;
  let { old_string: oldString, new_string: newString } = input;
  let absolutePath = expandStablePath(filePath);
  let approvedSpellings = consumeWritePermission(context, absolutePath);
  if (hasReadDenyRuleForPath(absolutePath, context.permissions()))
    throw new FileStateError(READ_DENY_RULE_EDIT_ERROR);
  let writeRefusal = writeBlockRefusal(absolutePath, context.permissions(), approvedSpellings);
  if (writeRefusal !== undefined) throw new FileStateError(writeRefusal);
  ({ old_string: oldString, new_string: newString } = normalizeEditInputForRemote(input, context));
  if (!env.CLAUDE_CODE_SIMPLE && context.remoteCall === undefined)
    await discoverSkillsForPath(
      context.session.host,
      absolutePath,
      dynamicSkillDirTriggers,
      context.storageV5,
    );
  if (context.remoteCall === undefined)
    await diagnosticTrackingSlot.of(context.session).beforeFileEdited(absolutePath);
  let stagingDecision = await checkSettingsWrite(context, approvedSpellings, {
    toolName: EDIT,
    absolutePath,
    input,
  });
  let skillSaveModeValue = skillSaveMode(
    context,
    approvedSpellings,
    await isInSyncedSkillsDir(context.session.host, approvedSpellings),
  );
  if (stagingDecision === undefined)
    await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, parentMessage.uuid);
  let {
    originalFileContents,
    actualOldString,
    actualNewString,
    updatedFile,
    patch,
    staleRecovered,
    contentNotInModelContext,
    staged,
  } = await runWithFileWriteContext(absolutePath, async () => {
    let fileHandle = await pinWriteTarget(absolutePath, approvedSpellings, {
      createParents: oldString === "" && stagingDecision === undefined,
    }).catch((error) => {
      if (stagingDecision !== undefined && oldString === "" && isENOENT(error)) return null;
      throw error;
    });
    try {
      let { content, fileExists, encoding, lineEndings, notText } = await readFileForEdit(fileHandle);
      let lastRead = readFileState.get(absolutePath);
      let staleRecovered =
        fileExists &&
        fileHandle !== null &&
        (await isUnreadEditAllowed({
          ioPath: fileHandle.ioPath,
          fileContents: content,
          lastRead,
          oldString,
          replaceAll,
          preReadGuard: isLegacyPromptModelOrOverride(getCanonicalName(context.model()), context.remoteCall),
          readBaseline: context.readBaseline,
          servedOn: context.remoteCall?.origin.hostName,
          readNotAutoAllowed: () =>
            !readAutoAllowedForMutation(EDIT, absolutePath, context, context.permissions()),
        }));
      if (notText) throw new FileStateError(fileWriteRefusalMessage(notText));
      let matchedOldString = findActualString(content, oldString) || oldString;
      let quotedNewString = preserveEscapeStyle(
        oldString,
        matchedOldString,
        preserveQuoteStyle(oldString, matchedOldString, newString),
      );
      let memorySource = memoryWriteSource(context);
      let postEditRefusal =
        lintMemoryFilePath(absolutePath, quotedNewString, memorySource) ??
        secretWarning(absolutePath, quotedNewString);
      if (postEditRefusal !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          postEditRefusal,
          "memory-directory write refused an edit after escape decoding",
        );
      let lintedNewString = lintBackgroundMemoryWrite(absolutePath, quotedNewString, memorySource);
      let newStringChanged = lintedNewString !== quotedNewString;
      let finalNewString = oldString === "" ? preserveBomPrefix(content, lintedNewString) : lintedNewString;
      let staleLintCleared = forgetLintedWrite(context.session.host, context.toolUseId);
      let contentAdjusted = newStringChanged || staleLintCleared;
      if (newStringChanged && finalNewString === matchedOldString)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "Nothing to change once the invisible characters are removed and harness-tag text is defused in new_string: it then equals old_string. Nothing was written.",
          "memory-directory write lint left an edit with nothing to change",
        );
      let editPatch = getPatchForEdit({
        filePath: absolutePath,
        fileContents: content,
        oldString: matchedOldString,
        newString: finalNewString,
        replaceAll,
        isForToolResult: stagingDecision === undefined,
      });
      let filePath = await mapToMirrorPath(absolutePath);
      let syncOutcome =
        stagingDecision !== undefined || fileHandle === null
          ? undefined
          : await memoryItemStampContext(
              context,
              filePath,
              fileExists ? content : null,
              editPatch.updatedFile,
              {
                remote: context.remoteCall !== undefined,
              },
            );
      let memoryContent = prepareMemoryContent(filePath, editPatch.updatedFile, syncOutcome?.context);
      logMemoryItemBlock(memoryContent.sharedItemBlock, "team");
      let content_2 = memoryContent.content;
      let memoryContentChanged = content_2 !== editPatch.updatedFile;
      let patch = !memoryContentChanged
        ? editPatch.patch
        : getPatchFromContents({
            filePath: absolutePath,
            oldContent: content,
            newContent: content_2,
            convertTabs: true,
            isForToolResult: stagingDecision === undefined,
          });
      let contentNotInModelContext =
        userModified ||
        memoryContentChanged ||
        contentAdjusted ||
        (fileExists &&
          (!hasFullFileContent(lastRead) ||
            staleRecovered ||
            !matchesReadContent(lastRead, stripBom_2(content))));
      if (stagingDecision !== undefined || fileHandle === null) {
        await stageSettingsWrite({
          writeCtx: context,
          tool: "Edit",
          absolutePath: stagingDecision?.path ?? absolutePath,
          currentContent: fileExists ? content : null,
          proposedContent: content_2,
        });
        return {
          originalFileContents: content,
          actualOldString: matchedOldString,
          actualNewString: finalNewString,
          updatedFile: content_2,
          patch,
          staleRecovered,
          contentNotInModelContext,
          staged: true,
        };
      }
      let timestamp;
      await fileHandle.recheckBeforeWrite();
      try {
        timestamp = await writeTextContentVerified(fileHandle.ioPath, content_2, encoding, lineEndings);
      } catch (error) {
        notePlanFileForgotten(absolutePath);
        throw error;
      }
      await noteMemoryItemWritten(filePath, content_2, memoryContent.item, syncOutcome?.rev);
      readFileState.set(absolutePath, {
        content: stripBom_2(content_2),
        timestamp,
        offset: undefined,
        limit: undefined,
        ...(contentNotInModelContext && {
          contentNotInModelContext: true,
        }),
        ...(fileExists &&
          lastRead?.isPartialView === true && {
            isPartialView: true,
          }),
      });
      if (encoding === "utf8" && lineEndings !== "CRLF") notePlanFileWritten(absolutePath, content_2);
      else notePlanFileForgotten(absolutePath);
      return {
        originalFileContents: content,
        actualOldString: matchedOldString,
        actualNewString: finalNewString,
        updatedFile: content_2,
        patch,
        staleRecovered,
        contentNotInModelContext,
        staged: false,
      };
    } catch (error) {
      if (fileHandle === null) throw error;
      rethrowWithPath(error, fileHandle, absolutePath);
    } finally {
      await fileHandle?.close();
    }
  });
  if (staged) {
    let isRemoteOrForeign = context.remoteCall !== undefined || context.inputFromAnotherMachine === true;
    return {
      data: {
        filePath,
        oldString: isRemoteOrForeign ? input.old_string : actualOldString,
        newString: isRemoteOrForeign ? input.new_string : newString,
        originalFile: isRemoteOrForeign ? null : originalFileContents,
        structuredPatch: isRemoteOrForeign ? [] : patch,
        userModified: userModified ?? false,
        replaceAll,
        staged: true,
        stagedWording: settingsWriteRoute({
          session: context.session,
          served: context.remoteCall !== undefined,
          cause: stagingDecision?.cause ?? "unapproved",
        }),
      },
      remedy: {
        kind: "staged_for_review",
        path: stagingDecision?.path ?? absolutePath,
      },
    };
  }
  if (context.remoteCall === undefined) pushUnique(context.nestedMemoryAttachmentTriggers, absolutePath);
  let lspManager = context.remoteCall === undefined ? getLspServerManager() : undefined;
  if (lspManager) {
    clearDeliveredDiagnosticsForFile(context.session, absolutePath);
    clearPendingDiagnosticsForFile(context.session, absolutePath);
    lspManager.changeFile(absolutePath, updatedFile).catch((error) => {
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
  lintMemoryWrite(absolutePath, originalFileContents, updatedFile);
  if (absolutePath.endsWith(`${sep}CLAUDE.md`)) logEvent("tengu_write_claudemd", {});
  (context.callerLogsSharedEvents ? countLinesChanged : logFileChanged)(patch, parentMessage.message.model);
  logFileOperation({
    operation: "edit",
    tool: "FileEditTool",
    filePath: absolutePath,
  });
  logEvent("tengu_edit_string_lengths", {
    oldStringBytes: Buffer.byteLength(oldString, "utf8"),
    newStringBytes: Buffer.byteLength(newString, "utf8"),
    replaceAll,
  });
  let gitDiff;
  if (shouldSendToolDiff(context)) {
    let now = Date.now();
    let singleFileGitDiff = await fetchSingleFileGitDiff(absolutePath);
    if (singleFileGitDiff && isPatchWithinSizeLimit(singleFileGitDiff)) gitDiff = singleFileGitDiff;
    logEvent("tengu_tool_use_diff_computed", {
      isEditTool: true,
      durationMs: Date.now() - now,
      hasDiff: !!singleFileGitDiff,
    });
  }
  let output = {
    filePath,
    oldString: actualOldString,
    newString,
    originalFile: originalFileContents,
    structuredPatch: patch,
    userModified: userModified ?? false,
    replaceAll,
    ...(staleRecovered && {
      staleRecovered: true,
    }),
    ...(contentNotInModelContext && {
      contentNotInModelContext: true,
    }),
    ...(skillSaveModeValue && {
      syncedSkillNext: skillSaveModeValue,
    }),
    ...(gitDiff && {
      gitDiff,
    }),
  };
  let fingerprintInput = {
    absoluteFilePath: absolutePath,
    output,
    originalFile: originalFileContents,
    updatedFile,
    appliedNewString: actualNewString,
  };
  let fingerprintResult =
    context.remoteCall !== undefined
      ? undefined
      : context.smallResultAsked === true
        ? recordEditFingerprint(fingerprintInput)
        : context.agentId !== undefined
          ? maybeRecordEditFingerprint(fingerprintInput)
          : undefined;
  return {
    data: output,
    ...fingerprintResult,
  };
}
//@ chunk-5xgkngpb.js:4770300-4770470 fingerprint (2.1.88 match: readFileForEdit, 0.841)
/**
 * 读取待编辑文件：句柄为 null 或文件不存在时返回空内容（utf8/LF、fileExists:false），否则返回 readExisting 的内容/编码/行尾。
 */
async function readFileForEdit(absoluteFilePath) {
  let readResult = absoluteFilePath === null ? null : await absoluteFilePath.readExisting();
  if (readResult === null)
    return {
      content: "",
      fileExists: false,
      encoding: "utf8",
      lineEndings: "LF",
    };
  return {
    ...readResult,
    fileExists: true,
  };
}
//@ chunk-5xgkngpb.js:4770470-4770647 sole-consumer
function classifyEditMatch(fileContent, oldString, replaceAll) {
  if (oldString === "") return "no_match";
  let actualString = findActualString(fileContent, oldString);
  if (!actualString) return "no_match";
  if (!replaceAll) {
    let index = fileContent.indexOf(actualString);
    if (fileContent.indexOf(actualString, index + actualString.length) !== -1) return "ambiguous";
  }
  return "applies";
}
//@ chunk-5xgkngpb.js:4770647-4771078 sole-consumer
/**
 * 未读文件时编辑是否可放行。
 */
async function isUnreadEditAllowed({
  ioPath,
  fileContents,
  lastRead,
  oldString,
  replaceAll,
  preReadGuard,
  readBaseline,
  servedOn,
  readNotAutoAllowed,
}) {
  if (!lastRead) {
    if (!preReadGuard && !readNotAutoAllowed()) {
      if (readBaseline === undefined || matchesContentDigest(readBaseline, stripBom_2(fileContents)))
        return false;
      if (classifyEditMatch(fileContents, oldString, replaceAll) === "applies") return true;
      throw new FileStateError(fileModifiedErrorFor(servedOn));
    }
    throw new FileStateError(FILE_NOT_READ_ERROR);
  }
  let refreshedBehindModel = isRefreshedBehindModel(lastRead);
  if (!refreshedBehindModel && (await getFileModificationTimeAsync(ioPath)) <= lastRead.timestamp)
    return false;
  let isFullView = isFullFileView(lastRead);
  if (!refreshedBehindModel && isFullView && matchesContentHash(lastRead, stripBom_2(fileContents)))
    return false;
  if (classifyEditMatch(fileContents, oldString, replaceAll) === "applies" && !readNotAutoAllowed())
    return true;
  throw new FileStateError(FILE_UNEXPECTEDLY_MODIFIED_ERROR);
}
//@ chunk-5xgkngpb.js:4771078-4771216 sole-consumer
function editMatchResultCode(matchOutcome) {
  switch (matchOutcome) {
    case "no_match":
      return lit_2("errorCode8");
    case "ambiguous":
      return lit_2("errorCode9");
    case "applies":
      return lit_2("success");
  }
}
export { FileEditTool };
