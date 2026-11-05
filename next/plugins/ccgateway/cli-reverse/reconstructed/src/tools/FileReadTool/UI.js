/**
 * tools/FileReadTool/UI.tsx
 *
 * Read 工具的用户可见名、摘要与结果渲染（任务输出文件识别）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/UI.tsx
 * pieces: chunk-rt8b7gmx.js (3), chunk-xm6m8ykh.js (3)
 * attribution: affinity 1, fingerprint 3, callgraph-witnessed 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { getTaskOutputDir } from "../../utils/task/diskOutput.js";
import { getPlansDirectory } from "../../utils/plans.js";
import { getDisplayPath } from "../../utils/file.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { replaceLineBreaks, stripUnsafeChars } from "../../utils/permissions/approvalPayloadSerialization.js";
import { Text } from "../../ink/components/Text.js";
import { formatFileSize } from "../../utils/format.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-rt8b7gmx.js:362-576 affinity (2.1.88 match: getAgentOutputTaskId, 1)
/**
 * 若路径是任务输出目录下的 <taskId>.output（id 1–20 位字母数字），返回 taskId；diskless 会话返回 null。
 */
function getAgentOutputTaskId(filePath) {
  if (isDiskless()) return null;
  let prefix = `${getTaskOutputDir()}${sep}`;
  let suffix = ".output";
  if (filePath.startsWith(prefix) && filePath.endsWith(suffix)) {
    let taskId = filePath.slice(prefix.length, -suffix.length);
    if (taskId.length > 0 && taskId.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(taskId)) return taskId;
  }
  return null;
}
//@ chunk-rt8b7gmx.js:576-720 fingerprint (2.1.88 match: userFacingName, 1)
/**
 * Read 的用户可见名："Reading Plan"（计划文件）、"Read agent output"（任务输出）或 "Read"。
 */
function userFacingName(input) {
  if (input?.file_path?.startsWith(getPlansDirectory())) return "Reading Plan";
  if (input?.file_path && getAgentOutputTaskId(input.file_path)) return "Read agent output";
  return "Read";
}
//@ chunk-rt8b7gmx.js:720-825 callgraph-witnessed (2.1.88 match: getToolUseSummary, 1)
/**
 * Read 的工具使用摘要：任务输出返回 taskId，否则显示路径。
 */
function getToolUseSummary(input) {
  if (!input?.file_path) return null;
  let agentTaskId = getAgentOutputTaskId(input.file_path);
  if (agentTaskId) return agentTaskId;
  return getDisplayPath(input.file_path);
}
//@ chunk-xm6m8ykh.js:8037-8420 fingerprint (2.1.88 match: renderToolUseMessage, 1)
function renderToolUseMessage({ file_path, offset, limit, pages }, { verbose }) {
  if (!file_path) return null;
  if (getAgentOutputTaskId(file_path)) return "";
  let children = verbose ? file_path : getDisplayPath(file_path);
  if (pages)
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(FilePathLink, {
          filePath: file_path,
          children,
        }),
        ` \xB7 pages ${replaceLineBreaks(stripUnsafeChars(`${pages}`))}`,
      ],
    });
  if (verbose && (offset || limit)) {
    let startLine = offset ?? 1;
    let lineRange = limit ? `lines ${startLine}-${startLine + limit - 1}` : `from line ${startLine}`;
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(FilePathLink, {
          filePath: file_path,
          children,
        }),
        ` \xB7 ${lineRange}`,
      ],
    });
  }
  return jsxProd_default(FilePathLink, {
    filePath: file_path,
    children,
  });
}
//@ chunk-xm6m8ykh.js:8420-8527 callgraph-fingerprint (2.1.88 match: renderToolUseTag, 1)
function renderToolUseTag({ file_path }) {
  let agentTaskId = file_path ? getAgentOutputTaskId(file_path) : null;
  if (!agentTaskId) return null;
  return jsxProd_default_2(Text, {
    dimColor: true,
    children: [" ", agentTaskId],
  });
}
//@ chunk-xm6m8ykh.js:8527-9337 fingerprint (2.1.88 match: renderToolResultMessage, 0.746)
function renderToolResultMessage(output) {
  switch (output.type) {
    case "image": {
      let { originalSize } = output.file;
      let formattedSize = formatFileSize(originalSize);
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: ["Read image (", formattedSize, ")"],
        }),
      });
    }
    case "notebook": {
      let { cells } = output.file;
      if (!cells || cells.length < 1)
        return jsxProd_default(Text, {
          color: "error",
          children: "No cells found in notebook",
        });
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: [
            "Read ",
            jsxProd_default(Text, {
              bold: true,
              children: cells.length,
            }),
            " cells",
          ],
        }),
      });
    }
    case "pdf": {
      let { originalSize } = output.file;
      let formattedSize = formatFileSize(originalSize);
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: ["Read PDF (", formattedSize, ")"],
        }),
      });
    }
    case "parts":
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: [
            "Read ",
            jsxProd_default(Text, {
              bold: true,
              children: output.file.count,
            }),
            " ",
            output.file.count === 1 ? "page" : "pages",
            " (",
            formatFileSize(output.file.originalSize),
            ")",
          ],
        }),
      });
    case "text": {
      let { numLines } = output.file;
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: [
            "Read ",
            jsxProd_default(Text, {
              bold: true,
              children: numLines,
            }),
            " ",
            numLines === 1 ? "line" : "lines",
          ],
        }),
      });
    }
  }
}
export {
  userFacingName,
  getToolUseSummary,
  getAgentOutputTaskId,
  renderToolResultMessage,
  renderToolUseMessage,
  renderToolUseTag,
};
