/**
 * tools/FileEditTool/FileEditTool.ts
 *
 * Edit 工具：精确字符串替换（先读、修改检测、引号与转义保真、暂存审阅、fileHistory、LSP 通知）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/FileEditTool.ts
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 1, affinity 2, fingerprint 2, layout 1, sole-consumer 3
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
  FILE_EDIT_TOOL_NAME,
  DENIED_DIRECTORY_ERROR,
  READ_DENY_RULE_EDIT_ERROR,
  FILE_NOT_READ_ERROR,
  FILE_UNEXPECTEDLY_MODIFIED_ERROR,
} from "./constants.js";
import { getEditToolDescription } from "./prompt.js";
import { userFacingName_2, getToolUseSummary_2 } from "./UI.js";
import { renderToolUseMessage_2 } from "../FileWriteTool/UI.js";
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
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
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
import { toTelemetryModelSlug } from "../../utils/model/telemetryModelName.js";
import { isLegacyPromptModelOrOverride } from "../../utils/model/promptBundles.js";
import { compareWithDisk } from "./fileStaleness.js";
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

//@ chunk-e6aww6q8.js:4648901-4648920 placement
/**
 * 可编辑文件的大小上限（1 GiB）。
 */
var MAX_EDITABLE_FILE_BYTES = 1073741824;
//@ chunk-e6aww6q8.js:4648920-4648972 affinity
/**
 * 判断读取记录是否在模型之后刷新过。
 */
function isRefreshedBehindModel(e) {
  return e?.refreshedBehindModel === true;
}
//@ chunk-e6aww6q8.js:4649110-4649429 affinity = areFileEditsInputsEquivalent (0.819)
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
  let [h] = edits;
  return h === undefined
    ? input1
    : {
        ...input1,
        file_path: filePath,
        old_string: h.old_string,
        new_string: h.new_string,
      };
}
//@ chunk-e6aww6q8.js:4649429-4656768 fingerprint = FileEditTool (0.557)
/**
 * Edit 工具定义（name "Edit"）。精确字符串替换：validateInput 依次查空字节/不稳定路径/用户电脑路径/工作树隔离/记忆目录 lint、old==new、deny 规则、Read deny、1GiB 上限、Perforce 只读、文件不存在/已存在、.ipynb、必须先 Read 且未被外部修改（可自动恢复）、匹配唯一性、settings 文件校验；call 交给 editFileToolCall。
 */
var FileEditTool = buildTool({
  name: FILE_EDIT_TOOL_NAME,
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
  getToolUseSummary: renderToolUseMessage_2,
  getActivityDescription(input) {
    let summary = renderToolUseMessage_2(input);
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
  fromAnotherProcess(e, n, r, s) {
    if (s !== undefined && !e.staged) logFileChanged(e.structuredPatch, s);
    return {
      data: {
        ...e,
        filePath: String(n.file_path ?? ""),
        userModified: r?.userModified === true,
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
    let n = remoteRoutingCandidate(input);
    if (!editRemovalVisibilityValue())
      return n === undefined
        ? `${input.file_path}: ${input.new_string}`
        : {
            file_path: input.file_path,
            new_string: input.new_string,
            [HOST_TOOL_INPUT_FIELD]: n,
            ...hostContextMeta(input),
          };
    let r = editRemovalCapValue();
    let oldString = input.old_string;
    let h = r > 0 && typeof oldString === "string" && oldString.length > r;
    return {
      file_path: input.file_path,
      adds: input.new_string,
      removes: h ? oldString.slice(0, r) : oldString,
      ...(r > 0 && {
        removesTruncated: h,
      }),
      ...(input.replace_all === true && {
        replaceAll: true,
      }),
      ...(n !== undefined && {
        [HOST_TOOL_INPUT_FIELD]: n,
        ...hostContextMeta(input),
      }),
    };
  },
  suppressesAllPermissionUpdates(e) {
    return hasHostField(e);
  },
  getPath(input) {
    return input.file_path;
  },
  backfillObservableInput(input) {
    if (typeof input.file_path === "string" && !isRemoteOnlyCheck(FILE_EDIT_TOOL_NAME))
      input.file_path = expandStablePath(input.file_path);
  },
  async preparePermissionMatcher({ file_path }) {
    return (pattern) => matchesPathRule(pattern, file_path);
  },
  inputsEquivalent(e, n) {
    let r = expandPathOrNull(e.file_path);
    let s = (h) => ({
      file_path: h.file_path,
      edits: [
        {
          old_string: h.old_string,
          new_string: r === null ? h.new_string : lintMemoryTextIfEnabled(r, h.new_string),
          replace_all: h.replace_all ?? false,
        },
      ],
    });
    return isRemoteOnlyCheck(FILE_EDIT_TOOL_NAME)
      ? areFileEditInputsIdentical(s(e), s(n))
      : areFileEditsInputsEquivalent(s(e), s(n));
  },
  create(toolContext) {
    return {
      permissionCheckFailureDecision(n) {
        return buildUnfinishedCheckDecision(
          FILE_EDIT_TOOL_NAME,
          isPlainObject_5(n) ? n.file_path : undefined,
          toolContext.permissions(),
        );
      },
      async checkPermissions(input, r) {
        let s = expandStablePath(input.file_path);
        let h = walkPermissionCheckPaths(s);
        toolContext.session.writePermissionStash.stash(r.toolUseId, s, h.spellings);
        let y = checkWritePermissionForTool(FileEditTool, input, toolContext.permissions(), h);
        let permissionResult = y.behavior === "deny" ? y : (leafSymlinkWriteRefusal(s, h) ?? y);
        if (
          permissionResult.behavior === "deny" ||
          (permissionResult.updatedInput !== undefined && permissionResult.updatedInput !== input)
        )
          return permissionResult;
        let toolUseSummary = getToolUseSummary_2(input, "new_string", memoryWriteSource(toolContext), {
          host: toolContext.session.host,
          toolUseId: r.toolUseId,
        });
        return toolUseSummary === input || toolUseSummary.new_string === input.old_string
          ? permissionResult
          : {
              ...permissionResult,
              updatedInput: toolUseSummary,
            };
      },
      async validateInput(input1, r) {
        let callContext = createToolContextView(toolContext, r);
        if (canRunToolsOnThisMachine() && hasHostField(input1))
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 14,
          };
        let { file_path, replace_all: replaceAll = false } = input1;
        let { old_string, new_string: newString } = input1;
        let L = rejectNullBytes(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (L) return L;
        let G = rejectTrailingWhitespace(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (G) return G;
        let q = checkForeignFilePath(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (q) return q;
        let absolutePath = expandStablePath(file_path);
        let Se = checkWorktreeIsolation_2(absolutePath, callContext);
        if (Se)
          return {
            result: false,
            message: Se,
            errorCode: 12,
          };
        let ke = secretWarning(absolutePath, newString);
        if (ke)
          return {
            result: false,
            message: ke,
            errorCode: 0,
          };
        let we = lintMemoryFilePath(absolutePath, newString, memoryWriteSource(callContext));
        if (we)
          return {
            result: false,
            message: we,
            errorCode: 0,
          };
        if (old_string === newString)
          return {
            result: false,
            behavior: "ask",
            message: "No changes to make: old_string and new_string are exactly the same.",
            errorCode: 1,
          };
        let Ee = matchingRuleForInput(absolutePath, callContext.permissions(), "edit", "deny");
        if (Ee !== null)
          return {
            result: false,
            behavior: "ask",
            message: DENIED_DIRECTORY_ERROR,
            errorCode: 2,
            deniedByPermissionRule: true,
            denyRule: Ee,
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
          let At = classifyEditMatch(fileContent, old_string, replaceAll);
          let It =
            At === "applies" &&
            readAutoAllowedForMutation(
              FILE_EDIT_TOOL_NAME,
              absolutePath,
              callContext,
              callContext.permissions(),
            );
          logEvent("tengu_edit_tool_stale_read", {
            wouldHaveResult: editMatchResultCode(At),
            recovered: It,
            trigger,
          });
          return It;
        };
        let staleReadError = (hostName) => ({
          result: false,
          behavior: "ask",
          message: REMOTE_FILE_MODIFIED_ERROR(hostName),
          errorCode: 7,
        });
        if (!readState || readState.isPartialView) {
          let canonicalName = getCanonicalName(callContext.model());
          let modelBucket = toTelemetryModelSlug(canonicalName);
          let It =
            !isLegacyPromptModelOrOverride(canonicalName, callContext.remoteCall) &&
            readAutoAllowedForMutation(
              FILE_EDIT_TOOL_NAME,
              absolutePath,
              callContext,
              callContext.permissions(),
            );
          let readBaseline = It && readState === undefined ? callContext.remoteCall?.readBaseline : undefined;
          let qt =
            readBaseline === undefined
              ? "absent"
              : await compareWithDisk(absolutePath, readBaseline, () =>
                  readAutoAllowedForMutation(
                    FILE_EDIT_TOOL_NAME,
                    absolutePath,
                    callContext,
                    callContext.permissions(),
                  ),
                );
          logEvent("tengu_edit_tool_not_read_hypothetical", {
            wouldHaveResult: editMatchResultCode(classifyEditMatch(fileContent, old_string, replaceAll)),
            isPartialView: readState?.isPartialView === true,
            isFilePathAbsolute: isAbsolute(file_path),
            guardSkipped: It,
            modelBucket,
            servedCall: callContext.remoteCall !== undefined,
            ...(callContext.remoteCall?.model !== undefined && {
              callerModelBucket: toTelemetryModelSlug(callContext.remoteCall.model),
            }),
            readBaseline: fromEnum(qt),
          });
          if (!It)
            return {
              result: false,
              behavior: "ask",
              message: FILE_NOT_READ_ERROR,
              meta: {
                isFilePathAbsolute: String(isAbsolute(file_path)),
              },
              errorCode: 6,
            };
          if (qt === "mismatch" && !tryRecoverStaleRead(lit_2("baseline")))
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
          let gt = hasUnicodeOrEscapes(old_string)
            ? `
(note: Edit also tried swapping \\uXXXX escapes and their characters; neither form matched, so the mismatch is likely elsewhere in old_string. Re-read the file and copy the exact surrounding text.)`
            : "";
          return {
            result: false,
            behavior: "ask",
            message: `String to replace not found in file.
String: ${old_string}${gt}`,
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
          replaceAll ? file.replaceAll(actualOldString, newString) : file.replace(actualOldString, newString),
        );
        if (settingsValidationResult !== null) return settingsValidationResult;
        return {
          result: true,
          meta: {
            actualOldString,
          },
        };
      },
      async call(n, r) {
        let { parentMessage } = r;
        if (parentMessage === undefined) throw Error("Edit: a call needs the message that issued it");
        return editFileToolCall(n, createToolContextView(toolContext, r), parentMessage);
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
    let Z = staleRecovered
      ? " (note: the file had been modified on disk since you last read it \u2014 the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)"
      : userModified || contentNotInModelContext
        ? ""
        : FILE_STATE_CURRENT_SUFFIX;
    let Se = syncedSkillSaveHint(syncedSkillNext);
    if (replaceAll)
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: `The file ${filePath} has been updated${modifiedNote}. All occurrences were successfully replaced.${Z}${Se}`,
      };
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: `The file ${filePath} has been updated successfully${modifiedNote}.${Z}${Se}`,
    };
  },
});
//@ chunk-e6aww6q8.js:4656768-4661702 layout
/**
 * Edit 的 call 实现：拒绝 Read deny 与不可写目标，记录 fileHistory 检查点，在文件锁内读取（编码/行尾）、findActualString 匹配并保留引号与 \uXXXX 风格、生成 patch，写入或暂存给机主审阅；更新 readFileState、通知 LSP、记 tengu_edit_string_lengths，可选计算 gitDiff。
 */
async function editFileToolCall(input, context, parentMessage) {
  let { readFileState, userModified, getFileHistoryState, applyFileHistoryOp, dynamicSkillDirTriggers } =
    context;
  let { file_path: filePath, replace_all: replaceAll = false } = input;
  let { old_string: oldString, new_string: newString } = input;
  let absolutePath = expandStablePath(filePath);
  let spellings = consumeWritePermission(context, absolutePath);
  if (hasReadDenyRuleForPath(absolutePath, context.permissions()))
    throw new FileStateError(READ_DENY_RULE_EDIT_ERROR);
  let we = writeBlockRefusal(absolutePath, context.permissions(), spellings);
  if (we !== undefined) throw new FileStateError(we);
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
  let stagingDecision = await checkSettingsWrite(context, spellings, {
    toolName: FILE_EDIT_TOOL_NAME,
    absolutePath,
    input,
  });
  let Ae = skillSaveMode(context, spellings, await isInSyncedSkillsDir(context.session.host, spellings));
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
    let fileHandle = await pinWriteTarget(absolutePath, spellings, {
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
          readBaseline: context.remoteCall?.readBaseline,
          servedOn: context.remoteCall?.origin.hostName,
          readNotAutoAllowed: () =>
            !readAutoAllowedForMutation(FILE_EDIT_TOOL_NAME, absolutePath, context, context.permissions()),
        }));
      if (notText) throw new FileStateError(fileWriteRefusalMessage(notText));
      let matchedOldString = findActualString(content, oldString) || oldString;
      let quotedNewString = preserveEscapeStyle(
        oldString,
        matchedOldString,
        preserveQuoteStyle(oldString, matchedOldString, newString),
      );
      let fo = memoryWriteSource(context);
      let To =
        lintMemoryFilePath(absolutePath, quotedNewString, fo) ?? secretWarning(absolutePath, quotedNewString);
      if (To !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          To,
          "memory-directory write refused an edit after escape decoding",
        );
      let bo = lintBackgroundMemoryWrite(absolutePath, quotedNewString, fo);
      let vn = bo !== quotedNewString;
      let co = oldString === "" ? preserveBomPrefix(content, bo) : bo;
      let So = forgetLintedWrite(context.session.host, context.toolUseId);
      let ko = vn || So;
      if (vn && co === matchedOldString)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "Nothing to change once the invisible characters are removed and harness-tag text is defused in new_string: it then equals old_string. Nothing was written.",
          "memory-directory write lint left an edit with nothing to change",
        );
      let editPatch = getPatchForEdit({
        filePath: absolutePath,
        fileContents: content,
        oldString: matchedOldString,
        newString: co,
        replaceAll,
        isForToolResult: stagingDecision === undefined,
      });
      let filePath = await mapToMirrorPath(absolutePath);
      let $o =
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
      let memoryContent = prepareMemoryContent(filePath, editPatch.updatedFile, $o?.context);
      logMemoryItemBlock(memoryContent.sharedItemBlock, "team");
      let content_2 = memoryContent.content;
      let rr = content_2 !== editPatch.updatedFile;
      let patch = !rr
        ? editPatch.patch
        : getPatchFromContents({
            filePath: absolutePath,
            oldContent: content,
            newContent: content_2,
            convertTabs: true,
            isForToolResult: stagingDecision === undefined,
          });
      let Hr =
        userModified ||
        rr ||
        ko ||
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
          actualNewString: co,
          updatedFile: content_2,
          patch,
          staleRecovered,
          contentNotInModelContext: Hr,
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
      await noteMemoryItemWritten(filePath, content_2, memoryContent.item, $o?.rev);
      readFileState.set(absolutePath, {
        content: stripBom_2(content_2),
        timestamp,
        offset: undefined,
        limit: undefined,
        ...(Hr && {
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
        actualNewString: co,
        updatedFile: content_2,
        patch,
        staleRecovered,
        contentNotInModelContext: Hr,
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
    let qt = context.remoteCall !== undefined || context.inputFromAnotherMachine === true;
    return {
      data: {
        filePath,
        oldString: qt ? input.old_string : actualOldString,
        newString: qt ? input.new_string : newString,
        originalFile: qt ? null : originalFileContents,
        structuredPatch: qt ? [] : patch,
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
  let Et = context.remoteCall === undefined ? getLspServerManager() : undefined;
  if (Et) {
    clearDeliveredDiagnosticsForFile(context.session, absolutePath);
    clearPendingDiagnosticsForFile(context.session, absolutePath);
    Et.changeFile(absolutePath, updatedFile).catch((error) => {
      logForDebugging(`LSP: Failed to notify server of file change for ${absolutePath}: ${error.message}`, {
        level: "error",
      });
    });
    Et.saveFile(absolutePath).catch((error) => {
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
  let At = {
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
    ...(Ae && {
      syncedSkillNext: Ae,
    }),
    ...(gitDiff && {
      gitDiff,
    }),
  };
  let It = {
    absoluteFilePath: absolutePath,
    output: At,
    originalFile: originalFileContents,
    updatedFile,
    appliedNewString: actualNewString,
  };
  let Yt =
    context.remoteCall !== undefined
      ? undefined
      : context.smallResultAsked === true
        ? recordEditFingerprint(It)
        : context.agentId !== undefined
          ? maybeRecordEditFingerprint(It)
          : undefined;
  return {
    data: At,
    ...Yt,
  };
}
//@ chunk-e6aww6q8.js:4661702-4661872 fingerprint = readFileForEdit (0.838)
/**
 * 读取待编辑文件：句柄为 null 或文件不存在时返回空内容（utf8/LF、fileExists:false），否则返回 readExisting 的内容/编码/行尾。
 */
async function readFileForEdit(absoluteFilePath) {
  let n = absoluteFilePath === null ? null : await absoluteFilePath.readExisting();
  if (n === null)
    return {
      content: "",
      fileExists: false,
      encoding: "utf8",
      lineEndings: "LF",
    };
  return {
    ...n,
    fileExists: true,
  };
}
//@ chunk-e6aww6q8.js:4661872-4662049 sole-consumer
function classifyEditMatch(e, oldString, replaceAll) {
  if (oldString === "") return "no_match";
  let actualString = findActualString(e, oldString);
  if (!actualString) return "no_match";
  if (!replaceAll) {
    let index = e.indexOf(actualString);
    if (e.indexOf(actualString, index + actualString.length) !== -1) return "ambiguous";
  }
  return "applies";
}
//@ chunk-e6aww6q8.js:4662049-4662480 sole-consumer
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
  let G = isRefreshedBehindModel(lastRead);
  if (!G && (await getFileModificationTimeAsync(ioPath)) <= lastRead.timestamp) return false;
  let q = isFullFileView(lastRead);
  if (!G && q && matchesContentHash(lastRead, stripBom_2(fileContents))) return false;
  if (classifyEditMatch(fileContents, oldString, replaceAll) === "applies" && !readNotAutoAllowed())
    return true;
  throw new FileStateError(FILE_UNEXPECTEDLY_MODIFIED_ERROR);
}
//@ chunk-e6aww6q8.js:4662480-4662618 sole-consumer
function editMatchResultCode(e) {
  switch (e) {
    case "no_match":
      return lit_2("errorCode8");
    case "ambiguous":
      return lit_2("errorCode9");
    case "applies":
      return lit_2("success");
  }
}
export { FileEditTool };
