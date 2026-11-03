/**
 * services/sessionStatus/sessionStateClassifier.ts
 *
 * 2.1.316 新增。会话状态分类（启发式 + 模型）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-spwda8nt.js (35)
 * attribution: placement 34, affinity 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_20, create_12, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { count } from "../../utils/collections.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { truncateContent } from "../../utils/telemetry/betaSessionTracing.js";
import { foldConfusableCharacters } from "../../utils/confusables.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-spwda8nt.js:523-750 placement
/**
 * 订阅无法使用（通常是欠费）时的提示文字。
 */
var SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE =
  "Claude Code can't use your Claude subscription, usually because a payment is past due \xB7 Pay or renew at https://claude.ai/settings/billing (if you just paid, try again shortly), or use an Anthropic API key instead";
//@ chunk-spwda8nt.js:750-1815 placement
/**
 * 会话状态分类用的 schema、四种状态的提示说明、输出字段说明与长度上限，以及终态集合。
 */
var SESSION_STATE_SCHEMA = DoctorLazy(() =>
  create({
    state: create_2().nullish(),
    detail: create_2().nullish(),
    tempo: create_2().nullish(),
    needs: create_2().nullish(),
    output: create_20(create_2(), create_12()).nullish(),
  }),
);
var STATE_PROMPT_DESCRIPTIONS = {
  working:
    "actively progressing on the task \u2014 narrating plans, calling tools, or writing code; no pending question for the user",
  blocked:
    'the last message ends on a direct question or explicit request for the user ("want me to\u2026?", "which do you prefer?", "approve this?", "needs input: \u2026") \u2014 nothing will happen until the user replies',
  done: 'the task the user asked for is fully delivered and there is no further work the agent plans to do \u2014 not just a progress update, not "almost done", not "let me know what you think"',
  failed:
    "the agent has given up or hit something unrecoverable \u2014 missing credential, broken build it cannot fix, wrong repo, task impossible as framed; distinct from blocked (user can unblock) and done (succeeded)",
};
var OUTPUT_FIELD_DESCRIPTIONS = {
  result: "one short sentence naming the finished deliverable \u2014 no sub-clauses or bullet summaries",
};
var MAX_HEADLINE_LENGTH = 800;
var MAX_NEEDS_LENGTH = 2000;
var TERMINAL_STATES = new Set(["done", "failed", "stopped"]);
//@ chunk-spwda8nt.js:1815-1941 placement
/**
 * 截断字符串到给定长度并加省略号，避免切开代理对。
 */
function truncateWithEllipsis(e, n) {
  if (e.length <= n) return e;
  let t = n - 1;
  let code = e.charCodeAt(t - 1);
  if (code >= 55296 && code <= 56319) t--;
  return e.slice(0, t) + "\u2026";
}
//@ chunk-spwda8nt.js:1941-1978 placement
/**
 * 判断截至给定位置之前是否有未闭合的代码围栏（据此忽略围栏里的文本）。
 */
function hasOpenCodeFenceAt(e, n) {
  return findOpenCodeFence(e, n) !== null;
}
//@ chunk-spwda8nt.js:1978-2413 placement
/**
 * 扫描到指定位置为止，找出仍未闭合的代码围栏（``` 或 ~~~，行首最多 3 个空格），返回其标记与长度或 null。
 */
function findOpenCodeFence(e, n) {
  let t = null;
  let s = 0;
  let i = 0;
  let index = e.indexOf("```");
  let index_2 = e.indexOf("~~~");
  while (i < n) {
    if (index !== -1 && index < i) index = e.indexOf("```", i);
    if (index_2 !== -1 && index_2 < i) index_2 = e.indexOf("~~~", i);
    let g = index === -1 ? index_2 : index_2 === -1 ? index : Math.min(index, index_2);
    if (g === -1 || g >= n) break;
    let r = e[g];
    let c = g - 1;
    let h = 0;
    while (c >= 0 && e[c] === " " && h < 3) {
      c--;
      h++;
    }
    let d =
      c < 0 ||
      e[c] ===
        `
`;
    let b = 3;
    i = g + 3;
    while (e[i] === r) {
      i++;
      b++;
    }
    if (!d) continue;
    if (t === null) {
      t = r;
      s = b;
    } else if (t === r && b >= s) {
      t = null;
      s = 0;
    }
  }
  return t === null
    ? null
    : {
        marker: t,
        length: s,
      };
}
//@ chunk-spwda8nt.js:2413-2498 placement
/**
 * 生成闭合当前未闭合代码围栏所需的标记行（没有则空串）。
 */
function openCodeFenceCloser(e) {
  let openCodeFence = findOpenCodeFence(e, e.length);
  return openCodeFence === null
    ? ""
    : openCodeFence.marker.repeat(openCodeFence.length) +
        `
`;
}
//@ chunk-spwda8nt.js:2498-2561 placement
/**
 * 组织需要验证时的 needs 文案。
 */
var VERIFICATION_REQUIRED_NEEDS = "organization verification required \u2014 see detail";
//@ chunk-spwda8nt.js:4008-4275 placement
var FAILED_LINE_RE = /(?:^|\n)\s*failed\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var NEEDS_INPUT_LINE_RE = /(?:^|\n)\s*needs input\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var BLOCKED_LINE_RE = /(?:^|\n)\s*blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
var IM_BLOCKED_RE = /\bI'?m blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
//@ chunk-spwda8nt.js:4275-4527 placement
function findLastStatusLine(e, n, t) {
  let s;
  for (let [i, a] of [
    ["failed", FAILED_LINE_RE],
    ["blocked", NEEDS_INPUT_LINE_RE],
    ["blocked", BLOCKED_LINE_RE],
    ["blocked", IM_BLOCKED_RE],
  ])
    for (let l of n.matchAll(a)) {
      if (hasOpenCodeFenceAt(e, t + l.index)) continue;
      if (!s || l.index > s.index)
        s = {
          state: i,
          capture: l[1].trim(),
          index: l.index,
          end: l.index + l[0].length,
        };
    }
  return s;
}
//@ chunk-spwda8nt.js:4527-4997 placement
/**
 * 判断助手消息结尾的类型：空、在代码围栏中、Result 行、Failed 行、问号结尾、列表/表格或陈述句。
 */
function classifyMessageEnding(e) {
  let trimmed = e.trim();
  if (!trimmed) return "empty";
  if (hasOpenCodeFenceAt(trimmed, trimmed.length)) return "code-fence";
  let sliced = trimmed.slice(-800);
  let s = trimmed.length - sliced.length;
  for (let a of sliced.matchAll(/(?:^|\n)\s*result:\s*\S/gi))
    if (!hasOpenCodeFenceAt(trimmed, s + a.index)) return "result-line";
  for (let a of sliced.matchAll(/(?:^|\n)\s*failed:\s*\S/gi))
    if (!hasOpenCodeFenceAt(trimmed, s + a.index)) return "failed-line";
  if (/[?\uFF1F]\s*$/.test(trimmed)) return "trailing-q";
  let sliced_2 = trimmed.slice(-200);
  if (/(?:^|\n)\s*(?:[-*\u2022]|\d+\.|[|])\s/.test(sliced_2)) return "list-or-table";
  return "declarative";
}
//@ chunk-spwda8nt.js:4997-9386 placement
/**
 * 用启发式规则判断会话状态（等待输入、运行中、出错等）。
 */
function classifySessionStateHeuristic(e) {
  let trimmed = e.trim();
  if (!trimmed) return null;
  let sliced = trimmed.slice(-800);
  let s;
  for (let o of sliced.matchAll(/(?:^|\n)\s*result:\s*(.+?)\s*(?:\n|$)/gi))
    if (!hasOpenCodeFenceAt(trimmed, trimmed.length - sliced.length + o.index)) s = o;
  let i = sliced;
  let a = trimmed.length - sliced.length;
  if (s) {
    let o = s.index + s[0].length;
    i = sliced.slice(o);
    a = trimmed.length - sliced.length + o;
  }
  let lastStatusLine = findLastStatusLine(trimmed, i, a);
  if (s && !lastStatusLine) {
    let o = truncateWithEllipsis(s[1], MAX_HEADLINE_LENGTH);
    if ([...i.matchAll(/(?:^|\n)\s*next:\s*\S/gi)].some((E) => !hasOpenCodeFenceAt(trimmed, a + E.index)))
      return {
        branch: "result-then-next",
        state: "working",
        tempo: "idle",
        detail: o,
        output: {
          result: o,
        },
      };
    let trailingAsk = findTrailingAsk(trimmed, trimmed.length - sliced.length + s.index);
    if (trailingAsk?.kind === "stale") return null;
    if (trailingAsk)
      return {
        branch: "result-approval-ask",
        state: "blocked",
        tempo: "blocked",
        needs: trailingAsk.needs,
        detail: o,
      };
    return {
      branch: "result-marker",
      state: "done",
      tempo: "idle",
      detail: o,
      output: {
        result: o,
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
    let sliced = i.slice(lastStatusLine.end);
    if (count(sliced.split(/\n\s*\n/), (u) => u.trim().length > 0) >= 3) return null;
    if (!/\bnothing (?:needed|required) from you\b|\bno(?: user)? action (?:needed|required)\b/i.test(i)) {
      let u = truncateWithEllipsis(lastStatusLine.capture, MAX_HEADLINE_LENGTH);
      return {
        branch: "blocked-marker",
        state: "blocked",
        tempo: "blocked",
        needs: u,
        detail: u,
      };
    }
    if (s) {
      let u = truncateWithEllipsis(s[1], MAX_HEADLINE_LENGTH);
      return {
        branch: "blocked-disclaimed",
        state: "done",
        tempo: "idle",
        detail: u,
        output: {
          result: u,
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
      let u = truncateWithEllipsis(sliced.slice(max + 1).trim(), MAX_HEADLINE_LENGTH);
      if (SESSION_STATE_PATTERNS.test(u)) return null;
      return {
        branch: "trailing-q",
        state: "blocked",
        tempo: "blocked",
        needs: u,
        detail: u,
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
  let replaced = sliced.slice(max).replace(/^[.!?\s]+/, "");
  let c = hasOpenCodeFenceAt(trimmed, trimmed.length - sliced.length + max);
  let match =
    /\b(?:waiting (?:for|on)|pending)\s+(?:the\s+)?(?:CI|build|tests?|reviewer|deploy(?:ment)?|workflow|checks?|rollout|merge queue)\b/i.exec(
      replaced,
    );
  if (match && !c)
    return {
      branch: "wait-external",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(match[0], MAX_HEADLINE_LENGTH),
      output: {},
    };
  let d = false;
  if (!c)
    for (let o of replaced.matchAll(regExp)) {
      let askContext = getAskContext(replaced, o);
      let R = classifyAskCandidate(replaced, o, askContext);
      if (R === "not-an-ask") continue;
      if (R === "defer") return null;
      if (!regExp_5.test(askContext.before) && INCOMPLETE_CLAUSE_AFTER.test(askContext.after)) {
        d = true;
        continue;
      }
      let E = truncateWithEllipsis(replaced.slice(o.index).trim(), MAX_HEADLINE_LENGTH);
      return {
        branch: "awaiting-user",
        state: "blocked",
        tempo: "blocked",
        needs: E,
        detail: E,
      };
    }
  let match_2 =
    /\b(please (?:run|provide|confirm|clarify|choose|let me know)|let me know (?:which|what|how|when)|which (?:option|approach|one)|should I (?:proceed|continue|use))\b/i.exec(
      replaced,
    );
  if (match_2 && !c) {
    let o = truncateWithEllipsis(replaced.slice(match_2.index).trim(), MAX_HEADLINE_LENGTH);
    return {
      branch: "ask-verb",
      state: "blocked",
      tempo: "blocked",
      needs: o,
      detail: o,
    };
  }
  if (
    !c &&
    /\b(not logged in|please run \/login|authentication failed|invalid api key|oauth token (?:expired|revoked)|credit balance (?:is )?too low|usage limit reached|mcp (?:server )?(?:authentication|auth|authorization|unauthorized)|mcp (?:server )?(?:credential|token) (?:missing|expired|invalid)|401 unauthorized|403 forbidden|token (?:has )?expired|bad credentials|gh auth login|gcloud auth login|aws (?:sso )?login)\b/i.test(
      replaced,
    )
  )
    return {
      branch: "auth-prose",
      state: "blocked",
      tempo: "blocked",
      needs: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
      detail: "authentication required",
    };
  let k = !c && !d;
  if (k && WORKING_VERB_START.test(replaced) && !HEDGED_OR_DEFERRED.test(replaced))
    return {
      branch: "working-verb",
      state: "working",
      tempo: "active",
      detail: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
      output: {},
    };
  if (k && AGENTS_IN_FLIGHT_STATUS.test(replaced))
    return {
      branch: "agents-status",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
    };
  if (k && WILL_CHECK_BACK.test(replaced))
    return {
      branch: "will-check-back",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
    };
  if (!c && CANNOT_PROCEED.test(replaced)) {
    let o = truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH);
    return {
      branch: "cant-proceed",
      state: "blocked",
      tempo: "blocked",
      detail: o,
      needs: o,
    };
  }
  if (k && GIVING_UP.test(replaced))
    return {
      branch: "giving-up",
      state: "failed",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
    };
  if (k && PUSHED_OR_COMMITTED.test(replaced)) {
    let o = truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH);
    return {
      branch: "pushed-committed",
      state: "done",
      tempo: "idle",
      detail: o,
      output: {
        result: o,
      },
    };
  }
  if (k && READY_FOR_REVIEW.test(replaced))
    return {
      branch: "ready-for",
      state: "done",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH),
    };
  if (k && VERDICT_MARKER.test(replaced)) {
    let o = truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH);
    return {
      branch: "verdict-marker",
      state: "done",
      tempo: "idle",
      detail: o,
      output: {
        result: o,
      },
    };
  }
  if (!c && PLEASE_DO_X.test(replaced)) {
    let o = truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH);
    return {
      branch: "please-do-x",
      state: "blocked",
      tempo: "blocked",
      detail: o,
      needs: o,
    };
  }
  if (!c && STOPPING_HERE.test(replaced)) {
    let o = truncateWithEllipsis(replaced, MAX_HEADLINE_LENGTH);
    return {
      branch: "stopping-here",
      state: "blocked",
      tempo: "blocked",
      detail: o,
      needs: o,
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
//@ chunk-spwda8nt.js:9386-9976 placement
/**
 * 从给定位置起寻找"等待用户"式的请求句（排除代码块、非请求语境），后面还有正文时标记为过期；返回 {kind:'ask', needs} 或 {kind:'stale'}。
 */
function findTrailingAsk(e, lastIndex) {
  let regExp = new RegExp(regExp_2);
  regExp.lastIndex = lastIndex;
  let sawStale = false;
  for (let i of e.matchAll(regExp)) {
    if (hasOpenCodeFenceAt(e, i.index)) continue;
    let context = getAskContext(e, i);
    let { before, after, end } = context;
    if (!(
      regExp_3.test(before) ||
      (/^\s*(?:\*\*|\))?\s*$/.test(after) &&
        (regExp_4.test(before) || (/^ready\b/i.test(i[0]) && !/\bas\s+$/i.test(before))))
    ))
      continue;
    let verdict = classifyAskCandidate(e, i, context);
    if (verdict === "not-an-ask") continue;
    if (verdict === "defer") return;
    if (hasProseAfterParagraph(e, i.index)) {
      sawStale = true;
      continue;
    }
    let trimmed = e.slice(i.index, end).trim();
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
//@ chunk-spwda8nt.js:9976-10179 placement
function hasProseAfterParagraph(e, index) {
  let match = /\n[ \t]*\n/.exec(e.slice(index));
  if (!match) return false;
  let s = index + match.index + 1;
  for (let line of e.slice(s).split(`
`)) {
    let a = s;
    s += line.length + 1;
    let trimmed = line.trim();
    if (trimmed && !MARKDOWN_OR_LIST_LINE.test(trimmed) && !hasOpenCodeFenceAt(e, a)) return true;
  }
  return false;
}
//@ chunk-spwda8nt.js:10179-10518 placement
/**
 * 取问句匹配周围的上下文：之前的句子、再之前的句子、之后到句末的文本及结束位置。
 */
function getAskContext(e, n) {
  let sliced = e.slice(Math.max(0, n.index - 800), n.index);
  let s = [...sliced.matchAll(SENTENCE_BOUNDARY)];
  let last = s.at(-1);
  let a = s.at(-2);
  let before = last ? sliced.slice(last.index + last[0].length) : sliced;
  let previous = last ? sliced.slice(a ? a.index + a[0].length : 0, last.index + 1) : "";
  let r = n.index + n[0].length;
  let match = SENTENCE_END.exec(e.slice(r));
  return {
    before,
    previous,
    after: e.slice(r, match ? r + match.index : e.length),
    end: match ? r + match.index + match[0].length : e.length,
  };
}
//@ chunk-spwda8nt.js:10518-10730 placement
function classifyAskCandidate(e, n, { before, previous }) {
  let i = before.split(CLAUSE_BREAK).at(-1) ?? before;
  if (
    NEGATION_WORD.test(i) ||
    DEFERRED_CONDITION.test(i + n[0]) ||
    OPTIONAL_OFFER.test(before) ||
    SESSION_STATE_PATTERNS.test(before) ||
    (/\?$/.test(previous) && SESSION_STATE_PATTERNS.test(previous))
  )
    return "not-an-ask";
  return ASYNC_FOLLOWUP.test(e.slice(n.index)) ? "defer" : "ask";
}
//@ chunk-spwda8nt.js:10730-10885 placement
/**
 * 用最后一行非空文本构造启发式的 working 状态。
 */
function buildWorkingState(e) {
  let last = e
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
//@ chunk-spwda8nt.js:10885-14842 placement
/**
 * 会话状态启发式规则用到的文本模式表。
 */
var SESSION_STATE_PATTERNS = /\b(?:want|like) me to\b|\b(?:shall|should) I also\b/i;
var WORKING_VERB_START =
  /^(?:(?:Now|Next|Then|Alright|OK|Okay|Right|Good|First|Also),?\s+)?(?:Let me (?!know\b)|(?:I(?:'?ll| will) |I'?m going to |Going to )(?!need\b|require\b|wait\b|leave\b|hold\b|skip\b|stop\b)|Proceeding |Moving (?:on|to)\b|Continuing |Starting |Trying |Checking |Looking |Searching |Reading |Investigating |Running |Re-?running |Building |Rebuilding |Installing |Fetching |Applying |Fixing |Patching |Updating |Adding |Removing |Deleting |Importing |Refactoring |Rewriting |Writing |Grepping |Scanning |Wrapping |Switching |Testing |Verifying |Regenerating |Pushing |Pulling |Reviewing |Examining |Loading |Compiling |Parsing |Analyzing |Tracing |Exploring )/i;
var HEDGED_OR_DEFERRED =
  /\b(?:once |when |after |until |as soon as )(?:you|it|the|that|this|they)\b|\bagain in\b|\bcheck back\b|\bin ~?\d+\s*(?:s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:ours?|rs?)?)\b|\bthen\.?\s*$|\bwhichever you\b|\bhold(?:ing)? for your\b|\b(?:to|and) wait for\b|\bgive it (?:more |some )?time\b|\bif (?:you(?:'d| want| prefer| need|'re)?|that(?:'s| helps| works)?|useful|needed|helpful|desired)\b|\b(?:isn'?t|not|won'?t) going to work\b/i;
var AGENTS_IN_FLIGHT_STATUS =
  /^(?:(?:\*\*)?[1-9]\d* (?:agent|cron|task|fork|job|worker|PR|check)s? (?:in flight|remaining|active|still (?:running|working)|pending|running|launched)\b|(?:Continuous )?(?:[Ll]oop|[Cc]rons?|[Bb]abysit) (?:active|healthy|continuing|running|will keep|continues)\b|Waiting for (?:the )?(?:agent|cron|task|fork|worker|job|remaining|them)s?\b|Agents? will report back\b|Waiting\.?$)/;
var WILL_CHECK_BACK =
  /^(?:I will|I'll|Will) (?:check back|re-?check|poll|look again|retry|re-?run|try again) (?:(?:when|once|after|until) (?!your?\b)|in\b|again\b)/i;
var CANNOT_PROCEED =
  /^I (?:can(?:'?t|not)|am unable to) (?:proceed|continue|make (?:any )?progress|complete|fix this)\b/i;
var GIVING_UP = /^(?:Giving up|I(?:'m| am) giving up|The task is not actionable)\b/i;
var PUSHED_OR_COMMITTED =
  /^(?:Pushed (?:to `|`[0-9a-f]{7,})|Committed as `?[0-9a-f]{7,}\b|Commit: `?[0-9a-f]{7,}\b|(?:Opened|Created) PR #?\d)/;
var READY_FOR_REVIEW = /^Ready (?:for review|to (?:upload|merge|ship|land))\b/;
var VERDICT_MARKER = /^VERDICT: (?:PASS|FAIL)\b/;
var PLEASE_DO_X =
  /^Please (?:start|run|provide|grant|export|add|install|configure|give me|paste|point me|set (?:the |up |`?[A-Z][A-Z0-9_]+\b))/;
var STOPPING_HERE =
  /^(?:Stopping here|I've stopped here|Parked (?:the|this) branch|Paused here)(?:\.|$| \u2014| -| until| pending| since| because)/i;
var NOT_NEGATED_PREFIX = String.raw`(?<!["'\u201C\u2018\x60]|\b(?:not|no longer|nothing(?: is|['\u2019]s)?|without|instead of|rather than|was|were|had been)\s+|n['\u2019]t\s+)`;
var AWAITING_YOUR_APPROVAL = String.raw`${NOT_NEGATED_PREFIX}\b(?:awaiting|waiting (?:for|on)|pending|ready for)\s+your\s+(?:approval|confirmation|go[- ]ahead|ok(?:ay)?\b|sign[- ]?off|green light)`;
var regExp = new RegExp(
  String.raw`${AWAITING_YOUR_APPROVAL}|${NOT_NEGATED_PREFIX}\b(?:awaiting|waiting (?:for|on)|pending)\s+(?:your\s+(?:feedback|input|decision|response|direction|guidance)|you\b|the user\b)`,
  "gi",
);
var regExp_2 = new RegExp(AWAITING_YOUR_APPROVAL, "gi");
var TRAILING_PRONOUN_TAIL = String.raw`(?:\*\*|\()?(?:(?:I['\u2019]?m|I am|still|now|currently|just)\s+)*$`;
var regExp_3 = new RegExp(String.raw`^\s*(?:result:\s*)?${TRAILING_PRONOUN_TAIL}`, "i");
var regExp_4 = new RegExp(String.raw`(?:[:;,\u2014\u2013]|\s-|\s\()\s*${TRAILING_PRONOUN_TAIL}`, "i");
var regExp_5 = new RegExp(
  String.raw`(?:^|[^\p{L}\p{N}\s]|\b(?:is|are|am|be|been|and|but|or)|['\u2019](?:s|re|m))\s*${TRAILING_PRONOUN_TAIL}`,
  "iu",
);
var INCOMPLETE_CLAUSE_AFTER =
  /^\s+(?:will|would|is|are|was|were|has|have|had|can|should|gets?|go(?:es)?|stays?|shows?)\b/i;
var SENTENCE_BOUNDARY = /[.!?](?:\*\*|\))?\s+|\n/g;
var SENTENCE_END = /[.!?](?:\*\*|\)|["'\u2019\u201D])*(?=\s|$)|\n/;
var CLAUSE_BREAK = /[,;:\u2014\u2013(]|\s-\s|\b(?:and|but|so|while)\b/i;
var MARKDOWN_OR_LIST_LINE = /^(?:```|~~~|[-+>|@]|[*\u2022]\s|\d+[.)]\s|#{1,6}\s)|:(?:\*\*)?$/;
var NEGATION_WORD = /\b(?:no|not|nothing|none|never|nobody|neither|nor)\b|n['\u2019]t\b/i;
var OPTIONAL_OFFER =
  /\bif you(?:['\u2019]d like| want| prefer| like)\b|\bI can also\b|\bhappy to\b|\boptionally\b/i;
var DEFERRED_CONDITION =
  /\b(?:once|when|after|until|as soon as)\s+(?:it|the|that|this|they)\b|\b(?:will|['\u2019]ll)\s+be\s+(?:ready|pending)\b/i;
var ASYNC_FOLLOWUP =
  /\bnext check\b|\bagain in\b|\bre-?poll|\bpoll(?:ing)? again\b|\bshepherding\b|\b(?:check(?:ing)? (?:back|again)|re-?check(?:ing)?|report(?:ing)?(?: back)?) (?:in|when|once|after)\b(?! you)/i;
//@ chunk-spwda8nt.js:14842-15087 placement
/**
 * 构造会话状态分类模型的用户提示：当前状态与持续时间、工具调用摘要、用户最近请求与助手消息尾部。
 */
function buildSessionStatePrompt(e) {
  let { tail, prev, latestAsk, toolSummary, minsInState } = e;
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
//@ chunk-spwda8nt.js:15087-15192 placement
/**
 * 解析模型返回的会话状态 JSON，校验失败返回 null。
 */
function parseSessionStateResponse(e) {
  let jsonObject = extractJsonObject(e);
  if (jsonObject === undefined) return null;
  let t = SESSION_STATE_SCHEMA().safeParse(jsonObject);
  return t.success ? t.data : null;
}
//@ chunk-spwda8nt.js:15192-15372 placement
function extractJsonObject(e) {
  let replaced = e.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  let index = replaced.indexOf("{");
  let index_2 = replaced.lastIndexOf("}");
  if (index < 0 || index_2 < 0) return;
  try {
    return jsonParse(replaced.slice(index, index_2 + 1));
  } catch {
    return;
  }
}
//@ chunk-spwda8nt.js:15372-15425 placement
/**
 * 把非空字符串规范成返回值，否则 undefined。
 */
function nonEmptyString(e) {
  return typeof e === "string" && e ? e : undefined;
}
//@ chunk-spwda8nt.js:15425-15871 placement
/**
 * 合并模型给出的会话状态与上一状态：校验状态与节奏，终态强制 idle，过滤并截断输出字段，blocked 时沿用需求说明。
 */
function mergeSessionState(e, prev, workingState) {
  let stateName = nonEmptyString(e.state);
  let state =
    stateName && Object.hasOwn(STATE_PROMPT_DESCRIPTIONS, stateName)
      ? stateName
      : (workingState?.state ?? prev);
  let tempoName = nonEmptyString(e.tempo);
  let tempo = TERMINAL_STATES.has(state)
    ? "idle"
    : tempoName === "active" || tempoName === "idle" || tempoName === "blocked"
      ? tempoName
      : (workingState?.tempo ?? "active");
  let output = {};
  let rawOutput = e.output ?? workingState?.output;
  if (rawOutput && typeof rawOutput === "object")
    for (let [key, value] of Object.entries(rawOutput)) {
      let b = nonEmptyString(value);
      if (b && Object.hasOwn(OUTPUT_FIELD_DESCRIPTIONS, key))
        output[key] = truncateWithEllipsis(b, MAX_HEADLINE_LENGTH);
    }
  let needs = nonEmptyString(e.needs) ?? (tempo === "blocked" ? workingState?.needs : undefined);
  return {
    state,
    detail: nonEmptyString(e.detail) ?? workingState?.detail ?? "",
    tempo,
    needs,
    output,
    branch: workingState?.branch,
  };
}
//@ chunk-spwda8nt.js:15871-16094 placement
var MAX_HEADLINE_LENGTH_2 = 140;
var MAX_NEEDS_LENGTH_2 = 64;
var MAX_REPLY_LENGTH = 80;
var sessionRecapSchema = DoctorLazy(() =>
  create({
    state: create_26(["working", "needs_reply", "needs_approval", "done", "failed"]),
    headline: create_2().nullish(),
    needs: create_2().nullish(),
    happened: create_2().nullish(),
    needs_you: create_2().nullish(),
    reply: create_2().nullish(),
  }),
);
//@ chunk-spwda8nt.js:16094-16240 placement
/**
 * 解析会话回顾 JSON，校验失败或 happened 为空时返回 null。
 */
function parseSessionRecap(e) {
  let jsonObject = extractJsonObject(e);
  if (jsonObject === undefined) return null;
  let t = sessionRecapSchema().safeParse(jsonObject);
  if (!t.success || !nonEmptyString(t.data.happened)?.trim()) return null;
  return t.data;
}
//@ chunk-spwda8nt.js:16395-16690 affinity
function formatHappenedSummary(e) {
  let n = truncateContent(e.happened ?? "");
  let t = truncateContent(e.needs_you ?? "");
  let suggestedReply = getSuggestedReply(e, t.text);
  let i = truncateContent(nonEmptyString(e.headline) ?? n.text, MAX_NEEDS_LENGTH_2);
  return {
    recap: {
      state: e.state,
      headline: i.text,
      needs: truncateWithEllipsis(normalizeWhitespace(nonEmptyString(e.needs) ?? ""), MAX_HEADLINE_LENGTH),
      happened: n.text,
      needsYou: t.text,
      reply: suggestedReply.text,
    },
    truncated: i.truncated || n.truncated || t.truncated || suggestedReply.truncated,
  };
}
//@ chunk-spwda8nt.js:16690-16833 placement
var INVISIBLE_FORMAT_RE =
  /(?![\u200C\u200D\uFE0E\uFE0F\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u{110BD}\u{110CD}])[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-spwda8nt.js:16833-16936 placement
function normalizeWhitespace(e) {
  return e
    .replace(/\p{Cs}/gu, "")
    .replace(INVISIBLE_FORMAT_RE, "")
    .replace(/[\s\u0085\p{Cc}]+/gu, " ")
    .trim();
}
//@ chunk-spwda8nt.js:16936-17184 placement
function foldForMatching(e) {
  return foldConfusableCharacters(
    e
      .replace(/\p{Cs}/gu, "")
      .replace(/[\p{Cf}\p{M}\p{Co}\p{Cn}\p{Default_Ignorable_Code_Point}]/gu, "")
      .replace(/[\s\u0085]+/gu, " ")
      .replace(/\p{Cc}/gu, "")
      .replace(/\p{Pd}/gu, "-")
      .replace(/[^\p{L}\p{Nd}-]+/gu, " "),
  ).toLowerCase();
}
//@ chunk-spwda8nt.js:17184-17308 placement
/**
 * 文本（多种规整形式）是否含批准/合并/部署/发布/支付/迁移/推送等高风险动作词。
 */
function looksLikeRiskyApproval(e) {
  return [
    normalizeWhitespace(e),
    foldForMatching(e),
    foldForMatching(e.replace(/[\p{Cc}\p{Co}\p{Cn}]/gu, " ")),
  ].some((n) => RISKY_APPROVAL_RE.test(n) || RISKY_APPROVAL_RE.test(n.replace(/-/g, "")));
}
//@ chunk-spwda8nt.js:17308-17583 placement
var RISKY_APPROVAL_RE =
  /\b(?:re|auto[- ]*|un)?(?:approv|merg(?!er\b)|deploy|promot|publish|releas|ship(?!ment)|pay(?!load|pal|ment)|migrat(?:e|ing)\b|sudo\b|launch|roll(?:ing|ed|s)?(?:[- ]+(?:it|this|that|them|these|those))?[- ]*out|green[- ]*light|force[- ]*push)|\bgo[- ]*(?:ahead|live)/iu;
//@ chunk-spwda8nt.js:17583-17863 placement
/**
 * 只对 needs_reply 状态给出建议回复：回复为空、不含可见字符或涉及高风险批准时不给；过长时标记截断。
 */
function getSuggestedReply(e, text) {
  if (e.state !== "needs_reply" || text === "")
    return {
      text: "",
      truncated: false,
    };
  let t = normalizeWhitespace(e.reply ?? "");
  if (
    !/(?!\u2800)[\p{L}\p{N}\p{P}\p{S}]/u.test(t) ||
    looksLikeRiskyApproval(e.reply ?? "") ||
    looksLikeRiskyApproval(e.needs_you ?? "")
  )
    return {
      text: "",
      truncated: false,
    };
  return t.length <= MAX_REPLY_LENGTH
    ? {
        text: t,
        truncated: false,
      }
    : {
        text: "",
        truncated: true,
      };
}
//@ chunk-spwda8nt.js:17863-18064 placement
/**
 * 把会话回顾转成会话状态：需回复/需批准时为 blocked 并带需求说明，其余为 idle。
 */
function recapToSessionState(recap) {
  let n = recap.state === "needs_reply" || recap.state === "needs_approval";
  return {
    state: n ? "blocked" : recap.state,
    detail: recap.headline,
    tempo: n ? "blocked" : "idle",
    needs: n && recap.needs ? recap.needs : undefined,
    output: {},
    recap,
  };
}
//@ chunk-spwda8nt.js:18064-18532 placement
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
//@ chunk-spwda8nt.js:18532-18556 placement
/**
 * 按 host 保存的会话状态分类状态。
 */
var sessionStatusStateSlots = new HostScoped(() => new SessionStatusState());
//@ chunk-spwda8nt.js:18556-18593 placement
/**
 * 取当前 host 的会话状态分类状态。
 */
function currentSessionStatusState() {
  return sessionStatusStateSlots.of(getRootSession().host);
}
export {
  SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE,
  VERIFICATION_REQUIRED_NEEDS,
  truncateWithEllipsis,
  currentSessionStatusState,
  MAX_HEADLINE_LENGTH,
  MAX_HEADLINE_LENGTH_2,
  normalizeWhitespace,
  classifySessionStateHeuristic,
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
