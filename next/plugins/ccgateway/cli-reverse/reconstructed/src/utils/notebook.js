/**
 * utils/notebook.ts
 *
 * 读取 .ipynb 并把单元转换为 tool_result 内容块
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/notebook.ts
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 8, layout 1, fingerprint 9, affinity 1
 */
import { jsonParse } from "./slowOperations.js";
import { isBashAvailable } from "./shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { formatFileSize } from "./format.js";
import { formatOutput } from "../tools/BashTool/utils.js";
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { readHandleUpTo } from "./fsOperations.js";

//@ chunk-e6aww6q8.js:3150675-3150692 placement
/**
 * notebook 文件大小上限（100 MB）。
 */
var MAX_NOTEBOOK_BYTES = 104857600;
//@ chunk-e6aww6q8.js:3150692-3150890 placement
/**
 * cells 是数组且每个单元 source 为字符串或字符串数组。
 */
function isValidNotebook(notebook) {
  let cells = notebook?.cells;
  return (
    Array.isArray(cells) &&
    !cells.some(
      (cell) =>
        cell === null ||
        typeof cell !== "object" ||
        (typeof cell.source !== "string" &&
          !(Array.isArray(cell.source) && cell.source.every((sourceLine) => typeof sourceLine === "string"))),
    )
  );
}
//@ chunk-e6aww6q8.js:3150890-3151004 placement
function parseCellId(cellId) {
  let match = cellId.match(/^cell-(\d+)$/);
  if (match && match[1]) {
    let index = parseInt(match[1], 10);
    return isNaN(index) ? undefined : index;
  }
  return;
}
//@ chunk-e6aww6q8.js:3151004-3151363 placement
/**
 * 按 id 或序号找单元的源码（unparsable/cell-missing/found）。
 */
function findNotebookCellSource(content, cellId) {
  let notebook;
  try {
    notebook = jsonParse(content);
  } catch {
    return {
      kind: "unparsable",
    };
  }
  if (!isValidNotebook(notebook) || notebook === null)
    return {
      kind: "unparsable",
    };
  if (!cellId)
    return {
      kind: "cell-missing",
    };
  let found = notebook.cells.find((cell) => cell.id === cellId);
  let index = found === undefined ? parseCellId(cellId) : undefined;
  let cell = found ?? (index !== undefined ? notebook.cells[index] : undefined);
  if (!cell)
    return {
      kind: "cell-missing",
    };
  return {
    kind: "found",
    source: Array.isArray(cell.source) ? cell.source.join("") : cell.source,
  };
}
//@ chunk-e6aww6q8.js:3151363-3151375 placement
var MAX_NOTEBOOK_OUTPUT_CHARS = 1e4;
//@ chunk-e6aww6q8.js:3151375-3152263 placement
function NOTEBOOK_TOO_LARGE_HINT() {
  return isBashAvailable()
    ? `Use ${BASH_TOOL_NAME} with jq to read specific portions:
  cat <notebook_path> | jq '.cells[:20]' # First 20 cells
  cat <notebook_path> | jq '.cells[100:120]' # Cells 100-120
  cat <notebook_path> | jq '.cells | length' # Count total cells
  cat <notebook_path> | jq '.cells[] | select(.cell_type=="code") | .source' # All code sources`
    : `Use ${POWERSHELL_TOOL_NAME} to read specific portions:
  Get-Content <notebook_path> | ConvertFrom-Json | Select-Object -ExpandProperty cells | Select-Object -First 20
  Get-Content <notebook_path> | ConvertFrom-Json | Select-Object -ExpandProperty cells | Select-Object -Skip 100 -First 20 # Cells 100-120
  (Get-Content <notebook_path> | ConvertFrom-Json).cells.Count # Count total cells
  Get-Content <notebook_path> | ConvertFrom-Json | Select-Object -ExpandProperty cells | Where-Object cell_type -eq code | Select-Object -ExpandProperty source`;
}
//@ chunk-e6aww6q8.js:3152263-3152366 placement
/**
 * notebook 超过可读大小的提示。
 */
function notebookTooLargeMessage() {
  return `Notebook file exceeds the maximum size this tool can read (${formatFileSize(MAX_NOTEBOOK_BYTES)}). ${NOTEBOOK_TOO_LARGE_HINT()}`;
}
//@ chunk-e6aww6q8.js:3152366-3152521 placement
var INVALID_NOTEBOOK_MESSAGE =
  'Notebook file is not a valid Jupyter notebook (top-level "cells" must be an array of cell objects, each with a string or string-array "source").';
//@ chunk-e6aww6q8.js:3152521-3152599 layout
class NotebookReadError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotebookReadError";
  }
}
//@ chunk-e6aww6q8.js:3152599-3152736 fingerprint (2.1.88 match: isLargeOutputs, 1)
function isLargeOutputs(outputs) {
  let size = 0;
  for (let output of outputs) {
    if (!output) continue;
    size += (output.text?.length ?? 0) + (output.image?.image_data.length ?? 0);
    if (size > MAX_NOTEBOOK_OUTPUT_CHARS) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3152736-3152840 fingerprint (2.1.88 match: processOutputText, 1)
function processOutputText(text) {
  if (!text) return "";
  let rawText = Array.isArray(text) ? text.join("") : text;
  let { truncatedContent } = formatOutput(rawText);
  return truncatedContent;
}
//@ chunk-e6aww6q8.js:3152840-3153051 fingerprint (2.1.88 match: extractImage, 0.737)
function extractImage(data) {
  for (let mediaType of ["image/png", "image/jpeg"]) {
    let base64Data = data[mediaType];
    if (typeof base64Data !== "string") continue;
    let replaced = base64Data.replace(/\s/g, "");
    if (sniffImageMediaType(Buffer.from(replaced, "base64")) === null) return;
    return {
      image_data: replaced,
      media_type: mediaType,
    };
  }
  return;
}
//@ chunk-e6aww6q8.js:3153051-3153394 fingerprint (2.1.88 match: processOutput, 1)
function processOutput(output) {
  switch (output.output_type) {
    case "stream":
      return {
        output_type: output.output_type,
        text: processOutputText(output.text),
      };
    case "execute_result":
    case "display_data":
      return {
        output_type: output.output_type,
        text: processOutputText(output.data?.["text/plain"]),
        image: output.data && extractImage(output.data),
      };
    case "error":
      return {
        output_type: output.output_type,
        text: processOutputText(`${output.ename}: ${output.evalue}
${output.traceback.join(`
`)}`),
      };
  }
}
//@ chunk-e6aww6q8.js:3153394-3154075 fingerprint (2.1.88 match: processCell, 0.893)
function processCell(cell, index, codeLanguage, includeLargeOutputs) {
  let cellId = cell.id ?? `cell-${index}`;
  let cellData = {
    cellType: cell.cell_type,
    source: Array.isArray(cell.source) ? cell.source.join("") : cell.source,
    execution_count: cell.cell_type === "code" ? cell.execution_count || undefined : undefined,
    cell_id: cellId,
  };
  if (cell.cell_type === "code") cellData.language = codeLanguage;
  if (cell.cell_type === "code" && cell.outputs?.length) {
    let outputs = cell.outputs.map(processOutput);
    if (!includeLargeOutputs && isLargeOutputs(outputs)) {
      let inspectCommand = isBashAvailable()
        ? `${BASH_TOOL_NAME} with: cat <notebook_path> | jq '.cells[${index}].outputs'`
        : `${POWERSHELL_TOOL_NAME} with: Get-Content <notebook_path> | ConvertFrom-Json | Select-Object -ExpandProperty cells | Select-Object -Index ${index} | Select-Object -ExpandProperty outputs`;
      cellData.outputs = [
        {
          output_type: "stream",
          text: `Outputs are too large to include. Use ${inspectCommand}`,
        },
      ];
    } else cellData.outputs = outputs;
  }
  return cellData;
}
//@ chunk-e6aww6q8.js:3154075-3154362 fingerprint (2.1.88 match: cellContentToToolResult, 1)
function cellContentToToolResult(cell) {
  let metadata = [];
  if (cell.cellType !== "code") metadata.push(`<cell_type>${cell.cellType}</cell_type>`);
  if (cell.language !== "python" && cell.cellType === "code")
    metadata.push(`<language>${cell.language}</language>`);
  return {
    text: `<cell id="${cell.cell_id}">${metadata.join("")}${cell.source}</cell id="${cell.cell_id}">`,
    type: "text",
  };
}
//@ chunk-e6aww6q8.js:3154362-3154557 fingerprint (2.1.88 match: cellOutputToToolResult, 1)
function cellOutputToToolResult(output) {
  let outputs = [];
  if (output.text)
    outputs.push({
      text: `
${output.text}`,
      type: "text",
    });
  if (output.image)
    outputs.push({
      type: "image",
      source: {
        data: output.image.image_data,
        media_type: output.image.media_type,
        type: "base64",
      },
    });
  return outputs;
}
//@ chunk-e6aww6q8.js:3154557-3154631 fingerprint (2.1.88 match: getToolResultFromCell, 1)
/**
 * 把 notebook 单元转成 tool_result 内容块（源码 + 各输出）。
 */
function getToolResultFromCell(cell) {
  let contentResult = cellContentToToolResult(cell);
  let outputResults = cell.outputs?.flatMap(cellOutputToToolResult);
  return [contentResult, ...(outputResults ?? [])];
}
//@ chunk-e6aww6q8.js:3154631-3155317 fingerprint (2.1.88 match: readNotebook, 0.73)
/**
 * 读取 .ipynb：拒绝非普通文件与超过上限的文件，解析 JSON，按 Read 的格式处理所有单元（可按 cellId 取单个）。
 */
async function readNotebook(notebookPath, cellId) {
  let stats = await notebookPath.stat();
  if (!stats.isFile() && !stats.isDirectory())
    throw new NotebookReadError("Notebook path is not a regular file (device, FIFO, or socket).");
  if (stats.size > MAX_NOTEBOOK_BYTES) throw new NotebookReadError(notebookTooLargeMessage());
  let buffer = await readHandleUpTo(notebookPath, MAX_NOTEBOOK_BYTES + 1, "file");
  if (buffer.length > MAX_NOTEBOOK_BYTES) throw new NotebookReadError(notebookTooLargeMessage());
  let content = buffer.toString("utf-8");
  let notebook;
  try {
    notebook = jsonParse(content);
  } catch (error) {
    throw new NotebookReadError(
      `Notebook file is not valid JSON (it may be truncated, corrupted, or still being written): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isValidNotebook(notebook)) throw new NotebookReadError(INVALID_NOTEBOOK_MESSAGE);
  let language = notebook.metadata?.language_info?.name ?? "python";
  if (cellId) {
    let cell = notebook.cells.find((cell) => cell.id === cellId);
    if (!cell) throw new NotebookReadError(`Cell with ID "${cellId}" not found in notebook`);
    return [processCell(cell, notebook.cells.indexOf(cell), language, true)];
  }
  return notebookToReadCells(notebook);
}
//@ chunk-e6aww6q8.js:3155317-3155422 affinity
/**
 * 按 Read 的渲染方式处理 notebook 所有单元（NotebookEdit 用它判断模型上下文中的内容是否最新）。
 */
function notebookToReadCells(notebook) {
  let codeLanguage = notebook.metadata?.language_info?.name ?? "python";
  return notebook.cells.map((cell, index) => processCell(cell, index, codeLanguage, false));
}
export {
  MAX_NOTEBOOK_BYTES,
  isValidNotebook,
  parseCellId,
  getToolResultFromCell,
  readNotebook,
  NOTEBOOK_TOO_LARGE_HINT,
  notebookTooLargeMessage,
  INVALID_NOTEBOOK_MESSAGE,
  notebookToReadCells,
  findNotebookCellSource,
};
