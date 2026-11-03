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
/**
 * 按终端显示宽度截断路径：保留首段与末段，中间用 … 代替。
 */
//@ chunk-8jypjjdf.js:18713-19333 layout
function truncatePathForDisplay(o, a) {
  if (bunStringWidth(o) <= a) return o;
  let t = "/",
    l = "\u2026",
    c = 1,
    m = 1,
    parts = o.split(t),
    d = parts[0] || "",
    f = parts.at(-1) || "",
    h = bunStringWidth(d),
    u = bunStringWidth(f);
  if (parts.length === 1) return truncateToWidth(o, a);
  if (d === "" && c + m + u >= a) return `${t}${truncateToWidth(f, Math.max(1, a - m))}`;
  if (d !== "" && c * 2 + m + u >= a) return `${l}${t}${truncateToWidth(f, Math.max(1, a - c - m))}`;
  if (parts.length === 2) {
    let g = a - c - m - u;
    return `${truncateToWidthNoEllipsis(d, g)}${l}${t}${f}`;
  }
  let b = a - h - u - c - 2 * m;
  if (b <= 0) {
    let max = Math.max(0, a - u - c - 2 * m);
    return `${truncateToWidthNoEllipsis(d, max)}${t}${l}${t}${f}`;
  }
  let C = [];
  for (let g = parts.length - 2; g > 0; g--) {
    let W = parts[g];
    if (W && bunStringWidth(W) + m <= b) (C.unshift(W), (b -= bunStringWidth(W) + m));
    else break;
  }
  if (C.length === 0) return `${d}${t}${l}${t}${f}`;
  return `${d}${t}${l}${t}${C.join(t)}${t}${f}`;
}
/**
 * 欢迎框（Logo v2）显示数据：版本、cwd、账号/计费信息等。
 */
//@ chunk-8jypjjdf.js:19333-20174 fingerprint = getLogoDisplayData (0.471)
function getLogoDisplayData() {
  let version =
      env.DEMO_VERSION ??
      `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}${getBuildRefSuffix()}`,
    serverUrl = getDirectConnectServerUrl(),
    t = env.DEMO_VERSION
      ? "/code/claude"
      : getIsRemoteMode() &&
          (getFeatureValue_SESSION_PINNED("tengu_violin_wood", !1) ||
            getFeatureValue_SESSION_PINNED(TENGU_VIOLIN_MAPLE, !1))
        ? tildify(getOriginalCwd())
        : getDisplayPath(getCwd()),
    l = env.CLAUDE_CODE_HIDE_CWD ? "" : serverUrl ? `${t} in ${serverUrl.replace(/^https?:\/\//, "")}` : t,
    c = getAPIProvider(),
    m =
      c !== "firstParty"
        ? THIRD_PARTY_PROVIDER_LABELS[c]
        : isClaudeAISubscriber()
          ? getSubscriptionName()
          : "API Usage Billing",
    agentName = getInitialSettings_2().agent;
  return { version: version, cwd: l, billingType: m, agentName: agentName };
}
//@ chunk-8jypjjdf.js:20174-20372 fingerprint = formatModelAndBilling (0.846)
function formatModelAndBilling(o, a, t, l) {
  if (bunStringWidth(l) + 3 + bunStringWidth(a) > t)
    return { shouldSplit: !0, truncatedModel: truncate(o, t), truncatedBilling: truncate(a, t) };
  return {
    shouldSplit: !1,
    truncatedModel: truncate(o, Math.max(t - bunStringWidth(a) - 3, 10)),
    truncatedBilling: a,
  };
}
//@ chunk-t3sg9e26.js:1126-1313 fingerprint = truncatePath (0.711)
function truncatePath(e, n, t) {
  let middleParts = [];
  for (let [s, o] of Object.entries(e)) {
    if (o === void 0) continue;
    if (s === n) middleParts.unshift({ name: s, value: o });
    else if (t && s.toUpperCase() === n) middleParts.push({ name: s, value: o });
  }
  return middleParts;
}

export { getLogoDisplayData, truncatePathForDisplay, formatModelAndBilling, getLayoutMode, truncatePath };
