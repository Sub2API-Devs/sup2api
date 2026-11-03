/**
 * tools/FileWriteTool/FileWriteTool.ts
 *
 * Write 工具：整文件创建/覆盖（先读、只读过开头时拒绝、子代理禁写报告 md、暂存审阅）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileWriteTool/FileWriteTool.ts
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 2, fingerprint 2, layout 3
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
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
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  cXt,
  SKILL_SAVE_SURFACES,
  SKILL_SAVE_OUTCOMES,
  sK,
  createToolContextView,
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
  Vq,
} from "../../utils/filePathValidation.js";
import { zodStrictObject, o, u, U, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  $r,
  $Fe,
  Cf,
  yO,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { hunkSchema, gitDiffSchema } from "../../../vendor/diff/lib/index.mjs";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isNotebookPath, expandPathOrNull, expandStablePath } from "../../utils/path.js";
import {
  aFe,
  tv,
  fileModifiedErrorFor,
  isFullFileView,
  y1,
  REMOTE_FILE_MODIFIED_ERROR,
  Bir,
  __,
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
import { userFacingName, getToolUseSummary_3 } from "./UI.js";
import { logFileChanged, getPatchFromContents, countLinesChanged } from "../../utils/diff.js";
import { normalizeWriteInputAliases } from "./inputAliases.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
import {
  eSe,
  IL,
  lintMemoryFilePath,
  lintBackgroundMemoryWrite,
  rSe,
  wSt,
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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import { getToolUseSummary_2 } from "../FileEditTool/UI.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { logEvent } from "../../services/analytics/index.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { hl } from "../../utils/networkPaths.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "../FileEditTool/perforce.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { toTelemetryModelSlug } from "../../utils/model/telemetryModelName.js";
import { jkn } from "../../utils/model/promptBundles.js";
import { compareWithDisk } from "../FileEditTool/fileStaleness.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { detectTextEncoding, swr } from "../../utils/fileRead.js";
import {
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  rnt,
  Dq,
  settingsWriteRoute,
} from "../../utils/settings/settingsReview.js";
import { FILE_STATE_CURRENT_SUFFIX } from "../FileReadTool/prompt.js";
import { hSe, skillSaveMode } from "../../utils/skillFileWrites.js";
import { consumeWritePermission } from "../../utils/fsSafety/atomicWriteStaging.js";
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
import { shouldSendToolDiff, fetchSingleFileGitDiff, isPatchWithinSizeLimit } from "../../utils/gitDiff.js";
import { logFileOperation } from "../../utils/fileOperationAnalytics.js";

/**
 * Write 输出 schema 片段：staged 时的提示措辞（内部字段）与 syncedSkillNext。
 */
//@ chunk-e6aww6q8.js:1367698-1367917 placement
var stagedWordingSchema = DoctorLazy(() =>
    cXt(SKILL_SAVE_SURFACES)
      .optional()
      .catch(void 0)
      .describe(
        "@internal Which message a staged result gave (see stagedResultWording); absent unless staged",
      ),
  ),
  aSe = DoctorLazy(() => ({
    syncedSkillNext: cXt(SKILL_SAVE_OUTCOMES)
      .optional()
      .catch(void 0),
  }));
/**
 * Write 的 zod schema：输入 file_path/content；输出 type(create|update)/filePath/content/structuredPatch/originalFile/gitDiff/userModified/staged；跨进程版附 memdirStamped。
 */
//@ chunk-e6aww6q8.js:1412568-1413761 fingerprint = outputSchema (0.542)
var fileWriteInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: o().describe("The absolute path to the file to write (must be absolute, not relative)"),
      content: o().describe("The content to write to the file"),
      ...attachedMachineInputField(),
    }),
  ),
  fileWriteOutputSchema = DoctorLazy(() =>
    u({
      type: U(["create", "update"]).describe(
        "Whether a new file was created or an existing file was updated",
      ),
      filePath: o().describe("The path to the file that was written"),
      content: o().describe("The content that was written to the file"),
      structuredPatch: A(hunkSchema()).describe(
        "Diff patch showing the changes (empty when nothing changed, the diff timed out, or \u2014 with originalFile null on an update \u2014 the previous content was too large to diff)",
      ),
      originalFile: o()
        .nullable()
        .describe(
          "The original file content before the write (null for new files, or when the previous content was too large to include)",
        ),
      gitDiff: gitDiffSchema().optional(),
      userModified: M()
        .optional()
        .describe("True when the user edited the proposed content in the permission dialog before accepting"),
      staged: M()
        .optional()
        .describe(
          "True when the write was held for the machine owner to review instead of written; the file is unchanged",
        ),
      stagedWording: stagedWordingSchema(),
    }),
  ),
  fileWriteOutputSchemaAcrossProcesses = DoctorLazy(() =>
    fileWriteOutputSchema().extend({
      memdirStamped: M()
        .optional()
        .catch(void 0),
      ...aSe(),
    }),
  );
/**
 * GrowthBook tengu_noble_mountain（默认 true）：是否允许 Write 的 coerceInput 修正输入。
 */
//@ chunk-e6aww6q8.js:1413761-1413812 layout
function isWriteInputCoercionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_noble_mountain", !0);
}
/**
 * 去掉结尾点和空格后是否为 .ipynb。
 */
//@ chunk-e6aww6q8.js:1413812-1413862 layout
function isNotebookPathIgnoringTrailingDots(e) {
  return isNotebookPath(e.replace(/[. ]+$/, ""));
}
/**
 * 写入前（锁内）再次校验读状态：未读或只读了部分时报未读错误（除非无预读守卫且自动允许，此时比对 readBaseline）；mtime 新于读取时间且内容不同时报文件已变。
 */
//@ chunk-e6aww6q8.js:1413862-1414204 layout
async function assertWriteReadStateFresh({
  fullFilePath: fullFilePath,
  ioPath: ioPath,
  diskContent: diskContent,
  lastRead: lastRead,
  preReadGuard: preReadGuard,
  readBaseline: readBaseline,
  servedOn: servedOn,
  readNotAutoAllowed: readNotAutoAllowed,
}) {
  if (!lastRead || lastRead.isPartialView) {
    if (
      !lastRead &&
      !isNotebookPathIgnoringTrailingDots(fullFilePath) &&
      !preReadGuard &&
      !readNotAutoAllowed()
    ) {
      if (readBaseline !== void 0 && !aFe(readBaseline, tv(diskContent)))
        throw new FileStateError(fileModifiedErrorFor(servedOn));
      return;
    }
    throw new FileStateError(FILE_NOT_READ_ERROR);
  }
  if (!((await getFileModificationTimeAsync(ioPath)) > lastRead.timestamp)) return;
  if (isFullFileView(lastRead) && y1(lastRead, tv(diskContent))) return;
  throw new FileStateError(FILE_UNEXPECTEDLY_MODIFIED_ERROR);
}
/**
 * Write 工具定义（name "Write"）。validateInput：空字节、不稳定路径、用户电脑路径、工作树隔离、子代理禁止写 REPORT/SUMMARY/FINDINGS/ANALYSIS*.md、记忆目录 lint、deny/Read deny、目录/非普通文件、Perforce 只读、只读过开头、必须先读且未被修改。
 */
//@ chunk-e6aww6q8.js:1414204-1419759 fingerprint = FileWriteTool (0.425)
var FileWriteTool = buildTool({
  name: FILE_WRITE_TOOL_NAME,
  ruleContentField: "file_path",
  searchHint: "create or overwrite files",
  remoteExecution: { supported: !0, decidingInputFields: ["file_path", "content"] },
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  strict: !0,
  async description() {
    return "Write a file to the local filesystem.";
  },
  userFacingName: userFacingName,
  getToolUseSummary: getToolUseSummary_3,
  getActivityDescription(e) {
    let n = getToolUseSummary_3(e);
    return n ? `Writing ${n}` : "Writing file";
  },
  async prompt({ model: e, leanPrompt: n }) {
    return getWriteToolDescription(e, n);
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
  fromAnotherProcess(e, n, r, s) {
    if (s !== void 0 && !e.staged)
      if (e.type === "create") logFileChanged([], s, String(n.content ?? ""));
      else logFileChanged(e.structuredPatch, s);
    return { data: { ...e, filePath: String(n.file_path ?? ""), userModified: r?.userModified === !0 } };
  },
  coerceInput(e) {
    let n = normalizeWriteInputAliases(e);
    return n !== null && isWriteInputCoercionEnabled() ? sK(fileWriteInputSchema(), n) : null;
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
    return { ...output, content: "", originalFile: null };
  },
  toAutoClassifierInput(input) {
    let n = zCe(input);
    return n === void 0
      ? `${input.file_path}: ${input.content}`
      : { file_path: input.file_path, content: input.content, [$r]: n, ...$Fe(input) };
  },
  suppressesAllPermissionUpdates(e) {
    return Cf(e);
  },
  getPath(e) {
    return e.file_path;
  },
  inputsEquivalent(e, n) {
    if (e.file_path !== n.file_path) return !1;
    if (e.content === n.content) return !0;
    let r = expandPathOrNull(e.file_path),
      s = (h) => (r === null ? h : eSe(r, h)).replace(/\n+$/, "");
    return s(e.content) === s(n.content);
  },
  backfillObservableInput(e) {
    if (typeof e.file_path === "string" && !isRemoteOnlyCheck(FILE_WRITE_TOOL_NAME))
      e.file_path = expandStablePath(e.file_path);
  },
  async preparePermissionMatcher({ file_path: e }) {
    return (n) => matchesPathRule(n, e);
  },
  extractSearchText() {
    return "";
  },
  create(toolContext) {
    return {
      permissionCheckFailureDecision(n) {
        return buildUnfinishedCheckDecision(
          FILE_WRITE_TOOL_NAME,
          isPlainObject_4(n) ? n.file_path : void 0,
          toolContext.permissions(),
        );
      },
      async checkPermissions(n, r) {
        let s = expandStablePath(n.file_path),
          h = walkPermissionCheckPaths(s);
        toolContext.session.writePermissionStash.stash(r.toolUseId, s, h.spellings);
        let y = checkWritePermissionForTool(FileWriteTool, n, toolContext.permissions(), h),
          permissionResult = y.behavior === "deny" ? y : (leafSymlinkWriteRefusal(s, h) ?? y);
        if (
          permissionResult.behavior === "deny" ||
          (permissionResult.updatedInput !== void 0 && permissionResult.updatedInput !== n)
        )
          return permissionResult;
        let w = getToolUseSummary_2(n, "content", IL(toolContext), {
          host: toolContext.session.host,
          toolUseId: r.toolUseId,
        });
        return w === n ? permissionResult : { ...permissionResult, updatedInput: w };
      },
      async validateInput(n, r) {
        let callContext = createToolContextView(toolContext, r),
          { file_path: file_path, content: content } = n;
        if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 14 };
        let S = rejectNullBytes(FILE_WRITE_TOOL_NAME, [["file_path", file_path]]);
        if (S) return S;
        let w = rejectTrailingWhitespace(FILE_WRITE_TOOL_NAME, [["file_path", file_path]]);
        if (w) return w;
        let L = checkForeignFilePath(FILE_WRITE_TOOL_NAME, [["file_path", file_path]]);
        if (L) return L;
        let absolutePath = expandStablePath(file_path),
          q = checkWorktreeIsolation_2(absolutePath, callContext);
        if (q) return { result: !1, message: q, errorCode: 7 };
        if (
          callContext.agentId &&
          /^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i.test(basename_27(absolutePath))
        )
          return (
            logEvent("tengu_subagent_md_report_blocked", { contentBytes: Buffer.byteLength(content) }),
            {
              result: !1,
              message:
                "Subagents should return findings as text, not write report files. Include this content in your final response instead.",
              errorCode: 5,
            }
          );
        let Z = secretWarning(absolutePath, content);
        if (Z) return { result: !1, message: Z, errorCode: 0 };
        let Se = lintMemoryFilePath(absolutePath, content, IL(callContext));
        if (Se) return { result: !1, message: Se, errorCode: 0 };
        let ke = matchingRuleForInput(absolutePath, callContext.permissions(), "edit", "deny");
        if (ke !== null)
          return {
            result: !1,
            message: DENIED_DIRECTORY_ERROR,
            errorCode: 1,
            deniedByPermissionRule: !0,
            denyRule: ke,
          };
        let we = readDenyRuleForPath(absolutePath, callContext.permissions());
        if (we !== void 0)
          return {
            result: !1,
            message: READ_DENY_RULE_WRITE_ERROR,
            errorCode: 13,
            deniedByPermissionRule: !0,
            denyRule: we,
          };
        if (hl(absolutePath)) return { result: !0 };
        let Ee = getFsImplementation(),
          Ae;
        try {
          let stats = await Ee.stat(absolutePath);
          if (((Ae = stats.mtimeMs), stats.isDirectory()))
            return {
              result: !1,
              message: `${encodeControlChars(file_path)} is a directory, not a file. To create a file inside it, include the file name in file_path.`,
              errorCode: 17,
            };
          if (!stats.isFile())
            return {
              result: !1,
              message: `${encodeControlChars(file_path)} exists but is not a regular file (a device, FIFO or socket). Write only creates or overwrites regular files.`,
              errorCode: 18,
            };
          if (isPerforceReadOnlyFile(stats.mode))
            return { result: !1, message: PERFORCE_READ_ONLY_MESSAGE, errorCode: 6 };
        } catch (error) {
          if (isENOENT(error)) return { result: !0 };
          throw error;
        }
        if (callContext.readFileState.holdsOnlyStartOf(absolutePath))
          return { result: !1, message: PARTIAL_READ_WRITE_ERROR, errorCode: 19 };
        let readState = callContext.readFileState.get(absolutePath);
        if (!readState || readState.isPartialView) {
          let We = getCanonicalName(callContext.model()),
            ze = toTelemetryModelSlug(We),
            lt =
              !readState &&
              !isNotebookPathIgnoringTrailingDots(absolutePath) &&
              !jkn(We, callContext.remoteCall) &&
              readAutoAllowedForMutation(
                FILE_WRITE_TOOL_NAME,
                absolutePath,
                callContext,
                callContext.permissions(),
              ),
            Je = lt ? callContext.remoteCall?.readBaseline : void 0,
            nt =
              Je === void 0
                ? "absent"
                : await compareWithDisk(absolutePath, Je, () =>
                    readAutoAllowedForMutation(
                      FILE_WRITE_TOOL_NAME,
                      absolutePath,
                      callContext,
                      callContext.permissions(),
                    ),
                  );
          if (
            (logEvent("tengu_write_tool_not_read_hypothetical", {
              wouldHaveResult:
                readState && Math.floor(Ae) > readState.timestamp ? lit_2("errorCode3") : lit_2("success"),
              isPartialView: readState?.isPartialView === !0,
              isFilePathAbsolute: isAbsolute_27(file_path),
              guardSkipped: lt,
              modelBucket: ze,
              servedCall: callContext.remoteCall !== void 0,
              ...(callContext.remoteCall?.model !== void 0 && {
                callerModelBucket: toTelemetryModelSlug(callContext.remoteCall.model),
              }),
              readBaseline: fromEnum(nt),
            }),
            !lt)
          )
            return { result: !1, message: FILE_NOT_READ_ERROR, errorCode: 2 };
          if (nt === "mismatch")
            return {
              result: !1,
              message: REMOTE_FILE_MODIFIED_ERROR(callContext.remoteCall?.origin.hostName),
              errorCode: 3,
            };
          return { result: !0 };
        }
        if (Math.floor(Ae) > readState.timestamp) {
          let We = isFullFileView(readState),
            ze = !1;
          if (We) {
            let fileBytes = await Ee.readFileBytes(absolutePath);
            ze = Bir(readState, fileBytes.toString(detectTextEncoding(fileBytes).encoding));
          }
          if (!ze) return { result: !1, message: REMOTE_FILE_MODIFIED_ERROR(), errorCode: 3 };
        }
        return { result: !0 };
      },
      async call(n, r) {
        let { parentMessage: parentMessage } = r;
        if (parentMessage === void 0) throw Error("Write: a call needs the message that issued it");
        return callFileWrite(n, createToolContextView(toolContext, r), parentMessage);
      },
    };
  },
  mapToolResultToToolResultBlockParam(
    {
      filePath: e,
      type: n,
      userModified: r,
      memdirStamped: s,
      staged: h,
      stagedWording: y,
      syncedSkillNext: S,
    },
    w,
  ) {
    if (h)
      return { tool_use_id: w, type: "tool_result", content: settingsNotAppliedMessage(e, y ?? "review") };
    let L = r ? " The user modified your proposed content before accepting it." : "",
      G = r || s ? "" : FILE_STATE_CURRENT_SUFFIX,
      q = hSe(S);
    switch (n) {
      case "create":
        return {
          tool_use_id: w,
          type: "tool_result",
          content: `File created successfully at: ${e}${L}${G}${q}`,
        };
      case "update":
        return {
          tool_use_id: w,
          type: "tool_result",
          content: `The file ${e} has been updated successfully.${L}${G}${q}`,
        };
    }
  },
});
/**
 * Write 工具的执行：权限与写入阻止检查、读状态新鲜度校验、记忆文件处理、写入或暂存审阅，之后通知 LSP、计算 diff 并返回 create/update 结果。
 */
//@ chunk-e6aww6q8.js:1419759-1423789 placement
async function callFileWrite({ file_path: file_path, content: content }, r, s) {
  let {
      readFileState: readFileState,
      userModified: userModified,
      getFileHistoryState: getFileHistoryState,
      applyFileHistoryOp: applyFileHistoryOp,
      dynamicSkillDirTriggers: dynamicSkillDirTriggers,
    } = r,
    absolutePath = expandStablePath(file_path),
    writePermission = consumeWritePermission(r, absolutePath);
  if (hasReadDenyRuleForPath(absolutePath, r.permissions()))
    throw new FileStateError(READ_DENY_RULE_WRITE_ERROR);
  let blockRefusal = writeBlockRefusal(absolutePath, r.permissions(), writePermission);
  if (blockRefusal !== void 0) throw new FileStateError(blockRefusal);
  if (r.remoteCall === void 0)
    await discoverSkillsForPath(r.session.host, absolutePath, dynamicSkillDirTriggers, r.storageV5);
  if (r.remoteCall === void 0) await Q2e.of(r.session).beforeFileEdited(absolutePath);
  let stagingTarget = await checkSettingsWrite(r, writePermission, {
      toolName: FILE_WRITE_TOOL_NAME,
      absolutePath: absolutePath,
      input: { file_path: file_path, content: content },
    }),
    syncedSkillNext = skillSaveMode(
      r,
      writePermission,
      await isInSyncedSkillsDir(r.session.host, writePermission),
    );
  if (stagingTarget === void 0)
    await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, s.uuid);
  let writeOutcome = await runWithFileWriteContext(absolutePath, async () => {
      let nt = await pinWriteTarget(absolutePath, writePermission, {
        createParents: stagingTarget === void 0,
      }).catch((pt) => {
        if (stagingTarget !== void 0 && isENOENT(pt)) return null;
        throw pt;
      });
      try {
        let pt = nt === null ? null : await nt.readExisting();
        if (nt !== null && pt !== null) {
          if (readFileState.holdsOnlyStartOf(absolutePath))
            throw new FileStateError(PARTIAL_READ_WRITE_ERROR);
          await assertWriteReadStateFresh({
            fullFilePath: absolutePath,
            ioPath: nt.ioPath,
            diskContent: pt.content,
            lastRead: readFileState.get(absolutePath),
            preReadGuard: jkn(getCanonicalName(r.model()), r.remoteCall),
            readBaseline: r.remoteCall?.readBaseline,
            servedOn: r.remoteCall?.origin.hostName,
            readNotAutoAllowed: () =>
              !readAutoAllowedForMutation(FILE_WRITE_TOOL_NAME, absolutePath, r, r.permissions()),
          });
        }
        if (pt?.notText) throw new FileStateError(fileWriteRefusalMessage(pt.notText));
        let Et = pt?.encoding ?? "utf8",
          yt = pt?.content ?? null,
          gt = content,
          At = IL(r),
          It = lintMemoryFilePath(absolutePath, content, At) ?? secretWarning(absolutePath, content);
        if (It !== null)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            It,
            "memory-directory write refused at call time",
          );
        content = lintBackgroundMemoryWrite(absolutePath, content, At);
        let Yt = rSe(r.session.host, r.toolUseId),
          qt = await mapToMirrorPath(absolutePath),
          Zt =
            stagingTarget !== void 0 || nt === null
              ? void 0
              : await memoryItemStampContext(r, qt, yt, content, { remote: r.remoteCall !== void 0 }),
          rn = prepareMemoryContent(qt, content, Zt?.context);
        (logMemoryItemBlock(rn.sharedItemBlock, "team"), (content = rn.content));
        let pn = content !== gt || Yt;
        if (stagingTarget !== void 0 || nt === null)
          return (
            await stageSettingsWrite({
              writeCtx: r,
              tool: "Write",
              absolutePath: stagingTarget?.path ?? absolutePath,
              currentContent: yt,
              proposedContent: content,
            }),
            { oldContent: yt, memdirStamped: pn, staged: !0 }
          );
        let no;
        ((content = swr(yt, content)), await nt.recheckBeforeWrite());
        try {
          no = await writeTextContentVerified(nt.ioPath, content, Et, "LF");
        } catch (error) {
          throw (notePlanFileForgotten(absolutePath), error);
        }
        if (
          (await noteMemoryItemWritten(qt, content, rn.item, Zt?.rev),
          readFileState.set(absolutePath, {
            content: __(content),
            timestamp: no,
            offset: void 0,
            limit: void 0,
            ...((userModified || pn) && { contentNotInModelContext: !0 }),
          }),
          Et === "utf8")
        )
          notePlanFileWritten(absolutePath, content);
        else notePlanFileForgotten(absolutePath);
        return { oldContent: yt, memdirStamped: pn, staged: !1 };
      } catch (error) {
        if (nt === null) throw error;
        rethrowWithPath(error, nt, absolutePath);
      } finally {
        await nt?.close();
      }
    }),
    { oldContent: oldContent, memdirStamped: memdirStamped, staged: staged } = writeOutcome,
    isOldContentLarge = oldContent !== null && oldContent.length > rnt;
  if (staged) {
    let nt = r.remoteCall !== void 0 || r.inputFromAnotherMachine === !0,
      pt =
        nt || oldContent === null || isOldContentLarge
          ? []
          : getPatchFromContents({
              filePath: file_path,
              oldContent: oldContent,
              newContent: swr(oldContent, Dq(content)),
              convertTabs: !0,
            });
    return {
      data: {
        type: oldContent === null ? "create" : "update",
        filePath: file_path,
        content: content,
        structuredPatch: pt,
        originalFile: nt || isOldContentLarge ? null : oldContent,
        userModified: userModified ?? !1,
        staged: !0,
        stagedWording: settingsWriteRoute({
          session: r.session,
          served: r.remoteCall !== void 0,
          cause: stagingTarget?.cause ?? "unapproved",
        }),
      },
      remedy: { kind: "staged_for_review", path: stagingTarget?.path ?? absolutePath },
    };
  }
  if (r.remoteCall === void 0) Vq(r.nestedMemoryAttachmentTriggers, absolutePath);
  let lspManager = r.remoteCall === void 0 ? getLspServerManager() : void 0;
  if (lspManager)
    (clearDeliveredDiagnosticsForFile(r.session, absolutePath),
      clearPendingDiagnosticsForFile(r.session, absolutePath),
      lspManager.changeFile(absolutePath, content).catch((nt) => {
        logForDebugging(`LSP: Failed to notify server of file change for ${absolutePath}: ${nt.message}`, {
          level: "error",
        });
      }),
      lspManager.saveFile(absolutePath).catch((nt) => {
        logForDebugging(`LSP: Failed to notify server of file save for ${absolutePath}: ${nt.message}`, {
          level: "error",
        });
      }));
  if (
    (wSt(absolutePath, isOldContentLarge ? null : oldContent, content),
    absolutePath.endsWith(`${sep_34}CLAUDE.md`))
  )
    logEvent("tengu_write_claudemd", {});
  let gitDiff;
  if (shouldSendToolDiff(r) && !isOldContentLarge) {
    let now = Date.now(),
      pt = await fetchSingleFileGitDiff(absolutePath);
    if (pt && isPatchWithinSizeLimit(pt)) gitDiff = pt;
    logEvent("tengu_tool_use_diff_computed", {
      isWriteTool: !0,
      durationMs: Date.now() - now,
      hasDiff: !!pt,
    });
  }
  let logChangedLines = r.callerLogsSharedEvents ? countLinesChanged : logFileChanged;
  if (oldContent) {
    let nt = isOldContentLarge
        ? []
        : getPatchFromContents({
            filePath: file_path,
            oldContent: oldContent,
            newContent: content,
            convertTabs: !0,
            isForToolResult: stagingTarget === void 0,
          }),
      pt = {
        type: "update",
        filePath: file_path,
        content: content,
        structuredPatch: nt,
        originalFile: isOldContentLarge ? null : oldContent,
        userModified: userModified ?? !1,
        ...(memdirStamped && { memdirStamped: !0 }),
        ...(syncedSkillNext && { syncedSkillNext: syncedSkillNext }),
        ...(gitDiff && { gitDiff: gitDiff }),
      };
    return (
      logChangedLines(
        nt,
        s.message.model,
        isOldContentLarge ? content : void 0,
        isOldContentLarge ? oldContent : void 0,
      ),
      logFileOperation({ operation: "write", tool: "FileWriteTool", filePath: absolutePath, type: "update" }),
      { data: pt }
    );
  }
  let createdResult = {
    type: "create",
    filePath: file_path,
    content: content,
    structuredPatch: [],
    originalFile: null,
    userModified: userModified ?? !1,
    ...(memdirStamped && { memdirStamped: !0 }),
    ...(syncedSkillNext && { syncedSkillNext: syncedSkillNext }),
    ...(gitDiff && { gitDiff: gitDiff }),
  };
  return (
    logChangedLines([], s.message.model, content),
    logFileOperation({ operation: "write", tool: "FileWriteTool", filePath: absolutePath, type: "create" }),
    { data: createdResult }
  );
}

export { aSe, FileWriteTool, stagedWordingSchema };
