/**
 * components/LogoV2/UpdateSummary.tsx
 *
 * 2.1.316 新增：启动时汇总版本更新说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (14)
 * attribution: placement 14
 */
import { plural } from "../../utils/stringUtils.js";
import { getForcedFirstLaunch, isNewerClawdEntranceVersion } from "./AnimatedClawd.js";
import {
  BUNDLED_CHANGELOG,
  latestReleaseNotes,
  formatReleaseNotes,
  HTTPS_CODE_CLAUDE_COM_DOCS_EN_CHANGELOG,
  CHANGELOG_URL,
} from "../../utils/releaseNotes.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { isSemverString } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { uiSignals } from "../../state/uiSignals.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useNoticeImpressionEnabled, CondensedLogo } from "./CondensedLogo.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { y, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { env } from "../../utils/env.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:65318-65583 placement
var BUGFIX_PATTERN =
  /^(fix(ed|es)?|resolve[ds]?|correct(ed|s)?|prevent(ed|s)?|(\S+\s+){0,2}no longer|revert(ed|s)?|bug fix(es)?)\b/;
var FEATURE_PREFIX_RE =
  /^(add(ed|s)?|new|introduce[ds]?|support(ed|s)?|launch(ed|es)?|ship(ped|s)?|enable[ds]?)\b/;
var BRACKET_PREFIX_RE = /^\[[^\]]+\]\s*/;
var NAMESPACE_PREFIX_RE = /^[a-z0-9 /._`-]{1,40}:\s*/;
//@ chunk-ag5x7vhf.js:65583-65697 placement
function classifyReleaseNote(m) {
  if (BUGFIX_PATTERN.test(m) || m.includes("regression")) return "bugFix";
  if (FEATURE_PREFIX_RE.test(m)) return "feature";
  return "other";
}
//@ chunk-ag5x7vhf.js:65697-65755 placement
var BUGFIX_ROLLUP_RE = /^(various )?bug ?fixes\b.*\bimprovements$/;
var CLASSIFY_MAX_CHARS = 500;
//@ chunk-ag5x7vhf.js:65755-65925 placement
function classifyReleaseNoteEntry(m) {
  let lower = m.slice(0, CLASSIFY_MAX_CHARS).trim().toLowerCase();
  if (BUGFIX_ROLLUP_RE.test(lower)) return "bugFixRollup";
  let x = classifyReleaseNote(lower);
  if (x !== "other") return x;
  return classifyReleaseNote(lower.replace(BRACKET_PREFIX_RE, "").replace(NAMESPACE_PREFIX_RE, ""));
}
//@ chunk-ag5x7vhf.js:65925-66386 placement
function summarizeReleaseNotes({ entries }) {
  let h = releaseNoteStrings(entries);
  if (h.length === 0) return null;
  let x = 0;
  let T = 0;
  let k = 0;
  for (let I of h)
    switch (classifyReleaseNoteEntry(I)) {
      case "feature":
        x++;
        break;
      case "bugFix":
        T++;
        break;
      case "other":
        k++;
        break;
      case "bugFixRollup":
        break;
    }
  let _ = [];
  if (x > 0) _.push(`${x} ${plural(x, "feature")}`);
  if (T > 0) _.push(`${T} ${plural(T, "bugfix", "bugfixes")}`);
  if (k > 0) {
    let I = _.length > 0 ? "other change" : "change";
    _.push(`${k} ${plural(k, I)}`);
  }
  if (_.length === 0) return "Updated to latest.";
  return `Updated to latest. Got ${formatListWithAnd(_)}.`;
}
//@ chunk-ag5x7vhf.js:66386-66531 placement = formatListWithAnd (0.812)
function formatListWithAnd(m) {
  if (m.length <= 1) return m.join("");
  if (m.length === 2) return `${m[0]} and ${m[1]}`;
  return `${m.slice(0, -1).join(", ")}, and ${m.at(-1)}`;
}
//@ chunk-ag5x7vhf.js:66531-66657 placement
function releaseNoteStrings(entries) {
  if (!Array.isArray(entries)) return [];
  let h = [];
  for (let x of entries) if (typeof x === "string" && x.trim() !== "") h.push(x);
  return h;
}
//@ chunk-ag5x7vhf.js:66657-67455 placement
/**
 * 启动时汇总自上次看过以来的版本更新说明（feature/bugFix 计数），用于"Updated to latest"提示。
 */
function computeStartupUpdateSummary(
  m = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  try {
    let forcedFirstLaunch = getForcedFirstLaunch();
    if (forcedFirstLaunch) {
      let T = BUNDLED_CHANGELOG();
      return summarizeReleaseNotes({
        entries:
          forcedFirstLaunch.pretendLastSeen === undefined
            ? latestReleaseNotes(T)
            : formatReleaseNotes(T, forcedFirstLaunch.pretendLastSeen, m),
      });
    }
    let lastReleaseNotesSeen = getGlobalConfig().lastReleaseNotesSeen;
    if (!isSemverString(lastReleaseNotesSeen) || !isNewerClawdEntranceVersion(lastReleaseNotesSeen, m))
      return null;
    return summarizeReleaseNotes({
      entries: formatReleaseNotes(BUNDLED_CHANGELOG(), lastReleaseNotesSeen, m),
    });
  } catch (error) {
    logForDebugging(`computeUpdateSummary: ${toError(error).message}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-ag5x7vhf.js:67455-67621 placement
function getStartupUpdateSummary() {
  if (uiSignals.startupUpdateSummary === undefined) {
    let startupUpdateSummary = computeStartupUpdateSummary();
    uiSignals.startupUpdateSummary = startupUpdateSummary;
    if (startupUpdateSummary !== null && !getForcedFirstLaunch()) logFeatureOk("startup_update_summary");
  }
  return uiSignals.startupUpdateSummary;
}
//@ chunk-ag5x7vhf.js:67621-68202 placement
function markReleaseNotesSeen(pe) {
  if (!isNewerClawdEntranceVersion(pe.lastReleaseNotesSeen)) {
    return pe;
  }
  return {
    ...pe,
    lastReleaseNotesSeen: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
//@ chunk-ag5x7vhf.js:68202-69046 placement
/**
 * 启动时显示精简 Logo 与"本次更新摘要 + changelog 链接"；后台/队友会话或非首屏时不显示，并在显示后标记已看过发行说明。
 */
function StartupUpdateSummary(props) {
  let I = w(17);
  let { hideLogo } = props;
  let x = hideLogo === undefined ? false : hideLogo;
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let D;
  if (I[0] !== host || I[1] !== noticeImpressionEnabled) {
    D = () =>
      !noticeImpressionEnabled ||
      isSessionRestored(host) ||
      isBgSession() ||
      getTeammateAgentId() !== undefined;
    I[0] = host;
    I[1] = noticeImpressionEnabled;
    I[2] = D;
  } else D = I[2];
  let [A] = y(D);
  let L;
  if (I[3] !== A) {
    L = () => (A || env.DEMO_VERSION ? null : getStartupUpdateSummary());
    I[3] = A;
    I[4] = L;
  } else L = I[4];
  let [V] = y(L);
  let W;
  let z;
  if (I[5] !== A || I[6] !== storageV5) {
    W = () => {
      if (A || !isNewerClawdEntranceVersion(getGlobalConfig().lastReleaseNotesSeen)) {
        return;
      }
      saveGlobalConfig(markReleaseNotesSeen, storageV5);
    };
    z = [A, storageV5];
    I[5] = A;
    I[6] = storageV5;
    I[7] = W;
    I[8] = z;
  } else {
    W = I[7];
    z = I[8];
  }
  P(W, z);
  let K;
  if (I[9] !== x || I[10] !== A) {
    K =
      !x &&
      jsxProd_default(CondensedLogo, {
        oneShotsAllowed: !A,
      });
    I[9] = x;
    I[10] = A;
    I[11] = K;
  } else K = I[11];
  let q;
  if (I[12] !== V) {
    q =
      V &&
      jsxProd_default_2(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: V,
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              jsxProd_default(Link, {
                url: HTTPS_CODE_CLAUDE_COM_DOCS_EN_CHANGELOG,
                children: CHANGELOG_URL,
              }),
              " for details",
            ],
          }),
        ],
      });
    I[12] = V;
    I[13] = q;
  } else q = I[13];
  let Y;
  if (I[14] !== K || I[15] !== q) {
    Y = jsxProd_default_2(Fragment, {
      children: [K, q, false],
    });
    I[14] = K;
    I[15] = q;
    I[16] = Y;
  } else Y = I[16];
  return Y;
}
//@ chunk-ag5x7vhf.js:69046-69050 placement
init_react_production();
//@ chunk-ag5x7vhf.js:69050-69054 placement
init_react_production();
//@ chunk-ag5x7vhf.js:69054-69058 placement
init_react_production();
export { StartupUpdateSummary };
