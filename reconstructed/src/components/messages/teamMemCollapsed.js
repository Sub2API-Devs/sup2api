/**
 * components/messages/teamMemCollapsed.tsx
 *
 * 团队记忆读写操作的折叠计数文案（Recalling/Recalled N team memories）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/teamMemCollapsed.tsx
 * pieces: chunk-ah34pb7m.js (13)
 * attribution: placement 11, fingerprint 2
 */
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { K2e } from "../../utils/permissions/serverClassifier/arbiter.js";
import { lMe } from "../../utils/taggedId.js";
import {
  getReadonlyNoteForTool,
  getClassifierUnavailableNotes,
  describeClassifierFailureParts,
  buildClassifierUnavailableMessage,
  stripDenialMessageSuffix,
  isClassifierDenial,
  isWellFormedClassifierDenial,
} from "../../utils/messages.js";
import { uniq } from "../../utils/collections.js";
import { wR, parseModelId, hasReservedTag } from "../../utils/model/modelIds.js";
import { qa } from "../../utils/stripAnsi.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Blockquote } from "../Blockquote.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:148396-148400 placement
j();
//@ chunk-ah34pb7m.js:148433-148437 placement
j();
/**
 * 值变为 undefined 后，保持旧值至少 d 毫秒再清除。
 */
//@ chunk-ah34pb7m.js:148437-148673 placement
function useLingeringValue(m, d) {
  let c = useClock(),
    [g, f] = y(m),
    h = R(m !== void 0 ? Date.now() : 0);
  return (
    P(() => {
      if (m !== void 0) {
        ((h.current = Date.now()), f(m));
        return;
      }
      let M = d - (Date.now() - h.current);
      if (M <= 0) {
        f(void 0);
        return;
      }
      return c.setTimeout(() => f(void 0), M);
    }, [m, d, c]),
    g
  );
}
//@ chunk-ah34pb7m.js:148673-148677 placement
j();
/**
 * 节流值更新：距上次更新不足 d 毫秒时延后到期再更新。
 */
//@ chunk-ah34pb7m.js:148677-148875 placement
function useThrottledValue(m, d) {
  let c = useClock(),
    [g, f] = y(m),
    h = R(0);
  return (
    P(() => {
      let M = Date.now() - h.current;
      if (M >= d) {
        ((h.current = Date.now()), f(m));
        return;
      }
      return c.setTimeout(() => {
        ((h.current = Date.now()), f(m));
      }, d - M);
    }, [m, d, c]),
    g
  );
}
/**
 * 团队记忆折叠显示使用的私有区标记字符与重试/时长描述表。
 */
//@ chunk-ah34pb7m.js:148875-150521 placement
var TEAM_MEM_MARKERS = "\uE000",
  pg = "\uE001",
  hx = "\uE002",
  Tx = 599,
  pL = [void 0, 429, 529, Tx],
  cL = [
    { ms: void 0, words: void 0 },
    { ms: 1000, words: "about 1 second" },
    { ms: 7200000, words: "about 2 hours" },
  ],
  gL = [
    { handedOff: !1, skippable: !1 },
    { handedOff: !0, skippable: !1 },
    { handedOff: !1, skippable: !0 },
  ],
  fL = [
    void 0,
    "wall_clock_timeout",
    "connection_timeout",
    "connection_error",
    "server_not_requested",
    "server_input_rewritten",
    "server_unsupported",
    "server_thread_unsupported",
    "server_stream_ended",
    "server_unavailable_disabled",
    "server_unavailable_error",
    "server_unavailable_other",
    "server_unrecognized_result",
    "server_no_result",
    "server_results_not_held",
    "server_context_stale",
    "server_call_skipped",
    "server_call_unavailable_timeout",
    "server_call_unavailable_error",
    "server_call_unavailable_refused",
    "server_call_unavailable_input_too_long",
    "server_call_unavailable_truncated",
    "server_call_unavailable_other",
  ],
  hL = io(() => {
    let m = `(?<model>${urlPatternToRegex(K2e)}|[a-z0-9.:@\\[\\]-]{1,64})`,
      d = `(?<tool>[\\w-]{1,${lMe}})`,
      c =
        "(?:about \\d{1,3} seconds?|about \\d{1,2} minutes|about \\d{1,2}(?:\\.\\d)? hours?|more than a day)",
      g = urlPatternToRegex(getReadonlyNoteForTool(!1)),
      f = `(?:${getClassifierUnavailableNotes().map(urlPatternToRegex).join("|")})`,
      h = new Set();
    for (let M of fL) {
      let flattened = pL.flatMap((k) =>
          describeClassifierFailureParts(k, M).map((b) =>
            urlPatternToRegex(b).replace(`HTTP ${Tx}`, "HTTP \\d{3}"),
          ),
        ),
        x = `(?:${uniq(flattened).join("|")})`;
      for (let { ms: ms, words: words } of cL)
        for (let { handedOff: handedOff, skippable: skippable } of gL) {
          let L = urlPatternToRegex(
            buildClassifierUnavailableMessage(
              pg,
              TEAM_MEM_MARKERS,
              void 0,
              M,
              ms,
              handedOff,
              void 0,
              skippable,
              !1,
              void 0,
              hx,
            ),
          );
          h.add(
            (words === void 0
              ? L
              : L.replaceAll(
                  words,
                  "(?:about \\d{1,3} seconds?|about \\d{1,2} minutes|about \\d{1,2}(?:\\.\\d)? hours?|more than a day)",
                )
            )
              .replaceAll(g, f)
              .replaceAll(hx, x)
              .replaceAll(TEAM_MEM_MARKERS, m)
              .replace(pg, d)
              .replaceAll(pg, "\\k<tool>"),
          );
        }
    }
    return [...h].map((M) => new RegExp(`^${M}$`));
  });
/**
 * 判断拒绝文本是否属于"模型不可用"类（匹配模式里的 model 组是指定模型或已知不可用模型）。
 */
//@ chunk-ah34pb7m.js:150521-150653 placement
function isModelUnavailableDenial(m) {
  let d = stripDenialMessageSuffix(m);
  return hL().some((c) => {
    let g = c.exec(d)?.groups?.model;
    return g === K2e || (g !== void 0 && (wR(parseModelId(g)) || hasReservedTag(g)));
  });
}
/**
 * 工具结果是否为自动模式分类器拦截：本地拒绝看 toolDenialKind，远程拒绝要求格式完整的分类器拒绝文本。
 */
//@ chunk-ah34pb7m.js:150653-150833 placement
function isAutoModeBlockedResult(
  m,
  { toolDenialKind: toolDenialKind, remoteToolDenialKind: remoteToolDenialKind },
) {
  if (typeof m !== "string") return !1;
  return toolDenialKind !== void 0
    ? toolDenialKind === "automode-blocked" && isClassifierDenial(m)
    : remoteToolDenialKind === "automode-blocked" && qa(m) === m && isWellFormedClassifierDenial(m);
}
/**
 * 远程拒绝种类为 automode-unavailable 且文本为模型不可用类时为真。
 */
//@ chunk-ah34pb7m.js:150833-150964 placement
function isAutoModeUnavailableResult(
  m,
  { toolDenialKind: toolDenialKind, remoteToolDenialKind: remoteToolDenialKind },
) {
  return (
    toolDenialKind === void 0 &&
    remoteToolDenialKind === "automode-unavailable" &&
    typeof m === "string" &&
    isModelUnavailableDenial(m)
  );
}
/**
 * 用户消息里是否有被自动模式拦截的 tool_result。
 */
//@ chunk-ah34pb7m.js:150964-151107 placement
function hasAutoModeBlockedToolResult(m) {
  return (
    m.type === "user" &&
    Array.isArray(m.message.content) &&
    m.message.content.some((d) => d.type === "tool_result" && isAutoModeBlockedResult(d.content, m))
  );
}
/**
 * 以引用块显示拒绝标签与原因。
 */
//@ chunk-ah34pb7m.js:151107-151298 placement
function DenialReasonQuote(m) {
  let g = w(3),
    { label: label, reason: reason } = m,
    f;
  if (g[0] !== label || g[1] !== reason)
    ((f = e(Blockquote, {
      multiline: !0,
      children: r(Text, { dimColor: !0, wrap: "wrap", children: [label, reason] }),
    })),
      (g[0] = label),
      (g[1] = reason),
      (g[2] = f));
  else f = g[2];
  return f;
}
//@ chunk-ah34pb7m.js:151298-151411 fingerprint = checkHasTeamMemOps (1)
function checkHasTeamMemOps(message) {
  return (
    (message.teamMemorySearchCount ?? 0) > 0 ||
    (message.teamMemoryReadCount ?? 0) > 0 ||
    (message.teamMemoryWriteCount ?? 0) > 0
  );
}
//@ chunk-ah34pb7m.js:151411-152699 fingerprint = TeamMemCountParts (0.95)
function TeamMemCountParts(t0) {
  let $ = w(15),
    { message: message, isActiveGroup: isActiveGroup, hasPrecedingParts: hasPrecedingParts } = t0,
    f = message.teamMemoryReadCount ?? 0,
    h = message.teamMemorySearchCount ?? 0,
    M = message.teamMemoryWriteCount ?? 0;
  if (f === 0 && h === 0 && M === 0) {
    return null;
  }
  let x;
  if ($[0] !== hasPrecedingParts || $[1] !== isActiveGroup || $[2] !== f || $[3] !== h || $[4] !== M) {
    let nodes = [];
    let b = hasPrecedingParts ? 1 : 0;
    if (f > 0) {
      let E = isActiveGroup ? (b === 0 ? "Recalling" : "recalling") : b === 0 ? "Recalled" : "recalled";
      if (b > 0) {
        let B;
        if ($[6] === MEMO_CACHE_SENTINEL) ((B = e(Text, { children: ", " }, "comma-tmr")), ($[6] = B));
        else B = $[6];
        nodes.push(B);
      }
      (nodes.push(
        r(
          Text,
          {
            children: [
              E,
              " ",
              e(Text, { bold: !0, children: f }),
              " team",
              " ",
              f === 1 ? "memory" : "memories",
            ],
          },
          "team-mem-read",
        ),
      ),
        b++);
    }
    if (h > 0) {
      let L = isActiveGroup ? (b === 0 ? "Searching" : "searching") : b === 0 ? "Searched" : "searched";
      if (b > 0) {
        let B;
        if ($[7] === MEMO_CACHE_SENTINEL) ((B = e(Text, { children: ", " }, "comma-tms")), ($[7] = B));
        else B = $[7];
        nodes.push(B);
      }
      (nodes.push(e(Text, { children: `${L} team memories` }, "team-mem-search")), b++);
    }
    if (M > 0) {
      let N = isActiveGroup ? (b === 0 ? "Writing" : "writing") : b === 0 ? "Wrote" : "wrote";
      if (b > 0) {
        let B;
        if ($[8] === MEMO_CACHE_SENTINEL) ((B = e(Text, { children: ", " }, "comma-tmw")), ($[8] = B));
        else B = $[8];
        nodes.push(B);
      }
      let B;
      if ($[9] !== M) ((B = e(Text, { bold: !0, children: M })), ($[9] = M), ($[10] = B));
      else B = $[10];
      const W = M === 1 ? "memory" : "memories";
      let U;
      if ($[11] !== B || $[12] !== W || $[13] !== N)
        ((U = r(Text, { children: [N, " ", B, " team", " ", W] }, "team-mem-write")),
          ($[11] = B),
          ($[12] = W),
          ($[13] = N),
          ($[14] = U));
      else U = $[14];
      nodes.push(U);
    }
    x = e(Fragment, { children: nodes });
    (($[0] = hasPrecedingParts), ($[1] = isActiveGroup), ($[2] = f), ($[3] = h), ($[4] = M), ($[5] = x));
  } else x = $[5];
  return x;
}

export {
  hasAutoModeBlockedToolResult,
  DenialReasonQuote,
  isAutoModeBlockedResult,
  isAutoModeUnavailableResult,
  checkHasTeamMemOps,
  useThrottledValue,
  useLingeringValue,
  isModelUnavailableDenial,
  TeamMemCountParts,
};
