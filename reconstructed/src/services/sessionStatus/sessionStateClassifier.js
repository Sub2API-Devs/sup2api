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

/**
 * 订阅无法使用（通常是欠费）时的提示文字。
 */
//@ chunk-spwda8nt.js:523-750 placement
var SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE =
  "Claude Code can't use your Claude subscription, usually because a payment is past due \xB7 Pay or renew at https://claude.ai/settings/billing (if you just paid, try again shortly), or use an Anthropic API key instead";
//@ chunk-spwda8nt.js:750-1815 placement
var SESSION_STATE_SCHEMA = DoctorLazy(() =>
    create({
      state: create_2().nullish(),
      detail: create_2().nullish(),
      tempo: create_2().nullish(),
      needs: create_2().nullish(),
      output: create_20(create_2(), create_12()).nullish(),
    }),
  ),
  M = {
    working:
      "actively progressing on the task \u2014 narrating plans, calling tools, or writing code; no pending question for the user",
    blocked:
      'the last message ends on a direct question or explicit request for the user ("want me to\u2026?", "which do you prefer?", "approve this?", "needs input: \u2026") \u2014 nothing will happen until the user replies',
    done: 'the task the user asked for is fully delivered and there is no further work the agent plans to do \u2014 not just a progress update, not "almost done", not "let me know what you think"',
    failed:
      "the agent has given up or hit something unrecoverable \u2014 missing credential, broken build it cannot fix, wrong repo, task impossible as framed; distinct from blocked (user can unblock) and done (succeeded)",
  },
  U = {
    result: "one short sentence naming the finished deliverable \u2014 no sub-clauses or bullet summaries",
  },
  Hg = 800,
  QQs = 2000,
  q = new Set(["done", "failed", "stopped"]);
/**
 * 截断字符串到给定长度并加省略号，避免切开代理对。
 */
//@ chunk-spwda8nt.js:1815-1941 placement
function truncateWithEllipsis(e, n) {
  if (e.length <= n) return e;
  let t = n - 1,
    code = e.charCodeAt(t - 1);
  if (code >= 55296 && code <= 56319) t--;
  return e.slice(0, t) + "\u2026";
}
//@ chunk-spwda8nt.js:1941-1978 placement
function f(e, n) {
  return findOpenCodeFence(e, n) !== null;
}
/**
 * 扫描到指定位置为止，找出仍未闭合的代码围栏（``` 或 ~~~，行首最多 3 个空格），返回其标记与长度或 null。
 */
//@ chunk-spwda8nt.js:1978-2413 placement
function findOpenCodeFence(e, n) {
  let t = null,
    s = 0,
    i = 0,
    index = e.indexOf("```"),
    index_2 = e.indexOf("~~~");
  while (i < n) {
    if (index !== -1 && index < i) index = e.indexOf("```", i);
    if (index_2 !== -1 && index_2 < i) index_2 = e.indexOf("~~~", i);
    let g = index === -1 ? index_2 : index_2 === -1 ? index : Math.min(index, index_2);
    if (g === -1 || g >= n) break;
    let r = e[g],
      c = g - 1,
      h = 0;
    while (c >= 0 && e[c] === " " && h < 3) (c--, h++);
    let d =
        c < 0 ||
        e[c] ===
          `
`,
      b = 3;
    i = g + 3;
    while (e[i] === r) (i++, b++);
    if (!d) continue;
    if (t === null) ((t = r), (s = b));
    else if (t === r && b >= s) ((t = null), (s = 0));
  }
  return t === null ? null : { marker: t, length: s };
}
//@ chunk-spwda8nt.js:2413-2498 placement
function bKo(e) {
  let n = findOpenCodeFence(e, e.length);
  return n === null
    ? ""
    : n.marker.repeat(n.length) +
        `
`;
}
/**
 * 组织需要验证时的 needs 文案。
 */
//@ chunk-spwda8nt.js:2498-2561 placement
var VERIFICATION_REQUIRED_NEEDS = "organization verification required \u2014 see detail";
//@ chunk-spwda8nt.js:4008-4275 placement
var FAILED_LINE_RE = /(?:^|\n)\s*failed\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,
  NEEDS_INPUT_LINE_RE = /(?:^|\n)\s*needs input\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,
  BLOCKED_LINE_RE = /(?:^|\n)\s*blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi,
  IM_BLOCKED_RE = /\bI'?m blocked\s*[:\u2014\u2013-]\s*(.{3,200}?)(?=\n|$)/gi;
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
      if (f(e, t + l.index)) continue;
      if (!s || l.index > s.index)
        s = { state: i, capture: l[1].trim(), index: l.index, end: l.index + l[0].length };
    }
  return s;
}
/**
 * 判断助手消息结尾的类型：空、在代码围栏中、Result 行、Failed 行、问号结尾、列表/表格或陈述句。
 */
//@ chunk-spwda8nt.js:4527-4997 placement
function classifyMessageEnding(e) {
  let trimmed = e.trim();
  if (!trimmed) return "empty";
  if (f(trimmed, trimmed.length)) return "code-fence";
  let sliced = trimmed.slice(-800),
    s = trimmed.length - sliced.length;
  for (let a of sliced.matchAll(/(?:^|\n)\s*result:\s*\S/gi))
    if (!f(trimmed, s + a.index)) return "result-line";
  for (let a of sliced.matchAll(/(?:^|\n)\s*failed:\s*\S/gi))
    if (!f(trimmed, s + a.index)) return "failed-line";
  if (/[?\uFF1F]\s*$/.test(trimmed)) return "trailing-q";
  let sliced_2 = trimmed.slice(-200);
  if (/(?:^|\n)\s*(?:[-*\u2022]|\d+\.|[|])\s/.test(sliced_2)) return "list-or-table";
  return "declarative";
}
/**
 * 用启发式规则判断会话状态（等待输入、运行中、出错等）。
 */
//@ chunk-spwda8nt.js:4997-9386 placement
function classifySessionStateHeuristic(e) {
  let trimmed = e.trim();
  if (!trimmed) return null;
  let sliced = trimmed.slice(-800),
    s;
  for (let o of sliced.matchAll(/(?:^|\n)\s*result:\s*(.+?)\s*(?:\n|$)/gi))
    if (!f(trimmed, trimmed.length - sliced.length + o.index)) s = o;
  let i = sliced,
    a = trimmed.length - sliced.length;
  if (s) {
    let o = s.index + s[0].length;
    ((i = sliced.slice(o)), (a = trimmed.length - sliced.length + o));
  }
  let l = findLastStatusLine(trimmed, i, a);
  if (s && !l) {
    let o = truncateWithEllipsis(s[1], Hg);
    if ([...i.matchAll(/(?:^|\n)\s*next:\s*\S/gi)].some((E) => !f(trimmed, a + E.index)))
      return {
        branch: "result-then-next",
        state: "working",
        tempo: "idle",
        detail: o,
        output: { result: o },
      };
    let R = findTrailingAsk(trimmed, trimmed.length - sliced.length + s.index);
    if (R?.kind === "stale") return null;
    if (R)
      return { branch: "result-approval-ask", state: "blocked", tempo: "blocked", needs: R.needs, detail: o };
    return { branch: "result-marker", state: "done", tempo: "idle", detail: o, output: { result: o } };
  }
  if (l?.state === "failed")
    return {
      branch: "failed-marker",
      state: "failed",
      tempo: "idle",
      detail: truncateWithEllipsis(l.capture, Hg),
      output: {},
    };
  if (l?.state === "blocked") {
    let sliced = i.slice(l.end);
    if (count(sliced.split(/\n\s*\n/), (u) => u.trim().length > 0) >= 3) return null;
    if (!/\bnothing (?:needed|required) from you\b|\bno(?: user)? action (?:needed|required)\b/i.test(i)) {
      let u = truncateWithEllipsis(l.capture, Hg);
      return { branch: "blocked-marker", state: "blocked", tempo: "blocked", needs: u, detail: u };
    }
    if (s) {
      let u = truncateWithEllipsis(s[1], Hg);
      return { branch: "blocked-disclaimed", state: "done", tempo: "idle", detail: u, output: { result: u } };
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
    if (!f(trimmed, trimmed.length - sliced.length + max)) {
      let u = truncateWithEllipsis(sliced.slice(max + 1).trim(), Hg);
      if (SESSION_STATE_PATTERNS.test(u)) return null;
      return { branch: "trailing-q", state: "blocked", tempo: "blocked", needs: u, detail: u };
    }
  }
  let max = Math.max(
      0,
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("! "),
      sliced.lastIndexOf("? "),
      sliced.lastIndexOf(`
`),
    ),
    replaced = sliced.slice(max).replace(/^[.!?\s]+/, ""),
    c = f(trimmed, trimmed.length - sliced.length + max),
    match =
      /\b(?:waiting (?:for|on)|pending)\s+(?:the\s+)?(?:CI|build|tests?|reviewer|deploy(?:ment)?|workflow|checks?|rollout|merge queue)\b/i.exec(
        replaced,
      );
  if (match && !c)
    return {
      branch: "wait-external",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(match[0], Hg),
      output: {},
    };
  let d = !1;
  if (!c)
    for (let o of replaced.matchAll(regExp)) {
      let u = getAskContext(replaced, o),
        R = classifyAskCandidate(replaced, o, u);
      if (R === "not-an-ask") continue;
      if (R === "defer") return null;
      if (!regExp_5.test(u.before) && ge.test(u.after)) {
        d = !0;
        continue;
      }
      let E = truncateWithEllipsis(replaced.slice(o.index).trim(), Hg);
      return { branch: "awaiting-user", state: "blocked", tempo: "blocked", needs: E, detail: E };
    }
  let match_2 =
    /\b(please (?:run|provide|confirm|clarify|choose|let me know)|let me know (?:which|what|how|when)|which (?:option|approach|one)|should I (?:proceed|continue|use))\b/i.exec(
      replaced,
    );
  if (match_2 && !c) {
    let o = truncateWithEllipsis(replaced.slice(match_2.index).trim(), Hg);
    return { branch: "ask-verb", state: "blocked", tempo: "blocked", needs: o, detail: o };
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
      needs: truncateWithEllipsis(replaced, Hg),
      detail: "authentication required",
    };
  let k = !c && !d;
  if (k && Y.test(replaced) && !X.test(replaced))
    return {
      branch: "working-verb",
      state: "working",
      tempo: "active",
      detail: truncateWithEllipsis(replaced, Hg),
      output: {},
    };
  if (k && Q.test(replaced))
    return {
      branch: "agents-status",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, Hg),
    };
  if (k && Z.test(replaced))
    return {
      branch: "will-check-back",
      state: "working",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, Hg),
    };
  if (!c && ee.test(replaced)) {
    let o = truncateWithEllipsis(replaced, Hg);
    return { branch: "cant-proceed", state: "blocked", tempo: "blocked", detail: o, needs: o };
  }
  if (k && ne.test(replaced))
    return {
      branch: "giving-up",
      state: "failed",
      tempo: "idle",
      detail: truncateWithEllipsis(replaced, Hg),
    };
  if (k && se.test(replaced)) {
    let o = truncateWithEllipsis(replaced, Hg);
    return { branch: "pushed-committed", state: "done", tempo: "idle", detail: o, output: { result: o } };
  }
  if (k && ie.test(replaced))
    return { branch: "ready-for", state: "done", tempo: "idle", detail: truncateWithEllipsis(replaced, Hg) };
  if (k && re.test(replaced)) {
    let o = truncateWithEllipsis(replaced, Hg);
    return { branch: "verdict-marker", state: "done", tempo: "idle", detail: o, output: { result: o } };
  }
  if (!c && oe.test(replaced)) {
    let o = truncateWithEllipsis(replaced, Hg);
    return { branch: "please-do-x", state: "blocked", tempo: "blocked", detail: o, needs: o };
  }
  if (!c && ae.test(replaced)) {
    let o = truncateWithEllipsis(replaced, Hg);
    return { branch: "stopping-here", state: "blocked", tempo: "blocked", detail: o, needs: o };
  }
  let x = findTrailingAsk(trimmed, trimmed.length - sliced.length);
  if (x?.kind === "ask")
    return {
      branch: "leading-approval-ask",
      state: "blocked",
      tempo: "blocked",
      needs: x.needs,
      detail: x.needs,
    };
  return null;
}
/**
 * 从给定位置起寻找"等待用户"式的请求句（排除代码块、非请求语境），后面还有正文时标记为过期；返回 {kind:'ask', needs} 或 {kind:'stale'}。
 */
//@ chunk-spwda8nt.js:9386-9976 placement
function findTrailingAsk(e, n) {
  let regExp = new RegExp(regExp_2);
  regExp.lastIndex = n;
  let sawStale = !1;
  for (let i of e.matchAll(regExp)) {
    if (f(e, i.index)) continue;
    let context = getAskContext(e, i),
      { before: before, after: after, end: end } = context;
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
      sawStale = !0;
      continue;
    }
    let trimmed = e.slice(i.index, end).trim();
    if (trimmed.endsWith("**") && trimmed.split("**").length % 2 === 0) trimmed = trimmed.slice(0, -2);
    else if (trimmed.endsWith(")") && countCharInString(trimmed, ")") > countCharInString(trimmed, "("))
      trimmed = trimmed.slice(0, -1);
    return { kind: "ask", needs: truncateWithEllipsis(trimmed, Hg) };
  }
  return sawStale ? { kind: "stale" } : void 0;
}
//@ chunk-spwda8nt.js:9976-10179 placement
function hasProseAfterParagraph(e, n) {
  let match = /\n[ \t]*\n/.exec(e.slice(n));
  if (!match) return !1;
  let s = n + match.index + 1;
  for (let i of e.slice(s).split(`
`)) {
    let a = s;
    s += i.length + 1;
    let trimmed = i.trim();
    if (trimmed && !ke.test(trimmed) && !f(e, a)) return !0;
  }
  return !1;
}
/**
 * 取问句匹配周围的上下文：之前的句子、再之前的句子、之后到句末的文本及结束位置。
 */
//@ chunk-spwda8nt.js:10179-10518 placement
function getAskContext(e, n) {
  let sliced = e.slice(Math.max(0, n.index - 800), n.index),
    s = [...sliced.matchAll(he)],
    at = s.at(-1),
    at_2 = s.at(-2),
    l = at ? sliced.slice(at.index + at[0].length) : sliced,
    g = at ? sliced.slice(at_2 ? at_2.index + at_2[0].length : 0, at.index + 1) : "",
    r = n.index + n[0].length,
    match = fe.exec(e.slice(r));
  return {
    before: l,
    previous: g,
    after: e.slice(r, match ? r + match.index : e.length),
    end: match ? r + match.index + match[0].length : e.length,
  };
}
//@ chunk-spwda8nt.js:10518-10730 placement
function classifyAskCandidate(e, n, { before: before, previous: previous }) {
  let i = before.split(be).at(-1) ?? before;
  if (
    Re.test(i) ||
    _e.test(i + n[0]) ||
    Ee.test(before) ||
    SESSION_STATE_PATTERNS.test(before) ||
    (/\?$/.test(previous) && SESSION_STATE_PATTERNS.test(previous))
  )
    return "not-an-ask";
  return xe.test(e.slice(n.index)) ? "defer" : "ask";
}
/**
 * 用最后一行非空文本构造启发式的 working 状态。
 */
//@ chunk-spwda8nt.js:10730-10885 placement
function buildWorkingState(e) {
  let last = e
    .split(
      `
`,
    )
    .map((t) => t.trim())
    .findLast(Boolean);
  return {
    branch: "heuristic",
    state: "working",
    tempo: "idle",
    detail: last ? truncateWithEllipsis(last, Hg) : "\u2014",
  };
}
/**
 * 会话状态启发式规则用到的文本模式表。
 */
//@ chunk-spwda8nt.js:10885-14842 placement
var SESSION_STATE_PATTERNS = /\b(?:want|like) me to\b|\b(?:shall|should) I also\b/i,
  Y =
    /^(?:(?:Now|Next|Then|Alright|OK|Okay|Right|Good|First|Also),?\s+)?(?:Let me (?!know\b)|(?:I(?:'?ll| will) |I'?m going to |Going to )(?!need\b|require\b|wait\b|leave\b|hold\b|skip\b|stop\b)|Proceeding |Moving (?:on|to)\b|Continuing |Starting |Trying |Checking |Looking |Searching |Reading |Investigating |Running |Re-?running |Building |Rebuilding |Installing |Fetching |Applying |Fixing |Patching |Updating |Adding |Removing |Deleting |Importing |Refactoring |Rewriting |Writing |Grepping |Scanning |Wrapping |Switching |Testing |Verifying |Regenerating |Pushing |Pulling |Reviewing |Examining |Loading |Compiling |Parsing |Analyzing |Tracing |Exploring )/i,
  X =
    /\b(?:once |when |after |until |as soon as )(?:you|it|the|that|this|they)\b|\bagain in\b|\bcheck back\b|\bin ~?\d+\s*(?:s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:ours?|rs?)?)\b|\bthen\.?\s*$|\bwhichever you\b|\bhold(?:ing)? for your\b|\b(?:to|and) wait for\b|\bgive it (?:more |some )?time\b|\bif (?:you(?:'d| want| prefer| need|'re)?|that(?:'s| helps| works)?|useful|needed|helpful|desired)\b|\b(?:isn'?t|not|won'?t) going to work\b/i,
  Q =
    /^(?:(?:\*\*)?[1-9]\d* (?:agent|cron|task|fork|job|worker|PR|check)s? (?:in flight|remaining|active|still (?:running|working)|pending|running|launched)\b|(?:Continuous )?(?:[Ll]oop|[Cc]rons?|[Bb]abysit) (?:active|healthy|continuing|running|will keep|continues)\b|Waiting for (?:the )?(?:agent|cron|task|fork|worker|job|remaining|them)s?\b|Agents? will report back\b|Waiting\.?$)/,
  Z =
    /^(?:I will|I'll|Will) (?:check back|re-?check|poll|look again|retry|re-?run|try again) (?:(?:when|once|after|until) (?!your?\b)|in\b|again\b)/i,
  ee = /^I (?:can(?:'?t|not)|am unable to) (?:proceed|continue|make (?:any )?progress|complete|fix this)\b/i,
  ne = /^(?:Giving up|I(?:'m| am) giving up|The task is not actionable)\b/i,
  se =
    /^(?:Pushed (?:to `|`[0-9a-f]{7,})|Committed as `?[0-9a-f]{7,}\b|Commit: `?[0-9a-f]{7,}\b|(?:Opened|Created) PR #?\d)/,
  ie = /^Ready (?:for review|to (?:upload|merge|ship|land))\b/,
  re = /^VERDICT: (?:PASS|FAIL)\b/,
  oe =
    /^Please (?:start|run|provide|grant|export|add|install|configure|give me|paste|point me|set (?:the |up |`?[A-Z][A-Z0-9_]+\b))/,
  ae =
    /^(?:Stopping here|I've stopped here|Parked (?:the|this) branch|Paused here)(?:\.|$| \u2014| -| until| pending| since| because)/i,
  L = String.raw`(?<!["'\u201C\u2018\x60]|\b(?:not|no longer|nothing(?: is|['\u2019]s)?|without|instead of|rather than|was|were|had been)\s+|n['\u2019]t\s+)`,
  T = String.raw`${L}\b(?:awaiting|waiting (?:for|on)|pending|ready for)\s+your\s+(?:approval|confirmation|go[- ]ahead|ok(?:ay)?\b|sign[- ]?off|green light)`,
  regExp = new RegExp(
    String.raw`${T}|${L}\b(?:awaiting|waiting (?:for|on)|pending)\s+(?:your\s+(?:feedback|input|decision|response|direction|guidance)|you\b|the user\b)`,
    "gi",
  ),
  regExp_2 = new RegExp(T, "gi"),
  A = String.raw`(?:\*\*|\()?(?:(?:I['\u2019]?m|I am|still|now|currently|just)\s+)*$`,
  regExp_3 = new RegExp(String.raw`^\s*(?:result:\s*)?${A}`, "i"),
  regExp_4 = new RegExp(String.raw`(?:[:;,\u2014\u2013]|\s-|\s\()\s*${A}`, "i"),
  regExp_5 = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}\s]|\b(?:is|are|am|be|been|and|but|or)|['\u2019](?:s|re|m))\s*${A}`,
    "iu",
  ),
  ge = /^\s+(?:will|would|is|are|was|were|has|have|had|can|should|gets?|go(?:es)?|stays?|shows?)\b/i,
  he = /[.!?](?:\*\*|\))?\s+|\n/g,
  fe = /[.!?](?:\*\*|\)|["'\u2019\u201D])*(?=\s|$)|\n/,
  be = /[,;:\u2014\u2013(]|\s-\s|\b(?:and|but|so|while)\b/i,
  ke = /^(?:```|~~~|[-+>|@]|[*\u2022]\s|\d+[.)]\s|#{1,6}\s)|:(?:\*\*)?$/,
  Re = /\b(?:no|not|nothing|none|never|nobody|neither|nor)\b|n['\u2019]t\b/i,
  Ee = /\bif you(?:['\u2019]d like| want| prefer| like)\b|\bI can also\b|\bhappy to\b|\boptionally\b/i,
  _e =
    /\b(?:once|when|after|until|as soon as)\s+(?:it|the|that|this|they)\b|\b(?:will|['\u2019]ll)\s+be\s+(?:ready|pending)\b/i,
  xe =
    /\bnext check\b|\bagain in\b|\bre-?poll|\bpoll(?:ing)? again\b|\bshepherding\b|\b(?:check(?:ing)? (?:back|again)|re-?check(?:ing)?|report(?:ing)?(?: back)?) (?:in|when|once|after)\b(?! you)/i;
/**
 * 构造会话状态分类模型的用户提示：当前状态与持续时间、工具调用摘要、用户最近请求与助手消息尾部。
 */
//@ chunk-spwda8nt.js:14842-15087 placement
function buildSessionStatePrompt(e) {
  let {
    tail: tail,
    prev: prev,
    latestAsk: latestAsk,
    toolSummary: toolSummary,
    minsInState: minsInState,
  } = e;
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
/**
 * 解析模型返回的会话状态 JSON，校验失败返回 null。
 */
//@ chunk-spwda8nt.js:15087-15192 placement
function parseSessionStateResponse(e) {
  let n = extractJsonObject(e);
  if (n === void 0) return null;
  let safeParse = SESSION_STATE_SCHEMA().safeParse(n);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-spwda8nt.js:15192-15372 placement
function extractJsonObject(e) {
  let replaced = e.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""),
    index = replaced.indexOf("{"),
    index_2 = replaced.lastIndexOf("}");
  if (index < 0 || index_2 < 0) return;
  try {
    return jsonParse(replaced.slice(index, index_2 + 1));
  } catch {
    return;
  }
}
//@ chunk-spwda8nt.js:15372-15425 placement
function m(e) {
  return typeof e === "string" && e ? e : void 0;
}
/**
 * 合并模型给出的会话状态与上一状态：校验状态与节奏，终态强制 idle，过滤并截断输出字段，blocked 时沿用需求说明。
 */
//@ chunk-spwda8nt.js:15425-15871 placement
function mergeSessionState(e, n, t) {
  let stateName = m(e.state),
    state = stateName && Object.hasOwn(M, stateName) ? stateName : (t?.state ?? n),
    tempoName = m(e.tempo),
    tempo = q.has(state)
      ? "idle"
      : tempoName === "active" || tempoName === "idle" || tempoName === "blocked"
        ? tempoName
        : (t?.tempo ?? "active"),
    output = {},
    rawOutput = e.output ?? t?.output;
  if (rawOutput && typeof rawOutput === "object")
    for (let [h, d] of Object.entries(rawOutput)) {
      let b = m(d);
      if (b && Object.hasOwn(U, h)) output[h] = truncateWithEllipsis(b, Hg);
    }
  let needs = m(e.needs) ?? (tempo === "blocked" ? t?.needs : void 0);
  return {
    state: state,
    detail: m(e.detail) ?? t?.detail ?? "",
    tempo: tempo,
    needs: needs,
    output: output,
    branch: t?.branch,
  };
}
//@ chunk-spwda8nt.js:15871-16094 placement
var MAX_HEADLINE_LENGTH = 140,
  MAX_NEEDS_LENGTH = 64,
  MAX_REPLY_LENGTH = 80,
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
/**
 * 解析会话回顾 JSON，校验失败或 happened 为空时返回 null。
 */
//@ chunk-spwda8nt.js:16094-16240 placement
function parseSessionRecap(e) {
  let n = extractJsonObject(e);
  if (n === void 0) return null;
  let safeParse = sessionRecapSchema().safeParse(n);
  if (!safeParse.success || !m(safeParse.data.happened)?.trim()) return null;
  return safeParse.data;
}
//@ chunk-spwda8nt.js:16395-16690 affinity
function formatHappenedSummary(e) {
  let n = truncateContent(e.happened ?? ""),
    t = truncateContent(e.needs_you ?? ""),
    s = getSuggestedReply(e, t.text),
    i = truncateContent(m(e.headline) ?? n.text, MAX_NEEDS_LENGTH);
  return {
    recap: {
      state: e.state,
      headline: i.text,
      needs: truncateWithEllipsis(normalizeWhitespace(m(e.needs) ?? ""), Hg),
      happened: n.text,
      needsYou: t.text,
      reply: s.text,
    },
    truncated: i.truncated || n.truncated || t.truncated || s.truncated,
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
/**
 * 文本（多种规整形式）是否含批准/合并/部署/发布/支付/迁移/推送等高风险动作词。
 */
//@ chunk-spwda8nt.js:17184-17308 placement
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
/**
 * 只对 needs_reply 状态给出建议回复：回复为空、不含可见字符或涉及高风险批准时不给；过长时标记截断。
 */
//@ chunk-spwda8nt.js:17583-17863 placement
function getSuggestedReply(e, n) {
  if (e.state !== "needs_reply" || n === "") return { text: "", truncated: !1 };
  let t = normalizeWhitespace(e.reply ?? "");
  if (
    !/(?!\u2800)[\p{L}\p{N}\p{P}\p{S}]/u.test(t) ||
    looksLikeRiskyApproval(e.reply ?? "") ||
    looksLikeRiskyApproval(e.needs_you ?? "")
  )
    return { text: "", truncated: !1 };
  return t.length <= MAX_REPLY_LENGTH ? { text: t, truncated: !1 } : { text: "", truncated: !0 };
}
/**
 * 把会话回顾转成会话状态：需回复/需批准时为 blocked 并带需求说明，其余为 idle。
 */
//@ chunk-spwda8nt.js:17863-18064 placement
function recapToSessionState(e) {
  let n = e.state === "needs_reply" || e.state === "needs_approval";
  return {
    state: n ? "blocked" : e.state,
    detail: e.headline,
    tempo: n ? "blocked" : "idle",
    needs: n && e.needs ? e.needs : void 0,
    output: {},
    recap: e,
  };
}
/**
 * 后台会话状态：在途工作快照（任务、排队、类型）及变化信号、待处理结构化结果、迁移后的 cwd 等。
 */
//@ chunk-spwda8nt.js:18064-18532 placement
class SessionStatusState {
  inFlightSnapshot = { tasks: 0, queued: 0, kinds: [], items: [] };
  inFlightSnapshotChanged = createSignal();
  pendingStructuredResult = void 0;
  relocatedCwd = void 0;
  ownStateWriteDepth = 0;
  warnedUnknownDisabledSurface = !1;
  publishInFlightSnapshot(e) {
    this.inFlightSnapshot = e;
    try {
      this.inFlightSnapshotChanged.emit();
    } catch {}
  }
  reset() {
    ((this.pendingStructuredResult = void 0),
      (this.relocatedCwd = void 0),
      (this.warnedUnknownDisabledSurface = !1),
      this.publishInFlightSnapshot({ tasks: 0, queued: 0, kinds: [], items: [] }));
  }
}
//@ chunk-spwda8nt.js:18532-18556 placement
var Pe = new HostScoped(() => new SessionStatusState());
//@ chunk-spwda8nt.js:18556-18593 placement
function NX() {
  return Pe.of(getRootSession().host);
}

export {
  SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE,
  VERIFICATION_REQUIRED_NEEDS,
  truncateWithEllipsis,
  NX,
  Hg,
  MAX_HEADLINE_LENGTH,
  normalizeWhitespace,
  classifySessionStateHeuristic,
  bKo,
  mergeSessionState,
  buildWorkingState,
  QQs,
  buildSessionStatePrompt,
  parseSessionRecap,
  parseSessionStateResponse,
  formatHappenedSummary,
  recapToSessionState,
  classifyMessageEnding,
};
