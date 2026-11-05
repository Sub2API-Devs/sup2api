/**
 * services/sessionStatus/sessionStateClassifier.ts
 *
 * 2.1.316 新增。会话状态分类（启发式 + 模型）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3bj63apf.js (33), chunk-hvf6qeg9.js (3)
 * attribution: placement 34, layout 1, affinity 1
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_20, create_12, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { countWhere } from "../../utils/collections.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { truncateContent } from "../../utils/telemetry/betaSessionTracing.js";
import { foldConfusableCharacters } from "../../utils/confusables.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hvf6qeg9.js:297-765 placement
/**
 * 后台会话状态：在途工作快照（任务、排队、类型）及变化信号、待处理结构化结果、迁移后的 cwd 等。
 */
class SessionStatusState {
  inFlightSnapshot = {
    tasks: 0,
    queued: 0,
    kinds: [],
    items: [],
  };
  inFlightSnapshotChanged = createSignal();
  pendingStructuredResult = undefined;
  relocatedCwd = undefined;
  ownStateWriteDepth = 0;
  warnedUnknownDisabledSurface = false;
  publishInFlightSnapshot(inFlightSnapshot) {
    this.inFlightSnapshot = inFlightSnapshot;
    try {
      this.inFlightSnapshotChanged.emit();
    } catch {}
  }
  reset() {
    this.pendingStructuredResult = undefined;
    this.relocatedCwd = undefined;
    this.warnedUnknownDisabledSurface = false;
    this.publishInFlightSnapshot({
      tasks: 0,
      queued: 0,
      kinds: [],
      items: [],
    });
  }
}
//@ chunk-hvf6qeg9.js:765-788 placement
/**
 * 按 host 保存的会话状态分类状态。
 */
var sessionStatusStateSlots; // deferred: uses SessionStatusState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hvf6qeg9.js:765", () => {
  sessionStatusStateSlots = new HostScoped(() => new SessionStatusState());
});
//@ chunk-hvf6qeg9.js:788-824 placement
/**
 * 取当前 host 的会话状态分类状态。
 */
function currentSessionStatusState() {
  return sessionStatusStateSlots.of(getRootSession().host);
}
//@ chunk-3bj63apf.js:417-644 placement
/**
 * 订阅无法使用（通常是欠费）时的提示文字。
 */
var SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE =
  "Claude Code can't use your Claude subscription, usually because a payment is past due \xB7 Pay or renew at https://claude.ai/settings/billing (if you just paid, try again shortly), or use an Anthropic API key instead";
//@ chunk-3bj63apf.js:644-1709 placement
/**
 * 会话状态分类用的 schema、四种状态的提示说明、输出字段说明与长度上限，以及终态集合。
 */
var SESSION_STATE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var STATE_PROMPT_DESCRIPTIONS;
var OUTPUT_FIELD_DESCRIPTIONS;
var MAX_HEADLINE_LENGTH;
var MAX_NEEDS_LENGTH;
var TERMINAL_STATES;
deferInit("chunk-3bj63apf.js:644", () => {
  SESSION_STATE_SCHEMA = DoctorLazy(() =>
    create({
      state: create_2().nullish(),
      detail: create_2().nullish(),
      tempo: create_2().nullish(),
      needs: create_2().nullish(),
      output: create_20(create_2(), create_12()).nullish(),
    }),
  );
  STATE_PROMPT_DESCRIPTIONS = {
    working:
      "actively progressing on the task \u2014 narrating plans, calling tools, or writing code; no pending question for the user",
    blocked:
      'the last message ends on a direct question or explicit request for the user ("want me to\u2026?", "which do you prefer?", "approve this?", "needs input: \u2026") \u2014 nothing will happen until the user replies',
    done: 'the task the user asked for is fully delivered and there is no further work the agent plans to do \u2014 not just a progress update, not "almost done", not "let me know what you think"',
    failed:
      "the agent has given up or hit something unrecoverable \u2014 missing credential, broken build it cannot fix, wrong repo, task impossible as framed; distinct from blocked (user can unblock) and done (succeeded)",
  };
  OUTPUT_FIELD_DESCRIPTIONS = {
    result: "one short sentence naming the finished deliverable \u2014 no sub-clauses or bullet summaries",
  };
  MAX_HEADLINE_LENGTH = 800;
  MAX_NEEDS_LENGTH = 2000;
  TERMINAL_STATES = new Set(["done", "failed", "stopped"]);
});
//@ chunk-3bj63apf.js:1709-1835 placement
/**
 * 截断字符串到给定长度并加省略号，避免切开代理对。
 */
function truncateWithEllipsis(text, maxLength) {
  if (text.length <= maxLength) return text;
  let cutIndex = maxLength - 1;
  let code = text.charCodeAt(cutIndex - 1);
  if (code >= 55296 && code <= 56319) cutIndex--;
  return text.slice(0, cutIndex) + "\u2026";
}
//@ chunk-3bj63apf.js:1835-1872 placement
/**
 * 判断截至给定位置之前是否有未闭合的代码围栏（据此忽略围栏里的文本）。
 */
function hasOpenCodeFenceAt(text, endIndex) {
  return findOpenCodeFence(text, endIndex) !== null;
}
//@ chunk-3bj63apf.js:1872-2307 placement
/**
 * 扫描到指定位置为止，找出仍未闭合的代码围栏（``` 或 ~~~，行首最多 3 个空格），返回其标记与长度或 null。
 */
function findOpenCodeFence(text, limit) {
  let openMarker = null;
  let openLength = 0;
  let position = 0;
  let index = text.indexOf("```");
  let index_2 = text.indexOf("~~~");
  while (position < limit) {
    if (index !== -1 && index < position) index = text.indexOf("```", position);
    if (index_2 !== -1 && index_2 < position) index_2 = text.indexOf("~~~", position);
    let fenceStart = index === -1 ? index_2 : index_2 === -1 ? index : Math.min(index, index_2);
    if (fenceStart === -1 || fenceStart >= limit) break;
    let markerChar = text[fenceStart];
    let scanIndex = fenceStart - 1;
    let spaceCount = 0;
    while (scanIndex >= 0 && text[scanIndex] === " " && spaceCount < 3) {
      scanIndex--;
      spaceCount++;
    }
    let atLineStart =
      scanIndex < 0 ||
      text[scanIndex] ===
        `
`;
    let runLength = 3;
    position = fenceStart + 3;
    while (text[position] === markerChar) {
      position++;
      runLength++;
    }
    if (!atLineStart) continue;
    if (openMarker === null) {
      openMarker = markerChar;
      openLength = runLength;
    } else if (openMarker === markerChar && runLength >= openLength) {
      openMarker = null;
      openLength = 0;
    }
  }
  return openMarker === null
    ? null
    : {
        marker: openMarker,
        length: openLength,
      };
}
//@ chunk-3bj63apf.js:2307-2392 placement
/**
 * 生成闭合当前未闭合代码围栏所需的标记行（没有则空串）。
 */
function openCodeFenceCloser(transcriptText) {
  let openCodeFence = findOpenCodeFence(transcriptText, transcriptText.length);
  return openCodeFence === null
    ? ""
    : openCodeFence.marker.repeat(openCodeFence.length) +
        `
`;
}
//@ chunk-3bj63apf.js:2392-2455 placement
/**
 * 组织需要验证时的 needs 文案。
 */
var VERIFICATION_REQUIRED_NEEDS = "organization verification required \u2014 see detail";
//@ chunk-3bj63apf.js:2455-4018 layout
/**
 * API 错误类型 → 轮后摘要的 {state: blocked/failed, needs: 提示}（登录、组织禁用 OAuth、限额、过载、请求过大等）。
 */
function classifyApiErrorForSummary(error, message = "", reason) {
  if (reason === "dlp_request_denied" || reason === "safety_monitor_blocked")
    return {
      state: "failed",
      needs: "API error",
    };
  if (reason === "network_edge_blocked")
    return {
      state: "blocked",
      needs: "network or region blocked \u2014 check VPN or network",
    };
  switch (error) {
    case "authentication_failed":
      return {
        state: "blocked",
        needs: "login required \u2014 run /login",
      };
    case "oauth_org_not_allowed":
      return message === SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE
        ? {
            state: "blocked",
            needs: "can't use subscription \u2014 pay or renew, or use API key",
          }
        : {
            state: "blocked",
            needs: "org disabled OAuth \u2014 use API key or ask admin",
          };
    case "account_on_hold":
      return {
        state: "blocked",
        needs: "account on hold \u2014 see detail",
      };
    case "cloud_credential_error":
      return {
        state: "blocked",
        needs: "cloud credentials unavailable \u2014 check or refresh them",
      };
    case "verification_required":
      return {
        state: "blocked",
        needs: VERIFICATION_REQUIRED_NEEDS,
      };
    case "billing_error":
      return {
        state: "blocked",
        needs: "usage limit reached \u2014 check plan",
      };
    case "rate_limit":
      return {
        state: "blocked",
        needs: "rate limited \u2014 wait and retry",
      };
    case "overloaded":
      return {
        state: "blocked",
        needs: "API overloaded \u2014 wait and retry",
      };
    case "server_error":
      return {
        state: "blocked",
        needs: "API unavailable \u2014 retry",
      };
    case "invalid_request":
      return /\b(too long|too large|exceeds|token limit|prompt is too long)\b/i.test(message)
        ? {
            state: "blocked",
            needs: "request too large \u2014 /compact or trim",
          }
        : {
            state: "blocked",
            needs: "invalid API request \u2014 see detail",
          };
    case "max_output_tokens":
      return null;
    case undefined:
      return {
        state: "blocked",
        needs: "API error \u2014 see detail",
      };
    case "unknown":
    default:
      return {
        state: "failed",
        needs: "API error",
      };
  }
}
//@ chunk-3bj63apf.js:4018-4285 placement
var FAILED_LINE_RE = /(?:^|\n)\s*failed\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var NEEDS_INPUT_LINE_RE = /(?:^|\n)\s*needs input\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var BLOCKED_LINE_RE = /(?:^|\n)\s*blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var IM_BLOCKED_RE = /\bI'?m blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
//@ chunk-3bj63apf.js:4285-4537 placement
function findLastStatusLine(fullText, segment, offset) {
  let best;
  for (let [state, pattern] of [
    ["failed", FAILED_LINE_RE],
    ["blocked", NEEDS_INPUT_LINE_RE],
    ["blocked", BLOCKED_LINE_RE],
    ["blocked", IM_BLOCKED_RE],
  ])
    for (let match of segment.matchAll(pattern)) {
      if (hasOpenCodeFenceAt(fullText, offset + match.index)) continue;
      if (!best || match.index > best.index)
        best = {
          state,
          capture: match[1].trim(),
          index: match.index,
          end: match.index + match[0].length,
        };
    }
  return best;
}
//@ chunk-3bj63apf.js:4537-5007 placement
/**
 * 判断助手消息结尾的类型：空、在代码围栏中、Result 行、Failed 行、问号结尾、列表/表格或陈述句。
 */
function classifyMessageEnding(text) {
  let trimmed = text.trim();
  if (!trimmed) return "empty";
  if (hasOpenCodeFenceAt(trimmed, trimmed.length)) return "code-fence";
  let sliced = trimmed.slice(-800);
  let baseOffset = trimmed.length - sliced.length;
  for (let match of sliced.matchAll(/(?:^|\n)\s*result:\s*\S/gi))
    if (!hasOpenCodeFenceAt(trimmed, baseOffset + match.index)) return "result-line";
  for (let match of sliced.matchAll(/(?:^|\n)\s*failed:\s*\S/gi))
    if (!hasOpenCodeFenceAt(trimmed, baseOffset + match.index)) return "failed-line";
  if (/[?\uFF1F]\s*$/.test(trimmed)) return "trailing-q";
  let sliced_2 = trimmed.slice(-200);
  if (/(?:^|\n)\s*(?:[-*\u2022]|\d+\.|[|])\s/.test(sliced_2)) return "list-or-table";
  return "declarative";
}
//@ chunk-3bj63apf.js:5007-9393 placement
/**
 * 用启发式规则判断会话状态（等待输入、运行中、出错等）。
 */
function classifySessionStateHeuristic(text) {
  let trimmed = text.trim();
  if (!trimmed) return null;
  let sliced = trimmed.slice(-800);
  let resultMatch;
  for (let match of sliced.matchAll(/(?:^|\n)\s*result:\s*(.+?)\s*(?:\n|$)/gi))
    if (!hasOpenCodeFenceAt(trimmed, trimmed.length - sliced.length + match.index)) resultMatch = match;
  let remainingText = sliced;
  let remainingOffset = trimmed.length - sliced.length;
  if (resultMatch) {
    let afterResultIndex = resultMatch.index + resultMatch[0].length;
    remainingText = sliced.slice(afterResultIndex);
    remainingOffset = trimmed.length - sliced.length + afterResultIndex;
  }
  let lastStatusLine = findLastStatusLine(trimmed, remainingText, remainingOffset);
  if (resultMatch && !lastStatusLine) {
    let headline = truncateWithEllipsis(resultMatch[1], MAX_HEADLINE_LENGTH);
    if (
      [...remainingText.matchAll(/(?:^|\n)\s*next:\s*\S/gi)].some(
        (nextMatch) => !hasOpenCodeFenceAt(trimmed, remainingOffset + nextMatch.index),
      )
    )
      return {
        branch: "result-then-next",
        state: "working",
        tempo: "idle",
        detail: headline,
        output: {
          result: headline,
        },
      };
    let trailingAsk = findTrailingAsk(trimmed, trimmed.length - sliced.length + resultMatch.index);
    if (trailingAsk?.kind === "stale") return null;
    if (trailingAsk)
      return {
        branch: "result-approval-ask",
        state: "blocked",
        tempo: "blocked",
        needs: trailingAsk.needs,
        detail: headline,
      };
    return {
      branch: "result-marker",
      state: "done",
      tempo: "idle",
      detail: headline,
      output: {
        result: headline,
      },
    };
  }
  if (lastStatusLine?.state === "failed")
    return {
      branch: "failed-marker",
      state: "failed",
      tempo: "idle",
      detail: truncateWithEllipsis(lastStatusLine.capture, MAX_HEADLINE_LENGTH),
      output: {},
    };
  if (lastStatusLine?.state === "blocked") {
    let sliced = remainingText.slice(lastStatusLine.end);
    if (countWhere(sliced.split(/\n\s*\n/), (paragraph) => paragraph.trim().length > 0) >= 3) return null;
    if (
      !/\bnothing (?:needed|required) from you\b|\bno(?: user)? action (?:needed|required)\b/i.test(
        remainingText,
      )
    ) {
      let needsText = truncateWithEllipsis(lastStatusLine.capture, MAX_HEADLINE_LENGTH);
      return {
        branch: "blocked-marker",
        state: "blocked",
        tempo: "blocked",
        needs: needsText,
        detail: needsText,
      };
    }
    if (resultMatch) {
      let headline = truncateWithEllipsis(resultMatch[1], MAX_HEADLINE_LENGTH);
      return {
        branch: "blocked-disclaimed",
        state: "done",
        tempo: "idle",
        detail: headline,
        output: {
          result: headline,
        },
      };
    }
    return null;
  }
  if (/[?\uFF1F]\s*$/.test(sliced) && sliced.replace(/[?\uFF1F\s]+$/, "").length >= 4) {
    let max = Math.max(
      sliced.lastIndexOf(`
`),
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("! "),
      sliced.lastIndexOf("? ", sliced.length - 2),
    );
    if (!hasOpenCodeFenceAt(trimmed, trimmed.length - sliced.length + max)) {
      let questionText = truncateWithEllipsis(sliced.slice(max + 1).trim(), MAX_HEADLINE_LENGTH);
      if (SESSION_STATE_PATTERNS.test(questionText)) return null;
      return {
        branch: "trailing-q",
        state: "blocked",
        tempo: "blocked",
        needs: questionText,
        detail: questionText,
      };
    }
  }
  let max = Math.max(
    0,
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("! "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf(`
`),
  );
  let text_2 = sliced.slice(max).replace(/^[.!?\s]+/, "");
  let isInCodeFence = hasOpenCodeFenceAt(trimmed, trimmed.length - sliced.length + max);
  let match =
    /\b(?:waiting (?:for|on)|pending)\s+(?:the\s+)?(?:CI|build|tests?|reviewer|deploy(?:ment)?|workflow|checks?|rollout|merge queue)\b/i.exec(
      text_2,
    );
  if (match && !isInCodeFence)
    return {
      branch: "wait-external",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(match[0], MAX_HEADLINE_LENGTH),
      output: {},
    };
  let sawIncompleteClause = false;
  if (!isInCodeFence)
    for (let askMatch of text_2.matchAll(regExp)) {
      let askContext = getAskContext(text_2, askMatch);
      let verdict = classifyAskCandidate(text_2, askMatch, askContext);
      if (verdict === "not-an-ask") continue;
      if (verdict === "defer") return null;
      if (!regExp_5.test(askContext.before) && INCOMPLETE_CLAUSE_AFTER.test(askContext.after)) {
        sawIncompleteClause = true;
        continue;
      }
      let needsText = truncateWithEllipsis(text_2.slice(askMatch.index).trim(), MAX_HEADLINE_LENGTH);
      return {
        branch: "awaiting-user",
        state: "blocked",
        tempo: "blocked",
        needs: needsText,
        detail: needsText,
      };
    }
  let match_2 =
    /\b(please (?:run|provide|confirm|clarify|choose|let me know)|let me know (?:which|what|how|when)|which (?:option|approach|one)|should I (?:proceed|continue|use))\b/i.exec(
      text_2,
    );
  if (match_2 && !isInCodeFence) {
    let needsText = truncateWithEllipsis(text_2.slice(match_2.index).trim(), MAX_HEADLINE_LENGTH);
    return {
      branch: "ask-verb",
      state: "blocked",
      tempo: "blocked",
      needs: needsText,
      detail: needsText,
    };
  }
  if (
    !isInCodeFence &&
    /\b(not logged in|please run \/login|authentication failed|invalid api key|oauth token (?:expired|revoked)|credit balance (?:is )?too low|usage limit reached|mcp (?:server )?(?:authentication|auth|authorization|unauthorized)|mcp (?:server )?(?:credential|token) (?:missing|expired|invalid)|401 unauthorized|403 forbidden|token (?:has )?expired|bad credentials|gh auth login|gcloud auth login|aws (?:sso )?login)\b/i.test(
      text_2,
    )
  )
    return {
      branch: "auth-prose",
      state: "blocked",
      tempo: "blocked",
      needs: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
      detail: "authentication required",
    };
  let canClassify = !isInCodeFence && !sawIncompleteClause;
  if (canClassify && WORKING_VERB_START.test(text_2) && !HEDGED_OR_DEFERRED.test(text_2))
    return {
      branch: "working-verb",
      state: "working",
      tempo: "active",
      detail: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
      output: {},
    };
  if (canClassify && AGENTS_IN_FLIGHT_STATUS.test(text_2))
    return {
      branch: "agents-status",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
    };
  if (canClassify && WILL_CHECK_BACK.test(text_2))
    return {
      branch: "will-check-back",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
    };
  if (!isInCodeFence && CANNOT_PROCEED.test(text_2)) {
    let headline = truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH);
    return {
      branch: "cant-proceed",
      state: "blocked",
      tempo: "blocked",
      detail: headline,
      needs: headline,
    };
  }
  if (canClassify && GIVING_UP.test(text_2))
    return {
      branch: "giving-up",
      state: "failed",
      tempo: "idle",
      detail: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
    };
  if (canClassify && PUSHED_OR_COMMITTED.test(text_2)) {
    let headline = truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH);
    return {
      branch: "pushed-committed",
      state: "done",
      tempo: "idle",
      detail: headline,
      output: {
        result: headline,
      },
    };
  }
  if (canClassify && READY_FOR_REVIEW.test(text_2))
    return {
      branch: "ready-for",
      state: "done",
      tempo: "idle",
      detail: truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH),
    };
  if (canClassify && VERDICT_MARKER.test(text_2)) {
    let headline = truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH);
    return {
      branch: "verdict-marker",
      state: "done",
      tempo: "idle",
      detail: headline,
      output: {
        result: headline,
      },
    };
  }
  if (!isInCodeFence && PLEASE_DO_X.test(text_2)) {
    let headline = truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH);
    return {
      branch: "please-do-x",
      state: "blocked",
      tempo: "blocked",
      detail: headline,
      needs: headline,
    };
  }
  if (!isInCodeFence && STOPPING_HERE.test(text_2)) {
    let headline = truncateWithEllipsis(text_2, MAX_HEADLINE_LENGTH);
    return {
      branch: "stopping-here",
      state: "blocked",
      tempo: "blocked",
      detail: headline,
      needs: headline,
    };
  }
  let trailingAsk = findTrailingAsk(trimmed, trimmed.length - sliced.length);
  if (trailingAsk?.kind === "ask")
    return {
      branch: "leading-approval-ask",
      state: "blocked",
      tempo: "blocked",
      needs: trailingAsk.needs,
      detail: trailingAsk.needs,
    };
  return null;
}
//@ chunk-3bj63apf.js:9393-9983 placement
/**
 * 从给定位置起寻找"等待用户"式的请求句（排除代码块、非请求语境），后面还有正文时标记为过期；返回 {kind:'ask', needs} 或 {kind:'stale'}。
 */
function findTrailingAsk(text, lastIndex) {
  let regExp = new RegExp(regExp_2);
  regExp.lastIndex = lastIndex;
  let sawStale = false;
  for (let match of text.matchAll(regExp)) {
    if (hasOpenCodeFenceAt(text, match.index)) continue;
    let context = getAskContext(text, match);
    let { before, after, end } = context;
    if (!(
      regExp_3.test(before) ||
      (/^\s*(?:\*\*|\))?\s*$/.test(after) &&
        (regExp_4.test(before) || (/^ready\b/i.test(match[0]) && !/\bas\s+$/i.test(before))))
    ))
      continue;
    let verdict = classifyAskCandidate(text, match, context);
    if (verdict === "not-an-ask") continue;
    if (verdict === "defer") return;
    if (hasProseAfterParagraph(text, match.index)) {
      sawStale = true;
      continue;
    }
    let trimmed = text.slice(match.index, end).trim();
    if (trimmed.endsWith("**") && trimmed.split("**").length % 2 === 0) trimmed = trimmed.slice(0, -2);
    else if (trimmed.endsWith(")") && countCharInString(trimmed, ")") > countCharInString(trimmed, "("))
      trimmed = trimmed.slice(0, -1);
    return {
      kind: "ask",
      needs: truncateWithEllipsis(trimmed, MAX_HEADLINE_LENGTH),
    };
  }
  return sawStale
    ? {
        kind: "stale",
      }
    : undefined;
}
//@ chunk-3bj63apf.js:9983-10186 placement
function hasProseAfterParagraph(text, index) {
  let match = /\n[ \t]*\n/.exec(text.slice(index));
  if (!match) return false;
  let nextLineStart = index + match.index + 1;
  for (let line of text.slice(nextLineStart).split(`
`)) {
    let lineStart = nextLineStart;
    nextLineStart += line.length + 1;
    let trimmed = line.trim();
    if (trimmed && !MARKDOWN_OR_LIST_LINE.test(trimmed) && !hasOpenCodeFenceAt(text, lineStart)) return true;
  }
  return false;
}
//@ chunk-3bj63apf.js:10186-10525 placement
/**
 * 取问句匹配周围的上下文：之前的句子、再之前的句子、之后到句末的文本及结束位置。
 */
function getAskContext(text, match) {
  let sliced = text.slice(Math.max(0, match.index - 800), match.index);
  let boundaries = [...sliced.matchAll(SENTENCE_BOUNDARY)];
  let last = boundaries.at(-1);
  let previousBoundary = boundaries.at(-2);
  let before = last ? sliced.slice(last.index + last[0].length) : sliced;
  let previous = last
    ? sliced.slice(previousBoundary ? previousBoundary.index + previousBoundary[0].length : 0, last.index + 1)
    : "";
  let afterIndex = match.index + match[0].length;
  let match_2 = SENTENCE_END.exec(text.slice(afterIndex));
  return {
    before,
    previous,
    after: text.slice(afterIndex, match_2 ? afterIndex + match_2.index : text.length),
    end: match_2 ? afterIndex + match_2.index + match_2[0].length : text.length,
  };
}
//@ chunk-3bj63apf.js:10525-10737 placement
function classifyAskCandidate(text, match, { before, previous }) {
  let clause = before.split(CLAUSE_BREAK).at(-1) ?? before;
  if (
    NEGATION_WORD.test(clause) ||
    DEFERRED_CONDITION.test(clause + match[0]) ||
    OPTIONAL_OFFER.test(before) ||
    SESSION_STATE_PATTERNS.test(before) ||
    (/\?$/.test(previous) && SESSION_STATE_PATTERNS.test(previous))
  )
    return "not-an-ask";
  return ASYNC_FOLLOWUP.test(text.slice(match.index)) ? "defer" : "ask";
}
//@ chunk-3bj63apf.js:10737-10892 placement
/**
 * 用最后一行非空文本构造启发式的 working 状态。
 */
function buildWorkingState(text) {
  let last = text
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .findLast(Boolean);
  return {
    branch: "heuristic",
    state: "working",
    tempo: "idle",
    detail: last ? truncateWithEllipsis(last, MAX_HEADLINE_LENGTH) : "\u2014",
  };
}
//@ chunk-3bj63apf.js:10892-14846 placement
/**
 * 会话状态启发式规则用到的文本模式表。
 */
var SESSION_STATE_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORKING_VERB_START;
var HEDGED_OR_DEFERRED;
var AGENTS_IN_FLIGHT_STATUS;
var WILL_CHECK_BACK;
var CANNOT_PROCEED;
var GIVING_UP;
var PUSHED_OR_COMMITTED;
var READY_FOR_REVIEW;
var VERDICT_MARKER;
var PLEASE_DO_X;
var STOPPING_HERE;
var NOT_NEGATED_PREFIX;
var AWAITING_YOUR_APPROVAL;
var regExp;
var regExp_2;
var TRAILING_PRONOUN_TAIL;
var regExp_3;
var regExp_4;
var regExp_5;
var INCOMPLETE_CLAUSE_AFTER;
var SENTENCE_BOUNDARY;
var SENTENCE_END;
var CLAUSE_BREAK;
var MARKDOWN_OR_LIST_LINE;
var NEGATION_WORD;
var OPTIONAL_OFFER;
var DEFERRED_CONDITION;
var ASYNC_FOLLOWUP;
deferInit("chunk-3bj63apf.js:10892", () => {
  SESSION_STATE_PATTERNS = /\b(?:want|like) me to\b|\b(?:shall|should) I also\b/i;
  WORKING_VERB_START =
    /^(?:(?:Now|Next|Then|Alright|OK|Okay|Right|Good|First|Also),?\s+)?(?:Let me (?!know\b)|(?:I(?:'?ll| will) |I'?m going to |Going to )(?!need\b|require\b|wait\b|leave\b|hold\b|skip\b|stop\b)|Proceeding |Moving (?:on|to)\b|Continuing |Starting |Trying |Checking |Looking |Searching |Reading |Investigating |Running |Re-?running |Building |Rebuilding |Installing |Fetching |Applying |Fixing |Patching |Updating |Adding |Removing |Deleting |Importing |Refactoring |Rewriting |Writing |Grepping |Scanning |Wrapping |Switching |Testing |Verifying |Regenerating |Pushing |Pulling |Reviewing |Examining |Loading |Compiling |Parsing |Analyzing |Tracing |Exploring )/i;
  HEDGED_OR_DEFERRED =
    /\b(?:once |when |after |until |as soon as )(?:you|it|the|that|this|they)\b|\bagain in\b|\bcheck back\b|\bin ~?\d+\s*(?:s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:ours?|rs?)?)\b|\bthen\.?\s*$|\bwhichever you\b|\bhold(?:ing)? for your\b|\b(?:to|and) wait for\b|\bgive it (?:more |some )?time\b|\bif (?:you(?:'d| want| prefer| need|'re)?|that(?:'s| helps| works)?|useful|needed|helpful|desired)\b|\b(?:isn'?t|not|won'?t) going to work\b/i;
  AGENTS_IN_FLIGHT_STATUS =
    /^(?:(?:\*\*)?[1-9]\d* (?:agent|cron|task|fork|job|worker|PR|check)s? (?:in flight|remaining|active|still (?:running|working)|pending|running|launched)\b|(?:Continuous )?(?:[Ll]oop|[Cc]rons?|[Bb]abysit) (?:active|healthy|continuing|running|will keep|continues)\b|Waiting for (?:the )?(?:agent|cron|task|fork|worker|job|remaining|them)s?\b|Agents? will report back\b|Waiting\.?$)/;
  WILL_CHECK_BACK =
    /^(?:I will|I'll|Will) (?:check back|re-?check|poll|look again|retry|re-?run|try again) (?:(?:when|once|after|until) (?!your?\b)|in\b|again\b)/i;
  CANNOT_PROCEED =
    /^I (?:can(?:'?t|not)|am unable to) (?:proceed|continue|make (?:any )?progress|complete|fix this)\b/i;
  GIVING_UP = /^(?:Giving up|I(?:'m| am) giving up|The task is not actionable)\b/i;
  PUSHED_OR_COMMITTED =
    /^(?:Pushed (?:to `|`[0-9a-f]{7,})|Committed as `?[0-9a-f]{7,}\b|Commit: `?[0-9a-f]{7,}\b|(?:Opened|Created) PR #?\d)/;
  READY_FOR_REVIEW = /^Ready (?:for review|to (?:upload|merge|ship|land))\b/;
  VERDICT_MARKER = /^VERDICT: (?:PASS|FAIL)\b/;
  PLEASE_DO_X =
    /^Please (?:start|run|provide|grant|export|add|install|configure|give me|paste|point me|set (?:the |up |`?[A-Z][A-Z0-9_]+\b))/;
  STOPPING_HERE =
    /^(?:Stopping here|I've stopped here|Parked (?:the|this) branch|Paused here)(?:\.|$| \u2014| -| until| pending| since| because)/i;
  NOT_NEGATED_PREFIX = String.raw`(?<!["'\u201C\u2018\x60]|\b(?:not|no longer|nothing(?: is|['\u2019]s)?|without|instead of|rather than|was|were|had been)\s+|n['\u2019]t\s+)`;
  AWAITING_YOUR_APPROVAL = String.raw`${NOT_NEGATED_PREFIX}\b(?:awaiting|waiting (?:for|on)|pending|ready for)\s+your\s+(?:approval|confirmation|go[- ]ahead|ok(?:ay)?\b|sign[- ]?off|green light)`;
  regExp = new RegExp(
    String.raw`${AWAITING_YOUR_APPROVAL}|${NOT_NEGATED_PREFIX}\b(?:awaiting|waiting (?:for|on)|pending)\s+(?:your\s+(?:feedback|input|decision|response|direction|guidance)|you\b|the user\b)`,
    "gi",
  );
  regExp_2 = new RegExp(AWAITING_YOUR_APPROVAL, "gi");
  TRAILING_PRONOUN_TAIL = String.raw`(?:\*\*|\()?(?:(?:I['\u2019]?m|I am|still|now|currently|just)\s+)*$`;
  regExp_3 = new RegExp(String.raw`^\s*(?:result:\s*)?${TRAILING_PRONOUN_TAIL}`, "i");
  regExp_4 = new RegExp(String.raw`(?:[:;,\u2014\u2013]|\s-|\s\()\s*${TRAILING_PRONOUN_TAIL}`, "i");
  regExp_5 = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}\s]|\b(?:is|are|am|be|been|and|but|or)|['\u2019](?:s|re|m))\s*${TRAILING_PRONOUN_TAIL}`,
    "iu",
  );
  INCOMPLETE_CLAUSE_AFTER =
    /^\s+(?:will|would|is|are|was|were|has|have|had|can|should|gets?|go(?:es)?|stays?|shows?)\b/i;
  SENTENCE_BOUNDARY = /[.!?](?:\*\*|\))?\s+|\n/g;
  SENTENCE_END = /[.!?](?:\*\*|\)|["'\u2019\u201D])*(?=\s|$)|\n/;
  CLAUSE_BREAK = /[,;:\u2014\u2013(]|\s-\s|\b(?:and|but|so|while)\b/i;
  MARKDOWN_OR_LIST_LINE = /^(?:```|~~~|[-+>|@]|[*\u2022]\s|\d+[.)]\s|#{1,6}\s)|:(?:\*\*)?$/;
  NEGATION_WORD = /\b(?:no|not|nothing|none|never|nobody|neither|nor)\b|n['\u2019]t\b/i;
  OPTIONAL_OFFER =
    /\bif you(?:['\u2019]d like| want| prefer| like)\b|\bI can also\b|\bhappy to\b|\boptionally\b/i;
  DEFERRED_CONDITION =
    /\b(?:once|when|after|until|as soon as)\s+(?:it|the|that|this|they)\b|\b(?:will|['\u2019]ll)\s+be\s+(?:ready|pending)\b/i;
  ASYNC_FOLLOWUP =
    /\bnext check\b|\bagain in\b|\bre-?poll|\bpoll(?:ing)? again\b|\bshepherding\b|\b(?:check(?:ing)? (?:back|again)|re-?check(?:ing)?|report(?:ing)?(?: back)?) (?:in|when|once|after)\b(?! you)/i;
});
//@ chunk-3bj63apf.js:14846-15091 placement
/**
 * 构造会话状态分类模型的用户提示：当前状态与持续时间、工具调用摘要、用户最近请求与助手消息尾部。
 */
function buildSessionStatePrompt(options) {
  let { tail, prev, latestAsk, toolSummary, minsInState } = options;
  return `Current state: ${prev} (for ${minsInState}m)
Tool calls so far: ${toolSummary || "none"}${
    latestAsk
      ? `
User's most recent ask: "${latestAsk}"`
      : ""
  }

Assistant message tail (last ${tail.length} chars):
${tail}`;
}
//@ chunk-3bj63apf.js:15091-15196 placement
/**
 * 解析模型返回的会话状态 JSON，校验失败返回 null。
 */
function parseSessionStateResponse(text) {
  let jsonObject = extractJsonObject(text);
  if (jsonObject === undefined) return null;
  let parsed = SESSION_STATE_SCHEMA().safeParse(jsonObject);
  return parsed.success ? parsed.data : null;
}
//@ chunk-3bj63apf.js:15196-15376 placement
function extractJsonObject(text) {
  let replaced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  let index = replaced.indexOf("{");
  let index_2 = replaced.lastIndexOf("}");
  if (index < 0 || index_2 < 0) return;
  try {
    return jsonParse(replaced.slice(index, index_2 + 1));
  } catch {
    return;
  }
}
//@ chunk-3bj63apf.js:15376-15429 placement
/**
 * 把非空字符串规范成返回值，否则 undefined。
 */
function nonEmptyString(value) {
  return typeof value === "string" && value ? value : undefined;
}
//@ chunk-3bj63apf.js:15429-15875 placement
/**
 * 合并模型给出的会话状态与上一状态：校验状态与节奏，终态强制 idle，过滤并截断输出字段，blocked 时沿用需求说明。
 */
function mergeSessionState(response, prev, previousState) {
  let stateName = nonEmptyString(response.state);
  let state =
    stateName && Object.hasOwn(STATE_PROMPT_DESCRIPTIONS, stateName)
      ? stateName
      : (previousState?.state ?? prev);
  let tempoName = nonEmptyString(response.tempo);
  let tempo = TERMINAL_STATES.has(state)
    ? "idle"
    : tempoName === "active" || tempoName === "idle" || tempoName === "blocked"
      ? tempoName
      : (previousState?.tempo ?? "active");
  let output = {};
  let rawOutput = response.output ?? previousState?.output;
  if (rawOutput && typeof rawOutput === "object")
    for (let [key, value] of Object.entries(rawOutput)) {
      let text = nonEmptyString(value);
      if (text && Object.hasOwn(OUTPUT_FIELD_DESCRIPTIONS, key))
        output[key] = truncateWithEllipsis(text, MAX_HEADLINE_LENGTH);
    }
  let needs = nonEmptyString(response.needs) ?? (tempo === "blocked" ? previousState?.needs : undefined);
  return {
    state,
    detail: nonEmptyString(response.detail) ?? previousState?.detail ?? "",
    tempo,
    needs,
    output,
    branch: previousState?.branch,
  };
}
//@ chunk-3bj63apf.js:15875-16098 placement
var MAX_HEADLINE_LENGTH_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_NEEDS_LENGTH_2;
var MAX_REPLY_LENGTH;
var sessionRecapSchema;
deferInit("chunk-3bj63apf.js:15875", () => {
  MAX_HEADLINE_LENGTH_2 = 140;
  MAX_NEEDS_LENGTH_2 = 64;
  MAX_REPLY_LENGTH = 80;
  sessionRecapSchema = DoctorLazy(() =>
    create({
      state: create_26(["working", "needs_reply", "needs_approval", "done", "failed"]),
      headline: create_2().nullish(),
      needs: create_2().nullish(),
      happened: create_2().nullish(),
      needs_you: create_2().nullish(),
      reply: create_2().nullish(),
    }),
  );
});
//@ chunk-3bj63apf.js:16098-16244 placement
/**
 * 解析会话回顾 JSON，校验失败或 happened 为空时返回 null。
 */
function parseSessionRecap(text) {
  let jsonObject = extractJsonObject(text);
  if (jsonObject === undefined) return null;
  let parsed = sessionRecapSchema().safeParse(jsonObject);
  if (!parsed.success || !nonEmptyString(parsed.data.happened)?.trim()) return null;
  return parsed.data;
}
//@ chunk-3bj63apf.js:16399-16694 affinity
function formatHappenedSummary(recap) {
  let happened = truncateContent(recap.happened ?? "");
  let needsYou = truncateContent(recap.needs_you ?? "");
  let suggestedReply = getSuggestedReply(recap, needsYou.text);
  let headline = truncateContent(nonEmptyString(recap.headline) ?? happened.text, MAX_NEEDS_LENGTH_2);
  return {
    recap: {
      state: recap.state,
      headline: headline.text,
      needs: truncateWithEllipsis(
        normalizeWhitespace(nonEmptyString(recap.needs) ?? ""),
        MAX_HEADLINE_LENGTH,
      ),
      happened: happened.text,
      needsYou: needsYou.text,
      reply: suggestedReply.text,
    },
    truncated: headline.truncated || happened.truncated || needsYou.truncated || suggestedReply.truncated,
  };
}
//@ chunk-3bj63apf.js:16694-16837 placement
var INVISIBLE_FORMAT_RE =
  /(?![\u200C\u200D\uFE0E\uFE0F\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u{110BD}\u{110CD}])[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-3bj63apf.js:16837-16940 placement
function normalizeWhitespace(text) {
  return text
    .replace(/\p{Cs}/gu, "")
    .replace(INVISIBLE_FORMAT_RE, "")
    .replace(/[\s\u0085\p{Cc}]+/gu, " ")
    .trim();
}
//@ chunk-3bj63apf.js:16940-17188 placement
function foldForMatching(text) {
  return foldConfusableCharacters(
    text
      .replace(/\p{Cs}/gu, "")
      .replace(/[\p{Cf}\p{M}\p{Co}\p{Cn}\p{Default_Ignorable_Code_Point}]/gu, "")
      .replace(/[\s\u0085]+/gu, " ")
      .replace(/\p{Cc}/gu, "")
      .replace(/\p{Pd}/gu, "-")
      .replace(/[^\p{L}\p{Nd}-]+/gu, " "),
  ).toLowerCase();
}
//@ chunk-3bj63apf.js:17188-17312 placement
/**
 * 文本（多种规整形式）是否含批准/合并/部署/发布/支付/迁移/推送等高风险动作词。
 */
function looksLikeRiskyApproval(text) {
  return [
    normalizeWhitespace(text),
    foldForMatching(text),
    foldForMatching(text.replace(/[\p{Cc}\p{Co}\p{Cn}]/gu, " ")),
  ].some((variant) => RISKY_APPROVAL_RE.test(variant) || RISKY_APPROVAL_RE.test(variant.replace(/-/g, "")));
}
//@ chunk-3bj63apf.js:17312-17587 placement
var RISKY_APPROVAL_RE =
  /\b(?:re|auto[- ]*|un)?(?:approv|merg(?!er\b)|deploy|promot|publish|releas|ship(?!ment)|pay(?!load|pal|ment)|migrat(?:e|ing)\b|sudo\b|launch|roll(?:ing|ed|s)?(?:[- ]+(?:it|this|that|them|these|those))?[- ]*out|green[- ]*light|force[- ]*push)|\bgo[- ]*(?:ahead|live)/iu;
//@ chunk-3bj63apf.js:17587-17867 placement
/**
 * 只对 needs_reply 状态给出建议回复：回复为空、不含可见字符或涉及高风险批准时不给；过长时标记截断。
 */
function getSuggestedReply(recap, text) {
  if (recap.state !== "needs_reply" || text === "")
    return {
      text: "",
      truncated: false,
    };
  let reply = normalizeWhitespace(recap.reply ?? "");
  if (
    !/(?!\u2800)[\p{L}\p{N}\p{P}\p{S}]/u.test(reply) ||
    looksLikeRiskyApproval(recap.reply ?? "") ||
    looksLikeRiskyApproval(recap.needs_you ?? "")
  )
    return {
      text: "",
      truncated: false,
    };
  return reply.length <= MAX_REPLY_LENGTH
    ? {
        text: reply,
        truncated: false,
      }
    : {
        text: "",
        truncated: true,
      };
}
//@ chunk-3bj63apf.js:17867-18068 placement
/**
 * 把会话回顾转成会话状态：需回复/需批准时为 blocked 并带需求说明，其余为 idle。
 */
function recapToSessionState(recap) {
  let isBlocking = recap.state === "needs_reply" || recap.state === "needs_approval";
  return {
    state: isBlocking ? "blocked" : recap.state,
    detail: recap.headline,
    tempo: isBlocking ? "blocked" : "idle",
    needs: isBlocking && recap.needs ? recap.needs : undefined,
    output: {},
    recap,
  };
}
export {
  MAX_HEADLINE_LENGTH_2,
  normalizeWhitespace,
  truncateWithEllipsis,
  SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE,
  MAX_HEADLINE_LENGTH,
  currentSessionStatusState,
  VERIFICATION_REQUIRED_NEEDS,
  classifySessionStateHeuristic,
  classifyApiErrorForSummary,
  openCodeFenceCloser,
  mergeSessionState,
  buildWorkingState,
  MAX_NEEDS_LENGTH,
  buildSessionStatePrompt,
  parseSessionRecap,
  parseSessionStateResponse,
  formatHappenedSummary,
  recapToSessionState,
  classifyMessageEnding,
};
