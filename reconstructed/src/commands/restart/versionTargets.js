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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { readlinkSync, readlinkSync as readlinkSync_2, readlinkSync as readlinkSync_3 } from "fs";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { ge } from "../../utils/identity.js";
import {
  getDynamicConfig_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:2037905-2037923 placement
var gZ = Re(Vy(), 1);
/**
 * 读取启动命令链接指向的已安装版本名（不是合法版本号时返回 undefined）。
 */
//@ chunk-e6aww6q8.js:2037993-2038093 placement
function installedVersionName(e) {
  try {
    let n = basename_40(readlinkSync_3(e ?? getLaunchCommand().target));
    return gZ.parse(n) === null ? void 0 : n;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2038093-2038133 placement
var mZ = ge({ until: 0, version: void 0 }, pjo);
//@ chunk-e6aww6q8.js:2038133-2038238 placement
function cachedInstalledVersion() {
  let startTime = performance.now();
  if (startTime >= mZ.until) ((mZ.version = installedVersionName()), (mZ.until = startTime + 1000));
  return mZ.version;
}
//@ chunk-e6aww6q8.js:2038238-2038264 placement
function pjo() {
  mZ.until = 0;
}
/**
 * 判断重启目标版本相对当前版本（2.1.316）的关系：未知、相同、更新或更旧（附目标版本号）。
 */
//@ chunk-e6aww6q8.js:2038264-2038961 placement
function restartVersionTarget(requested) {
  let targetVersion = requested === void 0 ? cachedInstalledVersion() : installedVersionName(requested),
    parse = gZ.parse(
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
  if (targetVersion === void 0 || parse === null) return { kind: "unknown" };
  let comparison = gZ.parse(targetVersion)?.compare(parse) ?? 0;
  if (comparison === 0) return { kind: "same" };
  return { kind: comparison > 0 ? "newer" : "older", version: targetVersion };
}
//@ chunk-e6aww6q8.js:2038961-2039630 placement
function resolveMaxVersionConfig(e = cachedInstalledVersion) {
  let external = getDynamicConfig_CACHED_MAY_BE_STALE("tengu_max_version_config", {}).external;
  if (!external) return;
  let s = e();
  if (
    s === void 0 ||
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
    return (gZ.parse(s)?.compare(external) ?? 0) > 0 ? s : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:2039630-2039656 placement
var TENGU_FANCY_WAND = "tengu_fancy_wand";
//@ chunk-e6aww6q8.js:2039656-2039698 placement
function Orn() {
  return hasGrowthBookOverride(TENGU_FANCY_WAND) || (isGrowthBookEnabled() && hasFreshGrowthBookFeatures());
}

export { Orn, resolveMaxVersionConfig, TENGU_FANCY_WAND, restartVersionTarget, installedVersionName, pjo };
