/**
 * utils/proactivityRelaunch.ts
 *
 * 2.1.316 新增：重启时传递主动性设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-erzjxbhh.js (11)
 * attribution: placement 11
 */
import { wasProactivityEverOn } from "../Tool.js";
import { hasResumeFlag, argsBeforeDoubleDash } from "../main/resumeFlagScan.js";
import { env } from "./env.js";
import { parsePermissionMode } from "../types/permissions.js";
import { isProactivityMode } from "./proactivityMode.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";

//@ chunk-erzjxbhh.js:415-606 placement
/**
 * 重启时传递主动性设置所用的环境变量名。
 */
var RELAUNCH_PROACTIVITY_BASELINE_ENV = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE";
var CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL";
var CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED";
var CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON";
//@ chunk-erzjxbhh.js:606-691 placement
/**
 * withProactivityBaseline：带主动性基线时原样返回。
 */
function withProactivityBaseline(context) {
  return context.toolPermissionContext.proactivityBaseline === undefined ? undefined : context;
}
//@ chunk-erzjxbhh.js:691-795 placement
/**
 * 生成重启时传递主动性基线权限模式的环境变量。
 */
function proactivityBaselineEnv({ toolPermissionContext }) {
  let proactivityBaseline = toolPermissionContext.proactivityBaseline;
  return proactivityBaseline === undefined
    ? {}
    : {
        [RELAUNCH_PROACTIVITY_BASELINE_ENV]: proactivityBaseline.mode,
      };
}
//@ chunk-erzjxbhh.js:795-960 placement
/**
 * 生成重启时传递主动性等级、是否已决定与是否开启过的环境变量。
 */
function proactivityLevelEnv({ proactivityLevel, toolPermissionContext }) {
  let relaunchEnv = {
    [CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL]: proactivityLevel,
  };
  if (toolPermissionContext.startupModeDecidedByProactivityLevel !== undefined)
    relaunchEnv[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED] = "1";
  if (wasProactivityEverOn()) relaunchEnv[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON] = "1";
  return relaunchEnv;
}
//@ chunk-erzjxbhh.js:960-1070 placement
/**
 * 启动模式未由主动性等级决定时，传递"未决定"标记。
 */
function undecidedProactivityEnv({ toolPermissionContext }) {
  return toolPermissionContext.startupModeDecidedByProactivityLevel === undefined
    ? {
        [CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED]: "0",
      }
    : {};
}
//@ chunk-erzjxbhh.js:1070-1189 placement
/**
 * 判断重启参数是否为恢复会话或显式指定了 --permission-mode。
 */
function hasExplicitPermissionMode(argv) {
  return (
    hasResumeFlag(argv) !== "fresh" ||
    argsBeforeDoubleDash(argv).some(
      (arg) => arg === "--permission-mode" || arg.startsWith("--permission-mode="),
    )
  );
}
//@ chunk-erzjxbhh.js:1189-1367 placement
/**
 * 读取并清除重启传来的基线权限模式（未允许时忽略 bypassPermissions）。
 */
function takeRelaunchBaselineMode(allowBypass) {
  let baselineValue = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE");
  let permissionMode = parsePermissionMode(baselineValue);
  if (permissionMode === "bypassPermissions" && !allowBypass) return;
  return permissionMode;
}
//@ chunk-erzjxbhh.js:1367-1609 placement
/**
 * 读取并清除重启传来的主动性等级，无效时一并清除相关标记。
 */
function takeRelaunchProactivityLevel() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL");
  if (isProactivityMode(CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL))
    return CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED");
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON");
  return;
}
//@ chunk-erzjxbhh.js:1609-1738 placement
/**
 * 读取并清除"主动性曾开启"标记。
 */
function takeProactivityEverOn() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON");
  return isEnvTruthy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON);
}
//@ chunk-erzjxbhh.js:1738-1854 placement
/**
 * 判断重启传来的主动性等级有效且曾开启过。
 */
function isRelaunchProactivityEverOn() {
  return (
    isProactivityMode(env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL) &&
    isEnvTruthy(env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON)
  );
}
//@ chunk-erzjxbhh.js:1854-2013 placement
/**
 * 读取并清除"启动模式已由主动性决定"标记，返回 true/false/undefined。
 */
function takeProactivityDecided() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED");
  if (isEnvTruthy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED)) return true;
  if (isEnvDefinedFalsy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED)) return false;
  return;
}
export {
  isRelaunchProactivityEverOn,
  takeRelaunchProactivityLevel,
  takeProactivityEverOn,
  takeProactivityDecided,
  takeRelaunchBaselineMode,
  RELAUNCH_PROACTIVITY_BASELINE_ENV,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL,
  proactivityBaselineEnv,
  proactivityLevelEnv,
  withProactivityBaseline,
  hasExplicitPermissionMode,
  undecidedProactivityEnv,
};
