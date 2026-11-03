/**
 * tools/FileReadTool/UI.tsx
 *
 * Read 工具的用户可见名、摘要与结果渲染（任务输出文件识别）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/UI.tsx
 * pieces: chunk-cjvab7rz.js (3), chunk-nc07tp5s.js (3)
 * attribution: affinity 1, fingerprint 3, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import { sep, basename } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { getTaskOutputDir } from "../../utils/task/diskOutput.js";
import { getPlansDirectory } from "../../utils/plans.js";
import { getDisplayPath } from "../../utils/file.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { replaceLineBreaks, stripUnsafeChars } from "../../utils/permissions/approvalPayloadSerialization.js";
import { Text } from "../../ink/components/Text.js";
import { formatFileSize } from "../../utils/format.js";
import { MessageResponse } from "../../components/MessageResponse.js";

/**
 * 若路径是任务输出目录下的 <taskId>.output（id 1–20 位字母数字），返回 taskId；diskless 会话返回 null。
 */
//@ chunk-cjvab7rz.js:362-576 affinity = getAgentOutputTaskId (1)
function getAgentOutputTaskId(filePath) {
  if (isDiskless()) return null;
  let prefix = `${getTaskOutputDir()}${sep}`,
    suffix = ".output";
  if (filePath.startsWith(prefix) && filePath.endsWith(suffix)) {
    let taskId = filePath.slice(prefix.length, -suffix.length);
    if (taskId.length > 0 && taskId.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(taskId)) return taskId;
  }
  return null;
}
/**
 * Read 的用户可见名："Reading Plan"（计划文件）、"Read agent output"（任务输出）或 "Read"。
 */
//@ chunk-cjvab7rz.js:576-720 fingerprint = userFacingName (1)
function userFacingName(input) {
  if (input?.file_path?.startsWith(getPlansDirectory())) return "Reading Plan";
  if (input?.file_path && getAgentOutputTaskId(input.file_path)) return "Read agent output";
  return "Read";
}
/**
 * Read 的工具使用摘要：任务输出返回 taskId，否则显示路径。
 */
//@ chunk-cjvab7rz.js:720-825 callgraph-witnessed = getToolUseSummary (1)
function getToolUseSummary(input) {
  if (!input?.file_path) return null;
  let agentTaskId = getAgentOutputTaskId(input.file_path);
  if (agentTaskId) return agentTaskId;
  return getDisplayPath(input.file_path);
}
//@ chunk-nc07tp5s.js:7424-7805 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage(
  { file_path: file_path, offset: offset, limit: limit, pages: pages },
  { verbose: verbose },
) {
  if (!file_path) return null;
  if (getAgentOutputTaskId(file_path)) return "";
  let i = verbose ? file_path : getDisplayPath(file_path);
  if (pages)
    return r(Fragment, {
      children: [
        e(FilePathLink, { filePath: file_path, children: i }),
        ` \xB7 pages ${replaceLineBreaks(stripUnsafeChars(`${pages}`))}`,
      ],
    });
  if (verbose && (offset || limit)) {
    let startLine = offset ?? 1,
      d = limit ? `lines ${startLine}-${startLine + limit - 1}` : `from line ${startLine}`;
    return r(Fragment, { children: [e(FilePathLink, { filePath: file_path, children: i }), ` \xB7 ${d}`] });
  }
  return e(FilePathLink, { filePath: file_path, children: i });
}
//@ chunk-nc07tp5s.js:7805-7912 callgraph-fingerprint = renderToolUseTag (1)
function renderToolUseTag({ file_path: file_path }) {
  let agentTaskId = file_path ? getAgentOutputTaskId(file_path) : null;
  if (!agentTaskId) return null;
  return r(Text, { dimColor: !0, children: [" ", agentTaskId] });
}
//@ chunk-nc07tp5s.js:7912-8904 fingerprint = renderToolResultMessage (0.679)
function renderToolResultMessage(output) {
  switch (output.type) {
    case "image": {
      let { originalSize: originalSize } = output.file,
        formattedSize = formatFileSize(originalSize);
      return e(MessageResponse, {
        height: 1,
        children: r(Text, { children: ["Read image (", formattedSize, ")"] }),
      });
    }
    case "notebook": {
      let { cells: cells } = output.file;
      if (!cells || cells.length < 1)
        return e(Text, { color: "error", children: "No cells found in notebook" });
      return e(MessageResponse, {
        height: 1,
        children: r(Text, { children: ["Read ", e(Text, { bold: !0, children: cells.length }), " cells"] }),
      });
    }
    case "pdf": {
      let { originalSize: originalSize } = output.file,
        formattedSize = formatFileSize(originalSize);
      return e(MessageResponse, {
        height: 1,
        children: r(Text, { children: ["Read PDF (", formattedSize, ")"] }),
      });
    }
    case "parts":
      return e(MessageResponse, {
        height: 1,
        children: r(Text, {
          children: [
            "Read ",
            e(Text, { bold: !0, children: output.file.count }),
            " ",
            output.file.count === 1 ? "page" : "pages",
            " (",
            formatFileSize(output.file.originalSize),
            ")",
          ],
        }),
      });
    case "text": {
      let { numLines: numLines } = output.file;
      return e(MessageResponse, {
        height: 1,
        children: r(Text, {
          children: [
            "Read ",
            e(Text, { bold: !0, children: numLines }),
            " ",
            numLines === 1 ? "line" : "lines",
          ],
        }),
      });
    }
    case "file_unchanged":
      return e(MessageResponse, {
        height: 1,
        children: e(Text, {
          dimColor: !0,
          children:
            output.source === "seeded"
              ? `Already in context (${replaceLineBreaks(stripUnsafeChars(basename(output.file.filePath)))})`
              : "Unchanged since last read",
        }),
      });
  }
}

export { userFacingName, getToolUseSummary, getAgentOutputTaskId };
