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
import { extname } from "path";
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, _enum, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "./constants.js";
import { NOTEBOOK_EDIT_DESCRIPTION, NOTEBOOK_EDIT_PROMPT } from "./prompt.js";
import { isRemoteOnlyCheck, escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { expandStablePath } from "../../utils/path.js";
import { getToolUseSummary } from "./UI.js";
import { editRemovalVisibilityValue } from "../../utils/envFlagValues.js";
import {
  matchesPathRule,
  checkWritePermissionForTool,
  leafSymlinkWriteRefusal,
  writeBlockRefusal,
} from "../../utils/permissions/filesystem.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { buildUnfinishedCheckDecision } from "../../utils/permissions/unfinishedWriteCheck.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import {
  rejectNullBytes,
  rejectTrailingWhitespace,
  checkForeignFilePath,
} from "../../utils/filePathValidation.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
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
import { readFileChecked, isFileTooLargeError } from "../../utils/fileRead.js";
import {
  MAX_NOTEBOOK_BYTES,
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
import {
  hasFullFileContent,
  matchesReadContent,
  stripBom as stripBom_2,
} from "../../utils/remoteFileState.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatFileSize } from "../../utils/format.js";
import { replaceLineBreaks } from "../../utils/permissions/approvalPayloadSerialization.js";

//@ chunk-e6aww6q8.js:4663432-4664942 fingerprint = outputSchema (0.748)
var notebookEditInputSchema = DoctorLazy(() =>
  zodStrictObject({
    notebook_path: string().describe(
      "The absolute path to the Jupyter notebook file to edit (must be absolute, not relative)",
    ),
    cell_id: string()
      .optional()
      .describe(
        "The ID of the cell to edit. When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified.",
      ),
    new_source: string().describe("The new source for the cell"),
    cell_type: _enum(["code", "markdown"])
      .optional()
      .describe(
        "The type of the cell (code or markdown). If not specified, it defaults to the current cell type. If using edit_mode=insert, this is required.",
      ),
    edit_mode: _enum(["replace", "insert", "delete"])
      .optional()
      .describe("The type of edit to make (replace, insert, delete). Defaults to replace."),
  }),
);
var notebookEditOutputSchema = DoctorLazy(() =>
  u({
    new_source: string().describe("The new source code that was written to the cell"),
    old_source: string()
      .optional()
      .describe(
        "The previous cell source (replace/delete only). Enables cell-relative diff rendering without re-reading the notebook.",
      ),
    cell_id: string().optional().describe("The ID of the cell that was edited"),
    cell_type: _enum(["code", "markdown"]).describe("The type of the cell"),
    language: string().describe("The programming language of the notebook"),
    edit_mode: string().describe("The edit mode that was used"),
    error: string().optional().describe("Error message if the operation failed"),
    notebook_path: string().describe("The path to the notebook file"),
    original_file: string().describe("The original notebook content before modification"),
    updated_file: string().describe("The updated notebook content after modification"),
  }),
);
//@ chunk-e6aww6q8.js:4665018-4672012 fingerprint = NotebookEditTool (0.807)
/**
 * NotebookEdit 工具定义（name "NotebookEdit"，shouldDefer）。替换/插入/删除单元；必须先 Read 且未被修改；按 cell_id 或数字下标定位；nbformat 4.5 及以上时新单元生成 8 位 id；code 单元替换后清空输出；写前检查大小上限。
 */
var NotebookEditTool = buildTool({
  name: NOTEBOOK_EDIT_TOOL_NAME,
  ruleContentField: "notebook_path",
  searchHint: "edit Jupyter notebook cells (.ipynb)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
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
  getToolUseSummary,
  getActivityDescription(input) {
    let summary = getToolUseSummary(input);
    return summary ? `Editing notebook ${summary}` : "Editing notebook";
  },
  get inputSchema() {
    return notebookEditInputSchema();
  },
  get outputSchema() {
    return notebookEditOutputSchema();
  },
  toAutoClassifierInput(input) {
    let editMode = input.edit_mode ?? "replace";
    if (!editRemovalVisibilityValue()) return `${input.notebook_path} ${editMode}: ${input.new_source}`;
    return {
      notebook_path: input.notebook_path,
      mode: editMode,
      ...(input.cell_id !== undefined && {
        cell_id: input.cell_id,
      }),
      ...(editMode !== "delete" &&
        input.cell_type !== undefined && {
          cell_type: input.cell_type,
        }),
      ...(editMode === "delete"
        ? {
            ignored_source: input.new_source,
          }
        : {
            adds: input.new_source,
          }),
    };
  },
  getPath(input) {
    return input.notebook_path;
  },
  async preparePermissionMatcher({ notebook_path: notebookPath }) {
    return (n) => matchesPathRule(n, notebookPath);
  },
  fromAnotherProcess(e, n) {
    return {
      data: {
        ...e,
        notebook_path: String(n.notebook_path ?? ""),
        new_source: String(n.new_source ?? ""),
        edit_mode: String(n.edit_mode ?? "replace"),
        ...(e.cell_id !== undefined && {
          cell_id: escapeXmlInline(clipText(e.cell_id, 200)),
        }),
        ...(e.error !== undefined && {
          error: escapeXmlInline(clipText(e.error, 2000)),
        }),
        ...(e.old_source !== undefined && {
          old_source: clipText(e.old_source, 1e5),
        }),
        original_file: "",
        updated_file: "",
      },
    };
  },
  mapToolResultToToolResultBlockParam({ cell_id, edit_mode, new_source, error }, toolUseID) {
    if (error)
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: error,
        is_error: true,
      };
    switch (edit_mode) {
      case "replace":
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: `Updated cell ${cell_id} with ${new_source}`,
        };
      case "insert":
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: `Inserted cell ${cell_id} with ${new_source}`,
        };
      case "delete":
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: `Deleted cell ${cell_id}`,
        };
      default:
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: "Unknown edit mode",
        };
    }
  },
  create(toolContext) {
    return {
      permissionCheckFailureDecision(n) {
        return buildUnfinishedCheckDecision(
          NOTEBOOK_EDIT_TOOL_NAME,
          isPlainObject_5(n) ? n.notebook_path : undefined,
          toolContext.permissions(),
        );
      },
      async checkPermissions(n, r) {
        let s = expandStablePath(n.notebook_path);
        let h = walkPermissionCheckPaths(s);
        toolContext.session.writePermissionStash.stash(r.toolUseId, s, h.spellings);
        let y = checkWritePermissionForTool(NotebookEditTool, n, toolContext.permissions(), h);
        return y.behavior === "deny" ? y : (leafSymlinkWriteRefusal(s, h) ?? y);
      },
      async validateInput({ notebook_path: notebookPath, cell_type, cell_id, edit_mode = "replace" }, y) {
        let S = {
          toolUseId: y.toolUseId,
          session: toolContext.session,
          agentId: toolContext.agentId,
          agentWorktree: toolContext.agentWorktree,
        };
        let w = rejectNullBytes(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", notebookPath]]);
        if (w) return w;
        let L = rejectTrailingWhitespace(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", notebookPath]]);
        if (L) return L;
        let G = checkForeignFilePath(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", notebookPath]]);
        if (G) return G;
        let absolutePath = expandStablePath(notebookPath);
        let Z = checkWorktreeIsolation_2(absolutePath, S);
        if (Z)
          return {
            result: false,
            message: Z,
            errorCode: 12,
          };
        if (extname(absolutePath) !== ".ipynb")
          return {
            result: false,
            message:
              "File must be a Jupyter notebook (.ipynb file). For editing other file types, use the FileEdit tool.",
            errorCode: 2,
          };
        if (edit_mode === "insert" && !cell_type)
          return {
            result: false,
            message: "Cell type is required when using edit_mode=insert.",
            errorCode: 5,
          };
        let readTimestamp = toolContext.readFileState.get(absolutePath);
        if (!readTimestamp)
          return {
            result: false,
            message: "File has not been read yet. Read it first before writing to it.",
            errorCode: 9,
          };
        if (isUntouchableSpelling(absolutePath))
          return {
            result: true,
          };
        if (isPerforceMode())
          try {
            let { mode } = await getFsImplementation().stat(absolutePath);
            if (isPerforceReadOnlyFile(mode))
              return {
                result: false,
                message: PERFORCE_READ_ONLY_MESSAGE,
                errorCode: 11,
              };
          } catch (error) {
            if (!isENOENT(error)) throw error;
          }
        if ((await getFileModificationTimeAsync(absolutePath)) > readTimestamp.timestamp)
          return {
            result: false,
            message:
              "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.",
            errorCode: 10,
          };
        let content;
        let we;
        try {
          ({ content, notText: we } = await readFileChecked(absolutePath, MAX_NOTEBOOK_BYTES));
        } catch (e) {
          if (isENOENT(e))
            return {
              result: false,
              message: "Notebook file does not exist.",
              errorCode: 1,
            };
          if (isFileTooLargeError(e))
            return {
              result: false,
              message: notebookTooLargeMessage(),
              errorCode: 13,
            };
          throw e;
        }
        if (we)
          return {
            result: false,
            message: fileWriteRefusalMessage(we),
            errorCode: 15,
          };
        let notebook = safeParseJSON(content);
        if (!notebook)
          return {
            result: false,
            message: "Notebook is not valid JSON.",
            errorCode: 6,
          };
        if (!isValidNotebook(notebook))
          return {
            result: false,
            message: INVALID_NOTEBOOK_MESSAGE,
            errorCode: 6,
          };
        if (!cell_id) {
          if (edit_mode !== "insert")
            return {
              result: false,
              message: "Cell ID must be specified when not inserting a new cell.",
              errorCode: 7,
            };
        } else if (!notebook.cells.some((cell) => cell.id === cell_id)) {
          let parsedCellIndex = parseCellId(cell_id);
          if (parsedCellIndex === undefined)
            return {
              result: false,
              message: `Cell with ID "${cell_id}" not found in notebook.`,
              errorCode: 8,
            };
          if (!notebook.cells[parsedCellIndex])
            return {
              result: false,
              message: `Cell with index ${parsedCellIndex} does not exist in notebook.`,
              errorCode: 7,
            };
        }
        return {
          result: true,
        };
      },
      async call(
        { notebook_path: notebookPath, new_source, cell_id, cell_type, edit_mode: originalEditMode },
        S,
      ) {
        let w = {
          toolUseId: S.toolUseId,
          session: toolContext.session,
          agentId: toolContext.agentId,
          agentWorktree: toolContext.agentWorktree,
        };
        let { parentMessage } = S;
        if (parentMessage === undefined) throw Error("NotebookEdit: a call needs the message that issued it");
        let { readFileState, getFileHistoryState, applyFileHistoryOp } = toolContext;
        let absolutePath = expandStablePath(notebookPath);
        let errorResult = (error) => ({
          data: {
            new_source,
            old_source: undefined,
            cell_type: cell_type ?? "code",
            language: "python",
            edit_mode: "replace",
            error,
            cell_id,
            notebook_path: absolutePath,
            original_file: "",
            updated_file: "",
          },
        });
        let we = consumeWritePermission(w, absolutePath);
        let Ee = writeBlockRefusal(absolutePath, toolContext.permissions(), we);
        if (Ee !== undefined) return errorResult(Ee);
        await fileHistoryTrackEdit(getFileHistoryState, applyFileHistoryOp, absolutePath, parentMessage.uuid);
        try {
          return await runWithFileWriteContext(absolutePath, async () => {
            let Ae = await pinWriteTarget(absolutePath, we);
            try {
              let Ie;
              try {
                Ie = await Ae.readExisting(MAX_NOTEBOOK_BYTES);
              } catch (error) {
                if (isFileTooLargeError(error)) return errorResult(notebookTooLargeMessage());
                throw error;
              }
              if (Ie === null) return errorResult("Notebook file does not exist.");
              if (Ie.notText) return errorResult(fileWriteRefusalMessage(Ie.notText));
              let { content, encoding, lineEndings } = Ie;
              let fileModificationTime = await getFileModificationTimeAsync(Ae.ioPath);
              let notebook;
              try {
                notebook = jsonParse(content);
              } catch {
                return errorResult("Notebook is not valid JSON.");
              }
              if (!isValidNotebook(notebook)) return errorResult(INVALID_NOTEBOOK_MESSAGE);
              let nt = readFileState.get(absolutePath);
              let pt = false;
              if (hasFullFileContent(nt)) {
                pt = matchesReadContent(nt, stripBom_2(content));
                if (!pt && fileModificationTime <= nt.timestamp)
                  try {
                    pt = matchesReadContent(nt, jsonStringify(notebookToReadCells(notebook)));
                  } catch (error) {
                    logForDebugging(
                      `NotebookEdit: the cells cannot be rendered as Read renders them: ${errorMessage(error)}`,
                    );
                  }
              }
              let cellIndex;
              if (!cell_id) cellIndex = 0;
              else {
                cellIndex = notebook.cells.findIndex((cell) => cell.id === cell_id);
                if (cellIndex === -1) {
                  let parsedCellIndex = parseCellId(cell_id);
                  if (parsedCellIndex !== undefined) cellIndex = parsedCellIndex;
                }
                if (originalEditMode === "insert") cellIndex += 1;
              }
              let edit_mode = originalEditMode;
              if (edit_mode === "replace" && cellIndex === notebook.cells.length) {
                edit_mode = "insert";
                if (!cell_type) cell_type = "code";
              }
              let language = notebook.metadata?.language_info?.name ?? "python";
              let new_cell_id = undefined;
              if (notebook.nbformat > 4 || (notebook.nbformat === 4 && notebook.nbformat_minor >= 5)) {
                if (edit_mode === "insert") new_cell_id = randomUUID().slice(0, 8);
                else if (cell_id !== null) new_cell_id = cell_id;
              }
              let It;
              if (edit_mode === "delete") {
                let pn = notebook.cells[cellIndex];
                It = Array.isArray(pn.source) ? pn.source.join("") : pn.source;
                notebook.cells.splice(cellIndex, 1);
              } else if (edit_mode === "insert") {
                let new_cell;
                if (cell_type === "markdown")
                  new_cell = {
                    cell_type: "markdown",
                    id: new_cell_id,
                    source: new_source,
                    metadata: {},
                  };
                else
                  new_cell = {
                    cell_type: "code",
                    id: new_cell_id,
                    source: new_source,
                    metadata: {},
                    execution_count: null,
                    outputs: [],
                  };
                notebook.cells.splice(cellIndex, 0, new_cell);
              } else {
                let targetCell = notebook.cells[cellIndex];
                It = Array.isArray(targetCell.source) ? targetCell.source.join("") : targetCell.source;
                targetCell.source = new_source;
                if (targetCell.cell_type === "code") {
                  targetCell.execution_count = null;
                  targetCell.outputs = [];
                }
                if (cell_type && cell_type !== targetCell.cell_type) targetCell.cell_type = cell_type;
              }
              let qt = jsonStringify(notebook, null, 1);
              if (
                Buffer.byteLength(detectLineEndingsForString(qt, lineEndings), encoding) > MAX_NOTEBOOK_BYTES
              )
                return errorResult(
                  `Edit rejected: the updated notebook would exceed the maximum size this tool can read (${formatFileSize(MAX_NOTEBOOK_BYTES)}). The file was left unchanged.`,
                );
              await Ae.recheckBeforeWrite();
              let timestamp = await writeTextContentVerified(Ae.ioPath, qt, encoding, lineEndings);
              readFileState.set(absolutePath, {
                content: qt,
                timestamp,
                offset: undefined,
                limit: undefined,
                ...(!pt && {
                  contentNotInModelContext: true,
                }),
              });
              return {
                data: {
                  new_source,
                  old_source: It,
                  cell_type: cell_type ?? "code",
                  language,
                  edit_mode: edit_mode ?? "replace",
                  cell_id: new_cell_id || undefined,
                  error: "",
                  notebook_path: absolutePath,
                  original_file: content,
                  updated_file: qt,
                },
              };
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
