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
import {
  zodStrictObject,
  stringSchema,
  _enum,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4663432-4664942 fingerprint = outputSchema (0.748)
var notebookEditInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var notebookEditOutputSchema;
deferInit("chunk-e6aww6q8.js:4663432", () => {
  notebookEditInputSchema = DoctorLazy(() =>
    zodStrictObject({
      notebook_path: stringSchema().describe(
        "The absolute path to the Jupyter notebook file to edit (must be absolute, not relative)",
      ),
      cell_id: stringSchema()
        .optional()
        .describe(
          "The ID of the cell to edit. When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified.",
        ),
      new_source: stringSchema().describe("The new source for the cell"),
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
  notebookEditOutputSchema = DoctorLazy(() =>
    objectSchema({
      new_source: stringSchema().describe("The new source code that was written to the cell"),
      old_source: stringSchema()
        .optional()
        .describe(
          "The previous cell source (replace/delete only). Enables cell-relative diff rendering without re-reading the notebook.",
        ),
      cell_id: stringSchema().optional().describe("The ID of the cell that was edited"),
      cell_type: _enum(["code", "markdown"]).describe("The type of the cell"),
      language: stringSchema().describe("The programming language of the notebook"),
      edit_mode: stringSchema().describe("The edit mode that was used"),
      error: stringSchema().optional().describe("Error message if the operation failed"),
      notebook_path: stringSchema().describe("The path to the notebook file"),
      original_file: stringSchema().describe("The original notebook content before modification"),
      updated_file: stringSchema().describe("The updated notebook content after modification"),
    }),
  );
});
//@ chunk-e6aww6q8.js:4665018-4672012 fingerprint = NotebookEditTool (0.807)
/**
 * NotebookEdit 工具定义（name "NotebookEdit"，shouldDefer）。替换/插入/删除单元；必须先 Read 且未被修改；按 cell_id 或数字下标定位；nbformat 4.5 及以上时新单元生成 8 位 id；code 单元替换后清空输出；写前检查大小上限。
 */
var NotebookEditTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4665018", () => {
  NotebookEditTool = buildTool({
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
    backfillObservableInput(input) {
      if (typeof input.notebook_path === "string" && !isRemoteOnlyCheck(NOTEBOOK_EDIT_TOOL_NAME))
        input.notebook_path = expandStablePath(input.notebook_path);
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
      return (pattern) => matchesPathRule(pattern, notebookPath);
    },
    fromAnotherProcess(result, input) {
      return {
        data: {
          ...result,
          notebook_path: String(input.notebook_path ?? ""),
          new_source: String(input.new_source ?? ""),
          edit_mode: String(input.edit_mode ?? "replace"),
          ...(result.cell_id !== undefined && {
            cell_id: escapeXmlInline(clipText(result.cell_id, 200)),
          }),
          ...(result.error !== undefined && {
            error: escapeXmlInline(clipText(result.error, 2000)),
          }),
          ...(result.old_source !== undefined && {
            old_source: clipText(result.old_source, 1e5),
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
        permissionCheckFailureDecision(input) {
          return buildUnfinishedCheckDecision(
            NOTEBOOK_EDIT_TOOL_NAME,
            isPlainObject_5(input) ? input.notebook_path : undefined,
            toolContext.permissions(),
          );
        },
        async checkPermissions(input, callOptions) {
          let stablePath = expandStablePath(input.notebook_path);
          let pathSpellings = walkPermissionCheckPaths(stablePath);
          toolContext.session.writePermissionStash.stash(
            callOptions.toolUseId,
            stablePath,
            pathSpellings.spellings,
          );
          let writeDecision = checkWritePermissionForTool(
            NotebookEditTool,
            input,
            toolContext.permissions(),
            pathSpellings,
          );
          return writeDecision.behavior === "deny"
            ? writeDecision
            : (leafSymlinkWriteRefusal(stablePath, pathSpellings) ?? writeDecision);
        },
        async validateInput(
          { notebook_path: notebookPath, cell_type, cell_id, edit_mode = "replace" },
          callOptions,
        ) {
          let callContext = {
            toolUseId: callOptions.toolUseId,
            session: toolContext.session,
            agentId: toolContext.agentId,
            agentWorktree: toolContext.agentWorktree,
          };
          let nullByteRefusal = rejectNullBytes(NOTEBOOK_EDIT_TOOL_NAME, [["notebook_path", notebookPath]]);
          if (nullByteRefusal) return nullByteRefusal;
          let trailingWhitespaceRefusal = rejectTrailingWhitespace(NOTEBOOK_EDIT_TOOL_NAME, [
            ["notebook_path", notebookPath],
          ]);
          if (trailingWhitespaceRefusal) return trailingWhitespaceRefusal;
          let foreignPathRefusal = checkForeignFilePath(NOTEBOOK_EDIT_TOOL_NAME, [
            ["notebook_path", notebookPath],
          ]);
          if (foreignPathRefusal) return foreignPathRefusal;
          let absolutePath = expandStablePath(notebookPath);
          let worktreeRefusal = checkWorktreeIsolation_2(absolutePath, callContext);
          if (worktreeRefusal)
            return {
              result: false,
              message: worktreeRefusal,
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
          let notTextReason;
          try {
            ({ content, notText: notTextReason } = await readFileChecked(absolutePath, MAX_NOTEBOOK_BYTES));
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
          if (notTextReason)
            return {
              result: false,
              message: fileWriteRefusalMessage(notTextReason),
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
          callOptions,
        ) {
          let callContext = {
            toolUseId: callOptions.toolUseId,
            session: toolContext.session,
            agentId: toolContext.agentId,
            agentWorktree: toolContext.agentWorktree,
          };
          let { parentMessage } = callOptions;
          if (parentMessage === undefined)
            throw Error("NotebookEdit: a call needs the message that issued it");
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
          let writePermission = consumeWritePermission(callContext, absolutePath);
          let writeRefusal = writeBlockRefusal(absolutePath, toolContext.permissions(), writePermission);
          if (writeRefusal !== undefined) return errorResult(writeRefusal);
          await fileHistoryTrackEdit(
            getFileHistoryState,
            applyFileHistoryOp,
            absolutePath,
            parentMessage.uuid,
          );
          try {
            return await runWithFileWriteContext(absolutePath, async () => {
              let target = await pinWriteTarget(absolutePath, writePermission);
              try {
                let existing;
                try {
                  existing = await target.readExisting(MAX_NOTEBOOK_BYTES);
                } catch (error) {
                  if (isFileTooLargeError(error)) return errorResult(notebookTooLargeMessage());
                  throw error;
                }
                if (existing === null) return errorResult("Notebook file does not exist.");
                if (existing.notText) return errorResult(fileWriteRefusalMessage(existing.notText));
                let { content, encoding, lineEndings } = existing;
                let fileModificationTime = await getFileModificationTimeAsync(target.ioPath);
                let notebook;
                try {
                  notebook = jsonParse(content);
                } catch {
                  return errorResult("Notebook is not valid JSON.");
                }
                if (!isValidNotebook(notebook)) return errorResult(INVALID_NOTEBOOK_MESSAGE);
                let readState = readFileState.get(absolutePath);
                let contentMatches = false;
                if (hasFullFileContent(readState)) {
                  contentMatches = matchesReadContent(readState, stripBom_2(content));
                  if (!contentMatches && fileModificationTime <= readState.timestamp)
                    try {
                      contentMatches = matchesReadContent(
                        readState,
                        jsonStringify(notebookToReadCells(notebook)),
                      );
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
                let oldSource;
                if (edit_mode === "delete") {
                  let deletedCell = notebook.cells[cellIndex];
                  oldSource = Array.isArray(deletedCell.source)
                    ? deletedCell.source.join("")
                    : deletedCell.source;
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
                  oldSource = Array.isArray(targetCell.source)
                    ? targetCell.source.join("")
                    : targetCell.source;
                  targetCell.source = new_source;
                  if (targetCell.cell_type === "code") {
                    targetCell.execution_count = null;
                    targetCell.outputs = [];
                  }
                  if (cell_type && cell_type !== targetCell.cell_type) targetCell.cell_type = cell_type;
                }
                let updatedNotebookJson = jsonStringify(notebook, null, 1);
                if (
                  Buffer.byteLength(detectLineEndingsForString(updatedNotebookJson, lineEndings), encoding) >
                  MAX_NOTEBOOK_BYTES
                )
                  return errorResult(
                    `Edit rejected: the updated notebook would exceed the maximum size this tool can read (${formatFileSize(MAX_NOTEBOOK_BYTES)}). The file was left unchanged.`,
                  );
                await target.recheckBeforeWrite();
                let timestamp = await writeTextContentVerified(
                  target.ioPath,
                  updatedNotebookJson,
                  encoding,
                  lineEndings,
                );
                readFileState.set(absolutePath, {
                  content: updatedNotebookJson,
                  timestamp,
                  offset: undefined,
                  limit: undefined,
                  ...(!contentMatches && {
                    contentNotInModelContext: true,
                  }),
                });
                return {
                  data: {
                    new_source,
                    old_source: oldSource,
                    cell_type: cell_type ?? "code",
                    language,
                    edit_mode: edit_mode ?? "replace",
                    cell_id: new_cell_id || undefined,
                    error: "",
                    notebook_path: absolutePath,
                    original_file: content,
                    updated_file: updatedNotebookJson,
                  },
                };
              } catch (error) {
                rethrowWithPath(error, target, absolutePath);
              } finally {
                await target.close();
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
});
export { NotebookEditTool };
