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
import { isAbsolute } from "path";
import {
  returnFalse_2,
  STUCK_AFTER_MS,
  validChildren,
  FLEET_BUCKET_LABELS,
  DONE_CAP_TITLE_ROWS,
  jobPreviewText,
  isTerminalDetail,
  jobTempo,
  jobBucket,
  sortJobs,
  canonicalRepoRoot,
  FLEET_BUCKETS,
  jobSortKey_2,
  DONE_CAP_MIN,
  computeDoneCap,
  doneFoldIndex,
  DONE_CAP_SLACK,
  layoutRows,
  bestSearchMatchIndex,
  initialFocusIndex,
  isFailedSettledJob,
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
import { collapseWhitespace, repeatString } from "../../utils/stringUtils.js";
import { sanitizeAttentionText } from "./sessionAttention.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { DEFAULT_BG_AGENT_TEMPLATE } from "../../cli/bg/bgSpawnEnv.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { splitGraphemes } from "../../utils/intl.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { R, y, zt, Kc } from "../../../vendor/react/cjs/react.production.js";
import { countGraphemes } from "../../ink/output.js";
import { BOXED_DIAMOND_GLYPH, BULLET_OPERATOR } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MAX_DISPATCH_RETRIES } from "./fleetDispatch.js";
import { getDefaultCharacters, spinnerFramesForTerminal } from "../Spinner/utils.js";
import { isGitLabMergeRequestUrl } from "../../utils/detectRepository.js";
import {
  parsePrNumber,
  prUrlMatcher,
  soloUrl,
  jobReferencesPr,
  mentionsText,
  parseDispatchInput,
  parseDispatchFlags,
} from "./fleetSessions.js";
import { getPrStatusColor } from "../../utils/ghPrStatus.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Link } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { trimTrailingPunctuation } from "../../services/oauth/oauthErrors.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { SPINNER_DOT } from "../Spinner/SpinnerGlyph.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { count } from "../../utils/collections.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { rankJobNameMatch } from "../../cli/bg/bgDispatch.js";
import { hasDotDotSegment } from "../../utils/pathClassification.js";
import { isNonWslUncPath, isNetworkRelatedPath } from "../../utils/networkPaths.js";

//@ chunk-93kwxas0.js:72647-73045 placement
/**
 * 会话距上次更新的时长文字（活跃时为空）。
 */
function formatJobAge(h, E) {
  let state = h.state;
  if (returnFalse_2(state)) {
    let x = Date.parse(state.updatedAt) || Date.parse(state.createdAt);
    if (!Number.isFinite(x)) return "";
    let max = Math.max(0, E - x);
    return state.tempo === "active" && state.detail !== SEED_DETAIL && max < STUCK_AFTER_MS
      ? ""
      : formatDuration(max, {
          mostSignificantOnly: true,
        });
  }
  let C =
    isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state))
      ? Date.parse(state.firstTerminalAt ?? state.updatedAt)
      : E;
  return formatDuration(Math.max(0, C - Date.parse(state.createdAt)), {
    mostSignificantOnly: true,
  });
}
//@ chunk-93kwxas0.js:73045-73153 placement
/**
 * 未来时间显示 “in X”，否则显示会话年龄。
 */
function formatJobAgeOrEta(h, E, k = Date.now()) {
  if (E != null && E > k)
    return `in ${formatDuration(E - k, {
      mostSignificantOnly: true,
    })}`;
  return formatJobAge(h, k);
}
//@ chunk-93kwxas0.js:73153-73763 placement
/**
 * 会话显示标题：名称或意图摘要，当前/来源会话特殊标注。
 */
function getJobTitle(state, E = false, k = false) {
  let C = (name) => collapseWhitespace(returnFalse_2(state) ? sanitizeAttentionText(name) : name);
  if (state.name) return redactSecrets(C(state.name));
  let x = 25;
  let filtered = redactSecrets(C(state.displayIntent ?? state.intent))
    .split(" ")
    .filter(Boolean);
  if (filtered.length === 0) {
    if (E) return k ? "session you came from" : "current session";
    if (
      (state.template === "bg" || state.template === DEFAULT_BG_AGENT_TEMPLATE.name) &&
      state.state === "working"
    )
      return k ? "untitled session" : "new session";
    if (k && (state.template === "bg" || state.template === DEFAULT_BG_AGENT_TEMPLATE.name))
      return "untitled session";
    return collapseWhitespace(state.template);
  }
  let A = filtered.length > 3 ? `${filtered.slice(0, 3).join(" ")}\u2026` : filtered.join(" ");
  if (bunStringWidth(A) <= x) return A;
  let L = "";
  let V = 0;
  for (let D of splitGraphemes(A)) {
    let U = bunStringWidth(D);
    if (V + U > x - 1) break;
    L += D;
    V += U;
  }
  return `${L}\u2026`;
}
//@ chunk-93kwxas0.js:73763-74583 placement
/**
 * 未命名会话自动生成标题的 hook。
 */
function useAutoTitle(h, E) {
  let C = w(12);
  let clock = useClock();
  let x;
  if (C[0] !== h || C[1] !== E) {
    x = {
      label: h,
      hasName: E,
      fired: false,
    };
    C[0] = h;
    C[1] = E;
    C[2] = x;
  } else x = C[2];
  let T = R(x);
  let [A, L] = y(null);
  let V;
  let D;
  if (C[3] !== clock || C[4] !== h || C[5] !== E) {
    V = () => {
      if (T.current.fired || T.current.hasName || !E) {
        T.current = {
          label: h,
          hasName: E,
          fired: T.current.fired,
        };
        return;
      }
      let label = T.current.label;
      T.current = {
        label: h,
        hasName: true,
        fired: true,
      };
      let max = Math.max(countGraphemes(label), countGraphemes(h));
      if (max === 0) {
        return;
      }
      L({
        old: label,
        n: 1,
      });
      let X = 1;
      let max_2 = Math.max(16, Math.floor(360 / max));
      let W = null;
      let z = () => {
        X = X + 1;
        if (X >= max) {
          L(null);
          W = null;
        } else {
          L({
            old: label,
            n: X,
          });
          W = clock.setTimeout(z, max_2);
        }
      };
      W = clock.setTimeout(z, max_2);
      return () => {
        W?.();
        L(null);
      };
    };
    D = [clock, h, E];
    C[3] = clock;
    C[4] = h;
    C[5] = E;
    C[6] = V;
    C[7] = D;
  } else {
    V = C[6];
    D = C[7];
  }
  zt(V, D);
  if (!A) {
    return null;
  }
  let oe;
  if (C[8] !== A.n || C[9] !== A.old || C[10] !== h) {
    oe = blendTitleAnimation(A.old, h, A.n);
    C[8] = A.n;
    C[9] = A.old;
    C[10] = h;
    C[11] = oe;
  } else oe = C[11];
  return oe;
}
//@ chunk-93kwxas0.js:74583-74814 placement
/**
 * 标题替换动画的一帧：新标题前 k 个字素 + 旧标题剩余部分，补齐到两者最大宽度。
 */
function blendTitleAnimation(old, E, k) {
  let C = splitGraphemes(old);
  let x = splitGraphemes(E);
  let joined = x.slice(0, Math.min(k, x.length)).join("");
  let max = Math.max(bunStringWidth(old), bunStringWidth(E));
  let L = bunStringWidth(joined);
  let V = "";
  for (let D of C.slice(k)) {
    let U = bunStringWidth(D);
    if (L + U > max) break;
    V += D;
    L += U;
  }
  return {
    display: joined + V + repeatString(" ", max - L),
    newLen: joined.length,
  };
}
//@ chunk-93kwxas0.js:74814-75065 placement
/**
 * 会话产物（PR/frame）列所需宽度。
 */
function artifactColumnWidth(state) {
  let E = validChildren(state.children);
  if (!E.length) return 0;
  let filtered = E.filter((C) => C.kind !== "frame");
  if (filtered.length > 1) return bunStringWidth(`${filtered.length} PRs`);
  if (filtered.length === 1) {
    let C = prNumberOfChild(filtered[0]);
    return bunStringWidth(C !== undefined ? `#${C}` : "PR");
  }
  return bunStringWidth(E.length > 1 ? `${E.length} ${BOXED_DIAMOND_GLYPH}` : BOXED_DIAMOND_GLYPH);
}
//@ chunk-93kwxas0.js:75065-75113 placement
function hasSafeModeFlag(respawnFlags) {
  return respawnFlags.includes("--safe-mode");
}
//@ chunk-93kwxas0.js:75113-75402 placement
/**
 * 计算 Agents 行的列宽（年龄、标签、产物、详情）。
 */
function computeFleetColumnWidths(h, E, initialJobId, columns, ageNow) {
  let max = Math.max(
    MAX_DISPATCH_RETRIES,
    ...h.map((D) => bunStringWidth(formatJobAgeOrEta(D, E(D), ageNow))),
  );
  let min = Math.min(
    Math.max(40, Math.floor(columns / 3)),
    Math.max(12, ...h.map((D) => bunStringWidth(getJobTitle(D.state, D.id === initialJobId)))),
  );
  let max_2 = Math.max(0, ...h.map((D) => artifactColumnWidth(D.state)));
  let detail = Math.max(8, columns - (min + 2) - 2 - (max_2 + 2) - (max + 2) - 2);
  return {
    age: max,
    label: min,
    artifact: max_2,
    detail,
  };
}
//@ chunk-93kwxas0.js:75402-75429 placement
function getSpinnerChars() {
  return getDefaultCharacters();
}
//@ chunk-93kwxas0.js:75429-75456 placement
function getLoopSpinnerChars() {
  return spinnerFramesForTerminal();
}
//@ chunk-93kwxas0.js:75456-75485 placement
function loopJobGlyph() {
  return getSpinnerChars()[4];
}
//@ chunk-93kwxas0.js:75485-75514 placement
function loopJobGlyphAlt() {
  return getSpinnerChars()[1];
}
//@ chunk-93kwxas0.js:75514-75918 placement
/**
 * 由活动与状态得出动词与颜色（Done/Failed/Stopped/Working…）。
 */
function activityVerb(activity, tempo, k, C) {
  if (activity === "success" && C)
    return {
      word: "Done",
      color: "success",
      dim: false,
    };
  if (activity === "failure" && C)
    return {
      word: "Failed",
      color: "error",
      dim: false,
    };
  if (activity === "stopped" && C)
    return {
      word: "Stopped",
      color: "inactive",
      dim: false,
    };
  if (k === "busy" || k === "shell")
    return {
      word: FLEET_BUCKET_LABELS.working,
      color: undefined,
      dim: false,
    };
  if (tempo === "blocked" || k === "waiting")
    return {
      word: FLEET_BUCKET_LABELS.blocked,
      color: "warning",
      dim: false,
    };
  return {
    word: "Idle",
    color: undefined,
    dim: true,
  };
}
//@ chunk-93kwxas0.js:75918-76006 placement
function activityColors(state, activity, status) {
  let { color, dim } = activityVerb(activity, state.tempo, status, terminalOutcome(state.state));
  return {
    color,
    dim,
  };
}
//@ chunk-93kwxas0.js:76006-76033 placement
var COLOR_PRIORITY = {
  error: 2,
  warning: 1,
};
//@ chunk-93kwxas0.js:76033-76176 placement
/**
 * 在会话与子项颜色中取优先级最高的颜色。
 */
function pickHighestPriorityColor(color, childRows) {
  let k = color;
  let C = color ? (COLOR_PRIORITY[color] ?? 0) : 0;
  for (let x of childRows) {
    if (x.color === undefined || isFrameRow(x)) continue;
    let T = COLOR_PRIORITY[x.color] ?? 0;
    if (T > C) {
      k = x.color;
      C = T;
    }
  }
  return k;
}
//@ chunk-93kwxas0.js:76176-76219 placement
function isFrameRow(h) {
  return h.row.kind === "frame";
}
//@ chunk-93kwxas0.js:76219-76263 placement
function prKindOf(row) {
  return isGitLabMergeRequestUrl(row.href) ? "mr" : "pr";
}
//@ chunk-93kwxas0.js:76263-76369 placement
/**
 * 子项的 PR 号：从链接里解析，或 id 本身是数字。
 */
function prNumberOfChild(h) {
  let prNumber = parsePrNumber(h.href);
  if (prNumber !== null) return Number(prNumber);
  return /^\d+$/.test(h.id) ? Number(h.id) : undefined;
}
//@ chunk-93kwxas0.js:76369-76428 placement
function normalizePrStatusColor(h) {
  let prStatusColor = getPrStatusColor(h);
  return prStatusColor === "error" ? "warning" : prStatusColor;
}
//@ chunk-93kwxas0.js:76428-76465 placement
var PR_SORT_RANK = {
  error: 3,
  warning: 2,
  success: 1,
};
//@ chunk-93kwxas0.js:76465-76528 placement
function sortByRank(h) {
  return [...h].sort((E, k) => k.sortRank - E.sortRank);
}
//@ chunk-93kwxas0.js:76528-77217 placement
/**
 * PR 状态的显示片段（已合并/关闭、检查失败/进行/通过）。
 */
function prStatusSegments(h) {
  if (h.state === "MERGED")
    return [
      {
        text: "merged",
        color: "merged",
      },
    ];
  if (h.state === "CLOSED")
    return [
      {
        text: "closed",
        color: "inactive",
      },
    ];
  let E = [];
  let { failed, pending, passed } = h.checks;
  let T = failed + pending + passed;
  if (failed > 0)
    E.push({
      text: `${figures_default.cross} ${failed}/${T}`,
      color: "error",
    });
  else if (pending > 0)
    E.push({
      text: `${passed}/${T}`,
      color: "warning",
    });
  else if (T > 0)
    E.push({
      text: figures_default.tick,
      color: "success",
    });
  switch (h.review) {
    case "APPROVED":
      E.push({
        text: "approved",
        color: "success",
      });
      break;
    case "CHANGES_REQUESTED":
      E.push({
        text: figures_default.cross,
        color: "error",
      });
      break;
    case "REVIEW_REQUIRED":
      E.push({
        text: "needs review",
        color: undefined,
      });
      break;
    case null:
      break;
  }
  if (E.length === 0 && h.state !== "DRAFT")
    E.push({
      text: h.state.toLowerCase(),
      color: normalizePrStatusColor(h),
    });
  return E;
}
//@ chunk-93kwxas0.js:77217-77727 placement
/**
 * 生成会话的子行（frame、PR 链接及其状态）。
 */
function childFrameRows(children, E) {
  return sortByRank(
    validChildren(children).map((k) => {
      if (k.kind === "frame")
        return {
          row: k,
          prNumber: undefined,
          label: collapseWhitespace(k.title ?? "") || collapseWhitespace(k.id),
          status: [],
          diffStat: undefined,
          isDraft: false,
          color: "claude",
          sortRank: 0,
        };
      let C = E.get(k.href);
      let x = C ? getPrStatusColor(C) : undefined;
      return {
        row: k,
        prNumber: C?.number ?? prNumberOfChild(k),
        label: C?.title ? collapseWhitespace(C.title) : "",
        status: C ? prStatusSegments(C) : [],
        diffStat:
          C && C.state !== "MERGED" && C.state !== "CLOSED"
            ? {
                additions: C.additions,
                deletions: C.deletions,
              }
            : undefined,
        isDraft: C?.state === "DRAFT",
        color: C ? normalizePrStatusColor(C) : undefined,
        sortRank: C?.state === "OPEN" && x ? (PR_SORT_RANK[x] ?? 0) : 0,
      };
    }),
  );
}
//@ chunk-93kwxas0.js:77727-77775 placement
var URL_RE = /https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+/;
//@ chunk-93kwxas0.js:77775-78456 placement
/**
 * 渲染带 **粗体**、++强调++、代码和链接的单行文本。
 */
function InlineMarkup(props) {
  let C = w(11);
  let { value: E, linkHref } = props;
  let x;
  let dimColor;
  let children;
  if (C[0] !== linkHref || C[1] !== E) {
    let parts = E.split(/(\*\*.+?\*\*|\+\+.+?\+\+|`[^`]+`|https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+)/g);
    x = Text;
    dimColor = true;
    let V;
    if (C[5] !== linkHref) {
      V = (D, U) => {
        let match = D.match(/^(?:\*\*|\+\+|`)(.+?)(?:\*\*|\+\+|`)$/);
        if (match) {
          return jsxProd_default(
            Text,
            {
              bold: true,
              children: match[1],
            },
            U,
          );
        }
        if (URL_RE.test(D)) {
          let X = trimTrailingPunctuation(D);
          let K = linkHref === undefined ? X : linkHref(X);
          if (K === undefined) {
            return D;
          }
          return jsxProd_default_2(
            Kc,
            {
              children: [
                jsxProd_default(Link, {
                  url: K,
                  children: X,
                }),
                D.slice(X.length),
              ],
            },
            U,
          );
        }
        return D;
      };
      C[5] = linkHref;
      C[6] = V;
    } else V = C[6];
    children = parts.map(V);
    C[0] = linkHref;
    C[1] = E;
    C[2] = x;
    C[3] = dimColor;
    C[4] = children;
  } else {
    x = C[2];
    dimColor = C[3];
    children = C[4];
  }
  let V;
  if (C[7] !== x || C[8] !== dimColor || C[9] !== children) {
    V = jsxProd_default(x, {
      dimColor,
      children,
    });
    C[7] = x;
    C[8] = dimColor;
    C[9] = children;
    C[10] = V;
  } else V = C[10];
  return V;
}
//@ chunk-93kwxas0.js:78456-78583 placement
/**
 * 行的无障碍前缀：“selected, pinned, 动词:”。
 */
function jobRowAriaLabel(activity, tempo, k, C, x, T = false) {
  let A = x ? "selected, " : "";
  let L = T ? "pinned, " : "";
  let { word } = activityVerb(activity, tempo, k, C);
  return `${A}${L}${word.toLowerCase()}:`;
}
//@ chunk-93kwxas0.js:78583-78723 placement
/**
 * 行首状态符号：非活跃时为点，忙碌/shell 时为空，循环任务和普通任务各有符号。
 */
function jobRowGlyph(state, E, k) {
  if (E && state.tempo !== "active" && k === undefined) return BULLET_OPERATOR;
  if (k === "busy" || k === "shell") return null;
  if (isLoopJob(state)) return loopJobGlyphAlt();
  return loopJobGlyph();
}
//@ chunk-93kwxas0.js:78723-78895 placement
/**
 * Agents 视图的旋转指示帧；减少动态效果或读屏时为静态点。
 */
function useFleetSpinnerFrame() {
  let x = w(1);
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let k = prefersReducedMotion || isScreenReaderEnabled;
  let [, C] = useAnimationFrame(k ? null : 120);
  if (k) {
    return SPINNER_DOT;
  }
  let T;
  if (x[0] === MEMO_CACHE_SENTINEL) {
    T = getLoopSpinnerChars();
    x[0] = T;
  } else T = x[0];
  let A = T;
  return A[Math.floor(C / 120) % A.length];
}
//@ chunk-93kwxas0.js:78895-79070 placement
var FLEET_RECENT_WINDOW_MS = 172800000;
var RECENT_LIST_GAP = 3;
var PORCELAIN_GROUP_ROWS = 3;
var RUNNING_GROUP_ROWS = 2;
var LIVE_GROUP_ROWS = 2;
var EMPTY_GROUP_ROWS = 4;
var FINISHED_SECTION_ROWS = 1;
var SIMPLE_NEW_SESSION = "simple:new-session";
var SIMPLE_PINNED = "simple:pinned";
var SIMPLE_FINISHED = "simple:finished";
var SIMPLE_BUCKET_KEYS = {
  needs: "simple:needs",
  live: "simple:live",
  done: "simple:done",
};
//@ chunk-93kwxas0.js:79070-79275 placement
/**
 * 会话归入 needs/live/done 中的哪个桶。
 */
function jobBucket_2(state, E) {
  if (E === "busy") return "live";
  if (isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state)))
    return "done";
  if (E === "waiting") return "needs";
  if (state.tempo === "blocked" && state.needs && state.needs !== IDLE_NEEDS) return "needs";
  return "live";
}
//@ chunk-93kwxas0.js:79275-79429 placement
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
function jobLatestTimestamp(state) {
  for (let E of [state.lastTerminalAt, state.firstTerminalAt, state.updatedAt, state.createdAt])
    if (E) {
      let timestamp = Date.parse(E);
      if (Number.isFinite(timestamp)) return timestamp;
    }
  return 0;
}
//@ chunk-93kwxas0.js:79429-79511 placement
function isDifferentDoneGroup(h, E) {
  if (h === undefined) return false;
  return !(simpleGroupOf(h) === SIMPLE_BUCKET_KEYS.done && simpleGroupOf(E) === SIMPLE_BUCKET_KEYS.done);
}
//@ chunk-93kwxas0.js:79511-79562 placement
function simpleGroupOf(h) {
  return h.group === SIMPLE_FINISHED ? SIMPLE_BUCKET_KEYS.done : h.group;
}
//@ chunk-93kwxas0.js:79562-79608 placement
function remainingRowsForTerminal(terminalRows, E) {
  return Math.max(0, terminalRows - RECENT_LIST_GAP - DONE_CAP_TITLE_ROWS - E);
}
//@ chunk-93kwxas0.js:79608-80705 placement
/**
 * 把会话分成 needs/live/done 等带计数的桶。
 */
function bucketJobs(h, { statusFor, now, fallbackOrigin, showFinishedEarlier, terminalRows }) {
  let A = [];
  let L = [];
  let V = [];
  let D = [];
  let U = 0;
  let N = 0;
  let X = 0;
  for (let le of h) {
    let Oe = statusFor(le);
    let De = jobBucket_2(le.state, Oe);
    if (De === "needs") U++;
    else if (De === "live") {
      N++;
      if (Oe === "busy" || Oe === "shell") X++;
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
  let K = [
    {
      kind: "newsession",
      origin: fallbackOrigin,
      group: SIMPLE_NEW_SESSION,
    },
  ];
  let W = (group, Oe) => {
    for (let De of Oe)
      K.push({
        kind: "job",
        job: De,
        origin: spawnOrigin(De.state),
        group,
      });
  };
  W(SIMPLE_PINNED, A);
  W(SIMPLE_BUCKET_KEYS.needs, L);
  W(SIMPLE_BUCKET_KEYS.live, V);
  let oe =
    1 +
    (V.length * RUNNING_GROUP_ROWS + (A.length + L.length) * PORCELAIN_GROUP_ROWS) +
    (U + N === 0 ? EMPTY_GROUP_ROWS : 0) +
    (D.length > 0 ? 1 + FINISHED_SECTION_ROWS : 0);
  let ge = remainingRowsForTerminal(terminalRows, oe);
  let se = count(D, (le) => now - jobLatestTimestamp(le.state) > FLEET_RECENT_WINDOW_MS);
  let max = Math.max(0, D.length - se - ge);
  let ae = showFinishedEarlier ? 0 : se + max;
  let me = ae >= LIVE_GROUP_ROWS ? ae : 0;
  let doneFoldHiddenFailed = count(
    D.slice(D.length - me),
    (le) => terminalOutcome(le.state.state) === "failure",
  );
  W(SIMPLE_BUCKET_KEYS.done, D.slice(0, D.length - me));
  if (me > 0)
    K.push({
      kind: "fold",
      origin: fallbackOrigin,
      group: SIMPLE_FINISHED,
      hidden: me,
    });
  return {
    rows: K,
    doneCount: D.length,
    doneFoldHidden: me,
    doneFoldHiddenFailed,
    doneCap: ge,
    foldGroup: SIMPLE_FINISHED,
    runningCount: U + N,
    needsCount: U,
    workingCount: X,
    liveCount: N,
  };
}
//@ chunk-93kwxas0.js:80705-80972 placement
/**
 * 子任务进度：todo 完成数，或 agent/workflow 完成数。
 */
function fanProgressLabel(state) {
  let fan = state.fan ?? [];
  let filtered = fan.filter((x) => x.kind === "todo");
  if (filtered.length > 0) return `${count(filtered, (x) => x.doneAt !== undefined)}/${filtered.length}`;
  let filtered_2 = fan.filter((x) => x.kind === "agent" || x.kind === "workflow");
  if (filtered_2.length > 0)
    return `${count(filtered_2, (x) => x.doneAt !== undefined)}/${filtered_2.length} agents`;
  return;
}
//@ chunk-93kwxas0.js:80972-81074 placement
/**
 * “N tokens”，下行时带箭头。
 */
function formatTokenCount(tokens, E) {
  if (tokens === undefined || tokens <= 0) return;
  let k = `${formatTokens(tokens)} tokens`;
  return E ? `${figures_default.arrowDown} ${k}` : k;
}
//@ chunk-93kwxas0.js:81074-81330 placement
/**
 * 行的活动词与颜色：working 变暗，blocked 时区分 “Needs you” 与 “Idle”。
 */
function jobActivityDisplay(job, E) {
  let k = E(job);
  let C = activityVerb(job.activity, job.state.tempo, k, terminalOutcome(job.state.state));
  if (C.word === FLEET_BUCKET_LABELS.working)
    return {
      ...C,
      color: undefined,
      dim: true,
    };
  if (C.word !== FLEET_BUCKET_LABELS.blocked) return C;
  return jobBucket_2(job.state, k) === "needs"
    ? {
        ...C,
        word: "Needs you",
      }
    : {
        word: "Idle",
        color: undefined,
        dim: true,
      };
}
//@ chunk-93kwxas0.js:81330-81418 placement
function jobAgeLabel(job, loopJobIds, loopKicks, ageNow) {
  return formatJobAgeOrEta(
    job,
    loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.nextAt : undefined,
    ageNow,
  );
}
//@ chunk-93kwxas0.js:81418-81481 placement
function jobTokenLabel(job, E) {
  return formatTokenCount(job.state.tokens, E.word === FLEET_BUCKET_LABELS.working);
}
//@ chunk-93kwxas0.js:81481-81851 placement
/**
 * 生成会话"需要你处理"的一行说明。
 */
function jobNeedsLine(job, E, k, columns) {
  let x = isScreenReaderMode() ? 1 / 0 : Math.max(24, Math.min(72, Math.floor(columns * 0.55)));
  let T = (U) => (x === 1 / 0 ? U : truncateToWidth(U, x));
  if (jobBucket_2(job.state, k) === "done") return;
  let needs = job.state.needs && job.state.needs !== IDLE_NEEDS ? job.state.needs : undefined;
  if (needs) return T(jobPreviewText(job.state, needs));
  if (!job.state.pinned && E.word !== FLEET_BUCKET_LABELS.working) return;
  let V = fanProgressLabel(job.state);
  if (V) return V;
  let detail = job.state.detail;
  return detail && !isTerminalDetail(detail) ? T(jobPreviewText(job.state, detail)) : undefined;
}
//@ chunk-93kwxas0.js:81851-81909 placement
function groupCollapseKey(groupMode, E) {
  return E === "pinned" ? "pinned" : `${groupMode}:${E}`;
}
//@ chunk-93kwxas0.js:81909-82123 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput(query, mode, jobs, cwdFilter) {
  let x = mode === "bash" ? null : parsePrNumber(query);
  let T = x ? prUrlMatcher(x) : undefined;
  let A = mode === "bash" || x ? null : soloUrl(query);
  let L = (D) => !cwdFilter || jobMatchesCwd(D.state, cwdFilter);
  let V = x ? (D) => jobReferencesPr(D, x, T) : A ? (D) => mentionsText(D, A) : null;
  return V ? (jobs ?? []).find((D) => L(D) && V(D.state))?.id : undefined;
}
//@ chunk-93kwxas0.js:82123-82217 placement
function parseDraftInput(query, mode, k, C) {
  return k
    ? null
    : parseDispatchInput(mode === "bash" ? `!${query}` : query, C.templates, C.allRepos, C.routines);
}
//@ chunk-93kwxas0.js:82217-82276 placement
function hasDispatchIntent(dispatch) {
  return !!(dispatch?.intent || dispatch?.routine || dispatch?.matched);
}
//@ chunk-93kwxas0.js:82276-82370 placement
function hasDispatchContent(dispatch) {
  return !!(
    dispatch &&
    (dispatch.intent ||
      dispatch.routine ||
      dispatch.matched ||
      dispatch.cwd !== undefined ||
      dispatch.exec !== undefined)
  );
}
//@ chunk-93kwxas0.js:82370-88328 placement
/**
 * 组合本地、接管的、远程、待创建会话及 PR 状态，生成 Agents 视图全部行（分组、过滤、折叠）。
 */
function buildFleetRows({
  jobs,
  adoptedPeers,
  remoteJobs,
  pendings,
  prStatuses,
  liveStatus,
  heldInTerminal,
  loopJobIds,
  loopKicks,
  focusedIdx,
  hoverFocusIdx,
  followOrigin,
  collapsed,
  capExpanded,
  groupMode,
  activeTab,
  query,
  mode,
  dispatch,
  linkMatchId,
  dispatchRepoCwd,
  pendingDelete,
  earlierEntries,
  cwdFilter,
  initialJobId,
  simpleView,
  simpleWantsRemote,
  peersEnabled,
  showRemoteTabs,
  launcherCwd,
  launcherGroup,
  scopedFallbackOrigin,
  termRows,
  columns,
  now,
  ageNow,
}) {
  let Wt = (xe) => groupCollapseKey(groupMode, xe);
  let isBashDispatch = mode === "bash" || dispatch?.exec !== undefined;
  let Ge = hasDispatchIntent(dispatch);
  let yt = hasDispatchContent(dispatch);
  let Bt = dispatch === null;
  let lt = Bt ? new Set() : collapsed;
  let { template, state, name: Ot, group, output, pr, url, text } = parseDispatchFlags(dispatch ? "" : query);
  let Fe = pr ? prUrlMatcher(pr) : undefined;
  let Rt = [...(jobs ?? []), ...(peersEnabled ? adoptedPeers : [])];
  let Vt = cwdFilter ? Rt.filter((xe) => jobMatchesCwd(xe.state, cwdFilter)) : Rt;
  let Be = showRemoteTabs
    ? activeTab === "remote"
      ? remoteJobs
      : Vt
    : simpleWantsRemote
      ? [...Vt, ...remoteJobs]
      : Vt;
  let filtered = Be.filter((xe) => {
    if (template && !xe.state.template.toLowerCase().startsWith(template)) return false;
    if (Ot && rankJobNameMatch(xe.state, Ot) === 0) return false;
    if (
      group &&
      !xe.state.group?.toLowerCase().startsWith(group) &&
      !(xe.state.pinned && "pinned".startsWith(group))
    )
      return false;
    if (pr && !jobReferencesPr(xe.state, pr, Fe)) return false;
    if (url && !mentionsText(xe.state, url)) return false;
    if (
      output !== undefined &&
      !Object.values(xe.state.output ?? {}).some((qt) => qt.toLowerCase().includes(output))
    )
      return false;
    if (
      state &&
      !xe.state.state.toLowerCase().startsWith(state) &&
      !jobTempo(xe.state).startsWith(state) &&
      !FLEET_BUCKET_LABELS[jobBucket(xe, prStatuses, liveStatus(xe))].toLowerCase().startsWith(state)
    )
      return false;
    if (text) {
      if (
        ![xe.state.name, xe.state.intent, xe.state.detail, ...Object.values(xe.state.output ?? {})]
          .join(" ")
          .toLowerCase()
          .includes(text)
      )
        return false;
    }
    return true;
  });
  let filtered_2 = pendings.filter((pending) => !filtered.some((qt) => qt.id === pending.id));
  let $e = filtered_2.length > 0 ? sortJobs([...filtered_2, ...filtered]) : filtered;
  let ht = groupMode === "state";
  let jt = groupMode === "group";
  let We = new Map(
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
              : canonicalRepoRoot(xe.state),
    ]),
  );
  let Jt = (xe) => (xe === "pinned" ? -1 : xe === UNGROUPED ? 1 : 0);
  let sorted = [...$e].sort((xe, qt) => {
    let it = We.get(xe.id);
    let io = We.get(qt.id);
    if (it === "pinned" || io === "pinned") return (it === "pinned" ? 0 : 1) - (io === "pinned" ? 0 : 1);
    if (jt) {
      let bo = (wo) =>
        pendingDelete?.id === wo.id && pendingDelete.sortKey !== undefined
          ? pendingDelete.sortKey
          : Date.parse(wo.state.updatedAt);
      return Jt(it) - Jt(io) || it.localeCompare(io) || bo(qt) - bo(xe);
    }
    if (ht) {
      let bo = FLEET_BUCKETS.indexOf(it) - FLEET_BUCKETS.indexOf(io);
      let wo = (Ho) =>
        pendingDelete?.id === Ho.id && pendingDelete.sortKey !== undefined
          ? pendingDelete.sortKey
          : jobSortKey_2(Ho.state, it);
      return bo !== 0 ? bo : wo(qt) - wo(xe) || qt.state.createdAt.localeCompare(xe.state.createdAt);
    }
    if (it === launcherGroup && io !== launcherGroup) return -1;
    if (io === launcherGroup && it !== launcherGroup) return 1;
    return it.localeCompare(io);
  });
  let He = 1 / 0;
  let ct = DONE_CAP_MIN;
  let vt = false;
  let rt = new Set();
  for (let xe of [...(jobs ?? []), ...pendings, ...(peersEnabled ? adoptedPeers : [])]) {
    if (xe.state.sessionId) rt.add(xe.state.sessionId);
    if (xe.state.resumeSessionId) rt.add(xe.state.resumeSessionId);
  }
  let Xe =
    Boolean(template || pr || url || state || group) ||
    output !== undefined ||
    earlierEntries.length === 0 ||
    activeTab === "remote" ||
    Boolean(cwdFilter)
      ? []
      : earlierEntries.filter(
          (earlierEntry) =>
            !rt.has(earlierEntry.sessionId) &&
            (!text || earlierEntry.title.toLowerCase().includes(text)) &&
            (!Ot || earlierEntry.title.toLowerCase().includes(Ot)),
        );
  if (ht && !simpleView) {
    let done = sorted.filter((bo) => We.get(bo.id) === "done");
    let size = new Set(sorted.map((bo) => We.get(bo.id))).size;
    let reduced = sorted.reduce((acc, wo) => {
      let Ho = We.get(wo.id);
      return Ho !== "done" && !lt.has(Wt(Ho)) ? acc + 1 : acc;
    }, 0);
    let doneCap = computeDoneCap(termRows, reduced + Math.max(0, size * 2 - 1));
    ct = doneCap.doneCap;
    vt = doneCap.compactHeader;
    if (!capExpanded.has("done"))
      He = doneFoldIndex({
        done,
        earlier: Xe,
        doneCap: ct,
        initialJobId,
        linkMatchId,
      });
  } else if (!simpleView && activeTab !== "remote" && Xe.length > 0) {
    let size = new Set(sorted.map((it) => We.get(it.id))).size;
    let doneCap = computeDoneCap(termRows, sorted.length + Math.max(0, size * 2 - 1));
    ct = doneCap.doneCap;
    vt = doneCap.compactHeader;
    if (!capExpanded.has(EARLIER)) He = Xe.length >= ct + DONE_CAP_SLACK ? ct : 1 / 0;
  }
  let bandCounts = {
    blocked: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "blocked"),
    active: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "active"),
    completed: count(Be, (xe) => jobTempo(xe.state, liveStatus(xe)) === "completed"),
  };
  let all = sorted.every((xe) => xe.id === initialJobId);
  let uo = !simpleView && ht && !query && all && !sorted[0]?.state.pinned;
  let Kt = simpleView
    ? bucketJobs($e, {
        statusFor: liveStatus,
        now,
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
      launcherGroup,
      scopedFallbackOrigin,
      doneFoldAt: He,
      emptyBucketHint: uo,
      earlier: Xe,
    });
  let rows = po.rows;
  let pt = new Map();
  for (let xe of sorted) {
    let qt = We.get(xe.id);
    pt.set(qt, (pt.get(qt) ?? 0) + 1);
  }
  if (Xe.length > 0 && activeTab !== "remote") {
    let xe = ht ? "done" : EARLIER;
    pt.set(xe, (pt.get(xe) ?? 0) + Xe.length);
  }
  if (lt.size > 0) rows = rows.filter((xe) => xe.kind === "header" || !lt.has(Wt(xe.group)));
  let homeIdx = simpleView ? 0 : Bt ? bestSearchMatchIndex(rows, Ot) : initialFocusIndex(rows, launcherCwd);
  let hasMultipleOrigins = new Set(rows.filter((xe) => xe.kind === "header").map((xe) => xe.group)).size > 1;
  let Ce = rows[focusedIdx];
  let job = Ce?.kind === "job" ? Ce.job : undefined;
  let at =
    activeTab === "remote" || (Ce?.kind === "job" && Ce.job.state.backend !== "daemon")
      ? scopedFallbackOrigin
      : (Ce?.origin ?? scopedFallbackOrigin);
  let altOpenOrigin = activeTab === "remote" ? (Ce?.origin ?? at) : at;
  let focusedGroup = Ce?.group ?? launcherGroup;
  let dispatchOrigin = ht && !simpleView ? scopedFallbackOrigin : at;
  let focusIsFromHover = focusedIdx === hoverFocusIdx;
  let cols = computeFleetColumnWidths(
    sorted,
    (xe) => (loopJobIds.has(xe.id) ? loopKicks.get(xe.state.sessionId)?.nextAt : null),
    initialJobId,
    columns,
    ageNow,
  );
  let dispatchTargetGroup = (() => {
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
  })();
  let enterIsNoop = !Ge && dispatch?.cwd !== undefined;
  let focusedIsPending = !!job && pendings.some((pending) => pending.id === job.id);
  let go = !!job && job.id === initialJobId;
  let runningCount = count(simpleWantsRemote ? [...Rt, ...remoteJobs] : Rt, (xe) => {
    let qt = jobBucket(xe, prStatuses, liveStatus(xe));
    return qt === "blocked" || qt === "working";
  });
  let enterLabel = Ge
    ? "create"
    : go
      ? "return"
      : job && isFailedSettledJob(job.state) && !heldInTerminal(job)
        ? "resume"
        : "open";
  let headerJobs =
    Ce?.kind === "header" && Ce.group === followOrigin
      ? sorted.filter((xe) => We.get(xe.id) === Ce.group)
      : [];
  return {
    byState: ht,
    byGroup: jt,
    hasDispatch: Ge,
    hasComposedDispatch: yt,
    isBashDispatch,
    enterIsNoop,
    queryIsFilter: Bt,
    hasNameFilter: Ot !== undefined,
    loopJobIds,
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
    rows,
    homeIdx,
    hasMultipleOrigins,
    groupCounts: pt,
    bandCounts,
    onlyOrigin: all,
    isOnboarding: uo,
    focusedRow: Ce,
    focused: job,
    altOpenOrigin,
    focusedGroup,
    dispatchOrigin,
    focusIsFromHover,
    cols,
    ageNow,
    dispatchTargetGroup,
    headerJobs,
    runningCount,
    enterLabel,
    focusedIsPending,
    focusedIsOrigin: go,
  };
}
//@ chunk-93kwxas0.js:88328-88380 placement
function isDispatchablePath(cwd) {
  return isAbsolute(cwd) && !hasDotDotSegment(cwd) && !isNonWslUncPath(cwd) && !isNetworkRelatedPath(cwd);
}
export {
  SIMPLE_PINNED,
  groupCollapseKey,
  prependModeCharacterToInput,
  parseDraftInput,
  buildFleetRows,
  getJobTitle,
  isDispatchablePath,
  isFrameRow,
  activityVerb,
  pickHighestPriorityColor,
  jobRowGlyph,
  useAutoTitle,
  jobRowAriaLabel,
  useFleetSpinnerFrame,
  prKindOf,
  isDifferentDoneGroup,
  SIMPLE_FINISHED,
  jobActivityDisplay,
  jobAgeLabel,
  jobTokenLabel,
  jobNeedsLine,
  jobBucket_2,
  formatJobAgeOrEta,
  childFrameRows,
  hasSafeModeFlag,
  activityColors,
  InlineMarkup,
};
