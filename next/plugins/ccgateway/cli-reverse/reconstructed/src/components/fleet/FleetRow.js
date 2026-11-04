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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  useRef,
  useState,
  useLayoutEffect,
  fragmentTypeExport,
} from "../../../vendor/react/cjs/react.production.js";
import { countGraphemes } from "../../ink/output.js";
import { BOXED_DIAMOND_GLYPH, BULLET_OPERATOR } from "../../constants/figures.js";
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
function formatJobAge(job, nowMs) {
  let state = job.state;
  if (returnFalse_2(state)) {
    let updatedMs = Date.parse(state.updatedAt) || Date.parse(state.createdAt);
    if (!Number.isFinite(updatedMs)) return "";
    let max = Math.max(0, nowMs - updatedMs);
    return state.tempo === "active" && state.detail !== SEED_DETAIL && max < STUCK_AFTER_MS
      ? ""
      : formatDuration(max, {
          mostSignificantOnly: true,
        });
  }
  let referenceMs =
    isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state))
      ? Date.parse(state.firstTerminalAt ?? state.updatedAt)
      : nowMs;
  return formatDuration(Math.max(0, referenceMs - Date.parse(state.createdAt)), {
    mostSignificantOnly: true,
  });
}
//@ chunk-93kwxas0.js:73045-73153 placement
/**
 * 未来时间显示 “in X”，否则显示会话年龄。
 */
function formatJobAgeOrEta(job, etaMs, nowMs = Date.now()) {
  if (etaMs != null && etaMs > nowMs)
    return `in ${formatDuration(etaMs - nowMs, {
      mostSignificantOnly: true,
    })}`;
  return formatJobAge(job, nowMs);
}
//@ chunk-93kwxas0.js:73153-73763 placement
/**
 * 会话显示标题：名称或意图摘要，当前/来源会话特殊标注。
 */
function getJobTitle(state, isCurrent = false, shortForm = false) {
  let sanitize = (name) => collapseWhitespace(returnFalse_2(state) ? sanitizeAttentionText(name) : name);
  if (state.name) return redactSecrets(sanitize(state.name));
  let maxWidth = 25;
  let filtered = redactSecrets(sanitize(state.displayIntent ?? state.intent))
    .split(" ")
    .filter(Boolean);
  if (filtered.length === 0) {
    if (isCurrent) return shortForm ? "session you came from" : "current session";
    if (
      (state.template === "bg" || state.template === DEFAULT_BG_AGENT_TEMPLATE.name) &&
      state.state === "working"
    )
      return shortForm ? "untitled session" : "new session";
    if (shortForm && (state.template === "bg" || state.template === DEFAULT_BG_AGENT_TEMPLATE.name))
      return "untitled session";
    return collapseWhitespace(state.template);
  }
  let truncatedWords = filtered.length > 3 ? `${filtered.slice(0, 3).join(" ")}\u2026` : filtered.join(" ");
  if (bunStringWidth(truncatedWords) <= maxWidth) return truncatedWords;
  let result = "";
  let width = 0;
  for (let grapheme of splitGraphemes(truncatedWords)) {
    let graphemeWidth = bunStringWidth(grapheme);
    if (width + graphemeWidth > maxWidth - 1) break;
    result += grapheme;
    width += graphemeWidth;
  }
  return `${result}\u2026`;
}
//@ chunk-93kwxas0.js:73763-74583 placement
/**
 * 未命名会话自动生成标题的 hook。
 */
function useAutoTitle(label, hasName) {
  let $ = useMemoCache(12);
  let clock = useClock();
  let initial;
  if ($[0] !== label || $[1] !== hasName) {
    initial = {
      label,
      hasName,
      fired: false,
    };
    $[0] = label;
    $[1] = hasName;
    $[2] = initial;
  } else initial = $[2];
  let stateRef = useRef(initial);
  let [animation, setAnimation] = useState(null);
  let titleEffect;
  let titleDeps;
  if ($[3] !== clock || $[4] !== label || $[5] !== hasName) {
    titleEffect = () => {
      if (stateRef.current.fired || stateRef.current.hasName || !hasName) {
        stateRef.current = {
          label,
          hasName,
          fired: stateRef.current.fired,
        };
        return;
      }
      let label_2 = stateRef.current.label;
      stateRef.current = {
        label,
        hasName: true,
        fired: true,
      };
      let max = Math.max(countGraphemes(label_2), countGraphemes(label));
      if (max === 0) {
        return;
      }
      setAnimation({
        old: label_2,
        n: 1,
      });
      let step = 1;
      let max_2 = Math.max(16, Math.floor(360 / max));
      let timer = null;
      let advance = () => {
        step = step + 1;
        if (step >= max) {
          setAnimation(null);
          timer = null;
        } else {
          setAnimation({
            old: label_2,
            n: step,
          });
          timer = clock.setTimeout(advance, max_2);
        }
      };
      timer = clock.setTimeout(advance, max_2);
      return () => {
        timer?.();
        setAnimation(null);
      };
    };
    titleDeps = [clock, label, hasName];
    $[3] = clock;
    $[4] = label;
    $[5] = hasName;
    $[6] = titleEffect;
    $[7] = titleDeps;
  } else {
    titleEffect = $[6];
    titleDeps = $[7];
  }
  useLayoutEffect(titleEffect, titleDeps);
  if (!animation) {
    return null;
  }
  let frame;
  if ($[8] !== animation.n || $[9] !== animation.old || $[10] !== label) {
    frame = blendTitleAnimation(animation.old, label, animation.n);
    $[8] = animation.n;
    $[9] = animation.old;
    $[10] = label;
    $[11] = frame;
  } else frame = $[11];
  return frame;
}
//@ chunk-93kwxas0.js:74583-74814 placement
/**
 * 标题替换动画的一帧：新标题前 k 个字素 + 旧标题剩余部分，补齐到两者最大宽度。
 */
function blendTitleAnimation(old, newTitle, step) {
  let oldGraphemes = splitGraphemes(old);
  let newGraphemes = splitGraphemes(newTitle);
  let joined = newGraphemes.slice(0, Math.min(step, newGraphemes.length)).join("");
  let max = Math.max(bunStringWidth(old), bunStringWidth(newTitle));
  let width = bunStringWidth(joined);
  let tail = "";
  for (let grapheme of oldGraphemes.slice(step)) {
    let graphemeWidth = bunStringWidth(grapheme);
    if (width + graphemeWidth > max) break;
    tail += grapheme;
    width += graphemeWidth;
  }
  return {
    display: joined + tail + repeatString(" ", max - width),
    newLen: joined.length,
  };
}
//@ chunk-93kwxas0.js:74814-75065 placement
/**
 * 会话产物（PR/frame）列所需宽度。
 */
function artifactColumnWidth(state) {
  let children = validChildren(state.children);
  if (!children.length) return 0;
  let filtered = children.filter((child) => child.kind !== "frame");
  if (filtered.length > 1) return bunStringWidth(`${filtered.length} PRs`);
  if (filtered.length === 1) {
    let prNumber = prNumberOfChild(filtered[0]);
    return bunStringWidth(prNumber !== undefined ? `#${prNumber}` : "PR");
  }
  return bunStringWidth(
    children.length > 1 ? `${children.length} ${BOXED_DIAMOND_GLYPH}` : BOXED_DIAMOND_GLYPH,
  );
}
//@ chunk-93kwxas0.js:75065-75113 placement
function hasSafeModeFlag(respawnFlags) {
  return respawnFlags.includes("--safe-mode");
}
//@ chunk-93kwxas0.js:75113-75402 placement
/**
 * 计算 Agents 行的列宽（年龄、标签、产物、详情）。
 */
function computeFleetColumnWidths(jobs, statusFor, initialJobId, columns, nowMs) {
  let max = Math.max(
    MAX_DISPATCH_RETRIES,
    ...jobs.map((job) => bunStringWidth(formatJobAgeOrEta(job, statusFor(job), nowMs))),
  );
  let min = Math.min(
    Math.max(40, Math.floor(columns / 3)),
    Math.max(12, ...jobs.map((job) => bunStringWidth(getJobTitle(job.state, job.id === initialJobId)))),
  );
  let max_2 = Math.max(0, ...jobs.map((job) => artifactColumnWidth(job.state)));
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
function activityVerb(activity, tempo, status, outcome) {
  if (activity === "success" && outcome)
    return {
      word: "Done",
      color: "success",
      dim: false,
    };
  if (activity === "failure" && outcome)
    return {
      word: "Failed",
      color: "error",
      dim: false,
    };
  if (activity === "stopped" && outcome)
    return {
      word: "Stopped",
      color: "inactive",
      dim: false,
    };
  if (status === "busy" || status === "shell")
    return {
      word: FLEET_BUCKET_LABELS.working,
      color: undefined,
      dim: false,
    };
  if (tempo === "blocked" || status === "waiting")
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
  let bestColor = color;
  let bestPriority = color ? (COLOR_PRIORITY[color] ?? 0) : 0;
  for (let child of childRows) {
    if (child.color === undefined || isFrameRow(child)) continue;
    let priority = COLOR_PRIORITY[child.color] ?? 0;
    if (priority > bestPriority) {
      bestColor = child.color;
      bestPriority = priority;
    }
  }
  return bestColor;
}
//@ chunk-93kwxas0.js:76176-76219 placement
function isFrameRow(row) {
  return row.row.kind === "frame";
}
//@ chunk-93kwxas0.js:76219-76263 placement
function prKindOf(row) {
  return isGitLabMergeRequestUrl(row.href) ? "mr" : "pr";
}
//@ chunk-93kwxas0.js:76263-76369 placement
/**
 * 子项的 PR 号：从链接里解析，或 id 本身是数字。
 */
function prNumberOfChild(child) {
  let prNumber = parsePrNumber(child.href);
  if (prNumber !== null) return Number(prNumber);
  return /^\d+$/.test(child.id) ? Number(child.id) : undefined;
}
//@ chunk-93kwxas0.js:76369-76428 placement
function normalizePrStatusColor(status) {
  let prStatusColor = getPrStatusColor(status);
  return prStatusColor === "error" ? "warning" : prStatusColor;
}
//@ chunk-93kwxas0.js:76428-76465 placement
var PR_SORT_RANK = {
  error: 3,
  warning: 2,
  success: 1,
};
//@ chunk-93kwxas0.js:76465-76528 placement
function sortByRank(rows) {
  return [...rows].sort((left, right) => right.sortRank - left.sortRank);
}
//@ chunk-93kwxas0.js:76528-77217 placement
/**
 * PR 状态的显示片段（已合并/关闭、检查失败/进行/通过）。
 */
function prStatusSegments(status) {
  if (status.state === "MERGED")
    return [
      {
        text: "merged",
        color: "merged",
      },
    ];
  if (status.state === "CLOSED")
    return [
      {
        text: "closed",
        color: "inactive",
      },
    ];
  let segments = [];
  let { failed, pending, passed } = status.checks;
  let checkTotal = failed + pending + passed;
  if (failed > 0)
    segments.push({
      text: `${figures_default.cross} ${failed}/${checkTotal}`,
      color: "error",
    });
  else if (pending > 0)
    segments.push({
      text: `${passed}/${checkTotal}`,
      color: "warning",
    });
  else if (checkTotal > 0)
    segments.push({
      text: figures_default.tick,
      color: "success",
    });
  switch (status.review) {
    case "APPROVED":
      segments.push({
        text: "approved",
        color: "success",
      });
      break;
    case "CHANGES_REQUESTED":
      segments.push({
        text: figures_default.cross,
        color: "error",
      });
      break;
    case "REVIEW_REQUIRED":
      segments.push({
        text: "needs review",
        color: undefined,
      });
      break;
    case null:
      break;
  }
  if (segments.length === 0 && status.state !== "DRAFT")
    segments.push({
      text: status.state.toLowerCase(),
      color: normalizePrStatusColor(status),
    });
  return segments;
}
//@ chunk-93kwxas0.js:77217-77727 placement
/**
 * 生成会话的子行（frame、PR 链接及其状态）。
 */
function childFrameRows(children, statusByHref) {
  return sortByRank(
    validChildren(children).map((child) => {
      if (child.kind === "frame")
        return {
          row: child,
          prNumber: undefined,
          label: collapseWhitespace(child.title ?? "") || collapseWhitespace(child.id),
          status: [],
          diffStat: undefined,
          isDraft: false,
          color: "claude",
          sortRank: 0,
        };
      let status = statusByHref.get(child.href);
      let color = status ? getPrStatusColor(status) : undefined;
      return {
        row: child,
        prNumber: status?.number ?? prNumberOfChild(child),
        label: status?.title ? collapseWhitespace(status.title) : "",
        status: status ? prStatusSegments(status) : [],
        diffStat:
          status && status.state !== "MERGED" && status.state !== "CLOSED"
            ? {
                additions: status.additions,
                deletions: status.deletions,
              }
            : undefined,
        isDraft: status?.state === "DRAFT",
        color: status ? normalizePrStatusColor(status) : undefined,
        sortRank: status?.state === "OPEN" && color ? (PR_SORT_RANK[color] ?? 0) : 0,
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
  let $ = useMemoCache(11);
  let { value, linkHref } = props;
  let Component;
  let dimColor;
  let children;
  if ($[0] !== linkHref || $[1] !== value) {
    let parts = value.split(/(\*\*.+?\*\*|\+\+.+?\+\+|`[^`]+`|https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+)/g);
    Component = Text;
    dimColor = true;
    let renderPart;
    if ($[5] !== linkHref) {
      renderPart = (part, key) => {
        let match = part.match(/^(?:\*\*|\+\+|`)(.+?)(?:\*\*|\+\+|`)$/);
        if (match) {
          return jsxProd_default(
            Text,
            {
              bold: true,
              children: match[1],
            },
            key,
          );
        }
        if (URL_RE.test(part)) {
          let url = trimTrailingPunctuation(part);
          let href = linkHref === undefined ? url : linkHref(url);
          if (href === undefined) {
            return part;
          }
          return jsxProd_default_2(
            fragmentTypeExport,
            {
              children: [
                jsxProd_default(Link, {
                  url: href,
                  children: url,
                }),
                part.slice(url.length),
              ],
            },
            key,
          );
        }
        return part;
      };
      $[5] = linkHref;
      $[6] = renderPart;
    } else renderPart = $[6];
    children = parts.map(renderPart);
    $[0] = linkHref;
    $[1] = value;
    $[2] = Component;
    $[3] = dimColor;
    $[4] = children;
  } else {
    Component = $[2];
    dimColor = $[3];
    children = $[4];
  }
  let textNode;
  if ($[7] !== Component || $[8] !== dimColor || $[9] !== children) {
    textNode = jsxProd_default(Component, {
      dimColor,
      children,
    });
    $[7] = Component;
    $[8] = dimColor;
    $[9] = children;
    $[10] = textNode;
  } else textNode = $[10];
  return textNode;
}
//@ chunk-93kwxas0.js:78456-78583 placement
/**
 * 行的无障碍前缀：“selected, pinned, 动词:”。
 */
function jobRowAriaLabel(activity, tempo, status, outcome, selected, pinned = false) {
  let selectedPrefix = selected ? "selected, " : "";
  let pinnedPrefix = pinned ? "pinned, " : "";
  let { word } = activityVerb(activity, tempo, status, outcome);
  return `${selectedPrefix}${pinnedPrefix}${word.toLowerCase()}:`;
}
//@ chunk-93kwxas0.js:78583-78723 placement
/**
 * 行首状态符号：非活跃时为点，忙碌/shell 时为空，循环任务和普通任务各有符号。
 */
function jobRowGlyph(state, muted, status) {
  if (muted && state.tempo !== "active" && status === undefined) return BULLET_OPERATOR;
  if (status === "busy" || status === "shell") return null;
  if (isLoopJob(state)) return loopJobGlyphAlt();
  return loopJobGlyph();
}
//@ chunk-93kwxas0.js:78723-78895 placement
/**
 * Agents 视图的旋转指示帧；减少动态效果或读屏时为静态点。
 */
function useFleetSpinnerFrame() {
  let $ = useMemoCache(1);
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isStatic = prefersReducedMotion || isScreenReaderEnabled;
  let [, frame] = useAnimationFrame(isStatic ? null : 120);
  if (isStatic) {
    return SPINNER_DOT;
  }
  let spinnerChars;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    spinnerChars = getLoopSpinnerChars();
    $[0] = spinnerChars;
  } else spinnerChars = $[0];
  let chars = spinnerChars;
  return chars[Math.floor(frame / 120) % chars.length];
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
function jobBucket_2(state, status) {
  if (status === "busy") return "live";
  if (isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state)))
    return "done";
  if (status === "waiting") return "needs";
  if (state.tempo === "blocked" && state.needs && state.needs !== IDLE_NEEDS) return "needs";
  return "live";
}
//@ chunk-93kwxas0.js:79275-79429 placement
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
function jobLatestTimestamp(state) {
  for (let timestamp of [state.lastTerminalAt, state.firstTerminalAt, state.updatedAt, state.createdAt])
    if (timestamp) {
      let timestamp_2 = Date.parse(timestamp);
      if (Number.isFinite(timestamp_2)) return timestamp_2;
    }
  return 0;
}
//@ chunk-93kwxas0.js:79429-79511 placement
function isDifferentDoneGroup(previous, nextGroup) {
  if (previous === undefined) return false;
  return !(
    simpleGroupOf(previous) === SIMPLE_BUCKET_KEYS.done &&
    simpleGroupOf(nextGroup) === SIMPLE_BUCKET_KEYS.done
  );
}
//@ chunk-93kwxas0.js:79511-79562 placement
function simpleGroupOf(group) {
  return group.group === SIMPLE_FINISHED ? SIMPLE_BUCKET_KEYS.done : group.group;
}
//@ chunk-93kwxas0.js:79562-79608 placement
function remainingRowsForTerminal(terminalRows, reserved) {
  return Math.max(0, terminalRows - RECENT_LIST_GAP - DONE_CAP_TITLE_ROWS - reserved);
}
//@ chunk-93kwxas0.js:79608-80705 placement
/**
 * 把会话分成 needs/live/done 等带计数的桶。
 */
function bucketJobs(jobs, { statusFor, now, fallbackOrigin, showFinishedEarlier, terminalRows }) {
  let pinnedRows = [];
  let needsRows = [];
  let liveRows = [];
  let doneRows = [];
  let needsCount = 0;
  let liveCount = 0;
  let workingCount = 0;
  for (let job of jobs) {
    let status = statusFor(job);
    let bucket = jobBucket_2(job.state, status);
    if (bucket === "needs") needsCount++;
    else if (bucket === "live") {
      liveCount++;
      if (status === "busy" || status === "shell") workingCount++;
    }
    if (job.state.pinned) {
      pinnedRows.push(job);
      continue;
    }
    switch (bucket) {
      case "needs":
        needsRows.push(job);
        break;
      case "live":
        liveRows.push(job);
        break;
      case "done":
        doneRows.push(job);
        break;
    }
  }
  doneRows.sort((left, right) => jobLatestTimestamp(right.state) - jobLatestTimestamp(left.state));
  let rows = [
    {
      kind: "newsession",
      origin: fallbackOrigin,
      group: SIMPLE_NEW_SESSION,
    },
  ];
  let addGroup = (group, groupRows) => {
    for (let job of groupRows)
      rows.push({
        kind: "job",
        job,
        origin: spawnOrigin(job.state),
        group,
      });
  };
  addGroup(SIMPLE_PINNED, pinnedRows);
  addGroup(SIMPLE_BUCKET_KEYS.needs, needsRows);
  addGroup(SIMPLE_BUCKET_KEYS.live, liveRows);
  let headerRows =
    1 +
    (liveRows.length * RUNNING_GROUP_ROWS + (pinnedRows.length + needsRows.length) * PORCELAIN_GROUP_ROWS) +
    (needsCount + liveCount === 0 ? EMPTY_GROUP_ROWS : 0) +
    (doneRows.length > 0 ? 1 + FINISHED_SECTION_ROWS : 0);
  let doneCap = remainingRowsForTerminal(terminalRows, headerRows);
  let oldCount = count(doneRows, (job) => now - jobLatestTimestamp(job.state) > FLEET_RECENT_WINDOW_MS);
  let max = Math.max(0, doneRows.length - oldCount - doneCap);
  let foldCount = showFinishedEarlier ? 0 : oldCount + max;
  let foldHidden = foldCount >= LIVE_GROUP_ROWS ? foldCount : 0;
  let doneFoldHiddenFailed = count(
    doneRows.slice(doneRows.length - foldHidden),
    (job) => terminalOutcome(job.state.state) === "failure",
  );
  addGroup(SIMPLE_BUCKET_KEYS.done, doneRows.slice(0, doneRows.length - foldHidden));
  if (foldHidden > 0)
    rows.push({
      kind: "fold",
      origin: fallbackOrigin,
      group: SIMPLE_FINISHED,
      hidden: foldHidden,
    });
  return {
    rows,
    doneCount: doneRows.length,
    doneFoldHidden: foldHidden,
    doneFoldHiddenFailed,
    doneCap,
    foldGroup: SIMPLE_FINISHED,
    runningCount: needsCount + liveCount,
    needsCount,
    workingCount,
    liveCount,
  };
}
//@ chunk-93kwxas0.js:80705-80972 placement
/**
 * 子任务进度：todo 完成数，或 agent/workflow 完成数。
 */
function fanProgressLabel(state) {
  let fan = state.fan ?? [];
  let filtered = fan.filter((item) => item.kind === "todo");
  if (filtered.length > 0)
    return `${count(filtered, (item) => item.doneAt !== undefined)}/${filtered.length}`;
  let filtered_2 = fan.filter((item) => item.kind === "agent" || item.kind === "workflow");
  if (filtered_2.length > 0)
    return `${count(filtered_2, (item) => item.doneAt !== undefined)}/${filtered_2.length} agents`;
  return;
}
//@ chunk-93kwxas0.js:80972-81074 placement
/**
 * “N tokens”，下行时带箭头。
 */
function formatTokenCount(tokens, withArrow) {
  if (tokens === undefined || tokens <= 0) return;
  let text = `${formatTokens(tokens)} tokens`;
  return withArrow ? `${figures_default.arrowDown} ${text}` : text;
}
//@ chunk-93kwxas0.js:81074-81330 placement
/**
 * 行的活动词与颜色：working 变暗，blocked 时区分 “Needs you” 与 “Idle”。
 */
function jobActivityDisplay(job, statusFor) {
  let status = statusFor(job);
  let display = activityVerb(job.activity, job.state.tempo, status, terminalOutcome(job.state.state));
  if (display.word === FLEET_BUCKET_LABELS.working)
    return {
      ...display,
      color: undefined,
      dim: true,
    };
  if (display.word !== FLEET_BUCKET_LABELS.blocked) return display;
  return jobBucket_2(job.state, status) === "needs"
    ? {
        ...display,
        word: "Needs you",
      }
    : {
        word: "Idle",
        color: undefined,
        dim: true,
      };
}
//@ chunk-93kwxas0.js:81330-81418 placement
function jobAgeLabel(job, loopJobIds, loopKicks, nowMs) {
  return formatJobAgeOrEta(
    job,
    loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.nextAt : undefined,
    nowMs,
  );
}
//@ chunk-93kwxas0.js:81418-81481 placement
function jobTokenLabel(job, display) {
  return formatTokenCount(job.state.tokens, display.word === FLEET_BUCKET_LABELS.working);
}
//@ chunk-93kwxas0.js:81481-81851 placement
/**
 * 生成会话"需要你处理"的一行说明。
 */
function jobNeedsLine(job, display, status, columns) {
  let lineWidth = isScreenReaderMode() ? 1 / 0 : Math.max(24, Math.min(72, Math.floor(columns * 0.55)));
  let truncate = (line) => (lineWidth === 1 / 0 ? line : truncateToWidth(line, lineWidth));
  if (jobBucket_2(job.state, status) === "done") return;
  let needs = job.state.needs && job.state.needs !== IDLE_NEEDS ? job.state.needs : undefined;
  if (needs) return truncate(jobPreviewText(job.state, needs));
  if (!job.state.pinned && display.word !== FLEET_BUCKET_LABELS.working) return;
  let progress = fanProgressLabel(job.state);
  if (progress) return progress;
  let detail = job.state.detail;
  return detail && !isTerminalDetail(detail) ? truncate(jobPreviewText(job.state, detail)) : undefined;
}
//@ chunk-93kwxas0.js:81851-81909 placement
function groupCollapseKey(groupMode, group) {
  return group === "pinned" ? "pinned" : `${groupMode}:${group}`;
}
//@ chunk-93kwxas0.js:81909-82123 placement (2.1.88 match: prependModeCharacterToInput, 1)
function prependModeCharacterToInput(text, mode, jobs, cwdFilter) {
  let prNumber = mode === "bash" ? null : parsePrNumber(text);
  let prMatcher = prNumber ? prUrlMatcher(prNumber) : undefined;
  let soloUrl_ = mode === "bash" || prNumber ? null : soloUrl(text);
  let matchesCwd = (job) => !cwdFilter || jobMatchesCwd(job.state, cwdFilter);
  let matchesJob = prNumber
    ? (job) => jobReferencesPr(job, prNumber, prMatcher)
    : soloUrl_
      ? (job) => mentionsText(job, soloUrl_)
      : null;
  return matchesJob ? (jobs ?? []).find((job) => matchesCwd(job) && matchesJob(job.state))?.id : undefined;
}
//@ chunk-93kwxas0.js:82123-82217 placement
function parseDraftInput(query, mode, modeCharacterJobId, parseScope) {
  return modeCharacterJobId
    ? null
    : parseDispatchInput(
        mode === "bash" ? `!${query}` : query,
        parseScope.templates,
        parseScope.allRepos,
        parseScope.routines,
      );
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
  let collapseKeyOf = (group) => groupCollapseKey(groupMode, group);
  let isBashDispatch = mode === "bash" || dispatch?.exec !== undefined;
  let hasIntent = hasDispatchIntent(dispatch);
  let hasContent = hasDispatchContent(dispatch);
  let isQueryOnly = dispatch === null;
  let activeCollapsed = isQueryOnly ? new Set() : collapsed;
  let {
    template,
    state,
    name: nameFilter,
    group,
    output,
    pr,
    url,
    text,
  } = parseDispatchFlags(dispatch ? "" : query);
  let prMatcher = pr ? prUrlMatcher(pr) : undefined;
  let localJobs = [...(jobs ?? []), ...(peersEnabled ? adoptedPeers : [])];
  let scopedLocalJobs = cwdFilter
    ? localJobs.filter((job) => jobMatchesCwd(job.state, cwdFilter))
    : localJobs;
  let scopedJobs = showRemoteTabs
    ? activeTab === "remote"
      ? remoteJobs
      : scopedLocalJobs
    : simpleWantsRemote
      ? [...scopedLocalJobs, ...remoteJobs]
      : scopedLocalJobs;
  let filtered = scopedJobs.filter((job) => {
    if (template && !job.state.template.toLowerCase().startsWith(template)) return false;
    if (nameFilter && rankJobNameMatch(job.state, nameFilter) === 0) return false;
    if (
      group &&
      !job.state.group?.toLowerCase().startsWith(group) &&
      !(job.state.pinned && "pinned".startsWith(group))
    )
      return false;
    if (pr && !jobReferencesPr(job.state, pr, prMatcher)) return false;
    if (url && !mentionsText(job.state, url)) return false;
    if (
      output !== undefined &&
      !Object.values(job.state.output ?? {}).some((outputValue) => outputValue.toLowerCase().includes(output))
    )
      return false;
    if (
      state &&
      !job.state.state.toLowerCase().startsWith(state) &&
      !jobTempo(job.state).startsWith(state) &&
      !FLEET_BUCKET_LABELS[jobBucket(job, prStatuses, liveStatus(job))].toLowerCase().startsWith(state)
    )
      return false;
    if (text) {
      if (
        ![job.state.name, job.state.intent, job.state.detail, ...Object.values(job.state.output ?? {})]
          .join(" ")
          .toLowerCase()
          .includes(text)
      )
        return false;
    }
    return true;
  });
  let filtered_2 = pendings.filter((pending) => !filtered.some((job) => job.id === pending.id));
  let withPendings = filtered_2.length > 0 ? sortJobs([...filtered_2, ...filtered]) : filtered;
  let byState = groupMode === "state";
  let byGroup = groupMode === "group";
  let groupOf = new Map(
    withPendings.map((job) => [
      job.id,
      job.state.pinned
        ? "pinned"
        : pendingDelete?.id === job.id && pendingDelete.group
          ? pendingDelete.group
          : byState
            ? jobBucket(job, prStatuses, liveStatus(job))
            : byGroup
              ? (job.state.group ?? UNGROUPED)
              : canonicalRepoRoot(job.state),
    ]),
  );
  let pinnedRank = (group) => (group === "pinned" ? -1 : group === UNGROUPED ? 1 : 0);
  let jobs_2 = [...withPendings].sort((jobA, jobB) => {
    let groupA = groupOf.get(jobA.id);
    let groupB = groupOf.get(jobB.id);
    if (groupA === "pinned" || groupB === "pinned")
      return (groupA === "pinned" ? 0 : 1) - (groupB === "pinned" ? 0 : 1);
    if (byGroup) {
      let sortTimeOf = (job) =>
        pendingDelete?.id === job.id && pendingDelete.sortKey !== undefined
          ? pendingDelete.sortKey
          : Date.parse(job.state.updatedAt);
      return (
        pinnedRank(groupA) - pinnedRank(groupB) ||
        groupA.localeCompare(groupB) ||
        sortTimeOf(jobB) - sortTimeOf(jobA)
      );
    }
    if (byState) {
      let bucketDelta = FLEET_BUCKETS.indexOf(groupA) - FLEET_BUCKETS.indexOf(groupB);
      let sortKeyOf = (job) =>
        pendingDelete?.id === job.id && pendingDelete.sortKey !== undefined
          ? pendingDelete.sortKey
          : jobSortKey_2(job.state, groupA);
      return bucketDelta !== 0
        ? bucketDelta
        : sortKeyOf(jobB) - sortKeyOf(jobA) || jobB.state.createdAt.localeCompare(jobA.state.createdAt);
    }
    if (groupA === launcherGroup && groupB !== launcherGroup) return -1;
    if (groupB === launcherGroup && groupA !== launcherGroup) return 1;
    return groupA.localeCompare(groupB);
  });
  let doneFoldAt = 1 / 0;
  let doneCap = DONE_CAP_MIN;
  let compactHeader = false;
  let jobSessionIds = new Set();
  for (let job of [...(jobs ?? []), ...pendings, ...(peersEnabled ? adoptedPeers : [])]) {
    if (job.state.sessionId) jobSessionIds.add(job.state.sessionId);
    if (job.state.resumeSessionId) jobSessionIds.add(job.state.resumeSessionId);
  }
  let earlierVisible =
    Boolean(template || pr || url || state || group) ||
    output !== undefined ||
    earlierEntries.length === 0 ||
    activeTab === "remote" ||
    Boolean(cwdFilter)
      ? []
      : earlierEntries.filter(
          (earlierEntry) =>
            !jobSessionIds.has(earlierEntry.sessionId) &&
            (!text || earlierEntry.title.toLowerCase().includes(text)) &&
            (!nameFilter || earlierEntry.title.toLowerCase().includes(nameFilter)),
        );
  if (byState && !simpleView) {
    let done = jobs_2.filter((job) => groupOf.get(job.id) === "done");
    let size = new Set(jobs_2.map((job) => groupOf.get(job.id))).size;
    let reduced = jobs_2.reduce((acc, job) => {
      let group = groupOf.get(job.id);
      return group !== "done" && !activeCollapsed.has(collapseKeyOf(group)) ? acc + 1 : acc;
    }, 0);
    let doneCap_2 = computeDoneCap(termRows, reduced + Math.max(0, size * 2 - 1));
    doneCap = doneCap_2.doneCap;
    compactHeader = doneCap_2.compactHeader;
    if (!capExpanded.has("done"))
      doneFoldAt = doneFoldIndex({
        done,
        earlier: earlierVisible,
        doneCap,
        initialJobId,
        linkMatchId,
      });
  } else if (!simpleView && activeTab !== "remote" && earlierVisible.length > 0) {
    let size = new Set(jobs_2.map((job) => groupOf.get(job.id))).size;
    let doneCap_2 = computeDoneCap(termRows, jobs_2.length + Math.max(0, size * 2 - 1));
    doneCap = doneCap_2.doneCap;
    compactHeader = doneCap_2.compactHeader;
    if (!capExpanded.has(EARLIER))
      doneFoldAt = earlierVisible.length >= doneCap + DONE_CAP_SLACK ? doneCap : 1 / 0;
  }
  let bandCounts = {
    blocked: count(scopedJobs, (job) => jobTempo(job.state, liveStatus(job)) === "blocked"),
    active: count(scopedJobs, (job) => jobTempo(job.state, liveStatus(job)) === "active"),
    completed: count(scopedJobs, (job) => jobTempo(job.state, liveStatus(job)) === "completed"),
  };
  let all = jobs_2.every((job) => job.id === initialJobId);
  let isOnboarding = !simpleView && byState && !query && all && !jobs_2[0]?.state.pinned;
  let simpleBuilt = simpleView
    ? bucketJobs(withPendings, {
        statusFor: liveStatus,
        now,
        fallbackOrigin: scopedFallbackOrigin,
        showFinishedEarlier: capExpanded.has(SIMPLE_FINISHED),
        terminalRows: termRows,
      })
    : null;
  if (simpleBuilt !== null) {
    let simpleRowCount = 1 + simpleBuilt.needsCount + simpleBuilt.liveCount;
    compactHeader = computeDoneCap(termRows, simpleRowCount).compactHeader;
  }
  let built =
    simpleBuilt ??
    layoutRows(jobs_2, groupOf, {
      byState,
      byGroup,
      onRemoteTab: activeTab === "remote",
      launcherGroup,
      scopedFallbackOrigin,
      doneFoldAt,
      emptyBucketHint: isOnboarding,
      earlier: earlierVisible,
    });
  let rows = built.rows;
  let groupCounts = new Map();
  for (let job of jobs_2) {
    let group = groupOf.get(job.id);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }
  if (earlierVisible.length > 0 && activeTab !== "remote") {
    let earlierGroupName = byState ? "done" : EARLIER;
    groupCounts.set(earlierGroupName, (groupCounts.get(earlierGroupName) ?? 0) + earlierVisible.length);
  }
  if (activeCollapsed.size > 0)
    rows = rows.filter((row) => row.kind === "header" || !activeCollapsed.has(collapseKeyOf(row.group)));
  let homeIdx = simpleView
    ? 0
    : isQueryOnly
      ? bestSearchMatchIndex(rows, nameFilter)
      : initialFocusIndex(rows, launcherCwd);
  let hasMultipleOrigins =
    new Set(rows.filter((row) => row.kind === "header").map((row) => row.group)).size > 1;
  let focusedRow = rows[focusedIdx];
  let job = focusedRow?.kind === "job" ? focusedRow.job : undefined;
  let focusOrigin =
    activeTab === "remote" || (focusedRow?.kind === "job" && focusedRow.job.state.backend !== "daemon")
      ? scopedFallbackOrigin
      : (focusedRow?.origin ?? scopedFallbackOrigin);
  let altOpenOrigin = activeTab === "remote" ? (focusedRow?.origin ?? focusOrigin) : focusOrigin;
  let focusedGroup = focusedRow?.group ?? launcherGroup;
  let dispatchOrigin = byState && !simpleView ? scopedFallbackOrigin : focusOrigin;
  let focusIsFromHover = focusedIdx === hoverFocusIdx;
  let cols = computeFleetColumnWidths(
    jobs_2,
    (job) => (loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.nextAt : null),
    initialJobId,
    columns,
    ageNow,
  );
  let dispatchTargetGroup = (() => {
    if (!hasContent || linkMatchId) return null;
    if (byState) return "working";
    if (dispatchRepoCwd)
      return (
        rows.find((row) => row.kind === "header" && row.origin === dispatchRepoCwd && row.group !== "pinned")
          ?.group ?? null
      );
    let currentRow = rows[focusedIdx];
    if (currentRow?.kind === "job") {
      if (currentRow.group === "pinned")
        return (
          rows.find(
            (row) => row.kind === "header" && row.origin === currentRow.origin && row.group !== "pinned",
          )?.group ?? null
        );
      return currentRow.group;
    }
    if (currentRow?.kind === "header") return currentRow.group === "pinned" ? null : currentRow.group;
    return null;
  })();
  let enterIsNoop = !hasIntent && dispatch?.cwd !== undefined;
  let focusedIsPending = !!job && pendings.some((pending) => pending.id === job.id);
  let focusedIsOrigin = !!job && job.id === initialJobId;
  let runningCount = count(simpleWantsRemote ? [...localJobs, ...remoteJobs] : localJobs, (job) => {
    let bucket = jobBucket(job, prStatuses, liveStatus(job));
    return bucket === "blocked" || bucket === "working";
  });
  let enterLabel = hasIntent
    ? "create"
    : focusedIsOrigin
      ? "return"
      : job && isFailedSettledJob(job.state) && !heldInTerminal(job)
        ? "resume"
        : "open";
  let headerJobs =
    focusedRow?.kind === "header" && focusedRow.group === followOrigin
      ? jobs_2.filter((job) => groupOf.get(job.id) === focusedRow.group)
      : [];
  return {
    byState,
    byGroup,
    hasDispatch: hasIntent,
    hasComposedDispatch: hasContent,
    isBashDispatch,
    enterIsNoop,
    queryIsFilter: isQueryOnly,
    hasNameFilter: nameFilter !== undefined,
    loopJobIds,
    localJobs,
    scopedLocalJobs,
    scopedJobs,
    filtered: jobs_2,
    groupOf,
    jobSessionIds,
    earlierVisible,
    doneCap,
    compactHeader,
    simpleBuilt,
    built,
    collapsed: activeCollapsed,
    rows,
    homeIdx,
    hasMultipleOrigins,
    groupCounts,
    bandCounts,
    onlyOrigin: all,
    isOnboarding,
    focusedRow,
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
    focusedIsOrigin,
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
