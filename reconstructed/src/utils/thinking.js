/**
 * utils/thinking.ts
 *
 * 扩展思考配置：模型是否支持 thinking/adaptive thinking/拒绝关闭思考，请求里 thinking 的形态（adaptive 或 enabled+budget_tokens、display），ultrathink 关键字与彩虹配色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/thinking.ts
 * pieces: chunk-aepeg2w5.js (21)
 * attribution: placement 6, fingerprint 3, file-local 4, layout 8
 */
import { getInitialSettings_2, getSettingsWithErrors_2 } from "./settings/settings.js";
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getCapabilityOverrideCached } from "./model/modelSupportOverrides.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { modelSupportsCapability } from "./model/modelCatalog.js";
import { hasFirstPartyCapabilities, getProviderForModel } from "./model/providers.js";
import { sanitizeTitle } from "./resultError.js";
import { renderModelName } from "./model/modelDisplay.js";
import { withCatalogSuppressed } from "./model/modelCatalog/servedCatalog.js";
import { parseIntLoose } from "./envUtils.js";

//@ chunk-aepeg2w5.js:476786-476839 placement
function nRn() {
  return getInitialSettings_2().showThinkingSummaries ?? !1;
}
/**
 * 取思考显示方式的覆盖值：命令行参数优先，其次 showThinkingSummaries 设置。
 */
//@ chunk-aepeg2w5.js:476839-477013 placement
function getThinkingDisplayOverride(e) {
  if (e !== void 0) return { display: e, source: "flag" };
  let showThinkingSummaries = getInitialSettings_2().showThinkingSummaries;
  if (showThinkingSummaries === void 0) return;
  return { display: showThinkingSummaries ? "summarized" : "omitted", source: "setting" };
}
/**
 * 决定思考内容的显示方式：显式设置优先；交互模式按开关显示摘要；非交互且输出格式满足条件时省略。
 */
//@ chunk-aepeg2w5.js:477013-477221 placement
function resolveThinkingDisplay({
  explicitDisplay: explicitDisplay,
  isNonInteractive: isNonInteractive,
  outputFormat: outputFormat,
  verbose: verbose,
}) {
  if (explicitDisplay) return explicitDisplay;
  if (!isNonInteractive) return nRn() ? "summarized" : void 0;
  if (fno({ isNonInteractive: isNonInteractive, outputFormat: outputFormat, verbose: verbose }))
    return "omitted";
  return;
}
//@ chunk-aepeg2w5.js:477221-477320 placement
function fno({ isNonInteractive: isNonInteractive, outputFormat: outputFormat, verbose: verbose }) {
  return isNonInteractive && (outputFormat === "text" || (outputFormat === "json" && !verbose));
}
/**
 * 解析思考配置（禁用、自适应）。
 */
//@ chunk-aepeg2w5.js:477320-477651 placement
function resolveThinkingConfig(e, n, r, s, h) {
  if (!isThinkingEffectivelyEnabled(r, e)) return { type: "disabled" };
  let y;
  if (n.type !== "disabled") y = n;
  else {
    let S = resolveThinkingDisplay({
      explicitDisplay: h,
      isNonInteractive: !1,
      outputFormat: "text",
      verbose: !1,
    });
    if (((y = S ? { type: "adaptive", display: S } : { type: "adaptive" }), h !== void 0))
      y.displayExplicit = !0;
  }
  if (s === void 0) return y;
  return { ...y, display: s, displayExplicit: !0 };
}
/**
 * 非交互会话中，除非使用精确工具、转发子代理文本或异步（非 Cowork 聊天）情况，把子代理的思考显示改为 omitted（远程 worker 时即使显式设置也覆盖）。
 */
//@ chunk-aepeg2w5.js:477651-477934 placement
function applySubagentThinkingDisplay(
  e,
  {
    useExactTools: useExactTools,
    forwardSubagentText: forwardSubagentText,
    isAsync: isAsync,
    isNonInteractiveSession: isNonInteractiveSession,
    sessionDisplayExplicit: sessionDisplayExplicit,
    isRemoteWorker: isRemoteWorker,
    isChatOriginCoworkSession: isChatOriginCoworkSession,
  },
) {
  if (
    !isNonInteractiveSession ||
    useExactTools ||
    forwardSubagentText ||
    (isAsync && !isChatOriginCoworkSession)
  )
    return e;
  if (!isRemoteWorker && (sessionDisplayExplicit || e.display === "omitted")) return e;
  return { ...e, display: "omitted", displayExplicit: !1 };
}
/**
 * ultrathink 关键字是否生效：未设 CLAUDE_CODE_DISABLE_ULTRATHINK 且 tengu_turtle_carbon（默认开）。
 */
//@ chunk-aepeg2w5.js:477934-478018 fingerprint = isUltrathinkEnabled (0.795)
function isUltrathinkEnabled() {
  return (
    !env.CLAUDE_CODE_DISABLE_ULTRATHINK && getFeatureValue_CACHED_MAY_BE_STALE("tengu_turtle_carbon", !0)
  );
}
/**
 * 文本是否含单词 ultrathink（不区分大小写）。
 */
//@ chunk-aepeg2w5.js:478018-478066 file-local
function hasUltrathinkKeyword(text) {
  return /\bultrathink\b/i.test(text);
}
/**
 * ultrathink 高亮用的七色主题键；同句 i$ 为对应 shimmer 版本。
 */
//@ chunk-aepeg2w5.js:478066-478362 fingerprint = RAINBOW_COLORS (0.667)
var RAINBOW_COLORS = [
    "rainbow_red",
    "rainbow_orange",
    "rainbow_yellow",
    "rainbow_green",
    "rainbow_blue",
    "rainbow_indigo",
    "rainbow_violet",
  ],
  RAINBOW_SHIMMER_COLORS = [
    "rainbow_red_shimmer",
    "rainbow_orange_shimmer",
    "rainbow_yellow_shimmer",
    "rainbow_green_shimmer",
    "rainbow_blue_shimmer",
    "rainbow_indigo_shimmer",
    "rainbow_violet_shimmer",
  ];
/**
 * 按下标循环取彩虹色（可选 shimmer）。
 */
//@ chunk-aepeg2w5.js:478362-478417 file-local
function getRainbowColor(charIndex, shimmer = !1) {
  let colors = shimmer ? RAINBOW_SHIMMER_COLORS : RAINBOW_COLORS;
  return colors[charIndex % colors.length];
}
/**
 * 模型是否支持 thinking：3P 能力覆盖优先，否则非 claude-3- 即支持。
 */
//@ chunk-aepeg2w5.js:478417-478515 file-local
function modelSupportsThinking(model) {
  let supported3P = getCapabilityOverrideCached(model, "thinking");
  if (supported3P !== void 0) return supported3P;
  return !getCanonicalName(model).includes("claude-3-");
}
/**
 * 模型是否拒绝 thinking.type=disabled：已知旧模型为 false，否则看 catalog 能力 rejects_disabled_thinking，再否则第一方类提供商为真。
 */
//@ chunk-aepeg2w5.js:478515-478942 layout
function modelRejectsDisabledThinking(e) {
  let n = getCanonicalName(e);
  if (
    n.includes("claude-3-") ||
    n === "claude-opus-4-0" ||
    n === "claude-opus-4-1" ||
    n === "claude-opus-4-5" ||
    n === "claude-opus-4-6" ||
    n === "claude-opus-4-7" ||
    n === "claude-opus-4-8" ||
    n === "claude-opus-5" ||
    n === "claude-sonnet-4-0" ||
    n === "claude-sonnet-4-5" ||
    n === "claude-sonnet-4-6" ||
    n === "claude-sonnet-5" ||
    n === "claude-haiku-4-5"
  )
    return !1;
  let r = modelSupportsCapability(n, "rejects_disabled_thinking", e);
  if (r !== void 0) return r;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
/**
 * 能力 rejects_disabled_thinking 明确为真且模型拒绝关闭思考。
 */
//@ chunk-aepeg2w5.js:478942-479018 layout
function isThinkingAlwaysOn(e) {
  return (
    modelSupportsCapability(getCanonicalName(e), "rejects_disabled_thinking", e) === !0 &&
    modelRejectsDisabledThinking(e)
  );
}
/**
 * "Thinking can't be turned off for <模型>"（总是开思考的模型）。
 */
//@ chunk-aepeg2w5.js:479018-479124 layout
function getThinkingCannotBeDisabledMessage(e) {
  if (!isThinkingAlwaysOn(e)) return;
  return `Thinking can't be turned off for ${sanitizeTitle(renderModelName(getCanonicalName(e, { identity: !0 })))}`;
}
/**
 * 模型思考常开时，把非机械关闭的 disabled 配置改成 adaptive（display 沿用或按 showThinkingSummaries 设为 summarized）。
 */
//@ chunk-aepeg2w5.js:479124-479302 layout
function upgradeDisabledThinkingForModel(thinkingConfig, thinkingAlwaysOn) {
  if (!thinkingAlwaysOn || thinkingConfig.type !== "disabled" || thinkingConfig.mechanical === !0)
    return thinkingConfig;
  return {
    type: "adaptive",
    display: thinkingConfig.display ?? (nRn() ? "summarized" : void 0),
    displayExplicit: thinkingConfig.displayExplicit,
  };
}
/**
 * 设置未显式关闭或模型思考常开。
 */
//@ chunk-aepeg2w5.js:479302-479342 layout
function isThinkingEffectivelyEnabled(e, n) {
  return n !== !1 || isThinkingAlwaysOn(e);
}
/**
 * 辅助查询的思考设置：模型拒绝关闭思考时 [undefined, 2048]，否则 [false, 0]。
 */
//@ chunk-aepeg2w5.js:479342-479400 layout
function getSideQueryThinkingSettings(e) {
  if (modelRejectsDisabledThinking(e)) return [void 0, 2048];
  return [!1, 0];
}
/**
 * 同上，但暂停服务端目录查询（JN）。
 */
//@ chunk-aepeg2w5.js:479400-479437 layout
function getSideQueryThinkingSettingsOffline(e) {
  return withCatalogSuppressed(() => getSideQueryThinkingSettings(e));
}
/**
 * thinking 类型：运行时覆盖优先；模型支持 adaptive（且未用 CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING 关掉 4.6）为 adaptive，否则 enabled（带 budget_tokens）。
 */
//@ chunk-aepeg2w5.js:479437-479664 file-local
function modelSupportsAdaptiveThinking({
  runtimeOverride: runtimeOverride,
  resolvedModel: resolvedModel,
  canonicalModel: canonicalModel,
}) {
  if (runtimeOverride !== void 0) return runtimeOverride;
  let s =
    env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING &&
    (canonicalModel.includes("opus-4-6") || canonicalModel.includes("sonnet-4-6"));
  return modelSupportsAdaptiveThinkingByCatalog(resolvedModel) && !s ? "adaptive" : "enabled";
}
/**
 * 能力覆盖 → 旧模型黑名单 → catalog 能力 adaptive_thinking → mythos-5 → 第一方类提供商默认。
 */
//@ chunk-aepeg2w5.js:479664-480035 layout
function modelSupportsAdaptiveThinkingByCatalog(e) {
  let n = getCapabilityOverrideCached(e, "adaptive_thinking");
  if (n !== void 0) return n;
  let r = getCanonicalName(e);
  if (
    r.includes("claude-3-") ||
    r === "claude-opus-4-0" ||
    r === "claude-opus-4-1" ||
    r === "claude-opus-4-5" ||
    r === "claude-sonnet-4-0" ||
    r === "claude-sonnet-4-5" ||
    r === "claude-haiku-4-5"
  )
    return !1;
  let s = modelSupportsCapability(r, "adaptive_thinking", e);
  if (s !== void 0) return s;
  if (r === "claude-mythos-5") return !0;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
/**
 * 默认关闭思考的原因：MAX_THINKING_TOKENS<=0 或 settings.alwaysThinkingEnabled=false；否则 null（默认开）。
 */
//@ chunk-aepeg2w5.js:480035-480243 fingerprint = shouldEnableThinkingByDefault (0.592)
function shouldEnableThinkingByDefault() {
  if (process.env.MAX_THINKING_TOKENS)
    return parseIntLoose(process.env.MAX_THINKING_TOKENS) > 0 ? null : "MAX_THINKING_TOKENS";
  let { settings: settings } = getSettingsWithErrors_2();
  return settings.alwaysThinkingEnabled === !1 ? "alwaysThinkingEnabled" : null;
}

export {
  modelSupportsAdaptiveThinkingByCatalog,
  isThinkingAlwaysOn,
  applySubagentThinkingDisplay,
  getRainbowColor,
  isUltrathinkEnabled,
  getThinkingCannotBeDisabledMessage,
  isThinkingEffectivelyEnabled,
  resolveThinkingConfig,
  getThinkingDisplayOverride,
  getSideQueryThinkingSettings,
  nRn,
  upgradeDisabledThinkingForModel,
  modelRejectsDisabledThinking,
  modelSupportsAdaptiveThinking,
  resolveThinkingDisplay,
  fno,
  getSideQueryThinkingSettingsOffline,
  shouldEnableThinkingByDefault,
  hasUltrathinkKeyword,
  modelSupportsThinking,
};
