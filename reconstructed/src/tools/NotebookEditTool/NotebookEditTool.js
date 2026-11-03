/**
 * tools/NotebookEditTool/NotebookEditTool.ts
 *
 * NotebookEdit 工具：替换/插入/删除 .ipynb 单元（延迟加载，先读与修改检测）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/NotebookEditTool/NotebookEditTool.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: fingerprint 2
 */
import { extname, extname as extname_2, extname as extname_3, extname as extname_4 } from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, U, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "./constants.js";
import { NOTEBOOK_EDIT_DESCRIPTION, NOTEBOOK_EDIT_PROMPT } from "./prompt.js";
import { isRemoteOnlyCheck, escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { expandStablePath } from "../../utils/path.js";
import { getToolUseSummary } from "./UI.js";
import { Yfn } from "../../utils/envFlagValues.js";
import {
  matchesPathRule,
  checkWritePermissionForTool,
  leafSymlinkWriteRefusal,
  writeBlockRefusal,
} from "../../utils/permissions/filesystem.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { buildUnfinishedCheckDecision } from "../../utils/permissions/unfinishedWriteCheck.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import {
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
} from "../../utils/filePathValidation.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { hl } from "../../utils/networkPaths.js";
import {
  isPerforceMode,
  isPerforceReadOnlyFile,
  PERFORCE_READ_ONLY_MESSAGE,
} from "../FileEditTool/perforce.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import {
  getFileModificationTimeAsync,
  runWithFileWriteContext,
  detectLineEndingsForString,
  writeTextContentVerified,
} from "../../utils/file.js";
import { readFileChecked, Cj } from "../../utils/fileRead.js";
import {
  SW,
  notebookTooLargeMessage,
  isValidNotebook,
  INVALID_NOTEBOOK_MESSAGE,
  parseCellId,
  notebookToReadCells,
} from "../../utils/notebook.js";
import { fileWriteRefusalMessage } from "../FileEditTool/fileStateErrors.js";
import { safeParseJSON } from "../../utils/json.js";
import { consumeWritePermission, SymlinkWriteRefusedError } from "../../utils/fsSafety/atomicWriteStaging.js";
import { fileHistoryTrackEdit } from "../../utils/fileHistory.js";
import { pinWriteTarget, rethrowWithPath } from "../../utils/fsSafety/pathRevalidation.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { Gie, matchesReadContent, tv } from "../../utils/remoteFileState.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatFileSize } from "../../utils/format.js";
import { replaceLineBreaks } from "../../utils/permissions/approvalPayloadSerialization.js";

//@ chunk-e6aww6q8.js:4663432-4664942 fingerprint = outputSchema (0.748)
var notebookEditInputSchema = DoctorLazy(() =>
    zodStrictObject({
      notebook_path: o().describe(
        "The absolute path to the Jupyter notebook file to edit (must be absolute, not relative)",
      ),
      cell_id: o()
        .optional()
        .describe(
          "The ID of the cell to edit. When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified.",
        ),
      new_source: o().describe("The new source for the cell"),
      cell_type: U(["code", "markdown"])
        .optional()
        .describe(
          "The type of the cell (code or markdown). If not specified, it defaults to the current cell type. If using edit_mode=insert, this is required.",
        ),
      edit_mode: U(["replace", "insert", "delete"])
        .optional()
        .describe("The type of edit to make (replace, insert, delete). Defaults to replace."),
    }),
  ),
  notebookEditOutputSchema = DoctorLazy(() =>
    u({
      new_source: o().describe("The new source code that was written to the cell"),
      old_source: o()
        .optional()
        .describe(
          "The previous cell source (replace/delete only). Enables cell-relative diff rendering without re-reading the notebook.",
        ),
      cell_id: o().optional().describe("The ID of the cell that was edited"),
      cell_type: U(["code", "markdown"]).describe("The type of the cell"),
      language: o().describe("The programming language of the notebook"),
      edit_mode: o().describe("The edit mode that was used"),
      error: o().optional().describe("Error message if the operation failed"),
      notebook_path: o().describe("The path to the notebook file"),
      original_file: o().describe("The original notebook content before modification"),
      updated_file: o().describe("The updated notebook content after modification"),
    }),
  );
/**
 * NotebookEdit 工具定义（name "NotebookEdit"，shouldDefer）。替换/插入/删除单元；必须先 Read 且未被修改；按 cell_id 或数字下标定位；nbformat 4.5 及以上时新单元生成 8 位 id；code 单元替换后清空输出；写前检查大小上限。
 */
//@ chunk-e6aww6q8.js:4665018-4672012 fingerprint = NotebookEditTool (0.807)
var NotebookEditTool = buildTool({
  name: NOTEBOOK_EDIT_TOOL_NAME,
  ruleContentField: "notebook_path",
  searchHint: "edit Jupyter notebook cells (.ipynb)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: !0,
  async description() {
    return NOTEBOOK_EDIT_DESCRIPTION;
  },
  async prompt() {
    return NOTEBOOK_EDIT_PROMPT;
  },
  backfillObservableInput(e) {
    if (typeof e.notebook_path === "string" && !isRemoteOnlyCheck(NOTEBOOK_EDIT_TOOL_NAME))
      e.notebook_path = expandStablePath(e.notebook_path);
  },
  userFacingName() {
    return "Edit Notebook";
  },
  getToolUseSummary: getToolUseSummary,
  getActivityDescription(e) {
    let n = getToolUseSummary(e);
    return n ? `Editing notebook ${n}` : "Editing notebook";
  },
  get inputSchema() {
    return notebookEditInputSchema();
  },
  get outputSchema() {
    return notebookEditOutputSchema();
  },
  toAutoClassifierInput(input) {
    let n = input.edit_mode ?? "replace";
    if (!Yfn()) return `${input.notebook_path} ${n}: ${input.new_source}`;
    return {
      notebook_path: input.notebook_path,
      mode: n,
      ...(input.cell_id !== void 0 && { cell_id: input.cell_id }),
      ...(n !== "delete" && input.cell_type !== void 0 && { cell_type: input.cell_type }),
      ...(n === "delete" ? { ignored_source: input.new_source } : { adds: input.new_source }),
    };
  },
  getPath(e) {
    return e.notebook_path;
  },
  async preparePermissionMatcher({ notebook_path: e }) {
    return (n) => matchesPathRule(n, e);
  },
  fromAnotherProcess(e, n) {
    return {
      data: {
        ...e,
        notebook_path: String(n.notebook_path ?? ""),
        new_source: String(n.new_source ?? ""),
        edit_mode: String(n.edit_mode ?? "replace"),
        ...(e.cell_id !== void 0 && { cell_id: escapeXmlInline(clipText(e.cell_id, 200)) }),
        ...(e.error !== void 0 && { error: escapeXmlInline(clipText(e.error, 2000)) }),
        ...(e.old_source !== void 0 && { old_source: clipText(e.old_source, 1e5) }),
        original_file: "",
        updated_file: "",
      },
    };
  },
  mapToolResultToToolResultBlockParam({ cell_id: e, edit_mode: n, new_source: r, error: s }, h) {
    if (s) return { tool_use_id: h, type: "tool_result", content: s, is_error: !0 };
    switch (n) {
      case "replace":
        return { tool_use_id: h, type: "tool_result", content: `Updated cell ${e} with ${r}` };
      case "insert":
        return { tool_use_id: h, type: "tool_result", content: `Inserted cell ${e} with ${r}` };
      case "delete":
        return { tool_use_id: h, type: "tool_result", content: `Deleted cell ${e}` };
      default:
        return { tool_use_id: h, type: "tool_result", content: "Unknown edit mode" };
    }
  },
  create(toolContext) {
    return {
      permissionCheckFailureDecision(n) {
        return buildUnfinishedCheckDecision(
          NOTEBOOK_EDIT_TOOL_NAME,
          isPlainObject_4(n) ? n.notebook_path : void 0,
          toolContext.permissions(),
        );
      },
      async checkPermissions(n, r) {
        let s = expandStablePath(n.notebook_path),
          h = walkPermissionCheckPaths(s);
        toolContext.session.writePermissionStash.stash(r.toolUseId, s, h.spellings);
        let y = checkWritePermissionForTool(NotebookEditTool, n, toolContext.permissions(), h);
        return y.behavior === "deny" ? y : (leafSymlinkWriteRefusal(s, h) ?? y);
      },
      async validateInput({ notebook_path: n, cell_type: r, cell_id: s, edit_mode: h = "replace" }, y) {
        let S = {
            toolUseId: y.toolUseId,
            session: toolContext.session,
            agentId: toolContext.agentId,
            agentWorktree: toolContext.agentWorktree,
          },
          w = rejectNullBytes(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", n]]);
        if (w) return w;
        let L = rejectTrailingWhitespace(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", n]]);
        if (L) return L;
        let G = checkForeignFilePath(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", n]]);
        if (G) return G;
        let absolutePath = expandStablePath(n),
          Z = checkWorktreeIsolation_2(absolutePath, S);
        if (Z) return { result: !1, message: Z, errorCode: 12 };
        if (extname_4(absolutePath) !== ".ipynb")
          return {
            result: !1,
            message:
              "File must be a Jupyter notebook (.ipynb file). For editing other file types, use the FileEdit tool.",
            errorCode: 2,
          };
        if (h === "insert" && !r)
          return { result: !1, message: "Cell type is required when using edit_mode=insert.", errorCode: 5 };
        let Se = toolContext.readFileState.get(absolutePath);
        if (!Se)
          return {
            result: !1,
            message: "File has not been read yet. Read it first before writing to it.",
            errorCode: 9,
          };
        if (hl(absolutePath)) return { result: !0 };
        if (isPerforceMode())
          try {
            let { mode: mode } = await getFsImplementation().stat(absolutePath);
            if (isPerforceReadOnlyFile(mode))
              return { result: !1, message: PERFORCE_READ_ONLY_MESSAGE, errorCode: 11 };
          } catch (error) {
            if (!isENOENT(error)) throw error;
          }
        if ((await getFileModificationTimeAsync(absolutePath)) > Se.timestamp)
          return {
            result: !1,
            message:
              "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.",
            errorCode: 10,
          };
        let ke, we;
        try {
          ({ content: ke, notText: we } = await readFileChecked(absolutePath, SW));
        } catch (error) {
          if (isENOENT(error)) return { result: !1, message: "Notebook file does not exist.", errorCode: 1 };
          if (Cj(error)) return { result: !1, message: notebookTooLargeMessage(), errorCode: 13 };
          throw error;
        }
        if (we) return { result: !1, message: fileWriteRefusalMessage(we), errorCode: 15 };
        let Ee = safeParseJSON(ke);
        if (!Ee) return { result: !1, message: "Notebook is not valid JSON.", errorCode: 6 };
        if (!isValidNotebook(Ee)) return { result: !1, message: INVALID_NOTEBOOK_MESSAGE, errorCode: 6 };
        if (!s) {
          if (h !== "insert")
            return {
              result: !1,
              message: "Cell ID must be specified when not inserting a new cell.",
              errorCode: 7,
            };
        } else if (!Ee.cells.some((cell) => cell.id === s)) {
          let Ae = parseCellId(s);
          if (Ae === void 0)
            return { result: !1, message: `Cell with ID "${s}" not found in notebook.`, errorCode: 8 };
          if (!Ee.cells[Ae])
            return { result: !1, message: `Cell with index ${Ae} does not exist in notebook.`, errorCode: 7 };
        }
        return { result: !0 };
      },
      async call({ notebook_path: n, new_source: r, cell_id: s, cell_type: h, edit_mode: y }, S) {
        let w = {
            toolUseId: S.toolUseId,
            session: toolContext.session,
            agentId: toolContext.agentId,
            agentWorktree: toolContext.agentWorktree,
          },
          { parentMessage: parentMessage } = S;
        if (parentMessage === void 0) throw Error("NotebookEdit: a call needs the message that issued it");
        let {
            readFileState: readFileState,
            getFileHistoryState: getFileHistoryState,
            applyFileHistoryOp: applyFileHistoryOp,
          } = toolContext,
          absolutePath = expandStablePath(n),
          errorResult = (Ae) => ({
            data: {
              new_source: r,
              old_source: void 0,
              cell_type: h ?? "code",
              language: "python",
              edit_mode: "replace",
              error: Ae,
              cell_id: s,
              notebook_path: absolutePath,
              original_file: "",
              updated_file: "",
            },
          }),
          we = consumeWritePermission(w, absolutePath),
          Ee = writeBlockRefusal(absolutePath, toolContext.permissions(), we);
        if (Ee !== void 0) return errorResult(Ee);
        await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, parentMessage.uuid);
        try {
          return await runWithFileWriteContext(absolutePath, async () => {
            let Ae = await pinWriteTarget(absolutePath, we);
            try {
              let Ie;
              try {
                Ie = await Ae.readExisting(SW);
              } catch (error) {
                if (Cj(error)) return errorResult(notebookTooLargeMessage());
                throw error;
              }
              if (Ie === null) return errorResult("Notebook file does not exist.");
              if (Ie.notText) return errorResult(fileWriteRefusalMessage(Ie.notText));
              let { content: content, encoding: encoding, lineEndings: lineEndings } = Ie,
                lt = await getFileModificationTimeAsync(Ae.ioPath),
                Je;
              try {
                Je = jsonParse(content);
              } catch {
                return errorResult("Notebook is not valid JSON.");
              }
              if (!isValidNotebook(Je)) return errorResult(INVALID_NOTEBOOK_MESSAGE);
              let nt = readFileState.get(absolutePath),
                pt = !1;
              if (Gie(nt)) {
                if (((pt = matchesReadContent(nt, tv(content))), !pt && lt <= nt.timestamp))
                  try {
                    pt = matchesReadContent(nt, jsonStringify(notebookToReadCells(Je)));
                  } catch (error) {
                    logForDebugging(
                      `NotebookEdit: the cells cannot be rendered as Read renders them: ${errorMessage(error)}`,
                    );
                  }
              }
              let Et;
              if (!s) Et = 0;
              else {
                if (((Et = Je.cells.findIndex((cell) => cell.id === s)), Et === -1)) {
                  let pn = parseCellId(s);
                  if (pn !== void 0) Et = pn;
                }
                if (y === "insert") Et += 1;
              }
              let yt = y;
              if (yt === "replace" && Et === Je.cells.length) {
                if (((yt = "insert"), !h)) h = "code";
              }
              let gt = Je.metadata?.language_info?.name ?? "python",
                At = void 0;
              if (Je.nbformat > 4 || (Je.nbformat === 4 && Je.nbformat_minor >= 5)) {
                if (yt === "insert") At = randomUUID_50().slice(0, 8);
                else if (s !== null) At = s;
              }
              let It;
              if (yt === "delete") {
                let pn = Je.cells[Et];
                ((It = Array.isArray(pn.source) ? pn.source.join("") : pn.source), Je.cells.splice(Et, 1));
              } else if (yt === "insert") {
                let pn;
                if (h === "markdown") pn = { cell_type: "markdown", id: At, source: r, metadata: {} };
                else
                  pn = {
                    cell_type: "code",
                    id: At,
                    source: r,
                    metadata: {},
                    execution_count: null,
                    outputs: [],
                  };
                Je.cells.splice(Et, 0, pn);
              } else {
                let pn = Je.cells[Et];
                if (
                  ((It = Array.isArray(pn.source) ? pn.source.join("") : pn.source),
                  (pn.source = r),
                  pn.cell_type === "code")
                )
                  ((pn.execution_count = null), (pn.outputs = []));
                if (h && h !== pn.cell_type) pn.cell_type = h;
              }
              let qt = jsonStringify(Je, null, 1);
              if (Buffer.byteLength(detectLineEndingsForString(qt, lineEndings), encoding) > SW)
                return errorResult(
                  `Edit rejected: the updated notebook would exceed the maximum size this tool can read (${formatFileSize(SW)}). The file was left unchanged.`,
                );
              await Ae.recheckBeforeWrite();
              let Zt = await writeTextContentVerified(Ae.ioPath, qt, encoding, lineEndings);
              return (
                readFileState.set(absolutePath, {
                  content: qt,
                  timestamp: Zt,
                  offset: void 0,
                  limit: void 0,
                  ...(!pt && { contentNotInModelContext: !0 }),
                }),
                {
                  data: {
                    new_source: r,
                    old_source: It,
                    cell_type: h ?? "code",
                    language: gt,
                    edit_mode: yt ?? "replace",
                    cell_id: At || void 0,
                    error: "",
                    notebook_path: absolutePath,
                    original_file: content,
                    updated_file: qt,
                  },
                }
              );
            } catch (error) {
              rethrowWithPath(error, Ae, absolutePath);
            } finally {
              await Ae.close();
            }
          });
        } catch (error) {
          if (error instanceof SymlinkWriteRefusedError) throw error;
          return errorResult(
            replaceLineBreaks(
              error instanceof Error ? error.message : "Unknown error occurred while editing notebook",
            ),
          );
        }
      },
    };
  },
});

export { NotebookEditTool };
