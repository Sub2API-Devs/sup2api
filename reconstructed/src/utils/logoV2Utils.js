/**
 * utils/logoV2Utils.ts
 *
 * 欢迎框（Logo v2）显示数据与路径按宽度截断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/logoV2Utils.ts
 * pieces: chunk-8jypjjdf.js (4), chunk-t3sg9e26.js (1)
 * attribution: fingerprint 4, layout 1
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToWidth, truncateToWidthNoEllipsis, truncate } from "./format.js";
import { env } from "./env.js";
import { getBuildRefSuffix } from "../cli/earlyArgs.js";
import { getDirectConnectServerUrl, getIsRemoteMode, getOriginalCwd } from "../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { TENGU_VIOLIN_MAPLE } from "./permissions/sensitivePaths.js";
import { tildify } from "./path.js";
import { getDisplayPath } from "./file.js";
import { getCwd } from "./cwd.js";
import { getAPIProvider, THIRD_PARTY_PROVIDER_LABELS } from "./model/providers.js";
import { isClaudeAISubscriber, getSubscriptionName } from "./auth.js";
import { getInitialSettings_2 } from "./settings/settings.js";

//@ chunk-8jypjjdf.js:18653-18713 fingerprint = getLayoutMode (1)
function getLayoutMode(columns) {
  if (columns >= 70) return "horizontal";
  return "compact";
}
//@ chunk-8jypjjdf.js:18713-19333 layout
/**
 * 按终端显示宽度截断路径：保留首段与末段，中间用 … 代替。
 */
function truncatePathForDisplay(path, maxLength) {
  if (bunStringWidth(path) <= maxLength) return path;
  let separator = "/";
  let ellipsis = "\u2026";
  let ellipsisWidth = 1;
  let separatorWidth = 1;
  let parts = path.split(separator);
  let first = parts[0] || "";
  let last = parts.at(-1) || "";
  let firstWidth = bunStringWidth(first);
  let lastWidth = bunStringWidth(last);
  if (parts.length === 1) return truncateToWidth(path, maxLength);
  if (first === "" && ellipsisWidth + separatorWidth + lastWidth >= maxLength)
    return `${separator}${truncateToWidth(last, Math.max(1, maxLength - separatorWidth))}`;
  if (first !== "" && ellipsisWidth * 2 + separatorWidth + lastWidth >= maxLength)
    return `${ellipsis}${separator}${truncateToWidth(last, Math.max(1, maxLength - ellipsisWidth - separatorWidth))}`;
  if (parts.length === 2) {
    let availableForFirst = maxLength - ellipsisWidth - separatorWidth - lastWidth;
    return `${truncateToWidthNoEllipsis(first, availableForFirst)}${ellipsis}${separator}${last}`;
  }
  let available = maxLength - firstWidth - lastWidth - ellipsisWidth - 2 * separatorWidth;
  if (available <= 0) {
    let availableForFirst = Math.max(0, maxLength - lastWidth - ellipsisWidth - 2 * separatorWidth);
    return `${truncateToWidthNoEllipsis(first, availableForFirst)}${separator}${ellipsis}${separator}${last}`;
  }
  let middleParts = [];
  for (let i = parts.length - 2; i > 0; i--) {
    let part = parts[i];
    if (part && bunStringWidth(part) + separatorWidth <= available) {
      middleParts.unshift(part);
      available -= bunStringWidth(part) + separatorWidth;
    } else break;
  }
  if (middleParts.length === 0) return `${first}${separator}${ellipsis}${separator}${last}`;
  return `${first}${separator}${ellipsis}${separator}${middleParts.join(separator)}${separator}${last}`;
}
//@ chunk-8jypjjdf.js:19333-20174 fingerprint = getLogoDisplayData (0.471)
/**
 * 欢迎框（Logo v2）显示数据：版本、cwd、账号/计费信息等。
 */
function getLogoDisplayData() {
  let version =
    env.DEMO_VERSION ??
    `${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    }${getBuildRefSuffix()}`;
  let serverUrl = getDirectConnectServerUrl();
  let displayPath = env.DEMO_VERSION
    ? "/code/claude"
    : getIsRemoteMode() &&
        (getFeatureValue_SESSION_PINNED("tengu_violin_wood", false) ||
          getFeatureValue_SESSION_PINNED(TENGU_VIOLIN_MAPLE, false))
      ? tildify(getOriginalCwd())
      : getDisplayPath(getCwd());
  let cwd = env.CLAUDE_CODE_HIDE_CWD
    ? ""
    : serverUrl
      ? `${displayPath} in ${serverUrl.replace(/^https?:\/\//, "")}`
      : displayPath;
  let apiProvider = getAPIProvider();
  let billingType =
    apiProvider !== "firstParty"
      ? THIRD_PARTY_PROVIDER_LABELS[apiProvider]
      : isClaudeAISubscriber()
        ? getSubscriptionName()
        : "API Usage Billing";
  let agentName = getInitialSettings_2().agent;
  return {
    version,
    cwd,
    billingType,
    agentName,
  };
}
//@ chunk-8jypjjdf.js:20174-20372 fingerprint = formatModelAndBilling (0.846)
function formatModelAndBilling(modelName, billingType, availableWidth, modelDisplay) {
  if (bunStringWidth(modelDisplay) + 3 + bunStringWidth(billingType) > availableWidth)
    return {
      shouldSplit: true,
      truncatedModel: truncate(modelName, availableWidth),
      truncatedBilling: truncate(billingType, availableWidth),
    };
  return {
    shouldSplit: false,
    truncatedModel: truncate(modelName, Math.max(availableWidth - bunStringWidth(billingType) - 3, 10)),
    truncatedBilling: billingType,
  };
}
//@ chunk-t3sg9e26.js:1126-1313 fingerprint = truncatePath (0.711)
function truncatePath(env, keyName, includeCaseInsensitive) {
  let middleParts = [];
  for (let [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (key === keyName)
      middleParts.unshift({
        name: key,
        value,
      });
    else if (includeCaseInsensitive && key.toUpperCase() === keyName)
      middleParts.push({
        name: key,
        value,
      });
  }
  return middleParts;
}
export { getLogoDisplayData, truncatePathForDisplay, formatModelAndBilling, getLayoutMode, truncatePath };
