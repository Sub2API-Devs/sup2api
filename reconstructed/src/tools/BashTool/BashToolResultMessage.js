/**
 * tools/BashTool/BashToolResultMessage.tsx
 *
 * Bash 结果渲染组件：剥离沙箱违规块与 cwd 重置提示，显示 stdout/stderr、编辑 diff、后台运行或空输出说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/BashToolResultMessage.tsx
 * pieces: chunk-femza1ss.js (8)
 * attribution: sole-consumer 5, fingerprint 3
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getDisplayPath } from "../../utils/file.js";
import { count } from "../../utils/collections.js";
import { StructuredDiffList } from "../../components/StructuredDiffList.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { wmt } from "../../components/FallbackToolUseErrorMessage.js";
import { CWD_RESET_WARNING_RE } from "./utils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { commandMovesWorkTree } from "./bashEditDiff/snapshot.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ShellTimeDisplay } from "../../components/shell/ShellTimeDisplay.js";

//@ chunk-femza1ss.js:778-782 sole-consumer
j();
/**
 * Bash 编辑 diff 显示用常量：预览行数、并发命令提示、git 步骤可能移动工作树的提示、首个 diff（用于只显示一次说明）。
 */
//@ chunk-femza1ss.js:782-1015 sole-consumer
var DIFF_PREVIEW_LINES = 40,
  SHARED_DIFF_NOTE =
    "(another command ran in this repository at the same time; a change made by either may show under either result)",
  TREE_MOVED_NOTE =
    "(a git step in this command can move the working tree, so these may be its changes, not edits)",
  firstShownDiff = null;
/**
 * 显示 Bash 命令期间文件变化：每个文件的创建/删除/更新与增删行数、diff（非 verbose 时截断）、更多文件、树移动与并发提示；跳过或不可用时显示说明。
 */
//@ chunk-femza1ss.js:1015-2864 sole-consumer
function BashEditDiff({ diff: diff, verbose: verbose, style: style, treeMoved: treeMoved }) {
  let { columns: columns } = useTerminalSize();
  if (diff.skipped || ((diff.unavailable || diff.shared) && diff.files.length === 0))
    return e(MessageResponse, {
      children: e(Text, {
        dimColor: !0,
        children: diff.skipped
          ? "(file diff skipped for this git command)"
          : diff.unavailable
            ? diff.moreFiles > 0
              ? diff.shared
                ? `(file diff unavailable for this command; ${B(diff.moreFiles)} changed in this repository while it ran, by it or by other commands)`
                : `(file diff unavailable for this command; ${B(diff.moreFiles)} changed)`
              : "(file diff unavailable for this command)"
            : SHARED_DIFF_NOTE,
      }),
    });
  firstShownDiff ??= diff;
  let i =
      verbose || firstShownDiff === diff
        ? "(files that changed while this command ran, by the command or by another process; a convenience view, not a review or audit of the command)"
        : null,
    u = diff.shared ? SHARED_DIFF_NOTE : null,
    y = (style === "condensed" || treeMoved) && !verbose;
  return r(Box, {
    flexDirection: "column",
    children: [
      diff.files.map((file) => {
        let flattened = file.hunks.flatMap((hunk) => hunk.lines),
          v = file.created ? "Created" : file.deleted ? "Deleted" : "Updated",
          { hunks: hunks, hiddenLines: hiddenLines } = verbose
            ? { hunks: file.hunks, hiddenLines: 0 }
            : truncateHunks(file.hunks, DIFF_PREVIEW_LINES);
        return e(
          MessageResponse,
          {
            children: r(Box, {
              flexDirection: "column",
              children: [
                r(Text, {
                  children: [
                    v,
                    " ",
                    e(Text, { bold: !0, children: verbose ? file.filePath : getDisplayPath(file.filePath) }),
                    " ",
                    r(Text, {
                      dimColor: !0,
                      children: [
                        "(+",
                        count(flattened, (a) => a.startsWith("+")),
                        " -",
                        count(flattened, (a) => a.startsWith("-")),
                        ")",
                      ],
                    }),
                  ],
                }),
                y
                  ? null
                  : e(StructuredDiffList, {
                      hunks: hunks,
                      dim: !1,
                      width: columns - 12,
                      filePath: file.filePath,
                      firstLine: null,
                    }),
                hiddenLines > 0 && !y
                  ? r(Text, {
                      dimColor: !0,
                      children: ["\u2026 ", hiddenLines, " more lines ", e(CtrlOToExpand, {})],
                    })
                  : null,
              ],
            }),
          },
          file.filePath,
        );
      }),
      diff.moreFiles > 0
        ? e(MessageResponse, {
            children: r(Text, {
              dimColor: !0,
              children: [
                diff.files.length > 0
                  ? `\u2026 ${diff.moreFiles} more ${diff.moreFiles === 1 ? "file" : "files"} changed`
                  : `${B(diff.moreFiles)} changed (binary, mode only or too large to show)`,
                diff.unavailable ? " (part of the diff is unavailable)" : "",
              ],
            }),
          })
        : null,
      treeMoved
        ? e(MessageResponse, {
            children: r(Text, {
              dimColor: !0,
              children: [
                TREE_MOVED_NOTE,
                verbose ? null : r(Fragment, { children: [" ", e(CtrlOToExpand, {})] }),
              ],
            }),
          })
        : null,
      u ? e(MessageResponse, { children: e(Text, { dimColor: !0, children: u }) }) : null,
      i ? e(MessageResponse, { children: e(Text, { dimColor: !0, children: i }) }) : null,
    ],
  });
}
//@ chunk-femza1ss.js:2864-2915 sole-consumer
function B(t) {
  return `${t} ${t === 1 ? "file" : "files"}`;
}
//@ chunk-femza1ss.js:2915-3154 sole-consumer
function truncateHunks(t, l) {
  let o = [],
    c = 0,
    h = 0;
  for (let i of t) {
    let u = l - c;
    if (u <= 0) h += i.lines.length;
    else if (i.lines.length <= u) (o.push(i), (c += i.lines.length));
    else (o.push({ ...i, lines: i.lines.slice(0, u) }), (h += i.lines.length - u), (c = l));
  }
  return { hunks: o, hiddenLines: h };
}
/**
 * 从 stderr 去掉 <sandbox_violations> 块，返回 cleanedStderr。
 */
//@ chunk-femza1ss.js:3154-3296 fingerprint = extractSandboxViolations (1)
function extractSandboxViolations(stderr) {
  if (!stderr.match(/<sandbox_violations>([\s\S]*?)<\/sandbox_violations>/)) return { cleanedStderr: stderr };
  return { cleanedStderr: wmt(stderr).trim() };
}
/**
 * 从 stderr 提取末尾 "Shell cwd was reset to …" 行，返回去掉该行的 stderr 和警告文本。
 */
//@ chunk-femza1ss.js:3296-3462 fingerprint = extractCwdResetWarning (1)
function extractCwdResetWarning(stderr) {
  let match = stderr.match(CWD_RESET_WARNING_RE);
  if (!match) return { cleanedStderr: stderr, cwdResetWarning: null };
  let cwdResetWarning = match[1] ?? null;
  return { cleanedStderr: stderr.replace(CWD_RESET_WARNING_RE, "").trim(), cwdResetWarning: cwdResetWarning };
}
/**
 * Bash 结果渲染：剥离 <sandbox_violations> 和 "Shell cwd was reset" 行，分别显示 stdout/stderr、cwd 提示、编辑 diff，空输出显示 returnCodeInterpretation / Done / (No output)，后台任务显示 "Running in the background"。
 */
//@ chunk-femza1ss.js:3462-5404 fingerprint = BashToolResultMessage (0.657)
function BashToolResultMessage(t0) {
  let p = w(44),
    { content: t1, verbose: verbose, timeoutMs: timeoutMs, style: style, command: command } = t0,
    {
      stdout: t2,
      stderr: t3,
      isImage: isImage,
      returnCodeInterpretation: returnCodeInterpretation,
      noOutputExpected: noOutputExpected,
      backgroundTaskId: backgroundTaskId,
      bashEditDiff: bashEditDiff,
    } = t1,
    a = t2 === void 0 ? "" : t2,
    V = t3 === void 0 ? "" : t3,
    ee;
  if (p[0] !== bashEditDiff || p[1] !== command)
    ((ee = bashEditDiff !== void 0 && command !== void 0 && commandMovesWorkTree(command)),
      (p[0] = bashEditDiff),
      (p[1] = command),
      (p[2] = ee));
  else ee = p[2];
  let A = ee,
    x,
    f,
    k,
    M,
    T,
    D,
    z;
  if (p[3] !== isImage || p[4] !== V || p[5] !== a || p[6] !== verbose) {
    z = EARLY_RETURN_SENTINEL;
    Fe: {
      let { cleanedStderr: stderrWithoutViolations } = extractSandboxViolations(V);
      ({ cleanedStderr: k, cwdResetWarning: f } = extractCwdResetWarning(stderrWithoutViolations));
      if (isImage) {
        let g;
        if (p[14] === MEMO_CACHE_SENTINEL)
          ((g = e(MessageResponse, {
            height: 1,
            children: e(Text, { dimColor: !0, children: "[Image data detected and sent to Claude]" }),
          })),
            (p[14] = g));
        else g = p[14];
        z = g;
        break Fe;
      }
      x = Box;
      M = "column";
      if (p[15] !== a || p[16] !== verbose)
        ((T = a !== "" ? e(OutputLine, { content: a, verbose: verbose }) : null),
          (p[15] = a),
          (p[16] = verbose),
          (p[17] = T));
      else T = p[17];
      D = k.trim() !== "" ? e(OutputLine, { content: k, verbose: verbose, isError: !0 }) : null;
    }
    ((p[3] = isImage),
      (p[4] = V),
      (p[5] = a),
      (p[6] = verbose),
      (p[7] = x),
      (p[8] = f),
      (p[9] = k),
      (p[10] = M),
      (p[11] = T),
      (p[12] = D),
      (p[13] = z));
  } else ((x = p[7]), (f = p[8]), (k = p[9]), (M = p[10]), (T = p[11]), (D = p[12]), (z = p[13]));
  if (z !== EARLY_RETURN_SENTINEL) return z;
  let g;
  if (p[18] !== f)
    ((g = f ? e(MessageResponse, { children: e(Text, { dimColor: !0, children: f }) }) : null),
      (p[18] = f),
      (p[19] = g));
  else g = p[19];
  let C;
  if (p[20] !== bashEditDiff || p[21] !== style || p[22] !== A || p[23] !== verbose)
    ((C = bashEditDiff
      ? e(BashEditDiff, { diff: bashEditDiff, verbose: verbose, style: style, treeMoved: A })
      : null),
      (p[20] = bashEditDiff),
      (p[21] = style),
      (p[22] = A),
      (p[23] = verbose),
      (p[24] = C));
  else C = p[24];
  let P;
  if (
    p[25] !== backgroundTaskId ||
    p[26] !== bashEditDiff ||
    p[27] !== f ||
    p[28] !== noOutputExpected ||
    p[29] !== returnCodeInterpretation ||
    p[30] !== k ||
    p[31] !== a
  )
    ((P =
      backgroundTaskId || (a === "" && k.trim() === "" && !f && !bashEditDiff)
        ? e(MessageResponse, {
            height: 1,
            children: e(Text, {
              dimColor: !0,
              children: backgroundTaskId
                ? r(Fragment, {
                    children: [
                      "Running in the background",
                      " ",
                      e(KeyboardShortcutHint, { chord: "down", action: "manage", parens: !0 }),
                    ],
                  })
                : returnCodeInterpretation || (noOutputExpected ? "Done" : "(No output)"),
            }),
          })
        : null),
      (p[25] = backgroundTaskId),
      (p[26] = bashEditDiff),
      (p[27] = f),
      (p[28] = noOutputExpected),
      (p[29] = returnCodeInterpretation),
      (p[30] = k),
      (p[31] = a),
      (p[32] = P));
  else P = p[32];
  let W;
  if (p[33] !== timeoutMs)
    ((W = timeoutMs && e(MessageResponse, { children: e(ShellTimeDisplay, { timeoutMs: timeoutMs }) })),
      (p[33] = timeoutMs),
      (p[34] = W));
  else W = p[34];
  let te;
  if (
    p[35] !== x ||
    p[36] !== C ||
    p[37] !== P ||
    p[38] !== W ||
    p[39] !== M ||
    p[40] !== T ||
    p[41] !== D ||
    p[42] !== g
  )
    ((te = r(x, { flexDirection: M, children: [T, D, g, C, P, W] })),
      (p[35] = x),
      (p[36] = C),
      (p[37] = P),
      (p[38] = W),
      (p[39] = M),
      (p[40] = T),
      (p[41] = D),
      (p[42] = g),
      (p[43] = te));
  else te = p[43];
  return te;
}

export { BashToolResultMessage };
