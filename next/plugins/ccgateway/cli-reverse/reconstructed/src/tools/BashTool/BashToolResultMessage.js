/**
 * tools/BashTool/BashToolResultMessage.tsx
 *
 * Bash 结果渲染组件：剥离沙箱违规块与 cwd 重置提示，显示 stdout/stderr、编辑 diff、后台运行或空输出说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/BashToolResultMessage.tsx
 * pieces: chunk-vaywhf0g.js (8)
 * attribution: sole-consumer 5, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getDisplayPath } from "../../utils/file.js";
import { countWhere } from "../../utils/collections.js";
import { StructuredDiffList } from "../../components/StructuredDiffList.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { stripSandboxViolations } from "../../components/FallbackToolUseErrorMessage.js";
import { CWD_RESET_WARNING_RE } from "./utils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { commandMovesWorkTree_2 } from "./bashEditDiff/snapshot.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ShellTimeDisplay } from "../../components/shell/ShellTimeDisplay.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vaywhf0g.js:779-783 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vaywhf0g.js:779", () => {
  init_react_production();
});
//@ chunk-vaywhf0g.js:783-1016 sole-consumer
/**
 * Bash 编辑 diff 显示用常量：预览行数、并发命令提示、git 步骤可能移动工作树的提示、首个 diff（用于只显示一次说明）。
 */
var DIFF_PREVIEW_LINES = 40;
var SHARED_DIFF_NOTE =
  "(another command ran in this repository at the same time; a change made by either may show under either result)";
var TREE_MOVED_NOTE =
  "(a git step in this command can move the working tree, so these may be its changes, not edits)";
var firstShownDiff = null;
//@ chunk-vaywhf0g.js:1016-2866 sole-consumer
/**
 * 显示 Bash 命令期间文件变化：每个文件的创建/删除/更新与增删行数、diff（非 verbose 时截断）、更多文件、树移动与并发提示；跳过或不可用时显示说明。
 */
function BashEditDiff({ diff, verbose, style, treeMoved }) {
  let { columns } = useTerminalSize();
  if (diff.skipped || ((diff.unavailable || diff.shared) && diff.files.length === 0))
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: diff.skipped
          ? "(file diff skipped for this git command)"
          : diff.unavailable
            ? diff.moreFiles > 0
              ? diff.shared
                ? `(file diff unavailable for this command; ${pluralizeFiles(diff.moreFiles)} changed in this repository while it ran, by it or by other commands)`
                : `(file diff unavailable for this command; ${pluralizeFiles(diff.moreFiles)} changed)`
              : "(file diff unavailable for this command)"
            : SHARED_DIFF_NOTE,
      }),
    });
  firstShownDiff ??= diff;
  let editDiffNote =
    verbose || firstShownDiff === diff
      ? "(files that changed while this command ran, by the command or by another process; a convenience view, not a review or audit of the command)"
      : null;
  let sharedDiffNote = diff.shared ? SHARED_DIFF_NOTE : null;
  let isCondensed = (style === "condensed" || treeMoved) && !verbose;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      diff.files.map((file) => {
        let flattened = file.hunks.flatMap((hunk) => hunk.lines);
        let changeLabel = file.created ? "Created" : file.deleted ? "Deleted" : "Updated";
        let { hunks, hiddenLines } = verbose
          ? {
              hunks: file.hunks,
              hiddenLines: 0,
            }
          : truncateHunks(file.hunks, DIFF_PREVIEW_LINES);
        return jsxProd_default(
          MessageResponse,
          {
            children: jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default_2(Text, {
                  children: [
                    changeLabel,
                    " ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: verbose ? file.filePath : getDisplayPath(file.filePath),
                    }),
                    " ",
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [
                        "(+",
                        countWhere(flattened, (line) => line.startsWith("+")),
                        " -",
                        countWhere(flattened, (line) => line.startsWith("-")),
                        ")",
                      ],
                    }),
                  ],
                }),
                isCondensed
                  ? null
                  : jsxProd_default(StructuredDiffList, {
                      hunks,
                      dim: false,
                      width: columns - 12,
                      filePath: file.filePath,
                      firstLine: null,
                    }),
                hiddenLines > 0 && !isCondensed
                  ? jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["\u2026 ", hiddenLines, " more lines ", jsxProd_default(CtrlOToExpand, {})],
                    })
                  : null,
              ],
            }),
          },
          file.filePath,
        );
      }),
      diff.moreFiles > 0
        ? jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                diff.files.length > 0
                  ? `\u2026 ${diff.moreFiles} more ${diff.moreFiles === 1 ? "file" : "files"} changed`
                  : `${pluralizeFiles(diff.moreFiles)} changed (binary, mode only or too large to show)`,
                diff.unavailable ? " (part of the diff is unavailable)" : "",
              ],
            }),
          })
        : null,
      treeMoved
        ? jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                TREE_MOVED_NOTE,
                verbose
                  ? null
                  : jsxProd_default_2(Fragment, {
                      children: [" ", jsxProd_default(CtrlOToExpand, {})],
                    }),
              ],
            }),
          })
        : null,
      sharedDiffNote
        ? jsxProd_default(MessageResponse, {
            children: jsxProd_default(Text, {
              dimColor: true,
              children: sharedDiffNote,
            }),
          })
        : null,
      editDiffNote
        ? jsxProd_default(MessageResponse, {
            children: jsxProd_default(Text, {
              dimColor: true,
              children: editDiffNote,
            }),
          })
        : null,
    ],
  });
}
//@ chunk-vaywhf0g.js:2866-2917 sole-consumer
/**
 * 把数字拼成 “N file(s)”，用于提示命令运行期间有多少文件发生变化。
 */
function pluralizeFiles(moreFiles) {
  return `${moreFiles} ${moreFiles === 1 ? "file" : "files"}`;
}
//@ chunk-vaywhf0g.js:2917-3156 sole-consumer
function truncateHunks(hunks, maxLines) {
  let shownHunks = [];
  let shownLineCount = 0;
  let hiddenLineCount = 0;
  for (let hunk of hunks) {
    let remainingLines = maxLines - shownLineCount;
    if (remainingLines <= 0) hiddenLineCount += hunk.lines.length;
    else if (hunk.lines.length <= remainingLines) {
      shownHunks.push(hunk);
      shownLineCount += hunk.lines.length;
    } else {
      shownHunks.push({
        ...hunk,
        lines: hunk.lines.slice(0, remainingLines),
      });
      hiddenLineCount += hunk.lines.length - remainingLines;
      shownLineCount = maxLines;
    }
  }
  return {
    hunks: shownHunks,
    hiddenLines: hiddenLineCount,
  };
}
//@ chunk-vaywhf0g.js:3156-3298 fingerprint (2.1.88 match: extractSandboxViolations, 1)
/**
 * 从 stderr 去掉 <sandbox_violations> 块，返回 cleanedStderr。
 */
function extractSandboxViolations(stderr) {
  if (!stderr.match(/<sandbox_violations>([\s\S]*?)<\/sandbox_violations>/))
    return {
      cleanedStderr: stderr,
    };
  return {
    cleanedStderr: stripSandboxViolations(stderr).trim(),
  };
}
//@ chunk-vaywhf0g.js:3298-3464 fingerprint (2.1.88 match: extractCwdResetWarning, 1)
/**
 * 从 stderr 提取末尾 "Shell cwd was reset to …" 行，返回去掉该行的 stderr 和警告文本。
 */
function extractCwdResetWarning(stderr) {
  let match = stderr.match(CWD_RESET_WARNING_RE);
  if (!match)
    return {
      cleanedStderr: stderr,
      cwdResetWarning: null,
    };
  let cwdResetWarning = match[1] ?? null;
  return {
    cleanedStderr: stderr.replace(CWD_RESET_WARNING_RE, "").trim(),
    cwdResetWarning,
  };
}
//@ chunk-vaywhf0g.js:3464-5402 fingerprint (2.1.88 match: BashToolResultMessage, 0.657)
/**
 * Bash 结果渲染：剥离 <sandbox_violations> 和 "Shell cwd was reset" 行，分别显示 stdout/stderr、cwd 提示、编辑 diff，空输出显示 returnCodeInterpretation / Done / (No output)，后台任务显示 "Running in the background"。
 */
function BashToolResultMessage(props) {
  let $ = useMemoCache(44);
  let { content, verbose, timeoutMs, style, command } = props;
  let {
    stdout,
    stderr,
    isImage,
    returnCodeInterpretation,
    noOutputExpected,
    backgroundTaskId,
    bashEditDiff,
  } = content;
  let stdout_2 = stdout === undefined ? "" : stdout;
  let stdErrWithViolations = stderr === undefined ? "" : stderr;
  let treeMovedCache;
  if ($[0] !== bashEditDiff || $[1] !== command) {
    treeMovedCache = bashEditDiff !== undefined && command !== undefined && commandMovesWorkTree_2(command);
    $[0] = bashEditDiff;
    $[1] = command;
    $[2] = treeMovedCache;
  } else treeMovedCache = $[2];
  let treeMoved = treeMovedCache;
  let Container;
  let cwdResetWarning;
  let stderr_2;
  let flexDirection;
  let stdoutElement;
  let stderrElement;
  let earlyReturn;
  if ($[3] !== isImage || $[4] !== stdErrWithViolations || $[5] !== stdout_2 || $[6] !== verbose) {
    earlyReturn = EARLY_RETURN_SENTINEL;
    Le: {
      let { cleanedStderr: stderrWithoutViolations } = extractSandboxViolations(stdErrWithViolations);
      ({ cleanedStderr: stderr_2, cwdResetWarning } = extractCwdResetWarning(stderrWithoutViolations));
      if (isImage) {
        let t8;
        if ($[14] === MEMO_CACHE_SENTINEL) {
          t8 = jsxProd_default(MessageResponse, {
            height: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: "[Image data detected and sent to Claude]",
            }),
          });
          $[14] = t8;
        } else t8 = $[14];
        earlyReturn = t8;
        break Le;
      }
      Container = Box;
      flexDirection = "column";
      if ($[15] !== stdout_2 || $[16] !== verbose) {
        stdoutElement =
          stdout_2 !== ""
            ? jsxProd_default(OutputLine, {
                content: stdout_2,
                verbose,
              })
            : null;
        $[15] = stdout_2;
        $[16] = verbose;
        $[17] = stdoutElement;
      } else stdoutElement = $[17];
      stderrElement =
        stderr_2.trim() !== ""
          ? jsxProd_default(OutputLine, {
              content: stderr_2,
              verbose,
              isError: true,
            })
          : null;
    }
    $[3] = isImage;
    $[4] = stdErrWithViolations;
    $[5] = stdout_2;
    $[6] = verbose;
    $[7] = Container;
    $[8] = cwdResetWarning;
    $[9] = stderr_2;
    $[10] = flexDirection;
    $[11] = stdoutElement;
    $[12] = stderrElement;
    $[13] = earlyReturn;
  } else {
    Container = $[7];
    cwdResetWarning = $[8];
    stderr_2 = $[9];
    flexDirection = $[10];
    stdoutElement = $[11];
    stderrElement = $[12];
    earlyReturn = $[13];
  }
  if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
  let cwdResetElement;
  if ($[18] !== cwdResetWarning) {
    cwdResetElement = cwdResetWarning
      ? jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: cwdResetWarning,
          }),
        })
      : null;
    $[18] = cwdResetWarning;
    $[19] = cwdResetElement;
  } else cwdResetElement = $[19];
  let editDiffElement;
  if ($[20] !== bashEditDiff || $[21] !== style || $[22] !== treeMoved || $[23] !== verbose) {
    editDiffElement = bashEditDiff
      ? jsxProd_default(BashEditDiff, {
          diff: bashEditDiff,
          verbose,
          style,
          treeMoved,
        })
      : null;
    $[20] = bashEditDiff;
    $[21] = style;
    $[22] = treeMoved;
    $[23] = verbose;
    $[24] = editDiffElement;
  } else editDiffElement = $[24];
  let summaryElement;
  if (
    $[25] !== backgroundTaskId ||
    $[26] !== bashEditDiff ||
    $[27] !== cwdResetWarning ||
    $[28] !== noOutputExpected ||
    $[29] !== returnCodeInterpretation ||
    $[30] !== stderr_2 ||
    $[31] !== stdout_2
  ) {
    summaryElement =
      backgroundTaskId || (stdout_2 === "" && stderr_2.trim() === "" && !cwdResetWarning && !bashEditDiff)
        ? jsxProd_default(MessageResponse, {
            height: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: backgroundTaskId
                ? jsxProd_default_2(Fragment, {
                    children: [
                      "Running in the background",
                      " ",
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "down",
                        action: "manage",
                        parens: true,
                      }),
                    ],
                  })
                : returnCodeInterpretation || (noOutputExpected ? "Done" : "(No output)"),
            }),
          })
        : null;
    $[25] = backgroundTaskId;
    $[26] = bashEditDiff;
    $[27] = cwdResetWarning;
    $[28] = noOutputExpected;
    $[29] = returnCodeInterpretation;
    $[30] = stderr_2;
    $[31] = stdout_2;
    $[32] = summaryElement;
  } else summaryElement = $[32];
  let timeoutElement;
  if ($[33] !== timeoutMs) {
    timeoutElement =
      timeoutMs &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(ShellTimeDisplay, {
          timeoutMs,
        }),
      });
    $[33] = timeoutMs;
    $[34] = timeoutElement;
  } else timeoutElement = $[34];
  let t11;
  if (
    $[35] !== Container ||
    $[36] !== editDiffElement ||
    $[37] !== summaryElement ||
    $[38] !== timeoutElement ||
    $[39] !== flexDirection ||
    $[40] !== stdoutElement ||
    $[41] !== stderrElement ||
    $[42] !== cwdResetElement
  ) {
    t11 = jsxProd_default_2(Container, {
      flexDirection,
      children: [
        stdoutElement,
        stderrElement,
        cwdResetElement,
        editDiffElement,
        summaryElement,
        timeoutElement,
      ],
    });
    $[35] = Container;
    $[36] = editDiffElement;
    $[37] = summaryElement;
    $[38] = timeoutElement;
    $[39] = flexDirection;
    $[40] = stdoutElement;
    $[41] = stderrElement;
    $[42] = cwdResetElement;
    $[43] = t11;
  } else t11 = $[43];
  return t11;
}
export { BashToolResultMessage };
