/**
 * components/LogoV2/UpdateSummary.tsx
 *
 * 2.1.316 新增：启动时汇总版本更新说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (14)
 * attribution: placement 14
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
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
import { env } from "../../utils/env.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SlashIndentBox } from "./NoticeIndent.js";
import { Text, Link } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:61185-61189 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:61185", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:64870-65135 placement
var BUGFIX_PATTERN =
  /^(fix(ed|es)?|resolve[ds]?|correct(ed|s)?|prevent(ed|s)?|(\S+\s+){0,2}no longer|revert(ed|s)?|bug fix(es)?)\b/;
var FEATURE_PREFIX_RE =
  /^(add(ed|s)?|new|introduce[ds]?|support(ed|s)?|launch(ed|es)?|ship(ped|s)?|enable[ds]?)\b/;
var BRACKET_PREFIX_RE = /^\[[^\]]+\]\s*/;
var NAMESPACE_PREFIX_RE = /^[a-z0-9 /._`-]{1,40}:\s*/;
//@ chunk-hnxhr3bs.js:65135-65249 placement
function classifyReleaseNote(note) {
  if (BUGFIX_PATTERN.test(note) || note.includes("regression")) return "bugFix";
  if (FEATURE_PREFIX_RE.test(note)) return "feature";
  return "other";
}
//@ chunk-hnxhr3bs.js:65249-65307 placement
var BUGFIX_ROLLUP_RE = /^(various )?bug ?fixes\b.*\bimprovements$/;
var CLASSIFY_MAX_CHARS = 500;
//@ chunk-hnxhr3bs.js:65307-65477 placement
function classifyReleaseNoteEntry(note) {
  let note_2 = note.slice(0, CLASSIFY_MAX_CHARS).trim().toLowerCase();
  if (BUGFIX_ROLLUP_RE.test(note_2)) return "bugFixRollup";
  let kind = classifyReleaseNote(note_2);
  if (kind !== "other") return kind;
  return classifyReleaseNote(note_2.replace(BRACKET_PREFIX_RE, "").replace(NAMESPACE_PREFIX_RE, ""));
}
//@ chunk-hnxhr3bs.js:65477-65938 placement
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
//@ chunk-hnxhr3bs.js:65938-66083 placement (2.1.88 match: formatListWithAnd, 0.811)
function formatListWithAnd(parts) {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}
//@ chunk-hnxhr3bs.js:66083-66209 placement
function releaseNoteStrings(entries) {
  if (!Array.isArray(entries)) return [];
  let out = [];
  for (let note of entries) if (typeof note === "string" && note.trim() !== "") out.push(note);
  return out;
}
//@ chunk-hnxhr3bs.js:66209-67007 placement
/**
 * 启动时汇总自上次看过以来的版本更新说明（feature/bugFix 计数），用于"Updated to latest"提示。
 */
function computeStartupUpdateSummary(
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
//@ chunk-hnxhr3bs.js:67007-67173 placement
function getStartupUpdateSummary() {
  if (uiSignals.startupUpdateSummary === undefined) {
    let startupUpdateSummary = computeStartupUpdateSummary();
    uiSignals.startupUpdateSummary = startupUpdateSummary;
    if (startupUpdateSummary !== null && !getForcedFirstLaunch()) logFeatureOk("startup_update_summary");
  }
  return uiSignals.startupUpdateSummary;
}
//@ chunk-hnxhr3bs.js:67173-67754 placement
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
//@ chunk-hnxhr3bs.js:67754-68602 placement
/**
 * 启动时显示精简 Logo 与"本次更新摘要 + changelog 链接"；后台/队友会话或非首屏时不显示，并在显示后标记已看过发行说明。
 */
function StartupUpdateSummary(props) {
  let $ = useMemoCache(18);
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
  if ($[12] !== hide || $[13] !== summary) {
    summaryBox =
      summary &&
      jsxProd_default_2(SlashIndentBox, {
        children: [
          jsxProd_default(Text, {
            bold: !hide,
            dimColor: hide,
            italic: hide,
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
    $[12] = hide;
    $[13] = summary;
    $[14] = summaryBox;
  } else summaryBox = $[14];
  let content;
  if ($[15] !== logo || $[16] !== summaryBox) {
    content = jsxProd_default_2(Fragment, {
      children: [logo, summaryBox, false],
    });
    $[15] = logo;
    $[16] = summaryBox;
    $[17] = content;
  } else content = $[17];
  return content;
}
//@ chunk-hnxhr3bs.js:68602-68606 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:68602", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:68606-68610 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:68606", () => {
  init_react_production();
});
export { StartupUpdateSummary };
