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
import { Xvn } from "../../remote/tools/nativeToolErrors.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { FSe } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { formatNumber } from "../../utils/format.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { getDisplayPath, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";

/**
 * 特定错误结果在非 verbose 非转录模式下的简化渲染。
 */
//@ chunk-ah34pb7m.js:16266-16347 placement = renderToolUseErrorMessage (0.767)
function renderToolUseErrorMessage_4(result, { verbose: verbose, isTranscriptMode: isTranscriptMode }) {
  return !verbose && !isTranscriptMode && result === Xvn ? e(Text, {}) : null;
}
/**
 * 渲染后台任务输出结果（仍在运行等）。
 */
//@ chunk-ah34pb7m.js:16347-16813 placement
function renderTaskOutputResult(m, d, { verbose: verbose, isTranscriptMode: isTranscriptMode }) {
  let f = FSe(m);
  if (!f) return null;
  if (f.status === "working")
    return verbose || isTranscriptMode
      ? e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: "still running" }) })
      : null;
  let h = f.status === "completed" ? f.result.content.reduce((T, x) => T + x.text.length, 0) : 0,
    joined = [
      f.status === "completed" && f.result.isError ? "completed with errors" : f.status,
      ...(h > 0 ? [`${formatNumber(h)} chars of output`] : []),
    ].join(" \xB7 ");
  return e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: joined }) });
}
//@ chunk-ah34pb7m.js:16813-18026 fingerprint = SearchResultSummary (0.639)
function SearchResultSummary(t0) {
  let T = w(26),
    {
      count: count,
      countLabel: countLabel,
      secondaryCount: secondaryCount,
      secondaryLabel: secondaryLabel,
      content: content,
      verbose: verbose,
    } = t0,
    x;
  if (T[0] !== count) ((x = r(Text, { bold: !0, children: [count, " "] })), (T[0] = count), (T[1] = x));
  else x = T[1];
  let k;
  if (T[2] !== count || T[3] !== countLabel)
    ((k = count === 0 || count > 1 ? countLabel : countLabel.slice(0, -1)),
      (T[2] = count),
      (T[3] = countLabel),
      (T[4] = k));
  else k = T[4];
  let b;
  if (T[5] !== x || T[6] !== k)
    ((b = r(Text, { children: ["Found ", x, k] })), (T[5] = x), (T[6] = k), (T[7] = b));
  else b = T[7];
  let E = b,
    B;
  if (T[8] !== secondaryCount || T[9] !== secondaryLabel)
    ((B =
      secondaryCount !== void 0 && secondaryLabel
        ? r(Text, {
            children: [
              " ",
              "across ",
              r(Text, { bold: !0, children: [secondaryCount, " "] }),
              secondaryCount === 0 || secondaryCount > 1 ? secondaryLabel : secondaryLabel.slice(0, -1),
            ],
          })
        : null),
      (T[8] = secondaryCount),
      (T[9] = secondaryLabel),
      (T[10] = B));
  else B = T[10];
  let L = B;
  if (verbose) {
    let N;
    if (T[11] === MEMO_CACHE_SENTINEL)
      ((N = e(Text, { dimColor: !0, children: "\xA0\xA0\u23BF \xA0" })), (T[11] = N));
    else N = T[11];
    let W;
    if (T[12] !== E || T[13] !== L)
      ((W = e(Box, { flexDirection: "row", children: r(Text, { children: [N, E, L] }) })),
        (T[12] = E),
        (T[13] = L),
        (T[14] = W));
    else W = T[14];
    let U;
    if (T[15] !== content)
      ((U = e(Box, { marginLeft: 5, children: e(Text, { children: content }) })),
        (T[15] = content),
        (T[16] = U));
    else U = T[16];
    let K;
    if (T[17] !== W || T[18] !== U)
      ((K = r(Box, { flexDirection: "column", children: [W, U] })), (T[17] = W), (T[18] = U), (T[19] = K));
    else K = T[19];
    return K;
  }
  let N;
  if (T[20] !== count) ((N = count > 0 && e(CtrlOToExpand, {})), (T[20] = count), (T[21] = N));
  else N = T[21];
  let W;
  if (T[22] !== E || T[23] !== L || T[24] !== N)
    ((W = e(MessageResponse, { height: 1, children: r(Text, { children: [E, L, " ", N] }) })),
      (T[22] = E),
      (T[23] = L),
      (T[24] = N),
      (T[25] = W));
  else W = T[25];
  return W;
}
/**
 * Grep 结果渲染：content 模式显示行数，count 模式显示匹配数与文件数，否则显示文件数。
 */
//@ chunk-ah34pb7m.js:18368-18778 fingerprint = renderToolResultMessage (1)
function renderToolResultMessage_3(
  {
    mode: mode = "files_with_matches",
    filenames: filenames,
    numFiles: numFiles,
    content: content,
    numLines: numLines,
    numMatches: numMatches,
  },
  _progressMessagesForMessage,
  { verbose: verbose },
) {
  if (mode === "content")
    return e(SearchResultSummary, {
      count: numLines ?? 0,
      countLabel: "lines",
      content: content,
      verbose: verbose,
    });
  if (mode === "count")
    return e(SearchResultSummary, {
      count: numMatches ?? 0,
      countLabel: "matches",
      secondaryCount: numFiles,
      secondaryLabel: "files",
      content: content,
      verbose: verbose,
    });
  let joined = filenames.map((filename) => filename).join(`
`);
  return e(SearchResultSummary, { count: numFiles, countLabel: "files", content: joined, verbose: verbose });
}
/**
 * Glob/Grep 调用渲染：pattern 与 path（非 verbose 时显示相对路径）。
 */
//@ chunk-e6aww6q8.js:1439687-1439832 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage({ pattern: pattern, path: path }, { verbose: verbose }) {
  if (!pattern) return null;
  let parts = [`pattern: "${pattern}"`];
  if (path) parts.push(`path: "${verbose ? path : getDisplayPath(path)}"`);
  return parts.join(", ");
}
//@ chunk-nc07tp5s.js:8904-9222 callgraph-witnessed = renderToolUseErrorMessage (0.42)
function renderToolUseErrorMessage(result, { verbose: verbose, toolDenialKind: toolDenialKind }) {
  if (!verbose && toolDenialKind !== "permission-rule" && typeof result === "string") {
    if (result.includes(FILE_NOT_FOUND_CWD_NOTE))
      return e(MessageResponse, { children: e(Text, { color: "error", children: "File not found" }) });
    if (extractTag(result, "tool_use_error"))
      return e(MessageResponse, { children: e(Text, { color: "error", children: "Error reading file" }) });
  }
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}

export {
  renderToolResultMessage_3,
  renderTaskOutputResult,
  renderToolUseErrorMessage_4,
  renderToolUseMessage,
};
