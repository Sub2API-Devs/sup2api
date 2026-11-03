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
import { sSe } from "./proactivityMode.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";

/**
 * 重启时传递主动性设置所用的环境变量名。
 */
//@ chunk-erzjxbhh.js:415-606 placement
var RELAUNCH_PROACTIVITY_BASELINE_ENV = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE",
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL",
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED",
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON = "CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON";
//@ chunk-erzjxbhh.js:606-691 placement
function vjs(e) {
  return e.toolPermissionContext.proactivityBaseline === void 0 ? void 0 : e;
}
/**
 * 生成重启时传递主动性基线权限模式的环境变量。
 */
//@ chunk-erzjxbhh.js:691-795 placement
function proactivityBaselineEnv({ toolPermissionContext: toolPermissionContext }) {
  let proactivityBaseline = toolPermissionContext.proactivityBaseline;
  return proactivityBaseline === void 0
    ? {}
    : { [RELAUNCH_PROACTIVITY_BASELINE_ENV]: proactivityBaseline.mode };
}
/**
 * 生成重启时传递主动性等级、是否已决定与是否开启过的环境变量。
 */
//@ chunk-erzjxbhh.js:795-960 placement
function proactivityLevelEnv({
  proactivityLevel: proactivityLevel,
  toolPermissionContext: toolPermissionContext,
}) {
  let n = { [CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL]: proactivityLevel };
  if (toolPermissionContext.startupModeDecidedByProactivityLevel !== void 0)
    n[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED] = "1";
  if (wasProactivityEverOn()) n[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON] = "1";
  return n;
}
/**
 * 启动模式未由主动性等级决定时，传递"未决定"标记。
 */
//@ chunk-erzjxbhh.js:960-1070 placement
function undecidedProactivityEnv({ toolPermissionContext: toolPermissionContext }) {
  return toolPermissionContext.startupModeDecidedByProactivityLevel === void 0
    ? { [CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED]: "0" }
    : {};
}
/**
 * 判断重启参数是否为恢复会话或显式指定了 --permission-mode。
 */
//@ chunk-erzjxbhh.js:1070-1189 placement
function hasExplicitPermissionMode(e) {
  return (
    hasResumeFlag(e) !== "fresh" ||
    argsBeforeDoubleDash(e).some((t) => t === "--permission-mode" || t.startsWith("--permission-mode="))
  );
}
/**
 * 读取并清除重启传来的基线权限模式（未允许时忽略 bypassPermissions）。
 */
//@ chunk-erzjxbhh.js:1189-1367 placement
function takeRelaunchBaselineMode(e) {
  let t = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE;
  env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE");
  let n = parsePermissionMode(t);
  if (n === "bypassPermissions" && !e) return;
  return n;
}
/**
 * 读取并清除重启传来的主动性等级，无效时一并清除相关标记。
 */
//@ chunk-erzjxbhh.js:1367-1609 placement
function takeRelaunchProactivityLevel() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL;
  if ((env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL"), sSe(CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL)))
    return CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL;
  (env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED"),
    env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON"));
  return;
}
/**
 * 读取并清除"主动性曾开启"标记。
 */
//@ chunk-erzjxbhh.js:1609-1738 placement
function takeProactivityEverOn() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON;
  return (
    env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON"),
    isEnvTruthy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON)
  );
}
/**
 * 判断重启传来的主动性等级有效且曾开启过。
 */
//@ chunk-erzjxbhh.js:1738-1854 placement
function isRelaunchProactivityEverOn() {
  return (
    sSe(env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL) &&
    isEnvTruthy(env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON)
  );
}
/**
 * 读取并清除"启动模式已由主动性决定"标记，返回 true/false/undefined。
 */
//@ chunk-erzjxbhh.js:1854-2013 placement
function takeProactivityDecided() {
  let CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED = env.CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED;
  if (
    (env.unset("CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED"),
    isEnvTruthy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED))
  )
    return !0;
  if (isEnvDefinedFalsy(CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED)) return !1;
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
  vjs,
  hasExplicitPermissionMode,
  undecidedProactivityEnv,
};
