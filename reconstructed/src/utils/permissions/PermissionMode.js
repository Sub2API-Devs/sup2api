/**
 * utils/permissions/PermissionMode.ts
 *
 * 权限模式的显示配置（标题、简称、指示文字、图标、颜色）、对外模式映射、模式基础行为（allow/ask/deny/classify）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionMode.ts
 * pieces: chunk-dcmhvw5a.js (11), chunk-tbfde207.js (2)
 * attribution: fingerprint 4, callgraph-witnessed 1, layout 4, file-local 3, sole-consumer 1
 */
import { PAUSE_GLYPH, AOt } from "./autoModeRulesPrompt.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { isPlanBypass } from "./browserToolNames.js";
import { shouldAllowManagedPermissionRulesOnly } from "./permissionsLoader.js";
import { Mmi } from "../../components/permissions/hooks.js";
import { externalMetadataToAppState } from "../../state/onChangeAppState.js";

/**
 * 六种对外权限模式的显示配置表：title/shortTitle/indicator/symbol/color/external。default 显示为 "Manual"；bubble 不在表内（getModeConfig 回落 default）。
 */
//@ chunk-dcmhvw5a.js:207975-208707 fingerprint = PERMISSION_MODE_CONFIG (0.746)
var PERMISSION_MODE_CONFIG = {
  default: {
    title: "Manual",
    shortTitle: "Manual",
    indicator: "manual mode",
    symbol: PAUSE_GLYPH,
    color: "inactive",
    external: "default",
  },
  plan: {
    title: "Plan",
    shortTitle: "Plan",
    indicator: "plan mode",
    symbol: PAUSE_GLYPH,
    color: "planMode",
    external: "plan",
  },
  acceptEdits: {
    title: "Accept edits",
    shortTitle: "Accept",
    indicator: "accept edits",
    symbol: AOt,
    color: "autoAccept",
    external: "acceptEdits",
  },
  bypassPermissions: {
    title: "Bypass Permissions",
    shortTitle: "Bypass",
    indicator: "bypass permissions",
    symbol: AOt,
    color: "error",
    external: "bypassPermissions",
  },
  dontAsk: {
    title: "Don't Ask",
    shortTitle: "DontAsk",
    indicator: "don't ask",
    symbol: AOt,
    color: "error",
    external: "dontAsk",
  },
  auto: {
    title: "Auto",
    shortTitle: "Auto",
    indicator: "auto mode",
    symbol: AOt,
    color: "warning",
    external: "auto",
  },
};
/**
 * 是否对外可见模式：只有内部模式 "bubble"（子代理把权限请求冒泡给父级）返回 false。
 */
//@ chunk-dcmhvw5a.js:208707-208743 fingerprint = isExternalPermissionMode (0.47)
function isExternalPermissionMode(mode) {
  return mode !== "bubble";
}
//@ chunk-dcmhvw5a.js:208743-208783 callgraph-witnessed = getModeConfig (0)
function getModeConfig(mode) {
  return PERMISSION_MODE_CONFIG[mode] ?? PERMISSION_MODE_CONFIG.default;
}
/**
 * 把内部模式映射为对外模式名（config.external）；未知模式按 default。
 */
//@ chunk-dcmhvw5a.js:208783-208820 layout
function toExternalPermissionMode(mode) {
  return getModeConfig(mode).external;
}
/**
 * 模式切换遥测字段 {permission_mode, is_ultraplan_mode}；rule="while-latched" 时只要新模式是 ultraplan 就上报，否则只在刚进入 ultraplan 时上报。
 */
//@ chunk-dcmhvw5a.js:208820-209022 layout
function getPermissionModeAnalyticsFields(change) {
  let externalMode = toExternalPermissionMode(change.newMode),
    isUltraplan = externalMode === "plan" && Boolean(change.newUltraplan),
    reportUltraplan =
      change.rule === "while-latched"
        ? isUltraplan
        : isUltraplan && toExternalPermissionMode(change.prevMode) !== "plan" && !change.prevUltraplan;
  return { permission_mode: externalMode, is_ultraplan_mode: reportUltraplan ? !0 : null };
}
/**
 * 把字符串解析为已知权限模式（经 Pg，"manual" 视作 default），无法识别时返回 "default"。
 */
//@ chunk-dcmhvw5a.js:209022-209061 file-local
function permissionModeFromString(str) {
  return parsePermissionMode(str) ?? "default";
}
/**
 * 模式的显示标题（PERMISSION_MODE_CONFIG.title）。
 */
//@ chunk-dcmhvw5a.js:209061-209095 file-local
function permissionModeTitle(mode) {
  return getModeConfig(mode).title;
}
/**
 * 模式为 "default" 或未设置时为 true。
 */
//@ chunk-dcmhvw5a.js:209095-209144 file-local
function isDefaultMode(mode) {
  return mode === "default" || mode === void 0;
}
/**
 * 某模式下“没有规则命中时”的基础行为：auto→"classify"，bypassPermissions（或 YD 判为等价 bypass）→"allow"，dontAsk→"deny"，其余→"ask"。
 */
//@ chunk-dcmhvw5a.js:209144-209285 layout
function getModeBaseBehavior(mode, isBypassAvailable) {
  if (mode === "auto") return "classify";
  if (mode === "bypassPermissions" || isPlanBypass(mode, isBypassAvailable)) return "allow";
  if (mode === "dontAsk") return "deny";
  return "ask";
}
/**
 * 模式在状态栏上的指示文字（config.indicator，如 "accept edits"）。
 */
//@ chunk-dcmhvw5a.js:209285-209323 layout
function permissionModeIndicator(mode) {
  return getModeConfig(mode).indicator;
}
/**
 * 模式图标（config.symbol）。
 */
//@ chunk-dcmhvw5a.js:209323-209359 fingerprint = permissionModeSymbol (1)
function permissionModeSymbol(mode) {
  return getModeConfig(mode).symbol;
}
/**
 * 根据元数据里的 session_allow_rules（去掉 mcp__ 规则、托管独占时忽略）返回把它们设为会话 allow 规则的 AppState 更新函数。
 */
//@ chunk-tbfde207.js:3646-3986 sole-consumer
function applySessionAllowRules(e) {
  let session_allow_rules = e.session_allow_rules;
  if (!Array.isArray(session_allow_rules)) return (i) => i;
  if (shouldAllowManagedPermissionRulesOnly()) return (i) => i;
  let n = Mmi(session_allow_rules.filter((i) => typeof i === "string" && !i.startsWith("mcp__")));
  if (n.length === 0) return (i) => i;
  return (i) => ({
    ...i,
    toolPermissionContext: {
      ...i.toolPermissionContext,
      alwaysAllowRules: { ...i.toolPermissionContext.alwaysAllowRules, session: n },
    },
  });
}
/**
 * 返回 AppState 更新函数：先应用 internal 元数据，再应用 external 元数据（externalMetadataToAppState）。与权限模式无关，属切分误归。
 */
//@ chunk-tbfde207.js:3986-4053 fingerprint = toExternalPermissionMode (0.654)
function sessionMetadataToAppState(metadata) {
  return (state) =>
    externalMetadataToAppState(metadata.external ?? {})(
      applySessionAllowRules(metadata.internal ?? {})(state),
    );
}

export {
  toExternalPermissionMode,
  permissionModeTitle,
  permissionModeFromString,
  permissionModeIndicator,
  isExternalPermissionMode,
  getModeBaseBehavior,
  permissionModeSymbol,
  isDefaultMode,
  sessionMetadataToAppState,
  getModeConfig,
  getPermissionModeAnalyticsFields,
};
