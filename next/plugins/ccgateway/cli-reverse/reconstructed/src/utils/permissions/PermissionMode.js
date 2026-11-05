/**
 * utils/permissions/PermissionMode.ts
 *
 * 权限模式的显示配置（标题、简称、指示文字、图标、颜色）、对外模式映射、模式基础行为（allow/ask/deny/classify）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionMode.ts
 * pieces: chunk-ct61sn5h.js (2), chunk-z20c443b.js (11)
 * attribution: sole-consumer 1, fingerprint 4, callgraph-witnessed 1, layout 4, file-local 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { PAUSE_GLYPH, FAST_FORWARD_GLYPH } from "../../constants/figures.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { isPlanBypass } from "./browserToolNames.js";
import { shouldAllowManagedPermissionRulesOnly } from "./permissionsLoader.js";
import { filterEditableRules } from "../../components/permissions/hooks.js";
import { externalMetadataToAppState } from "../../state/onChangeAppState.js";

//@ chunk-z20c443b.js:202101-202833 fingerprint (2.1.88 match: PERMISSION_MODE_CONFIG, 0.746)
/**
 * 六种对外权限模式的显示配置表：title/shortTitle/indicator/symbol/color/external。default 显示为 "Manual"；bubble 不在表内（getModeConfig 回落 default）。
 */
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
    symbol: FAST_FORWARD_GLYPH,
    color: "autoAccept",
    external: "acceptEdits",
  },
  bypassPermissions: {
    title: "Bypass Permissions",
    shortTitle: "Bypass",
    indicator: "bypass permissions",
    symbol: FAST_FORWARD_GLYPH,
    color: "error",
    external: "bypassPermissions",
  },
  dontAsk: {
    title: "Don't Ask",
    shortTitle: "DontAsk",
    indicator: "don't ask",
    symbol: FAST_FORWARD_GLYPH,
    color: "error",
    external: "dontAsk",
  },
  auto: {
    title: "Auto",
    shortTitle: "Auto",
    indicator: "auto mode",
    symbol: FAST_FORWARD_GLYPH,
    color: "warning",
    external: "auto",
  },
};
//@ chunk-z20c443b.js:202833-202869 fingerprint (2.1.88 match: isExternalPermissionMode, 0.468)
/**
 * 是否对外可见模式：只有内部模式 "bubble"（子代理把权限请求冒泡给父级）返回 false。
 */
function isExternalPermissionMode(mode) {
  return mode !== "bubble";
}
//@ chunk-z20c443b.js:202869-202909 callgraph-witnessed (2.1.88 match: getModeConfig, 0)
function getModeConfig(mode) {
  return PERMISSION_MODE_CONFIG[mode] ?? PERMISSION_MODE_CONFIG.default;
}
//@ chunk-z20c443b.js:202909-202946 layout
/**
 * 把内部模式映射为对外模式名（config.external）；未知模式按 default。
 */
function toExternalPermissionMode(mode) {
  return getModeConfig(mode).external;
}
//@ chunk-z20c443b.js:202946-203148 layout
/**
 * 模式切换遥测字段 {permission_mode, is_ultraplan_mode}；rule="while-latched" 时只要新模式是 ultraplan 就上报，否则只在刚进入 ultraplan 时上报。
 */
function getPermissionModeAnalyticsFields(change) {
  let externalMode = toExternalPermissionMode(change.newMode);
  let isUltraplan = externalMode === "plan" && Boolean(change.newUltraplan);
  let reportUltraplan =
    change.rule === "while-latched"
      ? isUltraplan
      : isUltraplan && toExternalPermissionMode(change.prevMode) !== "plan" && !change.prevUltraplan;
  return {
    permission_mode: externalMode,
    is_ultraplan_mode: reportUltraplan ? true : null,
  };
}
//@ chunk-z20c443b.js:203148-203187 file-local
/**
 * 把字符串解析为已知权限模式（经 Pg，"manual" 视作 default），无法识别时返回 "default"。
 */
function permissionModeFromString(str) {
  return parsePermissionMode(str) ?? "default";
}
//@ chunk-z20c443b.js:203187-203221 file-local
/**
 * 模式的显示标题（PERMISSION_MODE_CONFIG.title）。
 */
function permissionModeTitle(mode) {
  return getModeConfig(mode).title;
}
//@ chunk-z20c443b.js:203221-203270 file-local
/**
 * 模式为 "default" 或未设置时为 true。
 */
function isDefaultMode(mode) {
  return mode === "default" || mode === undefined;
}
//@ chunk-z20c443b.js:203270-203411 layout
/**
 * 某模式下“没有规则命中时”的基础行为：auto→"classify"，bypassPermissions（或 YD 判为等价 bypass）→"allow"，dontAsk→"deny"，其余→"ask"。
 */
function getModeBaseBehavior(mode, isBypassAvailable) {
  if (mode === "auto") return "classify";
  if (mode === "bypassPermissions" || isPlanBypass(mode, isBypassAvailable)) return "allow";
  if (mode === "dontAsk") return "deny";
  return "ask";
}
//@ chunk-z20c443b.js:203411-203449 layout
/**
 * 模式在状态栏上的指示文字（config.indicator，如 "accept edits"）。
 */
function permissionModeIndicator(mode) {
  return getModeConfig(mode).indicator;
}
//@ chunk-z20c443b.js:203449-203485 fingerprint (2.1.88 match: permissionModeSymbol, 1)
/**
 * 模式图标（config.symbol）。
 */
function permissionModeSymbol(mode) {
  return getModeConfig(mode).symbol;
}
//@ chunk-ct61sn5h.js:3686-4026 sole-consumer
/**
 * 根据元数据里的 session_allow_rules（去掉 mcp__ 规则、托管独占时忽略）返回把它们设为会话 allow 规则的 AppState 更新函数。
 */
function applySessionAllowRules(request) {
  let sessionAllowRules = request.session_allow_rules;
  if (!Array.isArray(sessionAllowRules)) return (appState) => appState;
  if (shouldAllowManagedPermissionRulesOnly()) return (appState) => appState;
  let rules = filterEditableRules(
    sessionAllowRules.filter(
      (sessionAllowRule) => typeof sessionAllowRule === "string" && !sessionAllowRule.startsWith("mcp__"),
    ),
  );
  if (rules.length === 0) return (appState) => appState;
  return (appState) => ({
    ...appState,
    toolPermissionContext: {
      ...appState.toolPermissionContext,
      alwaysAllowRules: {
        ...appState.toolPermissionContext.alwaysAllowRules,
        session: rules,
      },
    },
  });
}
//@ chunk-ct61sn5h.js:4026-4093 fingerprint (2.1.88 match: toExternalPermissionMode, 0.652)
/**
 * 返回 AppState 更新函数：先应用 internal 元数据，再应用 external 元数据（externalMetadataToAppState）。与权限模式无关，属切分误归。
 */
function sessionMetadataToAppState(metadata) {
  return (state) =>
    externalMetadataToAppState(metadata.external ?? {})(
      applySessionAllowRules(metadata.internal ?? {})(state),
    );
}
export {
  permissionModeTitle,
  permissionModeFromString,
  isExternalPermissionMode,
  toExternalPermissionMode,
  sessionMetadataToAppState,
  permissionModeSymbol,
  permissionModeIndicator,
  isDefaultMode,
  getModeBaseBehavior,
  getPermissionModeAnalyticsFields,
  getModeConfig,
};
