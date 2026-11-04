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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useNoticeImpressionEnabled, CondensedLogo } from "./CondensedLogo.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { useState, useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { env } from "../../utils/env.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:65318-65583 placement
var BUGFIX_PATTERN =
  /^(fix(ed|es)?|resolve[ds]?|correct(ed|s)?|prevent(ed|s)?|(\S+\s+){0,2}no longer|revert(ed|s)?|bug fix(es)?)\b/;
var FEATURE_PREFIX_RE =
  /^(add(ed|s)?|new|introduce[ds]?|support(ed|s)?|launch(ed|es)?|ship(ped|s)?|enable[ds]?)\b/;
var BRACKET_PREFIX_RE = /^\[[^\]]+\]\s*/;
var NAMESPACE_PREFIX_RE = /^[a-z0-9 /._`-]{1,40}:\s*/;
//@ chunk-ag5x7vhf.js:65583-65697 placement
function classifyReleaseNote(note) {
  if (BUGFIX_PATTERN.test(note) || note.includes("regression")) return "bugFix";
  if (FEATURE_PREFIX_RE.test(note)) return "feature";
  return "other";
}
//@ chunk-ag5x7vhf.js:65697-65755 placement
var BUGFIX_ROLLUP_RE = /^(various )?bug ?fixes\b.*\bimprovements$/;
var CLASSIFY_MAX_CHARS = 500;
//@ chunk-ag5x7vhf.js:65755-65925 placement
function classifyReleaseNoteEntry(note) {
  let note_2 = note.slice(0, CLASSIFY_MAX_CHARS).trim().toLowerCase();
  if (BUGFIX_ROLLUP_RE.test(note_2)) return "bugFixRollup";
  let kind = classifyReleaseNote(note_2);
  if (kind !== "other") return kind;
  return classifyReleaseNote(note_2.replace(BRACKET_PREFIX_RE, "").replace(NAMESPACE_PREFIX_RE, ""));
}
//@ chunk-ag5x7vhf.js:65925-66386 placement
function summarizeReleaseNotes({ entries }) {
  let notes = releaseNoteStrings(entries);
  if (notes.length === 0) return null;
  let featureCount = 0;
  let bugFixCount = 0;
  let otherCount = 0;
  for (let note of notes)
    switch (classifyReleaseNoteEntry(note)) {
      case "feature":
        featureCount++;
        break;
      case "bugFix":
        bugFixCount++;
        break;
      case "other":
        otherCount++;
        break;
      case "bugFixRollup":
        break;
    }
  let parts = [];
  if (featureCount > 0) parts.push(`${featureCount} ${plural(featureCount, "feature")}`);
  if (bugFixCount > 0) parts.push(`${bugFixCount} ${plural(bugFixCount, "bugfix", "bugfixes")}`);
  if (otherCount > 0) {
    let otherNoun = parts.length > 0 ? "other change" : "change";
    parts.push(`${otherCount} ${plural(otherCount, otherNoun)}`);
  }
  if (parts.length === 0) return "Updated to latest.";
  return `Updated to latest. Got ${formatListWithAnd(parts)}.`;
}
//@ chunk-ag5x7vhf.js:66386-66531 placement = formatListWithAnd (0.812)
function formatListWithAnd(parts) {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}
//@ chunk-ag5x7vhf.js:66531-66657 placement
function releaseNoteStrings(entries) {
  if (!Array.isArray(entries)) return [];
  let out = [];
  for (let note of entries) if (typeof note === "string" && note.trim() !== "") out.push(note);
  return out;
}
//@ chunk-ag5x7vhf.js:66657-67455 placement
/**
 * 启动时汇总自上次看过以来的版本更新说明（feature/bugFix 计数），用于"Updated to latest"提示。
 */
function computeStartupUpdateSummary(
  version = {
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
      let changelog = BUNDLED_CHANGELOG();
      return summarizeReleaseNotes({
        entries:
          forcedFirstLaunch.pretendLastSeen === undefined
            ? latestReleaseNotes(changelog)
            : formatReleaseNotes(changelog, forcedFirstLaunch.pretendLastSeen, version),
      });
    }
    let lastReleaseNotesSeen = getGlobalConfig().lastReleaseNotesSeen;
    if (!isSemverString(lastReleaseNotesSeen) || !isNewerClawdEntranceVersion(lastReleaseNotesSeen, version))
      return null;
    return summarizeReleaseNotes({
      entries: formatReleaseNotes(BUNDLED_CHANGELOG(), lastReleaseNotesSeen, version),
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
function markReleaseNotesSeen(config) {
  if (!isNewerClawdEntranceVersion(config.lastReleaseNotesSeen)) {
    return config;
  }
  return {
    ...config,
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
  let $ = useMemoCache(17);
  let { hideLogo } = props;
  let hide = hideLogo === undefined ? false : hideLogo;
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let selectHidden;
  if ($[0] !== host || $[1] !== noticeImpressionEnabled) {
    selectHidden = () =>
      !noticeImpressionEnabled ||
      isSessionRestored(host) ||
      isBgSession() ||
      getTeammateAgentId() !== undefined;
    $[0] = host;
    $[1] = noticeImpressionEnabled;
    $[2] = selectHidden;
  } else selectHidden = $[2];
  let [hidden] = useState(selectHidden);
  let loadSummary;
  if ($[3] !== hidden) {
    loadSummary = () => (hidden || env.DEMO_VERSION ? null : getStartupUpdateSummary());
    $[3] = hidden;
    $[4] = loadSummary;
  } else loadSummary = $[4];
  let [summary] = useState(loadSummary);
  let markSeen;
  let markDeps;
  if ($[5] !== hidden || $[6] !== storageV5) {
    markSeen = () => {
      if (hidden || !isNewerClawdEntranceVersion(getGlobalConfig().lastReleaseNotesSeen)) {
        return;
      }
      saveGlobalConfig(markReleaseNotesSeen, storageV5);
    };
    markDeps = [hidden, storageV5];
    $[5] = hidden;
    $[6] = storageV5;
    $[7] = markSeen;
    $[8] = markDeps;
  } else {
    markSeen = $[7];
    markDeps = $[8];
  }
  useEffect(markSeen, markDeps);
  let logo;
  if ($[9] !== hide || $[10] !== hidden) {
    logo =
      !hide &&
      jsxProd_default(CondensedLogo, {
        oneShotsAllowed: !hidden,
      });
    $[9] = hide;
    $[10] = hidden;
    $[11] = logo;
  } else logo = $[11];
  let summaryBox;
  if ($[12] !== summary) {
    summaryBox =
      summary &&
      jsxProd_default_2(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: summary,
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
    $[12] = summary;
    $[13] = summaryBox;
  } else summaryBox = $[13];
  let content;
  if ($[14] !== logo || $[15] !== summaryBox) {
    content = jsxProd_default_2(Fragment, {
      children: [logo, summaryBox, false],
    });
    $[14] = logo;
    $[15] = summaryBox;
    $[16] = content;
  } else content = $[16];
  return content;
}
//@ chunk-ag5x7vhf.js:69046-69050 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:69046", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:69050-69054 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:69050", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:69054-69058 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:69054", () => {
  init_react_production();
});
export { StartupUpdateSummary };
