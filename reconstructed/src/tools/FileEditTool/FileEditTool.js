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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import {
  normalizeFileEditInput,
  areFileEditInputsIdentical,
  findActualString,
  hasUnicodeOrEscapes,
  preserveEscapeStyle,
  preserveQuoteStyle,
  getPatchForEdit,
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
import { SDKUserMessageSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { logFileChanged, getPatchFromContents, countLinesChanged } from "../../utils/diff.js";
import { normalizeEditInputAliases } from "./_new/normalizeEditInputAliases.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
import { Yfn, T1r } from "../../utils/envFlagValues.js";
import { $r, $Fe, Cf, yO, hostFieldNotForwardedMessage } from "../../bridge/deviceRegistration.js";
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
  eSe,
  IL,
  lintMemoryFilePath,
  lintBackgroundMemoryWrite,
  rSe,
  wSt,
} from "../../memdir/memoryWriteLint.js";
import { areFileEditsInputsEquivalent } from "./_new/areFileEditsInputsEquivalent.js";
import { buildUnfinishedCheckDecision } from "../../utils/permissions/unfinishedWriteCheck.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import {
  createToolContextView,
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
  Vq,
} from "../../utils/filePathValidation.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { hl } from "../../utils/networkPaths.js";
import { formatFileSize } from "../../utils/format.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "./perforce.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { detectTextEncoding, swr } from "../../utils/fileRead.js";
import {
  __,
  REMOTE_FILE_MODIFIED_ERROR,
  isFullFileView,
  y1,
  Gie,
  matchesReadContent,
  tv,
  aFe,
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
import { jkn } from "../../utils/model/promptBundles.js";
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
import { hSe, skillSaveMode } from "../../utils/skillFileWrites.js";
import { consumeWritePermission } from "../../utils/fsSafety/atomicWriteStaging.js";
import { env } from "../../utils/env.js";
import { discoverSkillsForPath, isInSyncedSkillsDir } from "../../skills/loadSkillsDir.js";
import { Q2e } from "../../services/diagnosticTracking.js";
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
import { recordEditFingerprint, m2n } from "./_new/recordEditFingerprint.js";

//@ chunk-e6aww6q8.js:4648901-4648920 placement
var h2n = 1073741824;
//@ chunk-e6aww6q8.js:4648920-4648972 affinity
function _2n(e) {
  return e?.refreshedBehindModel === !0;
}
/**
 * 仅在远程调用或跨机器输入时对 Edit 的 old/new_string 运行 normalizeFileEditInput；本地调用原样返回。
 */
//@ chunk-e6aww6q8.js:4649110-4649429 affinity = areFileEditsInputsEquivalent (0.819)
function normalizeEditInputForRemote(input1, input2) {
  if (input2.remoteCall === void 0 && input2.inputFromAnotherMachine !== !0) return input1;
  let { file_path: file_path, edits: edits } = normalizeFileEditInput({
      file_path: input1.file_path,
      edits: [
        {
          old_string: input1.old_string,
          new_string: input1.new_string,
          replace_all: input1.replace_all ?? !1,
        },
      ],
    }),
    [h] = edits;
  return h === void 0
    ? input1
    : { ...input1, file_path: file_path, old_string: h.old_string, new_string: h.new_string };
}
/**
 * Edit 工具定义（name "Edit"）。精确字符串替换：validateInput 依次查空字节/不稳定路径/用户电脑路径/工作树隔离/记忆目录 lint、old==new、deny 规则、Read deny、1GiB 上限、Perforce 只读、文件不存在/已存在、.ipynb、必须先 Read 且未被外部修改（可自动恢复）、匹配唯一性、settings 文件校验；call 交给 editFileToolCall。
 */
//@ chunk-e6aww6q8.js:4649429-4656768 fingerprint = FileEditTool (0.557)
var FileEditTool = buildTool({
  name: FILE_EDIT_TOOL_NAME,
  ruleContentField: "file_path",
  searchHint: "modify file contents in place",
  remoteExecution: {
    supported: !0,
    decidingInputFields: ["file_path", "old_string", "new_string", "replace_all"],
  },
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  strict: !0,
  async description() {
    return "A tool for editing files";
  },
  async prompt({ model: e, leanPrompt: n }) {
    return getEditToolDescription(e, n);
  },
  userFacingName: userFacingName_2,
  getToolUseSummary: renderToolUseMessage_2,
  getActivityDescription(e) {
    let n = renderToolUseMessage_2(e);
    return n ? `Editing ${n}` : "Editing file";
  },
  get inputSchema() {
    return fileEditInputSchema();
  },
  get outputSchema() {
    return fileEditOutputSchema();
  },
  get outputSchemaAcrossProcesses() {
    return SDKUserMessageSchema_2();
  },
  fromAnotherProcess(e, n, r, s) {
    if (s !== void 0 && !e.staged) logFileChanged(e.structuredPatch, s);
    return { data: { ...e, filePath: String(n.file_path ?? ""), userModified: r?.userModified === !0 } };
  },
  coerceInput: normalizeEditInputAliases,
  stripForStorage(output) {
    if (typeof output !== "object" || output === null) return output;
    if ((output.originalFile ?? "") === "") return output;
    return { ...output, originalFile: "" };
  },
  toAutoClassifierInput(input) {
    let n = zCe(input);
    if (!Yfn())
      return n === void 0
        ? `${input.file_path}: ${input.new_string}`
        : { file_path: input.file_path, new_string: input.new_string, [$r]: n, ...$Fe(input) };
    let r = T1r(),
      old_string = input.old_string,
      h = r > 0 && typeof old_string === "string" && old_string.length > r;
    return {
      file_path: input.file_path,
      adds: input.new_string,
      removes: h ? old_string.slice(0, r) : old_string,
      ...(r > 0 && { removesTruncated: h }),
      ...(input.replace_all === !0 && { replaceAll: !0 }),
      ...(n !== void 0 && { [$r]: n, ...$Fe(input) }),
    };
  },
  suppressesAllPermissionUpdates(e) {
    return Cf(e);
  },
  getPath(e) {
    return e.file_path;
  },
  backfillObservableInput(e) {
    if (typeof e.file_path === "string" && !isRemoteOnlyCheck(FILE_EDIT_TOOL_NAME))
      e.file_path = expandStablePath(e.file_path);
  },
  async preparePermissionMatcher({ file_path: e }) {
    return (n) => matchesPathRule(n, e);
  },
  inputsEquivalent(e, n) {
    let r = expandPathOrNull(e.file_path),
      s = (h) => ({
        file_path: h.file_path,
        edits: [
          {
            old_string: h.old_string,
            new_string: r === null ? h.new_string : eSe(r, h.new_string),
            replace_all: h.replace_all ?? !1,
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
          isPlainObject_4(n) ? n.file_path : void 0,
          toolContext.permissions(),
        );
      },
      async checkPermissions(input, r) {
        let s = expandStablePath(input.file_path),
          h = walkPermissionCheckPaths(s);
        toolContext.session.writePermissionStash.stash(r.toolUseId, s, h.spellings);
        let y = checkWritePermissionForTool(FileEditTool, input, toolContext.permissions(), h),
          permissionResult = y.behavior === "deny" ? y : (leafSymlinkWriteRefusal(s, h) ?? y);
        if (
          permissionResult.behavior === "deny" ||
          (permissionResult.updatedInput !== void 0 && permissionResult.updatedInput !== input)
        )
          return permissionResult;
        let w = getToolUseSummary_2(input, "new_string", IL(toolContext), {
          host: toolContext.session.host,
          toolUseId: r.toolUseId,
        });
        return w === input || w.new_string === input.old_string
          ? permissionResult
          : { ...permissionResult, updatedInput: w };
      },
      async validateInput(n, r) {
        let callContext = createToolContextView(toolContext, r);
        if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 14 };
        let { file_path: file_path, replace_all: replace_all = !1 } = n,
          { old_string: old_string, new_string: new_string } = n,
          L = rejectNullBytes(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (L) return L;
        let G = rejectTrailingWhitespace(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (G) return G;
        let q = checkForeignFilePath(FILE_EDIT_TOOL_NAME, [["file_path", file_path]]);
        if (q) return q;
        let absolutePath = expandStablePath(file_path),
          Se = checkWorktreeIsolation_2(absolutePath, callContext);
        if (Se) return { result: !1, message: Se, errorCode: 12 };
        let ke = secretWarning(absolutePath, new_string);
        if (ke) return { result: !1, message: ke, errorCode: 0 };
        let we = lintMemoryFilePath(absolutePath, new_string, IL(callContext));
        if (we) return { result: !1, message: we, errorCode: 0 };
        if (old_string === new_string)
          return {
            result: !1,
            behavior: "ask",
            message: "No changes to make: old_string and new_string are exactly the same.",
            errorCode: 1,
          };
        let Ee = matchingRuleForInput(absolutePath, callContext.permissions(), "edit", "deny");
        if (Ee !== null)
          return {
            result: !1,
            behavior: "ask",
            message: DENIED_DIRECTORY_ERROR,
            errorCode: 2,
            deniedByPermissionRule: !0,
            denyRule: Ee,
          };
        let Ae = readDenyRuleForPath(absolutePath, callContext.permissions());
        if (Ae !== void 0)
          return {
            result: !1,
            behavior: "ask",
            message: READ_DENY_RULE_EDIT_ERROR,
            errorCode: 13,
            deniedByPermissionRule: !0,
            denyRule: Ae,
          };
        if (hl(absolutePath)) return { result: !0 };
        let Ie = getFsImplementation();
        try {
          let { size: size, mode: mode } = await Ie.stat(absolutePath);
          if (size > h2n)
            return {
              result: !1,
              behavior: "ask",
              message: `File is too large to edit (${formatFileSize(size)}). Maximum editable file size is ${formatFileSize(h2n)}.`,
              errorCode: 10,
            };
          if (isPerforceReadOnlyFile(mode))
            return { result: !1, behavior: "ask", message: PERFORCE_READ_ONLY_MESSAGE, errorCode: 11 };
        } catch (error) {
          if (!isENOENT(error)) throw error;
        }
        ({ old_string: old_string, new_string: new_string } = normalizeEditInputForRemote(n, callContext));
        let fileContent, notTextReason;
        try {
          let fileBytes = await Ie.readFileBytes(absolutePath),
            At = detectTextEncoding(fileBytes);
          ((notTextReason = At.notText), (fileContent = __(fileBytes.toString(At.encoding))));
        } catch (error) {
          if (isENOENT(error)) fileContent = null;
          else throw error;
        }
        if (fileContent === null) {
          if (old_string === "") return { result: !0 };
          let gt = await findSimilarFile(absolutePath),
            At = await normalizePathForComparison(absolutePath),
            It = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`;
          if (At) It += ` Did you mean ${At}?`;
          else if (gt) It += ` Did you mean ${gt}?`;
          return { result: !1, behavior: "ask", message: encodeControlChars(It), errorCode: 4 };
        }
        if (old_string === "") {
          if (fileContent.trim() !== "")
            return {
              result: !1,
              behavior: "ask",
              message: "Cannot create new file - file already exists.",
              errorCode: 3,
            };
          return { result: !0 };
        }
        if (absolutePath.endsWith(".ipynb"))
          return {
            result: !1,
            behavior: "ask",
            message: `File is a Jupyter Notebook. Use the ${NOTEBOOK_EDIT_TOOL_NAME} to edit this file.`,
            errorCode: 5,
          };
        let readState = callContext.readFileState.get(absolutePath),
          tryRecoverStaleRead = (gt) => {
            let At = classifyEditMatch(fileContent, old_string, replace_all),
              It =
                At === "applies" &&
                readAutoAllowedForMutation(
                  FILE_EDIT_TOOL_NAME,
                  absolutePath,
                  callContext,
                  callContext.permissions(),
                );
            return (
              logEvent("tengu_edit_tool_stale_read", {
                wouldHaveResult: editMatchResultCode(At),
                recovered: It,
                trigger: gt,
              }),
              It
            );
          },
          staleReadError = (gt) => ({
            result: !1,
            behavior: "ask",
            message: REMOTE_FILE_MODIFIED_ERROR(gt),
            errorCode: 7,
          });
        if (!readState || readState.isPartialView) {
          let gt = getCanonicalName(callContext.model()),
            At = toTelemetryModelSlug(gt),
            It =
              !jkn(gt, callContext.remoteCall) &&
              readAutoAllowedForMutation(
                FILE_EDIT_TOOL_NAME,
                absolutePath,
                callContext,
                callContext.permissions(),
              ),
            Yt = It && readState === void 0 ? callContext.remoteCall?.readBaseline : void 0,
            qt =
              Yt === void 0
                ? "absent"
                : await compareWithDisk(absolutePath, Yt, () =>
                    readAutoAllowedForMutation(
                      FILE_EDIT_TOOL_NAME,
                      absolutePath,
                      callContext,
                      callContext.permissions(),
                    ),
                  );
          if (
            (logEvent("tengu_edit_tool_not_read_hypothetical", {
              wouldHaveResult: editMatchResultCode(classifyEditMatch(fileContent, old_string, replace_all)),
              isPartialView: readState?.isPartialView === !0,
              isFilePathAbsolute: isAbsolute_3(file_path),
              guardSkipped: It,
              modelBucket: At,
              servedCall: callContext.remoteCall !== void 0,
              ...(callContext.remoteCall?.model !== void 0 && {
                callerModelBucket: toTelemetryModelSlug(callContext.remoteCall.model),
              }),
              readBaseline: fromEnum(qt),
            }),
            !It)
          )
            return {
              result: !1,
              behavior: "ask",
              message: FILE_NOT_READ_ERROR,
              meta: { isFilePathAbsolute: String(isAbsolute_3(file_path)) },
              errorCode: 6,
            };
          if (qt === "mismatch" && !tryRecoverStaleRead(lit_2("baseline")))
            return staleReadError(callContext.remoteCall?.origin.hostName);
        }
        if (readState) {
          if (_2n(readState) && !tryRecoverStaleRead(lit_2("refreshed"))) return staleReadError();
          if ((await getFileModificationTimeAsync(absolutePath)) > readState.timestamp) {
            if (
              !(isFullFileView(readState) && y1(readState, fileContent)) &&
              !tryRecoverStaleRead(lit_2("mtime"))
            )
              return staleReadError();
          }
        }
        if (notTextReason)
          return { result: !1, message: fileWriteRefusalMessage(notTextReason), errorCode: 15 };
        let nt = fileContent,
          actualOldString = findActualString(nt, old_string);
        if (!actualOldString) {
          let gt = hasUnicodeOrEscapes(old_string)
            ? `
(note: Edit also tried swapping \\uXXXX escapes and their characters; neither form matched, so the mismatch is likely elsewhere in old_string. Re-read the file and copy the exact surrounding text.)`
            : "";
          return {
            result: !1,
            behavior: "ask",
            message: `String to replace not found in file.
String: ${old_string}${gt}`,
            meta: { isFilePathAbsolute: String(isAbsolute_3(file_path)) },
            errorCode: 8,
          };
        }
        let Et = nt.split(actualOldString).length - 1;
        if (Et > 1 && !replace_all)
          return {
            result: !1,
            behavior: "ask",
            message: `Found ${Et} matches of the string to replace, but replace_all is false. To replace all occurrences, set replace_all to true. To replace only one occurrence, please provide more context to uniquely identify the instance.
String: ${old_string}`,
            meta: { isFilePathAbsolute: String(isAbsolute_3(file_path)), actualOldString: actualOldString },
            errorCode: 9,
          };
        let yt = validateInputForSettingsFileEdit(absolutePath, nt, () =>
          replace_all ? nt.replaceAll(actualOldString, new_string) : nt.replace(actualOldString, new_string),
        );
        if (yt !== null) return yt;
        return { result: !0, meta: { actualOldString: actualOldString } };
      },
      async call(n, r) {
        let { parentMessage: parentMessage } = r;
        if (parentMessage === void 0) throw Error("Edit: a call needs the message that issued it");
        return editFileToolCall(n, createToolContextView(toolContext, r), parentMessage);
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, n) {
    let {
      filePath: filePath,
      userModified: userModified,
      replaceAll: replaceAll,
      staleRecovered: staleRecovered,
      contentNotInModelContext: contentNotInModelContext,
      staged: staged,
      stagedWording: stagedWording,
      syncedSkillNext: syncedSkillNext,
    } = e;
    if (staged)
      return {
        tool_use_id: n,
        type: "tool_result",
        content: settingsNotAppliedMessage(filePath, stagedWording ?? "review"),
      };
    let q = userModified ? ".  The user modified your proposed changes before accepting them. " : "",
      Z = staleRecovered
        ? " (note: the file had been modified on disk since you last read it \u2014 the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)"
        : userModified || contentNotInModelContext
          ? ""
          : FILE_STATE_CURRENT_SUFFIX,
      Se = hSe(syncedSkillNext);
    if (replaceAll)
      return {
        tool_use_id: n,
        type: "tool_result",
        content: `The file ${filePath} has been updated${q}. All occurrences were successfully replaced.${Z}${Se}`,
      };
    return {
      tool_use_id: n,
      type: "tool_result",
      content: `The file ${filePath} has been updated successfully${q}.${Z}${Se}`,
    };
  },
});
/**
 * Edit 的 call 实现：拒绝 Read deny 与不可写目标，记录 fileHistory 检查点，在文件锁内读取（编码/行尾）、findActualString 匹配并保留引号与 \uXXXX 风格、生成 patch，写入或暂存给机主审阅；更新 readFileState、通知 LSP、记 tengu_edit_string_lengths，可选计算 gitDiff。
 */
//@ chunk-e6aww6q8.js:4656768-4661702 layout
async function editFileToolCall(input, context, r) {
  let {
      readFileState: readFileState,
      userModified: userModified,
      getFileHistoryState: getFileHistoryState,
      applyFileHistoryOp: applyFileHistoryOp,
      dynamicSkillDirTriggers: dynamicSkillDirTriggers,
    } = context,
    { file_path: file_path, replace_all: replace_all = !1 } = input,
    { old_string: old_string, new_string: new_string } = input,
    absolutePath = expandStablePath(file_path),
    ke = consumeWritePermission(context, absolutePath);
  if (hasReadDenyRuleForPath(absolutePath, context.permissions()))
    throw new FileStateError(READ_DENY_RULE_EDIT_ERROR);
  let we = writeBlockRefusal(absolutePath, context.permissions(), ke);
  if (we !== void 0) throw new FileStateError(we);
  if (
    (({ old_string: old_string, new_string: new_string } = normalizeEditInputForRemote(input, context)),
    !env.CLAUDE_CODE_SIMPLE && context.remoteCall === void 0)
  )
    await discoverSkillsForPath(
      context.session.host,
      absolutePath,
      dynamicSkillDirTriggers,
      context.storageV5,
    );
  if (context.remoteCall === void 0) await Q2e.of(context.session).beforeFileEdited(absolutePath);
  let stagingDecision = await checkSettingsWrite(context, ke, {
      toolName: FILE_EDIT_TOOL_NAME,
      absolutePath: absolutePath,
      input: input,
    }),
    Ae = skillSaveMode(context, ke, await isInSyncedSkillsDir(context.session.host, ke));
  if (stagingDecision === void 0)
    await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, r.uuid);
  let {
    originalFileContents: originalFileContents,
    actualOldString: actualOldString,
    actualNewString: actualNewString,
    updatedFile: updatedFile,
    patch: patch,
    staleRecovered: staleRecovered,
    contentNotInModelContext: contentNotInModelContext,
    staged: staged,
  } = await runWithFileWriteContext(absolutePath, async () => {
    let fileHandle = await pinWriteTarget(absolutePath, ke, {
      createParents: old_string === "" && stagingDecision === void 0,
    }).catch((Zt) => {
      if (stagingDecision !== void 0 && old_string === "" && isENOENT(Zt)) return null;
      throw Zt;
    });
    try {
      let {
          content: content,
          fileExists: fileExists,
          encoding: encoding,
          lineEndings: lineEndings,
          notText: notText,
        } = await readFileForEdit(fileHandle),
        lastRead = readFileState.get(absolutePath),
        staleRecovered =
          fileExists &&
          fileHandle !== null &&
          (await isUnreadEditAllowed({
            ioPath: fileHandle.ioPath,
            fileContents: content,
            lastRead: lastRead,
            oldString: old_string,
            replaceAll: replace_all,
            preReadGuard: jkn(getCanonicalName(context.model()), context.remoteCall),
            readBaseline: context.remoteCall?.readBaseline,
            servedOn: context.remoteCall?.origin.hostName,
            readNotAutoAllowed: () =>
              !readAutoAllowedForMutation(FILE_EDIT_TOOL_NAME, absolutePath, context, context.permissions()),
          }));
      if (notText) throw new FileStateError(fileWriteRefusalMessage(notText));
      let matchedOldString = findActualString(content, old_string) || old_string,
        quotedNewString = preserveEscapeStyle(
          old_string,
          matchedOldString,
          preserveQuoteStyle(old_string, matchedOldString, new_string),
        ),
        fo = IL(context),
        To =
          lintMemoryFilePath(absolutePath, quotedNewString, fo) ??
          secretWarning(absolutePath, quotedNewString);
      if (To !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          To,
          "memory-directory write refused an edit after escape decoding",
        );
      let bo = lintBackgroundMemoryWrite(absolutePath, quotedNewString, fo),
        vn = bo !== quotedNewString,
        co = old_string === "" ? swr(content, bo) : bo,
        So = rSe(context.session.host, context.toolUseId),
        ko = vn || So;
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
          replaceAll: replace_all,
          isForToolResult: stagingDecision === void 0,
        }),
        ao = await mapToMirrorPath(absolutePath),
        $o =
          stagingDecision !== void 0 || fileHandle === null
            ? void 0
            : await memoryItemStampContext(context, ao, fileExists ? content : null, editPatch.updatedFile, {
                remote: context.remoteCall !== void 0,
              }),
        yo = prepareMemoryContent(ao, editPatch.updatedFile, $o?.context);
      logMemoryItemBlock(yo.sharedItemBlock, "team");
      let content_2 = yo.content,
        rr = content_2 !== editPatch.updatedFile,
        br = !rr
          ? editPatch.patch
          : getPatchFromContents({
              filePath: absolutePath,
              oldContent: content,
              newContent: content_2,
              convertTabs: !0,
              isForToolResult: stagingDecision === void 0,
            }),
        Hr =
          userModified ||
          rr ||
          ko ||
          (fileExists && (!Gie(lastRead) || staleRecovered || !matchesReadContent(lastRead, tv(content))));
      if (stagingDecision !== void 0 || fileHandle === null)
        return (
          await stageSettingsWrite({
            writeCtx: context,
            tool: "Edit",
            absolutePath: stagingDecision?.path ?? absolutePath,
            currentContent: fileExists ? content : null,
            proposedContent: content_2,
          }),
          {
            originalFileContents: content,
            actualOldString: matchedOldString,
            actualNewString: co,
            updatedFile: content_2,
            patch: br,
            staleRecovered: staleRecovered,
            contentNotInModelContext: Hr,
            staged: !0,
          }
        );
      let Fr;
      await fileHandle.recheckBeforeWrite();
      try {
        Fr = await writeTextContentVerified(fileHandle.ioPath, content_2, encoding, lineEndings);
      } catch (error) {
        throw (notePlanFileForgotten(absolutePath), error);
      }
      if (
        (await noteMemoryItemWritten(ao, content_2, yo.item, $o?.rev),
        readFileState.set(absolutePath, {
          content: tv(content_2),
          timestamp: Fr,
          offset: void 0,
          limit: void 0,
          ...(Hr && { contentNotInModelContext: !0 }),
          ...(fileExists && lastRead?.isPartialView === !0 && { isPartialView: !0 }),
        }),
        encoding === "utf8" && lineEndings !== "CRLF")
      )
        notePlanFileWritten(absolutePath, content_2);
      else notePlanFileForgotten(absolutePath);
      return {
        originalFileContents: content,
        actualOldString: matchedOldString,
        actualNewString: co,
        updatedFile: content_2,
        patch: br,
        staleRecovered: staleRecovered,
        contentNotInModelContext: Hr,
        staged: !1,
      };
    } catch (error) {
      if (fileHandle === null) throw error;
      rethrowWithPath(error, fileHandle, absolutePath);
    } finally {
      await fileHandle?.close();
    }
  });
  if (staged) {
    let qt = context.remoteCall !== void 0 || context.inputFromAnotherMachine === !0;
    return {
      data: {
        filePath: file_path,
        oldString: qt ? input.old_string : actualOldString,
        newString: qt ? input.new_string : new_string,
        originalFile: qt ? null : originalFileContents,
        structuredPatch: qt ? [] : patch,
        userModified: userModified ?? !1,
        replaceAll: replace_all,
        staged: !0,
        stagedWording: settingsWriteRoute({
          session: context.session,
          served: context.remoteCall !== void 0,
          cause: stagingDecision?.cause ?? "unapproved",
        }),
      },
      remedy: { kind: "staged_for_review", path: stagingDecision?.path ?? absolutePath },
    };
  }
  if (context.remoteCall === void 0) Vq(context.nestedMemoryAttachmentTriggers, absolutePath);
  let Et = context.remoteCall === void 0 ? getLspServerManager() : void 0;
  if (Et)
    (clearDeliveredDiagnosticsForFile(context.session, absolutePath),
      clearPendingDiagnosticsForFile(context.session, absolutePath),
      Et.changeFile(absolutePath, updatedFile).catch((qt) => {
        logForDebugging(`LSP: Failed to notify server of file change for ${absolutePath}: ${qt.message}`, {
          level: "error",
        });
      }),
      Et.saveFile(absolutePath).catch((qt) => {
        logForDebugging(`LSP: Failed to notify server of file save for ${absolutePath}: ${qt.message}`, {
          level: "error",
        });
      }));
  if ((wSt(absolutePath, originalFileContents, updatedFile), absolutePath.endsWith(`${sep_6}CLAUDE.md`)))
    logEvent("tengu_write_claudemd", {});
  ((context.callerLogsSharedEvents ? countLinesChanged : logFileChanged)(patch, r.message.model),
    logFileOperation({ operation: "edit", tool: "FileEditTool", filePath: absolutePath }),
    logEvent("tengu_edit_string_lengths", {
      oldStringBytes: Buffer.byteLength(old_string, "utf8"),
      newStringBytes: Buffer.byteLength(new_string, "utf8"),
      replaceAll: replace_all,
    }));
  let gitDiff;
  if (shouldSendToolDiff(context)) {
    let now = Date.now(),
      Zt = await fetchSingleFileGitDiff(absolutePath);
    if (Zt && isPatchWithinSizeLimit(Zt)) gitDiff = Zt;
    logEvent("tengu_tool_use_diff_computed", { isEditTool: !0, durationMs: Date.now() - now, hasDiff: !!Zt });
  }
  let At = {
      filePath: file_path,
      oldString: actualOldString,
      newString: new_string,
      originalFile: originalFileContents,
      structuredPatch: patch,
      userModified: userModified ?? !1,
      replaceAll: replace_all,
      ...(staleRecovered && { staleRecovered: !0 }),
      ...(contentNotInModelContext && { contentNotInModelContext: !0 }),
      ...(Ae && { syncedSkillNext: Ae }),
      ...(gitDiff && { gitDiff: gitDiff }),
    },
    It = {
      absoluteFilePath: absolutePath,
      output: At,
      originalFile: originalFileContents,
      updatedFile: updatedFile,
      appliedNewString: actualNewString,
    },
    Yt =
      context.remoteCall !== void 0
        ? void 0
        : context.smallResultAsked === !0
          ? recordEditFingerprint(It)
          : context.agentId !== void 0
            ? m2n(It)
            : void 0;
  return { data: At, ...Yt };
}
/**
 * 读取待编辑文件：句柄为 null 或文件不存在时返回空内容（utf8/LF、fileExists:false），否则返回 readExisting 的内容/编码/行尾。
 */
//@ chunk-e6aww6q8.js:4661702-4661872 fingerprint = readFileForEdit (0.838)
async function readFileForEdit(absoluteFilePath) {
  let n = absoluteFilePath === null ? null : await absoluteFilePath.readExisting();
  if (n === null) return { content: "", fileExists: !1, encoding: "utf8", lineEndings: "LF" };
  return { ...n, fileExists: !0 };
}
//@ chunk-e6aww6q8.js:4661872-4662049 sole-consumer
function classifyEditMatch(e, n, r) {
  if (n === "") return "no_match";
  let s = findActualString(e, n);
  if (!s) return "no_match";
  if (!r) {
    let index = e.indexOf(s);
    if (e.indexOf(s, index + s.length) !== -1) return "ambiguous";
  }
  return "applies";
}
/**
 * 未读文件时编辑是否可放行。
 */
//@ chunk-e6aww6q8.js:4662049-4662480 sole-consumer
async function isUnreadEditAllowed({
  ioPath: ioPath,
  fileContents: fileContents,
  lastRead: lastRead,
  oldString: oldString,
  replaceAll: replaceAll,
  preReadGuard: preReadGuard,
  readBaseline: readBaseline,
  servedOn: servedOn,
  readNotAutoAllowed: readNotAutoAllowed,
}) {
  if (!lastRead) {
    if (!preReadGuard && !readNotAutoAllowed()) {
      if (readBaseline === void 0 || aFe(readBaseline, tv(fileContents))) return !1;
      if (classifyEditMatch(fileContents, oldString, replaceAll) === "applies") return !0;
      throw new FileStateError(fileModifiedErrorFor(servedOn));
    }
    throw new FileStateError(FILE_NOT_READ_ERROR);
  }
  let G = _2n(lastRead);
  if (!G && (await getFileModificationTimeAsync(ioPath)) <= lastRead.timestamp) return !1;
  let q = isFullFileView(lastRead);
  if (!G && q && y1(lastRead, tv(fileContents))) return !1;
  if (classifyEditMatch(fileContents, oldString, replaceAll) === "applies" && !readNotAutoAllowed())
    return !0;
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
