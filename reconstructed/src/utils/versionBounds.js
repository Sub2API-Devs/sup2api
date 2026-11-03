/**
 * utils/versionBounds.ts
 *
 * 2.1.316 新增：版本上下限判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-29ccbp5f.js (5)
 * attribution: placement 5
 */
import { Re } from "../../runtime/bun-runtime.js";
import { Vy } from "../../vendor/semver/index.js";
import { logForDebugging } from "./debug.js";
import { gte, lte } from "./semver.js";
import { getSettingsForSource } from "./settings/settings.js";
import { logError } from "./log.js";

//@ chunk-29ccbp5f.js:409-426 placement
var o = Re(Vy(), 1);
//@ chunk-29ccbp5f.js:426-471 placement = doctor (0.368)
var doctor = new Set(["update", "install", "doctor"]);
/**
 * 按组织策略的最低/最高版本检查当前版本，doctor 类命令跳过；版本号非法时记日志忽略；不满足时返回提示文本，否则 null。
 */
//@ chunk-29ccbp5f.js:471-1477 placement
function checkVersionBounds({
  currentVersion: currentVersion,
  requiredMinimumVersion: minVersion,
  requiredMaximumVersion: maxVersion,
  topLevelCommand: topLevelCommand,
}) {
  if (!minVersion && !maxVersion) return null;
  if (topLevelCommand !== void 0 && doctor.has(topLevelCommand)) return null;
  if (!o.parse(currentVersion)) return null;
  if (minVersion) {
    let minParsed = o.parse(minVersion)?.version;
    if (!minParsed)
      logForDebugging(
        `requiredMinimumVersion '${minVersion}' is not a valid semver version \u2014 ignoring`,
        { level: "error" },
      );
    else if (!gte(currentVersion, minParsed))
      return `Claude Code ${currentVersion} is older than the minimum version required by your organization (${minVersion}).
Update Claude Code using your organization's approved method, then try again. If automatic updates are available, \`claude update\` may also work.`;
  }
  if (maxVersion) {
    let maxParsed = o.parse(maxVersion)?.version;
    if (!maxParsed)
      logForDebugging(
        `requiredMaximumVersion '${maxVersion}' is not a valid semver version \u2014 ignoring`,
        { level: "error" },
      );
    else if (!lte(currentVersion, maxParsed))
      return `Claude Code ${currentVersion} is newer than the maximum version allowed by your organization (${maxVersion}).
Your organization requires version ${maxVersion} or older. Install an approved version using your organization's approved method. \`claude install <version>\` may also work.`;
  }
  return null;
}
/**
 * 找到顶层命令后，用策略设置中的版本上下限检查当前版本；出错时记日志返回 null。
 */
//@ chunk-29ccbp5f.js:1477-2246 placement
function checkCommandVersionBounds(command) {
  try {
    let topCommand = command.parent ? command : null;
    while (topCommand?.parent?.parent) topCommand = topCommand.parent;
    let policy = getSettingsForSource("policySettings");
    return checkVersionBounds({
      currentVersion: {
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
      requiredMinimumVersion: policy?.requiredMinimumVersion,
      requiredMaximumVersion: policy?.requiredMaximumVersion,
      topLevelCommand: topCommand?.name(),
    });
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 不针对具体命令，用策略设置中的版本上下限检查当前版本。
 */
//@ chunk-29ccbp5f.js:2246-2954 placement
function checkPolicyVersionBounds() {
  try {
    let policy = getSettingsForSource("policySettings");
    return checkVersionBounds({
      currentVersion: {
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
      requiredMinimumVersion: policy?.requiredMinimumVersion,
      requiredMaximumVersion: policy?.requiredMaximumVersion,
      topLevelCommand: void 0,
    });
  } catch (error) {
    return (logError(error), null);
  }
}

export { checkCommandVersionBounds, checkPolicyVersionBounds };
