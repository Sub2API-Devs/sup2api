/**
 * commands/restart/versionTargets.ts
 *
 * 2.1.316 新增：/restart 可选的目标版本解析（latest/stable/指定版本）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */
import { basename } from "path";
import { readlinkSync } from "fs";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { identity as identity_2 } from "../../utils/identity.js";
import {
  getDynamicConfig_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2093721-2093740 placement
var installedVersionSemver; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2093721", () => {
  installedVersionSemver = __toESM(require_semver_3(), 1);
});
//@ chunk-5xgkngpb.js:2093810-2093911 placement
/**
 * 读取启动命令链接指向的已安装版本名（不是合法版本号时返回 undefined）。
 */
function installedVersionName(requestedTarget) {
  try {
    let versionName = basename(readlinkSync(requestedTarget ?? getLaunchCommand().target));
    return installedVersionSemver.parse(versionName) === null ? undefined : versionName;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:2093911-2093952 placement
var INSTALLED_VERSION_CACHE; // deferred: uses resetInstalledVersionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2093911", () => {
  INSTALLED_VERSION_CACHE = identity_2(
    {
      until: 0,
      version: undefined,
    },
    resetInstalledVersionCache,
  );
});
//@ chunk-5xgkngpb.js:2093952-2094061 placement
function cachedInstalledVersion() {
  let startTime = performance.now();
  if (startTime >= INSTALLED_VERSION_CACHE.until) {
    INSTALLED_VERSION_CACHE.version = installedVersionName();
    INSTALLED_VERSION_CACHE.until = startTime + 1000;
  }
  return INSTALLED_VERSION_CACHE.version;
}
//@ chunk-5xgkngpb.js:2094061-2094088 placement
/**
 * 清空已安装版本缓存（until 置 0，下次读取重新探测）。
 */
function resetInstalledVersionCache() {
  INSTALLED_VERSION_CACHE.until = 0;
}
//@ chunk-5xgkngpb.js:2094088-2094787 placement
/**
 * 判断重启目标版本相对当前版本（2.1.316）的关系：未知、相同、更新或更旧（附目标版本号）。
 */
function restartVersionTarget(requested) {
  let targetVersion = requested === undefined ? cachedInstalledVersion() : installedVersionName(requested);
  let currentVersion = installedVersionSemver.parse(
    {
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
  );
  if (targetVersion === undefined || currentVersion === null)
    return {
      kind: "unknown",
    };
  let comparison = installedVersionSemver.parse(targetVersion)?.compare(currentVersion) ?? 0;
  if (comparison === 0)
    return {
      kind: "same",
    };
  return {
    kind: comparison > 0 ? "newer" : "older",
    version: targetVersion,
  };
}
//@ chunk-5xgkngpb.js:2094787-2095457 placement
function resolveMaxVersionConfig(installedVersionName = cachedInstalledVersion) {
  let external = getDynamicConfig_CACHED_MAY_BE_STALE("tengu_max_version_config", {}).external;
  if (!external) return;
  let currentVersion = installedVersionName();
  if (
    currentVersion === undefined ||
    currentVersion ===
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
  )
    return;
  try {
    return (installedVersionSemver.parse(currentVersion)?.compare(external) ?? 0) > 0
      ? currentVersion
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:2095457-2095484 placement
var TENGU_FANCY_WAND = "tengu_fancy_wand";
//@ chunk-5xgkngpb.js:2095484-2095527 placement
function isGrowthBookFreshOrOverridden() {
  return hasGrowthBookOverride(TENGU_FANCY_WAND) || (isGrowthBookEnabled() && hasFreshGrowthBookFeatures());
}
export {
  restartVersionTarget,
  resetInstalledVersionCache,
  resolveMaxVersionConfig,
  installedVersionName,
  isGrowthBookFreshOrOverridden,
  TENGU_FANCY_WAND,
};
