/**
 * utils/plugins/officialMarketplaceStartupCheck.ts
 *
 * 启动时自动安装官方市场（GCS 优先、git 回退、指数退避重试、策略与开关检查）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/officialMarketplaceStartupCheck.ts
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 5
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { env } from "../env.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  loadKnownMarketplacesWithDeclared,
  updateKnownMarketplaces,
  seedDirFor,
  addMarketplaceSource,
} from "./marketplaceManager.js";
import { CLAUDE_PLUGINS_OFFICIAL, Epe } from "./officialMarketplace.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { getResolvedMarketplacesCacheDir } from "./marketplaceNames.js";
import { fetchOfficialMarketplaceFromGcs } from "./officialMarketplaceGcs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isGitUsable, wqs } from "./pluginManifestRead.js";

//@ chunk-18hwfzwa.js:1765741-1765818 fingerprint = isOfficialMarketplaceAutoInstallDisabled (1)
function isOfficialMarketplaceAutoInstallDisabled() {
  return env.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL;
}
//@ chunk-18hwfzwa.js:1765818-1765913 fingerprint = RETRY_CONFIG (1)
var RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY_MS: 3600000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 604800000,
};
//@ chunk-18hwfzwa.js:1765913-1766027 fingerprint = calculateNextRetryDelay (1)
function calculateNextRetryDelay(retryCount) {
  let delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}
//@ chunk-18hwfzwa.js:1766027-1766468 fingerprint = shouldRetryInstallation (1)
function shouldRetryInstallation(config) {
  if (!config.officialMarketplaceAutoInstallAttempted) return !0;
  if (config.officialMarketplaceAutoInstalled) return !1;
  let failReason = config.officialMarketplaceAutoInstallFailReason,
    retryCount = config.officialMarketplaceAutoInstallRetryCount || 0,
    nextRetryTime = config.officialMarketplaceAutoInstallNextRetryTime,
    now = Date.now();
  if (retryCount >= RETRY_CONFIG.MAX_ATTEMPTS) return !1;
  if (failReason === "policy_blocked") return !1;
  if (nextRetryTime && now < nextRetryTime) return !1;
  return (
    failReason === "unknown" ||
    failReason === "git_unavailable" ||
    failReason === "gcs_unavailable" ||
    failReason === void 0
  );
}
/**
 * 启动时自动安装官方市场 claude-plugins-official：检查是否已装/被禁用（CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL）/策略阻止，优先 GCS 镜像，失败回退 git，失败按指数退避重试，结果记全局配置与 tengu_official_marketplace_auto_install。
 */
//@ chunk-18hwfzwa.js:1766468-1771932 fingerprint = checkAndInstallOfficialMarketplace (0.921)
async function checkAndInstallOfficialMarketplace(h) {
  let config = getGlobalConfig();
  if (!shouldRetryInstallation(config)) {
    let L = config.officialMarketplaceAutoInstalled
      ? "already_installed"
      : (config.officialMarketplaceAutoInstallFailReason ?? "already_attempted");
    return (
      logForDebugging(`Official marketplace auto-install skipped: ${L}`),
      { installed: !1, skipped: !0, reason: L }
    );
  }
  let D = !1;
  try {
    if (isOfficialMarketplaceAutoInstallDisabled())
      return (
        logForDebugging("Official marketplace auto-install disabled via env var, skipping"),
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !1,
            officialMarketplaceAutoInstallFailReason: "policy_blocked",
          }),
          h,
        ),
        logEvent("tengu_official_marketplace_auto_install", {
          installed: !1,
          skipped: !0,
          policy_blocked: !0,
        }),
        { installed: !1, skipped: !0, reason: "policy_blocked" }
      );
    if ((await loadKnownMarketplacesWithDeclared(h))[CLAUDE_PLUGINS_OFFICIAL])
      return (
        logForDebugging(`Official marketplace '${CLAUDE_PLUGINS_OFFICIAL}' already installed, skipping`),
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !0,
            officialMarketplaceAutoInstallFailReason: void 0,
            officialMarketplaceAutoInstallRetryCount: void 0,
            officialMarketplaceAutoInstallLastAttemptTime: void 0,
            officialMarketplaceAutoInstallNextRetryTime: void 0,
          }),
          h,
        ),
        { installed: !1, skipped: !0, reason: "already_installed" }
      );
    if (!isSourceAllowedByPolicy(Epe))
      return (
        logForDebugging("Official marketplace blocked by enterprise policy, skipping"),
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !1,
            officialMarketplaceAutoInstallFailReason: "policy_blocked",
          }),
          h,
        ),
        logEvent("tengu_official_marketplace_auto_install", {
          installed: !1,
          skipped: !0,
          policy_blocked: !0,
        }),
        { installed: !1, skipped: !0, reason: "policy_blocked" }
      );
    let cacheDir = getResolvedMarketplacesCacheDir(),
      installLocation = join_11(cacheDir, CLAUDE_PLUGINS_OFFICIAL);
    if ((await fetchOfficialMarketplaceFromGcs(installLocation, cacheDir, h)) !== null)
      return (
        logFeatureOk("plugin_official_marketplace_fetch"),
        await updateKnownMarketplaces((We) => {
          let ze = We[CLAUDE_PLUGINS_OFFICIAL];
          if (ze && seedDirFor(ze.installLocation)) return null;
          return (
            (We[CLAUDE_PLUGINS_OFFICIAL] = {
              source: Epe,
              installLocation: installLocation,
              lastUpdated: new Date().toISOString(),
            }),
            We
          );
        }, h),
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !0,
            officialMarketplaceAutoInstallFailReason: void 0,
            officialMarketplaceAutoInstallRetryCount: void 0,
            officialMarketplaceAutoInstallLastAttemptTime: void 0,
            officialMarketplaceAutoInstallNextRetryTime: void 0,
          }),
          h,
        ),
        logEvent("tengu_official_marketplace_auto_install", { installed: !0, skipped: !1, via_gcs: !0 }),
        { installed: !0, skipped: !1 }
      );
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", !0)) {
      (logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled"),
        logForDebugging(
          "Official marketplace GCS failed; git fallback disabled by flag \u2014 skipping install",
        ));
      let We = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1,
        now = Date.now(),
        Xe = now + calculateNextRetryDelay(We);
      return (
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !1,
            officialMarketplaceAutoInstallFailReason: "gcs_unavailable",
            officialMarketplaceAutoInstallRetryCount: We,
            officialMarketplaceAutoInstallLastAttemptTime: now,
            officialMarketplaceAutoInstallNextRetryTime: Xe,
          }),
          h,
        ),
        logEvent("tengu_official_marketplace_auto_install", {
          installed: !1,
          skipped: !0,
          gcs_unavailable: !0,
          retry_count: We,
        }),
        { installed: !1, skipped: !0, reason: "gcs_unavailable" }
      );
    }
    if (((D = !0), !(await isGitUsable()))) {
      (logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_git_unavailable"),
        logForDebugging("Git not available, skipping official marketplace auto-install"));
      let We = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1,
        now = Date.now(),
        nextRetryDelay = calculateNextRetryDelay(We),
        rt = now + nextRetryDelay;
      return (
        await saveGlobalConfig(
          (current) => ({
            ...current,
            officialMarketplaceAutoInstallAttempted: !0,
            officialMarketplaceAutoInstalled: !1,
            officialMarketplaceAutoInstallFailReason: "git_unavailable",
            officialMarketplaceAutoInstallRetryCount: We,
            officialMarketplaceAutoInstallLastAttemptTime: now,
            officialMarketplaceAutoInstallNextRetryTime: rt,
          }),
          h,
        ),
        logEvent("tengu_official_marketplace_auto_install", {
          installed: !1,
          skipped: !0,
          git_unavailable: !0,
          retry_count: We,
        }),
        { installed: !1, skipped: !0, reason: "git_unavailable" }
      );
    }
    (logForDebugging("Attempting to auto-install official marketplace"),
      await addMarketplaceSource(Epe, void 0, h),
      logForDebugging("Successfully auto-installed official marketplace"));
    let He = config.officialMarketplaceAutoInstallRetryCount || 0;
    return (
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: !0,
          officialMarketplaceAutoInstalled: !0,
          officialMarketplaceAutoInstallFailReason: void 0,
          officialMarketplaceAutoInstallRetryCount: void 0,
          officialMarketplaceAutoInstallLastAttemptTime: void 0,
          officialMarketplaceAutoInstallNextRetryTime: void 0,
        }),
        h,
      ),
      logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback"),
      logEvent("tengu_official_marketplace_auto_install", { installed: !0, skipped: !1, retry_count: He }),
      { installed: !0, skipped: !1 }
    );
  } catch (error) {
    let ee = error instanceof Error ? error.message : String(error);
    if (ee.includes("xcrun: error:")) {
      if ((wqs(), D)) logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_git_unavailable");
      return (
        logForDebugging(
          "Official marketplace auto-install: git is a non-functional macOS xcrun shim, treating as git_unavailable",
        ),
        logEvent("tengu_official_marketplace_auto_install", {
          installed: !1,
          skipped: !0,
          git_unavailable: !0,
          macos_xcrun_shim: !0,
        }),
        { installed: !1, skipped: !0, reason: "git_unavailable" }
      );
    }
    if (D) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
    logForDebugging(`Failed to auto-install official marketplace: ${ee}`, { level: "error" });
    let ke = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1,
      now = Date.now(),
      nextRetryDelay = calculateNextRetryDelay(ke),
      He = now + nextRetryDelay;
    return (
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: !0,
          officialMarketplaceAutoInstalled: !1,
          officialMarketplaceAutoInstallFailReason: "unknown",
          officialMarketplaceAutoInstallRetryCount: ke,
          officialMarketplaceAutoInstallLastAttemptTime: now,
          officialMarketplaceAutoInstallNextRetryTime: He,
        }),
        h,
      ),
      logEvent("tengu_official_marketplace_auto_install", {
        installed: !1,
        skipped: !0,
        failed: !0,
        retry_count: ke,
      }),
      { installed: !1, skipped: !0, reason: "unknown" }
    );
  }
}

export { checkAndInstallOfficialMarketplace };
