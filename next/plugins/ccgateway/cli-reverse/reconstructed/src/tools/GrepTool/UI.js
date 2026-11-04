/**
 * tools/GrepTool/UI.tsx
 *
 * Grep/Glob 结果摘要渲染（Found N files/lines/matches）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GrepTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (4), chunk-e6aww6q8.js (1), chunk-nc07tp5s.js (1)
 * attribution: placement 2, fingerprint 3, callgraph-witnessed 1
 */
import { getDisplayPath, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { GET_TASK_REPEAT_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { parseTaskResultOrNull } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { formatNumber } from "../../utils/format.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";

//@ chunk-e6aww6q8.js:1439687-1439832 fingerprint (2.1.88 match: renderToolUseMessage, 1)
/**
 * Glob/Grep 调用渲染：pattern 与 path（非 verbose 时显示相对路径）。
 */
function renderToolUseMessage({ pattern, path }, { verbose }) {
  if (!pattern) return null;
  let parts = [`pattern: "${pattern}"`];
  if (path) parts.push(`path: "${verbose ? path : getDisplayPath(path)}"`);
  return parts.join(", ");
}
//@ chunk-nc07tp5s.js:8904-9222 callgraph-witnessed (2.1.88 match: renderToolUseErrorMessage, 0.42)
function renderToolUseErrorMessage(result, { verbose, toolDenialKind }) {
  if (!verbose && toolDenialKind !== "permission-rule" && typeof result === "string") {
    if (result.includes(FILE_NOT_FOUND_CWD_NOTE))
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: "File not found",
        }),
      });
    if (extractTag(result, "tool_use_error"))
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: "Error reading file",
        }),
      });
  }
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-ah34pb7m.js:16266-16347 placement (2.1.88 match: renderToolUseErrorMessage, 0.767)
/**
 * 特定错误结果在非 verbose 非转录模式下的简化渲染。
 */
function renderToolUseErrorMessage_4(result, { verbose, isTranscriptMode }) {
  return !verbose && !isTranscriptMode && result === GET_TASK_REPEAT_TEXT ? jsxProd_default(Text, {}) : null;
}
//@ chunk-ah34pb7m.js:16347-16813 placement
/**
 * 渲染后台任务输出结果（仍在运行等）。
 */
function renderTaskOutputResult(result, progressMessages, { verbose, isTranscriptMode }) {
  let taskResultOrNull = parseTaskResultOrNull(result);
  if (!taskResultOrNull) return null;
  if (taskResultOrNull.status === "working")
    return verbose || isTranscriptMode
      ? jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "still running",
          }),
        })
      : null;
  let outputChars =
    taskResultOrNull.status === "completed"
      ? taskResultOrNull.result.content.reduce((acc, contentBlock) => acc + contentBlock.text.length, 0)
      : 0;
  let children = [
    taskResultOrNull.status === "completed" && taskResultOrNull.result.isError
      ? "completed with errors"
      : taskResultOrNull.status,
    ...(outputChars > 0 ? [`${formatNumber(outputChars)} chars of output`] : []),
  ].join(" \xB7 ");
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      dimColor: true,
      children,
    }),
  });
}
//@ chunk-ah34pb7m.js:16813-18026 fingerprint (2.1.88 match: SearchResultSummary, 0.639)
function SearchResultSummary(props) {
  let $ = useMemoCache(26);
  let { count, countLabel, secondaryCount, secondaryLabel, content, verbose } = props;
  let t1;
  if ($[0] !== count) {
    t1 = jsxProd_default_2(Text, {
      bold: true,
      children: [count, " "],
    });
    $[0] = count;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== count || $[3] !== countLabel) {
    t2 = count === 0 || count > 1 ? countLabel : countLabel.slice(0, -1);
    $[2] = count;
    $[3] = countLabel;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== t1 || $[6] !== t2) {
    t3 = jsxProd_default_2(Text, {
      children: ["Found ", t1, t2],
    });
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
  } else t3 = $[7];
  let primaryText = t3;
  let t4;
  if ($[8] !== secondaryCount || $[9] !== secondaryLabel) {
    t4 =
      secondaryCount !== undefined && secondaryLabel
        ? jsxProd_default_2(Text, {
            children: [
              " ",
              "across ",
              jsxProd_default_2(Text, {
                bold: true,
                children: [secondaryCount, " "],
              }),
              secondaryCount === 0 || secondaryCount > 1 ? secondaryLabel : secondaryLabel.slice(0, -1),
            ],
          })
        : null;
    $[8] = secondaryCount;
    $[9] = secondaryLabel;
    $[10] = t4;
  } else t4 = $[10];
  let secondaryText = t4;
  if (verbose) {
    let t5;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      t5 = jsxProd_default(Text, {
        dimColor: true,
        children: "\xA0\xA0\u23BF \xA0",
      });
      $[11] = t5;
    } else t5 = $[11];
    let t6;
    if ($[12] !== primaryText || $[13] !== secondaryText) {
      t6 = jsxProd_default(Box, {
        flexDirection: "row",
        children: jsxProd_default_2(Text, {
          children: [t5, primaryText, secondaryText],
        }),
      });
      $[12] = primaryText;
      $[13] = secondaryText;
      $[14] = t6;
    } else t6 = $[14];
    let t7;
    if ($[15] !== content) {
      t7 = jsxProd_default(Box, {
        marginLeft: 5,
        children: jsxProd_default(Text, {
          children: content,
        }),
      });
      $[15] = content;
      $[16] = t7;
    } else t7 = $[16];
    let t8;
    if ($[17] !== t6 || $[18] !== t7) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t6, t7],
      });
      $[17] = t6;
      $[18] = t7;
      $[19] = t8;
    } else t8 = $[19];
    return t8;
  }
  let t5;
  if ($[20] !== count) {
    t5 = count > 0 && jsxProd_default(CtrlOToExpand, {});
    $[20] = count;
    $[21] = t5;
  } else t5 = $[21];
  let t6;
  if ($[22] !== primaryText || $[23] !== secondaryText || $[24] !== t5) {
    t6 = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default_2(Text, {
        children: [primaryText, secondaryText, " ", t5],
      }),
    });
    $[22] = primaryText;
    $[23] = secondaryText;
    $[24] = t5;
    $[25] = t6;
  } else t6 = $[25];
  return t6;
}
//@ chunk-ah34pb7m.js:18368-18778 fingerprint (2.1.88 match: renderToolResultMessage, 1)
/**
 * Grep 结果渲染：content 模式显示行数，count 模式显示匹配数与文件数，否则显示文件数。
 */
function renderToolResultMessage_3(
  { mode = "files_with_matches", filenames, numFiles, content, numLines, numMatches },
  _progressMessagesForMessage,
  { verbose },
) {
  if (mode === "content")
    return jsxProd_default(SearchResultSummary, {
      count: numLines ?? 0,
      countLabel: "lines",
      content,
      verbose,
    });
  if (mode === "count")
    return jsxProd_default(SearchResultSummary, {
      count: numMatches ?? 0,
      countLabel: "matches",
      secondaryCount: numFiles,
      secondaryLabel: "files",
      content,
      verbose,
    });
  let fileListContent = filenames.map((filename) => filename).join(`
`);
  return jsxProd_default(SearchResultSummary, {
    count: numFiles,
    countLabel: "files",
    content: fileListContent,
    verbose,
  });
}
export {
  renderToolResultMessage_3,
  renderTaskOutputResult,
  renderToolUseErrorMessage_4,
  renderToolUseMessage,
  renderToolUseErrorMessage,
};
