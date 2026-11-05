/**
 * utils/plugins/officialMarketplaceStartupCheck.ts
 *
 * 启动时自动安装官方市场（GCS 优先、git 回退、指数退避重试、策略与开关检查）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/officialMarketplaceStartupCheck.ts
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
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
import { CLAUDE_PLUGINS_OFFICIAL, OFFICIAL_MARKETPLACE_SOURCE } from "./officialMarketplace.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { getResolvedMarketplacesCacheDir } from "./marketplaceNames.js";
import { fetchOfficialMarketplaceFromGcs } from "./officialMarketplaceGcs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isGitUsable, markGitUnavailable } from "./pluginManifestRead.js";

//@ chunk-czq1j3j2.js:1813003-1813080 fingerprint (2.1.88 match: isOfficialMarketplaceAutoInstallDisabled, 1)
function isOfficialMarketplaceAutoInstallDisabled() {
  return env.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL;
}
//@ chunk-czq1j3j2.js:1813080-1813175 fingerprint (2.1.88 match: RETRY_CONFIG, 1)
var RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY_MS: 3600000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 604800000,
};
//@ chunk-czq1j3j2.js:1813175-1813289 fingerprint (2.1.88 match: calculateNextRetryDelay, 1)
function calculateNextRetryDelay(retryCount) {
  let delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}
//@ chunk-czq1j3j2.js:1813289-1813730 fingerprint (2.1.88 match: shouldRetryInstallation, 1)
function shouldRetryInstallation(config) {
  if (!config.officialMarketplaceAutoInstallAttempted) return true;
  if (config.officialMarketplaceAutoInstalled) return false;
  let failReason = config.officialMarketplaceAutoInstallFailReason;
  let retryCount = config.officialMarketplaceAutoInstallRetryCount || 0;
  let nextRetryTime = config.officialMarketplaceAutoInstallNextRetryTime;
  let now = Date.now();
  if (retryCount >= RETRY_CONFIG.MAX_ATTEMPTS) return false;
  if (failReason === "policy_blocked") return false;
  if (nextRetryTime && now < nextRetryTime) return false;
  return (
    failReason === "unknown" ||
    failReason === "git_unavailable" ||
    failReason === "gcs_unavailable" ||
    failReason === undefined
  );
}
//@ chunk-czq1j3j2.js:1813730-1819194 fingerprint (2.1.88 match: checkAndInstallOfficialMarketplace, 0.921)
/**
 * 启动时自动安装官方市场 claude-plugins-official：检查是否已装/被禁用（CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL）/策略阻止，优先 GCS 镜像，失败回退 git，失败按指数退避重试，结果记全局配置与 tengu_official_marketplace_auto_install。
 */
async function checkAndInstallOfficialMarketplace(storageV5) {
  let config = getGlobalConfig();
  if (!shouldRetryInstallation(config)) {
    let reason = config.officialMarketplaceAutoInstalled
      ? "already_installed"
      : (config.officialMarketplaceAutoInstallFailReason ?? "already_attempted");
    logForDebugging(`Official marketplace auto-install skipped: ${reason}`);
    return {
      installed: false,
      skipped: true,
      reason,
    };
  }
  let triedGit = false;
  try {
    if (isOfficialMarketplaceAutoInstallDisabled()) {
      logForDebugging("Official marketplace auto-install disabled via env var, skipping");
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: false,
          officialMarketplaceAutoInstallFailReason: "policy_blocked",
        }),
        storageV5,
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: false,
        skipped: true,
        policy_blocked: true,
      });
      return {
        installed: false,
        skipped: true,
        reason: "policy_blocked",
      };
    }
    if ((await loadKnownMarketplacesWithDeclared(storageV5))[CLAUDE_PLUGINS_OFFICIAL]) {
      logForDebugging(`Official marketplace '${CLAUDE_PLUGINS_OFFICIAL}' already installed, skipping`);
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: true,
          officialMarketplaceAutoInstallFailReason: undefined,
          officialMarketplaceAutoInstallRetryCount: undefined,
          officialMarketplaceAutoInstallLastAttemptTime: undefined,
          officialMarketplaceAutoInstallNextRetryTime: undefined,
        }),
        storageV5,
      );
      return {
        installed: false,
        skipped: true,
        reason: "already_installed",
      };
    }
    if (!isSourceAllowedByPolicy(OFFICIAL_MARKETPLACE_SOURCE)) {
      logForDebugging("Official marketplace blocked by enterprise policy, skipping");
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: false,
          officialMarketplaceAutoInstallFailReason: "policy_blocked",
        }),
        storageV5,
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: false,
        skipped: true,
        policy_blocked: true,
      });
      return {
        installed: false,
        skipped: true,
        reason: "policy_blocked",
      };
    }
    let cacheDir = getResolvedMarketplacesCacheDir();
    let installLocation = join(cacheDir, CLAUDE_PLUGINS_OFFICIAL);
    if ((await fetchOfficialMarketplaceFromGcs(installLocation, cacheDir, storageV5)) !== null) {
      logFeatureOk("plugin_official_marketplace_fetch");
      await updateKnownMarketplaces((config) => {
        let existingEntry = config[CLAUDE_PLUGINS_OFFICIAL];
        if (existingEntry && seedDirFor(existingEntry.installLocation)) return null;
        config[CLAUDE_PLUGINS_OFFICIAL] = {
          source: OFFICIAL_MARKETPLACE_SOURCE,
          installLocation,
          lastUpdated: new Date().toISOString(),
        };
        return config;
      }, storageV5);
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: true,
          officialMarketplaceAutoInstallFailReason: undefined,
          officialMarketplaceAutoInstallRetryCount: undefined,
          officialMarketplaceAutoInstallLastAttemptTime: undefined,
          officialMarketplaceAutoInstallNextRetryTime: undefined,
        }),
        storageV5,
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: true,
        skipped: false,
        via_gcs: true,
      });
      return {
        installed: true,
        skipped: false,
      };
    }
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_official_mkt_git_fallback", true)) {
      logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_fallback_disabled");
      logForDebugging(
        "Official marketplace GCS failed; git fallback disabled by flag \u2014 skipping install",
      );
      let retryCount = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1;
      let now = Date.now();
      let nextRetryTime = now + calculateNextRetryDelay(retryCount);
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: false,
          officialMarketplaceAutoInstallFailReason: "gcs_unavailable",
          officialMarketplaceAutoInstallRetryCount: retryCount,
          officialMarketplaceAutoInstallLastAttemptTime: now,
          officialMarketplaceAutoInstallNextRetryTime: nextRetryTime,
        }),
        storageV5,
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: false,
        skipped: true,
        gcs_unavailable: true,
        retry_count: retryCount,
      });
      return {
        installed: false,
        skipped: true,
        reason: "gcs_unavailable",
      };
    }
    triedGit = true;
    if (!(await isGitUsable())) {
      logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_git_unavailable");
      logForDebugging("Git not available, skipping official marketplace auto-install");
      let retryCount = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1;
      let now = Date.now();
      let nextRetryDelay = calculateNextRetryDelay(retryCount);
      let nextRetryTime = now + nextRetryDelay;
      await saveGlobalConfig(
        (current) => ({
          ...current,
          officialMarketplaceAutoInstallAttempted: true,
          officialMarketplaceAutoInstalled: false,
          officialMarketplaceAutoInstallFailReason: "git_unavailable",
          officialMarketplaceAutoInstallRetryCount: retryCount,
          officialMarketplaceAutoInstallLastAttemptTime: now,
          officialMarketplaceAutoInstallNextRetryTime: nextRetryTime,
        }),
        storageV5,
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: false,
        skipped: true,
        git_unavailable: true,
        retry_count: retryCount,
      });
      return {
        installed: false,
        skipped: true,
        reason: "git_unavailable",
      };
    }
    logForDebugging("Attempting to auto-install official marketplace");
    await addMarketplaceSource(OFFICIAL_MARKETPLACE_SOURCE, undefined, storageV5);
    logForDebugging("Successfully auto-installed official marketplace");
    let previousRetryCount = config.officialMarketplaceAutoInstallRetryCount || 0;
    await saveGlobalConfig(
      (current) => ({
        ...current,
        officialMarketplaceAutoInstallAttempted: true,
        officialMarketplaceAutoInstalled: true,
        officialMarketplaceAutoInstallFailReason: undefined,
        officialMarketplaceAutoInstallRetryCount: undefined,
        officialMarketplaceAutoInstallLastAttemptTime: undefined,
        officialMarketplaceAutoInstallNextRetryTime: undefined,
      }),
      storageV5,
    );
    logFeatureSad("plugin_official_marketplace_fetch", "gcs_failed_git_fallback");
    logEvent("tengu_official_marketplace_auto_install", {
      installed: true,
      skipped: false,
      retry_count: previousRetryCount,
    });
    return {
      installed: true,
      skipped: false,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("xcrun: error:")) {
      markGitUnavailable();
      if (triedGit) logFeatureBad("plugin_official_marketplace_fetch", "gcs_failed_git_unavailable");
      logForDebugging(
        "Official marketplace auto-install: git is a non-functional macOS xcrun shim, treating as git_unavailable",
      );
      logEvent("tengu_official_marketplace_auto_install", {
        installed: false,
        skipped: true,
        git_unavailable: true,
        macos_xcrun_shim: true,
      });
      return {
        installed: false,
        skipped: true,
        reason: "git_unavailable",
      };
    }
    if (triedGit) logFeatureBad("plugin_official_marketplace_fetch", "gcs_and_git_failed");
    logForDebugging(`Failed to auto-install official marketplace: ${errorMessage}`, {
      level: "error",
    });
    let retryCount = (config.officialMarketplaceAutoInstallRetryCount || 0) + 1;
    let now = Date.now();
    let nextRetryDelay = calculateNextRetryDelay(retryCount);
    let nextRetryTime = now + nextRetryDelay;
    await saveGlobalConfig(
      (current) => ({
        ...current,
        officialMarketplaceAutoInstallAttempted: true,
        officialMarketplaceAutoInstalled: false,
        officialMarketplaceAutoInstallFailReason: "unknown",
        officialMarketplaceAutoInstallRetryCount: retryCount,
        officialMarketplaceAutoInstallLastAttemptTime: now,
        officialMarketplaceAutoInstallNextRetryTime: nextRetryTime,
      }),
      storageV5,
    );
    logEvent("tengu_official_marketplace_auto_install", {
      installed: false,
      skipped: true,
      failed: true,
      retry_count: retryCount,
    });
    return {
      installed: false,
      skipped: true,
      reason: "unknown",
    };
  }
}
export { checkAndInstallOfficialMarketplace };
