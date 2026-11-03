/**
 * components/fleet/FleetRow.tsx
 *
 * 2.1.316 新增：组合本地、接管的、远程、待创建会话及 PR 状态，生成 Agents 视图全部行（分组、过滤、折叠）；把会话分成 needs/live/done 等带计数的桶等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (49)
 * attribution: placement 49
 */
import { isAbsolute, isAbsolute as isAbsolute_2 } from "path";
import {
  Io,
  pd,
  bn,
  Ao,
  hd,
  mo,
  Si,
  jobTempo,
  jobBucket,
  jn,
  bs,
  FLEET_BUCKETS,
  jobSortKey,
  gd,
  computeDoneCap,
  doneFoldIndex,
  fs,
  layoutRows,
  bestSearchMatchIndex,
  initialFocusIndex,
  cs,
} from "./fleetRows.js";
import {
  SEED_DETAIL,
  isSettled,
  terminalOutcome,
  isSelfDriving,
  isLoopJob,
  IDLE_NEEDS,
  spawnOrigin,
  jobMatchesCwd,
  UNGROUPED,
  EARLIER,
} from "../../services/daemon/jobState.js";
import { formatDuration, formatTokens, truncateToWidth } from "../../utils/format.js";
import { Dr, repeatString } from "../../utils/stringUtils.js";
import { sanitizeAttentionText } from "./sessionAttention.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { ace } from "../../cli/bg/bgSpawnEnv.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { splitGraphemes } from "../../utils/intl.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { R, y, zt, Kc } from "../../../vendor/react/cjs/react.production.js";
import { countGraphemes } from "../../ink/output.js";
import { hf, BULLET_OPERATOR } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Lh } from "./fleetDispatch.js";
import { getDefaultCharacters, VWe } from "../Spinner/utils.js";
import { vhe } from "../../utils/detectRepository.js";
import {
  parsePrNumber,
  Is,
  _s,
  jobReferencesPr,
  Rd,
  parseDispatchInput,
  parseDispatchFlags,
} from "./fleetSessions.js";
import { getPrStatusColor } from "../../utils/ghPrStatus.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Link } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { trimTrailingPunctuation } from "../../services/oauth/oauthErrors.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { SPINNER_DOT } from "../Spinner/SpinnerGlyph.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { count } from "../../utils/collections.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { rankJobNameMatch } from "../../cli/bg/bgDispatch.js";
import { Eh } from "../../utils/pathClassification.js";
import { ai, Qg } from "../../utils/networkPaths.js";

/**
 * 会话距上次更新的时长文字（活跃时为空）。
 */
//@ chunk-93kwxas0.js:72647-73045 placement
function formatJobAge(h, E) {
  let state = h.state;
  if (Io(state)) {
    let x = Date.parse(state.updatedAt) || Date.parse(state.createdAt);
    if (!Number.isFinite(x)) return "";
    let max = Math.max(0, E - x);
    return state.tempo === "active" && state.detail !== SEED_DETAIL && max < pd
      ? ""
      : formatDuration(max, { mostSignificantOnly: !0 });
  }
  let C =
    isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state))
      ? Date.parse(state.firstTerminalAt ?? state.updatedAt)
      : E;
  return formatDuration(Math.max(0, C - Date.parse(state.createdAt)), { mostSignificantOnly: !0 });
}
/**
 * 未来时间显示 “in X”，否则显示会话年龄。
 */
//@ chunk-93kwxas0.js:73045-73153 placement
function formatJobAgeOrEta(h, E, k = Date.now()) {
  if (E != null && E > k) return `in ${formatDuration(E - k, { mostSignificantOnly: !0 })}`;
  return formatJobAge(h, k);
}
/**
 * 会话显示标题：名称或意图摘要，当前/来源会话特殊标注。
 */
//@ chunk-93kwxas0.js:73153-73763 placement
function getJobTitle(h, E = !1, k = !1) {
  let C = (D) => Dr(Io(h) ? sanitizeAttentionText(D) : D);
  if (h.name) return redactSecrets(C(h.name));
  let x = 25,
    filtered = redactSecrets(C(h.displayIntent ?? h.intent))
      .split(" ")
      .filter(Boolean);
  if (filtered.length === 0) {
    if (E) return k ? "session you came from" : "current session";
    if ((h.template === "bg" || h.template === ace.name) && h.state === "working")
      return k ? "untitled session" : "new session";
    if (k && (h.template === "bg" || h.template === ace.name)) return "untitled session";
    return Dr(h.template);
  }
  let A = filtered.length > 3 ? `${filtered.slice(0, 3).join(" ")}\u2026` : filtered.join(" ");
  if (bunStringWidth(A) <= x) return A;
  let L = "",
    V = 0;
  for (let D of splitGraphemes(A)) {
    let U = bunStringWidth(D);
    if (V + U > x - 1) break;
    ((L += D), (V += U));
  }
  return `${L}\u2026`;
}
/**
 * 未命名会话自动生成标题的 hook。
 */
//@ chunk-93kwxas0.js:73763-74583 placement
function useAutoTitle(h, E) {
  let C = w(12),
    k = useClock(),
    x;
  if (C[0] !== h || C[1] !== E)
    ((x = { label: h, hasName: E, fired: !1 }), (C[0] = h), (C[1] = E), (C[2] = x));
  else x = C[2];
  let T = R(x),
    [A, L] = y(null),
    V,
    D;
  if (C[3] !== k || C[4] !== h || C[5] !== E)
    ((V = () => {
      if (T.current.fired || T.current.hasName || !E) {
        T.current = { label: h, hasName: E, fired: T.current.fired };
        return;
      }
      let label = T.current.label;
      T.current = { label: h, hasName: !0, fired: !0 };
      let max = Math.max(countGraphemes(label), countGraphemes(h));
      if (max === 0) {
        return;
      }
      L({ old: label, n: 1 });
      let X = 1;
      let max_2 = Math.max(16, Math.floor(360 / max));
      let W = null;
      let z = () => {
        if (((X = X + 1), X >= max)) (L(null), (W = null));
        else (L({ old: label, n: X }), (W = k.setTimeout(z, max_2)));
      };
      return (
        (W = k.setTimeout(z, max_2)),
        () => {
          (W?.(), L(null));
        }
      );
    }),
      (D = [k, h, E]),
      (C[3] = k),
      (C[4] = h),
      (C[5] = E),
      (C[6] = V),
      (C[7] = D));
  else ((V = C[6]), (D = C[7]));
  if ((zt(V, D), !A)) {
    return null;
  }
  let oe;
  if (C[8] !== A.n || C[9] !== A.old || C[10] !== h)
    ((oe = blendTitleAnimation(A.old, h, A.n)), (C[8] = A.n), (C[9] = A.old), (C[10] = h), (C[11] = oe));
  else oe = C[11];
  return oe;
}
/**
 * 标题替换动画的一帧：新标题前 k 个字素 + 旧标题剩余部分，补齐到两者最大宽度。
 */
//@ chunk-93kwxas0.js:74583-74814 placement
function blendTitleAnimation(h, E, k) {
  let C = splitGraphemes(h),
    x = splitGraphemes(E),
    joined = x.slice(0, Math.min(k, x.length)).join(""),
    max = Math.max(bunStringWidth(h), bunStringWidth(E)),
    L = bunStringWidth(joined),
    V = "";
  for (let D of C.slice(k)) {
    let U = bunStringWidth(D);
    if (L + U > max) break;
    ((V += D), (L += U));
  }
  return { display: joined + V + repeatString(" ", max - L), newLen: joined.length };
}
/**
 * 会话产物（PR/frame）列所需宽度。
 */
//@ chunk-93kwxas0.js:74814-75065 placement
function artifactColumnWidth(h) {
  let E = bn(h.children);
  if (!E.length) return 0;
  let filtered = E.filter((C) => C.kind !== "frame");
  if (filtered.length > 1) return bunStringWidth(`${filtered.length} PRs`);
  if (filtered.length === 1) {
    let C = prNumberOfChild(filtered[0]);
    return bunStringWidth(C !== void 0 ? `#${C}` : "PR");
  }
  return bunStringWidth(E.length > 1 ? `${E.length} ${hf}` : hf);
}
//@ chunk-93kwxas0.js:75065-75113 placement
function Ep(h) {
  return h.includes("--safe-mode");
}
/**
 * 计算 Agents 行的列宽（年龄、标签、产物、详情）。
 */
//@ chunk-93kwxas0.js:75113-75402 placement
function computeFleetColumnWidths(h, E, k, C, x) {
  let max = Math.max(Lh, ...h.map((D) => bunStringWidth(formatJobAgeOrEta(D, E(D), x)))),
    min = Math.min(
      Math.max(40, Math.floor(C / 3)),
      Math.max(12, ...h.map((D) => bunStringWidth(getJobTitle(D.state, D.id === k)))),
    ),
    max_2 = Math.max(0, ...h.map((D) => artifactColumnWidth(D.state))),
    max_3 = Math.max(8, C - (min + 2) - 2 - (max_2 + 2) - (max + 2) - 2);
  return { age: max, label: min, artifact: max_2, detail: max_3 };
}
//@ chunk-93kwxas0.js:75402-75429 placement
function vp() {
  return getDefaultCharacters();
}
//@ chunk-93kwxas0.js:75429-75456 placement
function up() {
  return VWe();
}
//@ chunk-93kwxas0.js:75456-75485 placement
function Vh() {
  return vp()[4];
}
//@ chunk-93kwxas0.js:75485-75514 placement
function Bh() {
  return vp()[1];
}
/**
 * 由活动与状态得出动词与颜色（Done/Failed/Stopped/Working…）。
 */
//@ chunk-93kwxas0.js:75514-75918 placement
function activityVerb(h, E, k, C) {
  if (h === "success" && C) return { word: "Done", color: "success", dim: !1 };
  if (h === "failure" && C) return { word: "Failed", color: "error", dim: !1 };
  if (h === "stopped" && C) return { word: "Stopped", color: "inactive", dim: !1 };
  if (k === "busy" || k === "shell") return { word: Ao.working, color: void 0, dim: !1 };
  if (E === "blocked" || k === "waiting") return { word: Ao.blocked, color: "warning", dim: !1 };
  return { word: "Idle", color: void 0, dim: !0 };
}
//@ chunk-93kwxas0.js:75918-76006 placement
function Cp(h, E, k) {
  let { color: color, dim: dim } = activityVerb(E, h.tempo, k, terminalOutcome(h.state));
  return { color: color, dim: dim };
}
//@ chunk-93kwxas0.js:76006-76033 placement
var cp = { error: 2, warning: 1 };
/**
 * 在会话与子项颜色中取优先级最高的颜色。
 */
//@ chunk-93kwxas0.js:76033-76176 placement
function pickHighestPriorityColor(h, E) {
  let k = h,
    C = h ? (cp[h] ?? 0) : 0;
  for (let x of E) {
    if (x.color === void 0 || wn(x)) continue;
    let T = cp[x.color] ?? 0;
    if (T > C) ((k = x.color), (C = T));
  }
  return k;
}
//@ chunk-93kwxas0.js:76176-76219 placement
function wn(h) {
  return h.row.kind === "frame";
}
//@ chunk-93kwxas0.js:76219-76263 placement
function Ci(h) {
  return vhe(h.href) ? "mr" : "pr";
}
/**
 * 子项的 PR 号：从链接里解析，或 id 本身是数字。
 */
//@ chunk-93kwxas0.js:76263-76369 placement
function prNumberOfChild(h) {
  let E = parsePrNumber(h.href);
  if (E !== null) return Number(E);
  return /^\d+$/.test(h.id) ? Number(h.id) : void 0;
}
//@ chunk-93kwxas0.js:76369-76428 placement
function Ip(h) {
  let E = getPrStatusColor(h);
  return E === "error" ? "warning" : E;
}
//@ chunk-93kwxas0.js:76428-76465 placement
var Jh = { error: 3, warning: 2, success: 1 };
//@ chunk-93kwxas0.js:76465-76528 placement
function Hh(h) {
  return [...h].sort((E, k) => k.sortRank - E.sortRank);
}
/**
 * PR 状态的显示片段（已合并/关闭、检查失败/进行/通过）。
 */
//@ chunk-93kwxas0.js:76528-77217 placement
function prStatusSegments(h) {
  if (h.state === "MERGED") return [{ text: "merged", color: "merged" }];
  if (h.state === "CLOSED") return [{ text: "closed", color: "inactive" }];
  let E = [],
    { failed: failed, pending: pending, passed: passed } = h.checks,
    T = failed + pending + passed;
  if (failed > 0) E.push({ text: `${re.cross} ${failed}/${T}`, color: "error" });
  else if (pending > 0) E.push({ text: `${passed}/${T}`, color: "warning" });
  else if (T > 0) E.push({ text: re.tick, color: "success" });
  switch (h.review) {
    case "APPROVED":
      E.push({ text: "approved", color: "success" });
      break;
    case "CHANGES_REQUESTED":
      E.push({ text: re.cross, color: "error" });
      break;
    case "REVIEW_REQUIRED":
      E.push({ text: "needs review", color: void 0 });
      break;
    case null:
      break;
  }
  if (E.length === 0 && h.state !== "DRAFT") E.push({ text: h.state.toLowerCase(), color: Ip(h) });
  return E;
}
/**
 * 生成会话的子行（frame、PR 链接及其状态）。
 */
//@ chunk-93kwxas0.js:77217-77727 placement
function childFrameRows(h, E) {
  return Hh(
    bn(h).map((k) => {
      if (k.kind === "frame")
        return {
          row: k,
          prNumber: void 0,
          label: Dr(k.title ?? "") || Dr(k.id),
          status: [],
          diffStat: void 0,
          isDraft: !1,
          color: "claude",
          sortRank: 0,
        };
      let C = E.get(k.href),
        x = C ? getPrStatusColor(C) : void 0;
      return {
        row: k,
        prNumber: C?.number ?? prNumberOfChild(k),
        label: C?.title ? Dr(C.title) : "",
        status: C ? prStatusSegments(C) : [],
        diffStat:
          C && C.state !== "MERGED" && C.state !== "CLOSED"
            ? { additions: C.additions, deletions: C.deletions }
            : void 0,
        isDraft: C?.state === "DRAFT",
        color: C ? Ip(C) : void 0,
        sortRank: C?.state === "OPEN" && x ? (Jh[x] ?? 0) : 0,
      };
    }),
  );
}
//@ chunk-93kwxas0.js:77727-77775 placement
var pp = /https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+/;
/**
 * 渲染带 **粗体**、++强调++、代码和链接的单行文本。
 */
//@ chunk-93kwxas0.js:77775-78456 placement
function InlineMarkup(h) {
  let C = w(11),
    { value: E, linkHref: linkHref } = h,
    x,
    T,
    A;
  if (C[0] !== linkHref || C[1] !== E) {
    let parts = E.split(/(\*\*.+?\*\*|\+\+.+?\+\+|`[^`]+`|https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+)/g);
    x = Text;
    T = !0;
    let V;
    if (C[5] !== linkHref)
      ((V = (D, U) => {
        let match = D.match(/^(?:\*\*|\+\+|`)(.+?)(?:\*\*|\+\+|`)$/);
        if (match) {
          return e(Text, { bold: !0, children: match[1] }, U);
        }
        if (pp.test(D)) {
          let X = trimTrailingPunctuation(D);
          let K = linkHref === void 0 ? X : linkHref(X);
          if (K === void 0) {
            return D;
          }
          return r(Kc, { children: [e(Link, { url: K, children: X }), D.slice(X.length)] }, U);
        }
        return D;
      }),
        (C[5] = linkHref),
        (C[6] = V));
    else V = C[6];
    A = parts.map(V);
    ((C[0] = linkHref), (C[1] = E), (C[2] = x), (C[3] = T), (C[4] = A));
  } else ((x = C[2]), (T = C[3]), (A = C[4]));
  let V;
  if (C[7] !== x || C[8] !== T || C[9] !== A)
    ((V = e(x, { dimColor: T, children: A })), (C[7] = x), (C[8] = T), (C[9] = A), (C[10] = V));
  else V = C[10];
  return V;
}
/**
 * 行的无障碍前缀：“selected, pinned, 动词:”。
 */
//@ chunk-93kwxas0.js:78456-78583 placement
function jobRowAriaLabel(h, E, k, C, x, T = !1) {
  let A = x ? "selected, " : "",
    L = T ? "pinned, " : "",
    { word: word } = activityVerb(h, E, k, C);
  return `${A}${L}${word.toLowerCase()}:`;
}
/**
 * 行首状态符号：非活跃时为点，忙碌/shell 时为空，循环任务和普通任务各有符号。
 */
//@ chunk-93kwxas0.js:78583-78723 placement
function jobRowGlyph(h, E, k) {
  if (E && h.tempo !== "active" && k === void 0) return BULLET_OPERATOR;
  if (k === "busy" || k === "shell") return null;
  if (isLoopJob(h)) return Bh();
  return Vh();
}
/**
 * Agents 视图的旋转指示帧；减少动态效果或读屏时为静态点。
 */
//@ chunk-93kwxas0.js:78723-78895 placement
function useFleetSpinnerFrame() {
  let x = w(1),
    h = usePrefersReducedMotion(),
    E = useIsScreenReaderEnabled(),
    k = h || E,
    [, C] = useAnimationFrame(k ? null : 120);
  if (k) {
    return SPINNER_DOT;
  }
  let T;
  if (x[0] === MEMO_CACHE_SENTINEL) ((T = up()), (x[0] = T));
  else T = x[0];
  let A = T;
  return A[Math.floor(C / 120) % A.length];
}
//@ chunk-93kwxas0.js:78895-79070 placement
var FLEET_RECENT_WINDOW_MS = 172800000,
  Yh = 3,
  zh = 3,
  Qh = 2,
  Xh = 2,
  Zh = 4,
  eb = 1,
  SIMPLE_NEW_SESSION = "simple:new-session",
  SIMPLE_PINNED = "simple:pinned",
  SIMPLE_FINISHED = "simple:finished",
  SIMPLE_BUCKET_KEYS = { needs: "simple:needs", live: "simple:live", done: "simple:done" };
/**
 * 会话归入 needs/live/done 中的哪个桶。
 */
//@ chunk-93kwxas0.js:79070-79275 placement
function jobBucket_2(h, E) {
  if (E === "busy") return "live";
  if (isSettled(h) && !(terminalOutcome(h.state) === "success" && isSelfDriving(h))) return "done";
  if (E === "waiting") return "needs";
  if (h.tempo === "blocked" && h.needs && h.needs !== IDLE_NEEDS) return "needs";
  return "live";
}
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
//@ chunk-93kwxas0.js:79275-79429 placement
function jobLatestTimestamp(h) {
  for (let E of [h.lastTerminalAt, h.firstTerminalAt, h.updatedAt, h.createdAt])
    if (E) {
      let parse = Date.parse(E);
      if (Number.isFinite(parse)) return parse;
    }
  return 0;
}
//@ chunk-93kwxas0.js:79429-79511 placement
function _i(h, E) {
  if (h === void 0) return !1;
  return !(Tp(h) === SIMPLE_BUCKET_KEYS.done && Tp(E) === SIMPLE_BUCKET_KEYS.done);
}
//@ chunk-93kwxas0.js:79511-79562 placement
function Tp(h) {
  return h.group === SIMPLE_FINISHED ? SIMPLE_BUCKET_KEYS.done : h.group;
}
//@ chunk-93kwxas0.js:79562-79608 placement
function ob(h, E) {
  return Math.max(0, h - Yh - hd - E);
}
/**
 * 把会话分成 needs/live/done 等带计数的桶。
 */
//@ chunk-93kwxas0.js:79608-80705 placement
function bucketJobs(
  h,
  {
    statusFor: statusFor,
    now: now,
    fallbackOrigin: fallbackOrigin,
    showFinishedEarlier: showFinishedEarlier,
    terminalRows: terminalRows,
  },
) {
  let A = [],
    L = [],
    V = [],
    D = [],
    U = 0,
    N = 0,
    X = 0;
  for (let le of h) {
    let Oe = statusFor(le),
      De = jobBucket_2(le.state, Oe);
    if (De === "needs") U++;
    else if (De === "live") {
      if ((N++, Oe === "busy" || Oe === "shell")) X++;
    }
    if (le.state.pinned) {
      A.push(le);
      continue;
    }
    switch (De) {
      case "needs":
        L.push(le);
        break;
      case "live":
        V.push(le);
        break;
      case "done":
        D.push(le);
        break;
    }
  }
  D.sort((le, Oe) => jobLatestTimestamp(Oe.state) - jobLatestTimestamp(le.state));
  let K = [{ kind: "newsession", origin: fallbackOrigin, group: SIMPLE_NEW_SESSION }],
    W = (le, Oe) => {
      for (let De of Oe) K.push({ kind: "job", job: De, origin: spawnOrigin(De.state), group: le });
    };
  (W(SIMPLE_PINNED, A), W(SIMPLE_BUCKET_KEYS.needs, L), W(SIMPLE_BUCKET_KEYS.live, V));
  let oe =
      1 + (V.length * Qh + (A.length + L.length) * zh) + (U + N === 0 ? Zh : 0) + (D.length > 0 ? 1 + eb : 0),
    ge = ob(terminalRows, oe),
    se = count(D, (le) => now - jobLatestTimestamp(le.state) > FLEET_RECENT_WINDOW_MS),
    max = Math.max(0, D.length - se - ge),
    ae = showFinishedEarlier ? 0 : se + max,
    me = ae >= Xh ? ae : 0,
    Je = count(D.slice(D.length - me), (le) => terminalOutcome(le.state.state) === "failure");
  if ((W(SIMPLE_BUCKET_KEYS.done, D.slice(0, D.length - me)), me > 0))
    K.push({ kind: "fold", origin: fallbackOrigin, group: SIMPLE_FINISHED, hidden: me });
  return {
    rows: K,
    doneCount: D.length,
    doneFoldHidden: me,
    doneFoldHiddenFailed: Je,
    doneCap: ge,
    foldGroup: SIMPLE_FINISHED,
    runningCount: U + N,
    needsCount: U,
    workingCount: X,
    liveCount: N,
  };
}
/**
 * 子任务进度：todo 完成数，或 agent/workflow 完成数。
 */
//@ chunk-93kwxas0.js:80705-80972 placement
function fanProgressLabel(h) {
  let E = h.fan ?? [],
    filtered = E.filter((x) => x.kind === "todo");
  if (filtered.length > 0) return `${count(filtered, (x) => x.doneAt !== void 0)}/${filtered.length}`;
  let filtered_2 = E.filter((x) => x.kind === "agent" || x.kind === "workflow");
  if (filtered_2.length > 0)
    return `${count(filtered_2, (x) => x.doneAt !== void 0)}/${filtered_2.length} agents`;
  return;
}
/**
 * “N tokens”，下行时带箭头。
 */
//@ chunk-93kwxas0.js:80972-81074 placement
function formatTokenCount(h, E) {
  if (h === void 0 || h <= 0) return;
  let k = `${formatTokens(h)} tokens`;
  return E ? `${re.arrowDown} ${k}` : k;
}
/**
 * 行的活动词与颜色：working 变暗，blocked 时区分 “Needs you” 与 “Idle”。
 */
//@ chunk-93kwxas0.js:81074-81330 placement
function jobActivityDisplay(h, E) {
  let k = E(h),
    C = activityVerb(h.activity, h.state.tempo, k, terminalOutcome(h.state.state));
  if (C.word === Ao.working) return { ...C, color: void 0, dim: !0 };
  if (C.word !== Ao.blocked) return C;
  return jobBucket_2(h.state, k) === "needs"
    ? { ...C, word: "Needs you" }
    : { word: "Idle", color: void 0, dim: !0 };
}
//@ chunk-93kwxas0.js:81330-81418 placement
function Hd(h, E, k, C) {
  return formatJobAgeOrEta(h, E.has(h.id) ? k.get(h.state.sessionId)?.nextAt : void 0, C);
}
//@ chunk-93kwxas0.js:81418-81481 placement
function jd(h, E) {
  return formatTokenCount(h.state.tokens, E.word === Ao.working);
}
/**
 * 生成会话"需要你处理"的一行说明。
 */
//@ chunk-93kwxas0.js:81481-81851 placement
function jobNeedsLine(h, E, k, C) {
  let x = isScreenReaderMode() ? 1 / 0 : Math.max(24, Math.min(72, Math.floor(C * 0.55))),
    T = (U) => (x === 1 / 0 ? U : truncateToWidth(U, x));
  if (jobBucket_2(h.state, k) === "done") return;
  let L = h.state.needs && h.state.needs !== IDLE_NEEDS ? h.state.needs : void 0;
  if (L) return T(mo(h.state, L));
  if (!h.state.pinned && E.word !== Ao.working) return;
  let V = fanProgressLabel(h.state);
  if (V) return V;
  let detail = h.state.detail;
  return detail && !Si(detail) ? T(mo(h.state, detail)) : void 0;
}
//@ chunk-93kwxas0.js:81851-81909 placement
function Sn(h, E) {
  return E === "pinned" ? "pinned" : `${h}:${E}`;
}
//@ chunk-93kwxas0.js:81909-82123 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput(h, E, k, C) {
  let x = E === "bash" ? null : parsePrNumber(h),
    T = x ? Is(x) : void 0,
    A = E === "bash" || x ? null : _s(h),
    L = (D) => !C || jobMatchesCwd(D.state, C),
    V = x ? (D) => jobReferencesPr(D, x, T) : A ? (D) => Rd(D, A) : null;
  return V ? (k ?? []).find((D) => L(D) && V(D.state))?.id : void 0;
}
//@ chunk-93kwxas0.js:82123-82217 placement
function Ws(h, E, k, C) {
  return k ? null : parseDispatchInput(E === "bash" ? `!${h}` : h, C.templates, C.allRepos, C.routines);
}
//@ chunk-93kwxas0.js:82217-82276 placement
function ib(h) {
  return !!(h?.intent || h?.routine || h?.matched);
}
//@ chunk-93kwxas0.js:82276-82370 placement
function sb(h) {
  return !!(h && (h.intent || h.routine || h.matched || h.cwd !== void 0 || h.exec !== void 0));
}
/**
 * 组合本地、接管的、远程、待创建会话及 PR 状态，生成 Agents 视图全部行（分组、过滤、折叠）。
 */
//@ chunk-93kwxas0.js:82370-88328 placement
function buildFleetRows({
  jobs: jobs,
  adoptedPeers: adoptedPeers,
  remoteJobs: remoteJobs,
  pendings: pendings,
  prStatuses: prStatuses,
  liveStatus: liveStatus,
  heldInTerminal: heldInTerminal,
  loopJobIds: loopJobIds,
  loopKicks: loopKicks,
  focusedIdx: focusedIdx,
  hoverFocusIdx: hoverFocusIdx,
  followOrigin: followOrigin,
  collapsed: collapsed,
  capExpanded: capExpanded,
  groupMode: groupMode,
  activeTab: activeTab,
  query: query,
  mode: mode,
  dispatch: dispatch,
  linkMatchId: linkMatchId,
  dispatchRepoCwd: dispatchRepoCwd,
  pendingDelete: pendingDelete,
  earlierEntries: earlierEntries,
  cwdFilter: cwdFilter,
  initialJobId: initialJobId,
  simpleView: simpleView,
  simpleWantsRemote: simpleWantsRemote,
  peersEnabled: peersEnabled,
  showRemoteTabs: showRemoteTabs,
  launcherCwd: launcherCwd,
  launcherGroup: launcherGroup,
  scopedFallbackOrigin: scopedFallbackOrigin,
  termRows: termRows,
  columns: columns,
  now: now,
  ageNow: ageNow,
}) {
  let Wt = (xe) => Sn(groupMode, xe),
    ke = mode === "bash" || dispatch?.exec !== void 0,
    Ge = ib(dispatch),
    yt = sb(dispatch),
    Bt = dispatch === null,
    lt = Bt ? new Set() : collapsed,
    {
      template: template,
      state: state,
      name: Ot,
      group: group,
      output: output,
      pr: pr,
      url: url,
      text: text,
    } = parseDispatchFlags(dispatch ? "" : query),
    Fe = pr ? Is(pr) : void 0,
    Rt = [...(jobs ?? []), ...(peersEnabled ? adoptedPeers : [])],
    Vt = cwdFilter ? Rt.filter((xe) => jobMatchesCwd(xe.state, cwdFilter)) : Rt,
    Be = showRemoteTabs
      ? activeTab === "remote"
        ? remoteJobs
        : Vt
      : simpleWantsRemote
        ? [...Vt, ...remoteJobs]
        : Vt,
    filtered = Be.filter((xe) => {
      if (template && !xe.state.template.toLowerCase().startsWith(template)) return !1;
      if (Ot && rankJobNameMatch(xe.state, Ot) === 0) return !1;
      if (
        group &&
        !xe.state.group?.toLowerCase().startsWith(group) &&
        !(xe.state.pinned && "pinned".startsWith(group))
      )
        return !1;
      if (pr && !jobReferencesPr(xe.state, pr, Fe)) return !1;
      if (url && !Rd(xe.state, url)) return !1;
      if (
        output !== void 0 &&
        !Object.values(xe.state.output ?? {}).some((qt) => qt.toLowerCase().includes(output))
      )
        return !1;
      if (
        state &&
        !xe.state.state.toLowerCase().startsWith(state) &&
        !jobTempo(xe.state).startsWith(state) &&
        !Ao[jobBucket(xe, prStatuses, liveStatus(xe))].toLowerCase().startsWith(state)
      )
        return !1;
      if (text) {
        if (
          ![xe.state.name, xe.state.intent, xe.state.detail, ...Object.values(xe.state.output ?? {})]
            .join(" ")
            .toLowerCase()
            .includes(text)
        )
          return !1;
      }
      return !0;
    }),
    filtered_2 = pendings.filter((xe) => !filtered.some((qt) => qt.id === xe.id)),
    $e = filtered_2.length > 0 ? jn([...filtered_2, ...filtered]) : filtered,
    ht = groupMode === "state",
    jt = groupMode === "group",
    We = new Map(
      $e.map((xe) => [
        xe.id,
        xe.state.pinned
          ? "pinned"
          : pendingDelete?.id === xe.id && pendingDelete.group
            ? pendingDelete.group
            : ht
              ? jobBucket(xe, prStatuses, liveStatus(xe))
              : jt
                ? (xe.state.group ?? UNGROUPED)
                : bs(xe.state),
      ]),
    ),
    Jt = (xe) => (xe === "pinned" ? -1 : xe === UNGROUPED ? 1 : 0),
    sorted = [...$e].sort((xe, qt) => {
      let it = We.get(xe.id),
        io = We.get(qt.id);
      if (it === "pinned" || io === "pinned") return (it === "pinned" ? 0 : 1) - (io === "pinned" ? 0 : 1);
      if (jt) {
        let bo = (wo) =>
          pendingDelete?.id === wo.id && pendingDelete.sortKey !== void 0
            ? pendingDelete.sortKey
            : Date.parse(wo.state.updatedAt);
        return Jt(it) - Jt(io) || it.localeCompare(io) || bo(qt) - bo(xe);
      }
      if (ht) {
        let bo = FLEET_BUCKETS.indexOf(it) - FLEET_BUCKETS.indexOf(io),
          wo = (Ho) =>
            pendingDelete?.id === Ho.id && pendingDelete.sortKey !== void 0
              ? pendingDelete.sortKey
              : jobSortKey(Ho.state, it);
        return bo !== 0 ? bo : wo(qt) - wo(xe) || qt.state.createdAt.localeCompare(xe.state.createdAt);
      }
      if (it === launcherGroup && io !== launcherGroup) return -1;
      if (io === launcherGroup && it !== launcherGroup) return 1;
      return it.localeCompare(io);
    }),
    He = 1 / 0,
    ct = gd,
    vt = !1,
    rt = new Set();
  for (let xe of [...(jobs ?? []), ...pendings, ...(peersEnabled ? adoptedPeers : [])]) {
    if (xe.state.sessionId) rt.add(xe.state.sessionId);
    if (xe.state.resumeSessionId) rt.add(xe.state.resumeSessionId);
  }
  let Xe =
    Boolean(template || pr || url || state || group) ||
    output !== void 0 ||
    earlierEntries.length === 0 ||
    activeTab === "remote" ||
    Boolean(cwdFilter)
      ? []
      : earlierEntries.filter(
          (xe) =>
            !rt.has(xe.sessionId) &&
            (!text || xe.title.toLowerCase().includes(text)) &&
            (!Ot || xe.title.toLowerCase().includes(Ot)),
        );
  if (ht && !simpleView) {
    let filtered = sorted.filter((bo) => We.get(bo.id) === "done"),
      size = new Set(sorted.map((bo) => We.get(bo.id))).size,
      reduced = sorted.reduce((bo, wo) => {
        let Ho = We.get(wo.id);
        return Ho !== "done" && !lt.has(Wt(Ho)) ? bo + 1 : bo;
      }, 0),
      io = computeDoneCap(termRows, reduced + Math.max(0, size * 2 - 1));
    if (((ct = io.doneCap), (vt = io.compactHeader), !capExpanded.has("done")))
      He = doneFoldIndex({
        done: filtered,
        earlier: Xe,
        doneCap: ct,
        initialJobId: initialJobId,
        linkMatchId: linkMatchId,
      });
  } else if (!simpleView && activeTab !== "remote" && Xe.length > 0) {
    let size = new Set(sorted.map((it) => We.get(it.id))).size,
      qt = computeDoneCap(termRows, sorted.length + Math.max(0, size * 2 - 1));
    if (((ct = qt.doneCap), (vt = qt.compactHeader), !capExpanded.has(EARLIER)))
      He = Xe.length >= ct + fs ? ct : 1 / 0;
  }
  let St = {
      blocked: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "blocked"),
      active: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "active"),
      completed: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "completed"),
    },
    all = sorted.every((xe) => xe.id === initialJobId),
    uo = !simpleView && ht && !query && all && !sorted[0]?.state.pinned,
    Kt = simpleView
      ? bucketJobs($e, {
          statusFor: liveStatus,
          now: now,
          fallbackOrigin: scopedFallbackOrigin,
          showFinishedEarlier: capExpanded.has(SIMPLE_FINISHED),
          terminalRows: termRows,
        })
      : null;
  if (Kt !== null) {
    let xe = 1 + Kt.needsCount + Kt.liveCount;
    vt = computeDoneCap(termRows, xe).compactHeader;
  }
  let po =
      Kt ??
      layoutRows(sorted, We, {
        byState: ht,
        byGroup: jt,
        onRemoteTab: activeTab === "remote",
        launcherGroup: launcherGroup,
        scopedFallbackOrigin: scopedFallbackOrigin,
        doneFoldAt: He,
        emptyBucketHint: uo,
        earlier: Xe,
      }),
    rows = po.rows,
    pt = new Map();
  for (let xe of sorted) {
    let qt = We.get(xe.id);
    pt.set(qt, (pt.get(qt) ?? 0) + 1);
  }
  if (Xe.length > 0 && activeTab !== "remote") {
    let xe = ht ? "done" : EARLIER;
    pt.set(xe, (pt.get(xe) ?? 0) + Xe.length);
  }
  if (lt.size > 0) rows = rows.filter((xe) => xe.kind === "header" || !lt.has(Wt(xe.group)));
  let Nt = simpleView ? 0 : Bt ? bestSearchMatchIndex(rows, Ot) : initialFocusIndex(rows, launcherCwd),
    oo = new Set(rows.filter((xe) => xe.kind === "header").map((xe) => xe.group)).size > 1,
    Ce = rows[focusedIdx],
    Ke = Ce?.kind === "job" ? Ce.job : void 0,
    at =
      activeTab === "remote" || (Ce?.kind === "job" && Ce.job.state.backend !== "daemon")
        ? scopedFallbackOrigin
        : (Ce?.origin ?? scopedFallbackOrigin),
    Mt = activeTab === "remote" ? (Ce?.origin ?? at) : at,
    so = Ce?.group ?? launcherGroup,
    Jo = ht && !simpleView ? scopedFallbackOrigin : at,
    vo = focusedIdx === hoverFocusIdx,
    zo = computeFleetColumnWidths(
      sorted,
      (xe) => (loopJobIds.has(xe.id) ? loopKicks.get(xe.state.sessionId)?.nextAt : null),
      initialJobId,
      columns,
      ageNow,
    ),
    no = (() => {
      if (!yt || linkMatchId) return null;
      if (ht) return "working";
      if (dispatchRepoCwd)
        return (
          rows.find((it) => it.kind === "header" && it.origin === dispatchRepoCwd && it.group !== "pinned")
            ?.group ?? null
        );
      let xe = rows[focusedIdx];
      if (xe?.kind === "job") {
        if (xe.group === "pinned")
          return (
            rows.find((it) => it.kind === "header" && it.origin === xe.origin && it.group !== "pinned")
              ?.group ?? null
          );
        return xe.group;
      }
      if (xe?.kind === "header") return xe.group === "pinned" ? null : xe.group;
      return null;
    })(),
    _e = !Ge && dispatch?.cwd !== void 0,
    It = !!Ke && pendings.some((xe) => xe.id === Ke.id),
    go = !!Ke && Ke.id === initialJobId,
    No = count(simpleWantsRemote ? [...Rt, ...remoteJobs] : Rt, (xe) => {
      let qt = jobBucket(xe, prStatuses, liveStatus(xe));
      return qt === "blocked" || qt === "working";
    }),
    Qo = Ge ? "create" : go ? "return" : Ke && cs(Ke.state) && !heldInTerminal(Ke) ? "resume" : "open",
    Po =
      Ce?.kind === "header" && Ce.group === followOrigin
        ? sorted.filter((xe) => We.get(xe.id) === Ce.group)
        : [];
  return {
    byState: ht,
    byGroup: jt,
    hasDispatch: Ge,
    hasComposedDispatch: yt,
    isBashDispatch: ke,
    enterIsNoop: _e,
    queryIsFilter: Bt,
    hasNameFilter: Ot !== void 0,
    loopJobIds: loopJobIds,
    localJobs: Rt,
    scopedLocalJobs: Vt,
    scopedJobs: Be,
    filtered: sorted,
    groupOf: We,
    jobSessionIds: rt,
    earlierVisible: Xe,
    doneCap: ct,
    compactHeader: vt,
    simpleBuilt: Kt,
    built: po,
    collapsed: lt,
    rows: rows,
    homeIdx: Nt,
    hasMultipleOrigins: oo,
    groupCounts: pt,
    bandCounts: St,
    onlyOrigin: all,
    isOnboarding: uo,
    focusedRow: Ce,
    focused: Ke,
    altOpenOrigin: Mt,
    focusedGroup: so,
    dispatchOrigin: Jo,
    focusIsFromHover: vo,
    cols: zo,
    ageNow: ageNow,
    dispatchTargetGroup: no,
    headerJobs: Po,
    runningCount: No,
    enterLabel: Qo,
    focusedIsPending: It,
    focusedIsOrigin: go,
  };
}
//@ chunk-93kwxas0.js:88328-88380 placement
function ub(h) {
  return isAbsolute(h) && !Eh(h) && !ai(h) && !Qg(h);
}

export {
  SIMPLE_PINNED,
  Sn,
  prependModeCharacterToInput,
  Ws,
  buildFleetRows,
  getJobTitle,
  ub,
  wn,
  activityVerb,
  pickHighestPriorityColor,
  jobRowGlyph,
  useAutoTitle,
  jobRowAriaLabel,
  useFleetSpinnerFrame,
  Ci,
  _i,
  SIMPLE_FINISHED,
  jobActivityDisplay,
  Hd,
  jd,
  jobNeedsLine,
  jobBucket_2,
  formatJobAgeOrEta,
  childFrameRows,
  Ep,
  Cp,
  InlineMarkup,
};
