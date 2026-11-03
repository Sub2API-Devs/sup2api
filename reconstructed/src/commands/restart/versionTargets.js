/**
 * commands/restart/versionTargets.ts
 *
 * 2.1.316 新增：/restart 可选的目标版本解析（latest/stable/指定版本）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { basename } from "path";
import { readlinkSync } from "fs";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { identity as identity_2 } from "../../utils/identity.js";
import {
  getDynamicConfig_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:2037905-2037923 placement
var installedVersionSemver = Re(require_semver_3(), 1);
//@ chunk-e6aww6q8.js:2037993-2038093 placement
/**
 * 读取启动命令链接指向的已安装版本名（不是合法版本号时返回 undefined）。
 */
function installedVersionName(e) {
  try {
    let n = basename(readlinkSync(e ?? getLaunchCommand().target));
    return installedVersionSemver.parse(n) === null ? undefined : n;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2038093-2038133 placement
var INSTALLED_VERSION_CACHE = identity_2(
  {
    until: 0,
    version: undefined,
  },
  resetInstalledVersionCache,
);
//@ chunk-e6aww6q8.js:2038133-2038238 placement
function cachedInstalledVersion() {
  let startTime = performance.now();
  if (startTime >= INSTALLED_VERSION_CACHE.until) {
    INSTALLED_VERSION_CACHE.version = installedVersionName();
    INSTALLED_VERSION_CACHE.until = startTime + 1000;
  }
  return INSTALLED_VERSION_CACHE.version;
}
//@ chunk-e6aww6q8.js:2038238-2038264 placement
/**
 * 清空已安装版本缓存（until 置 0，下次读取重新探测）。
 */
function resetInstalledVersionCache() {
  INSTALLED_VERSION_CACHE.until = 0;
}
//@ chunk-e6aww6q8.js:2038264-2038961 placement
/**
 * 判断重启目标版本相对当前版本（2.1.316）的关系：未知、相同、更新或更旧（附目标版本号）。
 */
function restartVersionTarget(requested) {
  let targetVersion = requested === undefined ? cachedInstalledVersion() : installedVersionName(requested);
  let r = installedVersionSemver.parse(
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
    }.VERSION,
  );
  if (targetVersion === undefined || r === null)
    return {
      kind: "unknown",
    };
  let comparison = installedVersionSemver.parse(targetVersion)?.compare(r) ?? 0;
  if (comparison === 0)
    return {
      kind: "same",
    };
  return {
    kind: comparison > 0 ? "newer" : "older",
    version: targetVersion,
  };
}
//@ chunk-e6aww6q8.js:2038961-2039630 placement
function resolveMaxVersionConfig(installedVersionName = cachedInstalledVersion) {
  let external = getDynamicConfig_CACHED_MAY_BE_STALE("tengu_max_version_config", {}).external;
  if (!external) return;
  let s = installedVersionName();
  if (
    s === undefined ||
    s ===
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
  )
    return;
  try {
    return (installedVersionSemver.parse(s)?.compare(external) ?? 0) > 0 ? s : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2039630-2039656 placement
var TENGU_FANCY_WAND = "tengu_fancy_wand";
//@ chunk-e6aww6q8.js:2039656-2039698 placement
function isGrowthBookFreshOrOverridden() {
  return hasGrowthBookOverride(TENGU_FANCY_WAND) || (isGrowthBookEnabled() && hasFreshGrowthBookFeatures());
}
export {
  isGrowthBookFreshOrOverridden,
  resolveMaxVersionConfig,
  TENGU_FANCY_WAND,
  restartVersionTarget,
  installedVersionName,
  resetInstalledVersionCache,
};
