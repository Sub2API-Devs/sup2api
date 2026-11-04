/**
 * components/FileEditToolUseRejectedMessage.tsx
 *
 * 文件编辑/写入被拒绝时显示 "User rejected update/write to <文件>" 与被拒 diff 或内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolUseRejectedMessage.tsx
 * pieces: chunk-vnfdjr3f.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { getDisplayPath } from "../utils/file.js";
import { FilePathLink } from "./FilePathLink.js";
import { MessageResponse } from "./MessageResponse.js";
import { HighlightedCode } from "./HighlightedCode.js";
import { OverflowHint } from "./CtrlOToExpand.js";
import { StructuredDiffList } from "./StructuredDiffList.js";

//@ chunk-vnfdjr3f.js:627-636 affinity
var MAX_DIFF_PREVIEW_LINES = 10;
//@ chunk-vnfdjr3f.js:636-2341 fingerprint = FileEditToolUseRejectedMessage (0.879)
/**
 * 编辑/写入被拒绝："User rejected update/write to <路径>"，写入显示被拒内容（高亮），编辑显示被拒 diff。
 */
function FileEditToolUseRejectedMessage(props) {
  let $ = useMemoCache(39);
  let { file_path, operation, patch, firstLine, fileContent, content, style, verbose } = props;
  let { columns } = useTerminalSize();
  let t1;
  if ($[0] !== operation) {
    t1 = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["User rejected ", operation, " to "],
    });
    $[0] = operation;
    $[1] = t1;
  } else t1 = $[1];
  let children;
  if ($[2] !== file_path || $[3] !== verbose) {
    children = verbose ? file_path : getDisplayPath(file_path);
    $[2] = file_path;
    $[3] = verbose;
    $[4] = children;
  } else children = $[4];
  let fileElement;
  if ($[5] !== file_path || $[6] !== children) {
    fileElement = jsxProd_default(Text, {
      bold: true,
      color: "subtle",
      children: jsxProd_default(FilePathLink, {
        filePath: file_path,
        children,
      }),
    });
    $[5] = file_path;
    $[6] = children;
    $[7] = fileElement;
  } else fileElement = $[7];
  let t4;
  if ($[8] !== t1 || $[9] !== fileElement) {
    t4 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [t1, fileElement],
    });
    $[8] = t1;
    $[9] = fileElement;
    $[10] = t4;
  } else t4 = $[10];
  let text = t4;
  if (style === "condensed" && !verbose) {
    let t5;
    if ($[11] !== text) {
      t5 = jsxProd_default(MessageResponse, {
        children: text,
      });
      $[11] = text;
      $[12] = t5;
    } else t5 = $[12];
    return t5;
  }
  if (operation === "write" && content !== undefined) {
    let plusLines;
    let t5;
    if ($[13] !== content || $[14] !== verbose) {
      let lines = content.split(`
`);
      plusLines = lines.length - MAX_DIFF_PREVIEW_LINES;
      t5 = verbose
        ? content
        : lines.slice(0, MAX_DIFF_PREVIEW_LINES).join(`
`);
      $[13] = content;
      $[14] = verbose;
      $[15] = plusLines;
      $[16] = t5;
    } else {
      plusLines = $[15];
      t5 = $[16];
    }
    let truncatedContent = t5;
    const code = truncatedContent || "(No content)";
    const width = columns - 12;
    let t8;
    if ($[17] !== file_path || $[18] !== code || $[19] !== width) {
      t8 = jsxProd_default(HighlightedCode, {
        code,
        filePath: file_path,
        width,
        dim: true,
      });
      $[17] = file_path;
      $[18] = code;
      $[19] = width;
      $[20] = t8;
    } else t8 = $[20];
    let overflowElement;
    if ($[21] !== plusLines || $[22] !== verbose) {
      overflowElement =
        !verbose &&
        jsxProd_default(OverflowHint, {
          count: plusLines,
        });
      $[21] = plusLines;
      $[22] = verbose;
      $[23] = overflowElement;
    } else overflowElement = $[23];
    let t10;
    if ($[24] !== t8 || $[25] !== overflowElement || $[26] !== text) {
      t10 = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [text, t8, overflowElement],
        }),
      });
      $[24] = t8;
      $[25] = overflowElement;
      $[26] = text;
      $[27] = t10;
    } else t10 = $[27];
    return t10;
  }
  if (!patch || patch.length === 0) {
    let t5;
    if ($[28] !== text) {
      t5 = jsxProd_default(MessageResponse, {
        children: text,
      });
      $[28] = text;
      $[29] = t5;
    } else t5 = $[29];
    return t5;
  }
  const width = columns - 12;
  let t6;
  if (
    $[30] !== fileContent ||
    $[31] !== file_path ||
    $[32] !== firstLine ||
    $[33] !== patch ||
    $[34] !== width
  ) {
    t6 = jsxProd_default(StructuredDiffList, {
      hunks: patch,
      dim: true,
      width,
      filePath: file_path,
      firstLine,
      fileContent,
    });
    $[30] = fileContent;
    $[31] = file_path;
    $[32] = firstLine;
    $[33] = patch;
    $[34] = width;
    $[35] = t6;
  } else t6 = $[35];
  let t7;
  if ($[36] !== t6 || $[37] !== text) {
    t7 = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [text, t6],
      }),
    });
    $[36] = t6;
    $[37] = text;
    $[38] = t7;
  } else t7 = $[38];
  return t7;
}
export { FileEditToolUseRejectedMessage };
