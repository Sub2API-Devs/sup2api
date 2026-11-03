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
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { readHandleUpTo } from "./fsOperations.js";

//@ chunk-e6aww6q8.js:3150675-3150692 placement
var SW = 104857600;
/**
 * cells 是数组且每个单元 source 为字符串或字符串数组。
 */
//@ chunk-e6aww6q8.js:3150692-3150890 placement
function isValidNotebook(e) {
  let n = e?.cells;
  return (
    Array.isArray(n) &&
    !n.some(
      (r) =>
        r === null ||
        typeof r !== "object" ||
        (typeof r.source !== "string" &&
          !(Array.isArray(r.source) && r.source.every((s) => typeof s === "string"))),
    )
  );
}
//@ chunk-e6aww6q8.js:3150890-3151004 placement
function parseCellId(cellId) {
  let match = cellId.match(/^cell-(\d+)$/);
  if (match && match[1]) {
    let index = parseInt(match[1], 10);
    return isNaN(index) ? void 0 : index;
  }
  return;
}
/**
 * 按 id 或序号找单元的源码（unparsable/cell-missing/found）。
 */
//@ chunk-e6aww6q8.js:3151004-3151363 placement
function findNotebookCellSource(e, n) {
  let r;
  try {
    r = jsonParse(e);
  } catch {
    return { kind: "unparsable" };
  }
  if (!isValidNotebook(r) || r === null) return { kind: "unparsable" };
  if (!n) return { kind: "cell-missing" };
  let found = r.cells.find((cell) => cell.id === n),
    h = found === void 0 ? parseCellId(n) : void 0,
    y = found ?? (h !== void 0 ? r.cells[h] : void 0);
  if (!y) return { kind: "cell-missing" };
  return { kind: "found", source: Array.isArray(y.source) ? y.source.join("") : y.source };
}
//@ chunk-e6aww6q8.js:3151363-3151375 placement
var QRr = 1e4;
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
/**
 * notebook 超过可读大小的提示。
 */
//@ chunk-e6aww6q8.js:3152263-3152366 placement
function notebookTooLargeMessage() {
  return `Notebook file exceeds the maximum size this tool can read (${formatFileSize(SW)}). ${NOTEBOOK_TOO_LARGE_HINT()}`;
}
//@ chunk-e6aww6q8.js:3152366-3152521 placement
var INVALID_NOTEBOOK_MESSAGE =
  'Notebook file is not a valid Jupyter notebook (top-level "cells" must be an array of cell objects, each with a string or string-array "source").';
//@ chunk-e6aww6q8.js:3152521-3152599 layout
class NotebookReadError extends Error {
  constructor(e) {
    super(e);
    this.name = "NotebookReadError";
  }
}
//@ chunk-e6aww6q8.js:3152599-3152736 fingerprint = isLargeOutputs (1)
function isLargeOutputs(outputs) {
  let size = 0;
  for (let r of outputs) {
    if (!r) continue;
    if (((size += (r.text?.length ?? 0) + (r.image?.image_data.length ?? 0)), size > QRr)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:3152736-3152840 fingerprint = processOutputText (1)
function processOutputText(text) {
  if (!text) return "";
  let rawText = Array.isArray(text) ? text.join("") : text,
    { truncatedContent: truncatedContent } = formatOutput(rawText);
  return truncatedContent;
}
//@ chunk-e6aww6q8.js:3152840-3153051 fingerprint = extractImage (0.737)
function extractImage(data) {
  for (let n of ["image/png", "image/jpeg"]) {
    let r = data[n];
    if (typeof r !== "string") continue;
    let replaced = r.replace(/\s/g, "");
    if (Ph(Buffer.from(replaced, "base64")) === null) return;
    return { image_data: replaced, media_type: n };
  }
  return;
}
//@ chunk-e6aww6q8.js:3153051-3153394 fingerprint = processOutput (1)
function processOutput(output) {
  switch (output.output_type) {
    case "stream":
      return { output_type: output.output_type, text: processOutputText(output.text) };
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
//@ chunk-e6aww6q8.js:3153394-3154075 fingerprint = processCell (0.893)
function processCell(cell, index, codeLanguage, includeLargeOutputs) {
  let cellId = cell.id ?? `cell-${index}`,
    cellData = {
      cellType: cell.cell_type,
      source: Array.isArray(cell.source) ? cell.source.join("") : cell.source,
      execution_count: cell.cell_type === "code" ? cell.execution_count || void 0 : void 0,
      cell_id: cellId,
    };
  if (cell.cell_type === "code") cellData.language = codeLanguage;
  if (cell.cell_type === "code" && cell.outputs?.length) {
    let outputs = cell.outputs.map(processOutput);
    if (!includeLargeOutputs && isLargeOutputs(outputs)) {
      let w = isBashAvailable()
        ? `${BASH_TOOL_NAME} with: cat <notebook_path> | jq '.cells[${index}].outputs'`
        : `${POWERSHELL_TOOL_NAME} with: Get-Content <notebook_path> | ConvertFrom-Json | Select-Object -ExpandProperty cells | Select-Object -Index ${index} | Select-Object -ExpandProperty outputs`;
      cellData.outputs = [{ output_type: "stream", text: `Outputs are too large to include. Use ${w}` }];
    } else cellData.outputs = outputs;
  }
  return cellData;
}
//@ chunk-e6aww6q8.js:3154075-3154362 fingerprint = cellContentToToolResult (1)
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
//@ chunk-e6aww6q8.js:3154362-3154557 fingerprint = cellOutputToToolResult (1)
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
      source: { data: output.image.image_data, media_type: output.image.media_type, type: "base64" },
    });
  return outputs;
}
/**
 * 把 notebook 单元转成 tool_result 内容块（源码 + 各输出）。
 */
//@ chunk-e6aww6q8.js:3154557-3154631 fingerprint = getToolResultFromCell (1)
function getToolResultFromCell(cell) {
  let contentResult = cellContentToToolResult(cell),
    outputResults = cell.outputs?.flatMap(cellOutputToToolResult);
  return [contentResult, ...(outputResults ?? [])];
}
/**
 * 读取 .ipynb：拒绝非普通文件与超过上限的文件，解析 JSON，按 Read 的格式处理所有单元（可按 cellId 取单个）。
 */
//@ chunk-e6aww6q8.js:3154631-3155317 fingerprint = readNotebook (0.73)
async function readNotebook(notebookPath, cellId) {
  let stats = await notebookPath.stat();
  if (!stats.isFile() && !stats.isDirectory())
    throw new NotebookReadError("Notebook path is not a regular file (device, FIFO, or socket).");
  if (stats.size > SW) throw new NotebookReadError(notebookTooLargeMessage());
  let s = await readHandleUpTo(notebookPath, SW + 1, "file");
  if (s.length > SW) throw new NotebookReadError(notebookTooLargeMessage());
  let content = s.toString("utf-8"),
    y;
  try {
    y = jsonParse(content);
  } catch (error) {
    throw new NotebookReadError(
      `Notebook file is not valid JSON (it may be truncated, corrupted, or still being written): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isValidNotebook(y)) throw new NotebookReadError(INVALID_NOTEBOOK_MESSAGE);
  let language = y.metadata?.language_info?.name ?? "python";
  if (cellId) {
    let cell = y.cells.find((cell) => cell.id === cellId);
    if (!cell) throw new NotebookReadError(`Cell with ID "${cellId}" not found in notebook`);
    return [processCell(cell, y.cells.indexOf(cell), language, !0)];
  }
  return notebookToReadCells(y);
}
/**
 * 按 Read 的渲染方式处理 notebook 所有单元（NotebookEdit 用它判断模型上下文中的内容是否最新）。
 */
//@ chunk-e6aww6q8.js:3155317-3155422 affinity
function notebookToReadCells(e) {
  let n = e.metadata?.language_info?.name ?? "python";
  return e.cells.map((cell, s) => processCell(cell, s, n, !1));
}

export {
  SW,
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
