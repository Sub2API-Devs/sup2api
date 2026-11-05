/**
 * utils/thinking.ts
 *
 * 扩展思考配置：模型是否支持 thinking/adaptive thinking/拒绝关闭思考，请求里 thinking 的形态（adaptive 或 enabled+budget_tokens、display），ultrathink 关键字与彩虹配色。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/thinking.ts
 * pieces: chunk-exfmq47h.js (21)
 * attribution: placement 6, fingerprint 3, file-local 4, layout 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getInitialSettings, getSettingsWithErrors } from "./settings/settings.js";
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

//@ chunk-exfmq47h.js:488184-488237 placement
/**
 * 是否默认显示思考摘要。
 */
function showThinkingSummaries() {
  return getInitialSettings().showThinkingSummaries ?? false;
}
//@ chunk-exfmq47h.js:488237-488411 placement
/**
 * 取思考显示方式的覆盖值：命令行参数优先，其次 showThinkingSummaries 设置。
 */
function getThinkingDisplayOverride(flag) {
  if (flag !== undefined)
    return {
      display: flag,
      source: "flag",
    };
  let showThinkingSummaries = getInitialSettings().showThinkingSummaries;
  if (showThinkingSummaries === undefined) return;
  return {
    display: showThinkingSummaries ? "summarized" : "omitted",
    source: "setting",
  };
}
//@ chunk-exfmq47h.js:488411-488619 placement
/**
 * 决定思考内容的显示方式：显式设置优先；交互模式按开关显示摘要；非交互且输出格式满足条件时省略。
 */
function resolveThinkingDisplay({ explicitDisplay, isNonInteractive, outputFormat, verbose }) {
  if (explicitDisplay) return explicitDisplay;
  if (!isNonInteractive) return showThinkingSummaries() ? "summarized" : undefined;
  if (
    suppressesThinkingDisplay({
      isNonInteractive,
      outputFormat,
      verbose,
    })
  )
    return "omitted";
  return;
}
//@ chunk-exfmq47h.js:488619-488718 placement
/**
 * 非交互且输出为 text/非 verbose json 时抑制思考显示。
 */
function suppressesThinkingDisplay({ isNonInteractive, outputFormat, verbose }) {
  return isNonInteractive && (outputFormat === "text" || (outputFormat === "json" && !verbose));
}
//@ chunk-exfmq47h.js:488718-489049 placement
/**
 * 解析思考配置（禁用、自适应）。
 */
function resolveThinkingConfig(
  thinkingEnabled,
  thinkingConfig,
  options,
  thinkingDisplayOverride,
  thinkingDisplayFlag,
) {
  if (!isThinkingEffectivelyEnabled(options, thinkingEnabled))
    return {
      type: "disabled",
    };
  let thinkingEnabled_2;
  if (thinkingConfig.type !== "disabled") thinkingEnabled_2 = thinkingConfig;
  else {
    let thinkingDisplay = resolveThinkingDisplay({
      explicitDisplay: thinkingDisplayFlag,
      isNonInteractive: false,
      outputFormat: "text",
      verbose: false,
    });
    thinkingEnabled_2 = thinkingDisplay
      ? {
          type: "adaptive",
          display: thinkingDisplay,
        }
      : {
          type: "adaptive",
        };
    if (thinkingDisplayFlag !== undefined) thinkingEnabled_2.displayExplicit = true;
  }
  if (thinkingDisplayOverride === undefined) return thinkingEnabled_2;
  return {
    ...thinkingEnabled_2,
    display: thinkingDisplayOverride,
    displayExplicit: true,
  };
}
//@ chunk-exfmq47h.js:489049-489332 placement
/**
 * 非交互会话中，除非使用精确工具、转发子代理文本或异步（非 Cowork 聊天）情况，把子代理的思考显示改为 omitted（远程 worker 时即使显式设置也覆盖）。
 */
function applySubagentThinkingDisplay(
  thinkingConfig,
  {
    useExactTools,
    forwardSubagentText,
    isAsync,
    isNonInteractiveSession,
    sessionDisplayExplicit,
    isRemoteWorker,
    isChatOriginCoworkSession,
  },
) {
  if (
    !isNonInteractiveSession ||
    useExactTools ||
    forwardSubagentText ||
    (isAsync && !isChatOriginCoworkSession)
  )
    return thinkingConfig;
  if (!isRemoteWorker && (sessionDisplayExplicit || thinkingConfig.display === "omitted"))
    return thinkingConfig;
  return {
    ...thinkingConfig,
    display: "omitted",
    displayExplicit: false,
  };
}
//@ chunk-exfmq47h.js:489332-489416 fingerprint (2.1.88 match: isUltrathinkEnabled, 0.795)
/**
 * ultrathink 关键字是否生效：未设 CLAUDE_CODE_DISABLE_ULTRATHINK 且 tengu_turtle_carbon（默认开）。
 */
function isUltrathinkEnabled() {
  return (
    !env.CLAUDE_CODE_DISABLE_ULTRATHINK && getFeatureValue_CACHED_MAY_BE_STALE("tengu_turtle_carbon", true)
  );
}
//@ chunk-exfmq47h.js:489416-489464 file-local
/**
 * 文本是否含单词 ultrathink（不区分大小写）。
 */
function hasUltrathinkKeyword(text) {
  return /\bultrathink\b/i.test(text);
}
//@ chunk-exfmq47h.js:489464-489760 fingerprint (2.1.88 match: RAINBOW_COLORS, 0.667)
/**
 * ultrathink 高亮用的七色主题键；同句 i$ 为对应 shimmer 版本。
 */
var RAINBOW_COLORS = [
  "rainbow_red",
  "rainbow_orange",
  "rainbow_yellow",
  "rainbow_green",
  "rainbow_blue",
  "rainbow_indigo",
  "rainbow_violet",
];
var RAINBOW_SHIMMER_COLORS = [
  "rainbow_red_shimmer",
  "rainbow_orange_shimmer",
  "rainbow_yellow_shimmer",
  "rainbow_green_shimmer",
  "rainbow_blue_shimmer",
  "rainbow_indigo_shimmer",
  "rainbow_violet_shimmer",
];
//@ chunk-exfmq47h.js:489760-489815 file-local
/**
 * 按下标循环取彩虹色（可选 shimmer）。
 */
function getRainbowColor(charIndex, shimmer = false) {
  let colors = shimmer ? RAINBOW_SHIMMER_COLORS : RAINBOW_COLORS;
  return colors[charIndex % colors.length];
}
//@ chunk-exfmq47h.js:489815-489913 file-local
/**
 * 模型是否支持 thinking：3P 能力覆盖优先，否则非 claude-3- 即支持。
 */
function modelSupportsThinking(model) {
  let supported3P = getCapabilityOverrideCached(model, "thinking");
  if (supported3P !== undefined) return supported3P;
  return !getCanonicalName(model).includes("claude-3-");
}
//@ chunk-exfmq47h.js:489913-490340 layout
/**
 * 模型是否拒绝 thinking.type=disabled：已知旧模型为 false，否则看 catalog 能力 rejects_disabled_thinking，再否则第一方类提供商为真。
 */
function modelRejectsDisabledThinking(model) {
  let canonicalName = getCanonicalName(model);
  if (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-opus-4-6" ||
    canonicalName === "claude-opus-4-7" ||
    canonicalName === "claude-opus-4-8" ||
    canonicalName === "claude-opus-5" ||
    canonicalName === "claude-sonnet-4-0" ||
    canonicalName === "claude-sonnet-4-5" ||
    canonicalName === "claude-sonnet-4-6" ||
    canonicalName === "claude-sonnet-5" ||
    canonicalName === "claude-haiku-4-5"
  )
    return false;
  let canonicalName_2 = modelSupportsCapability(canonicalName, "rejects_disabled_thinking", model);
  if (canonicalName_2 !== undefined) return canonicalName_2;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-exfmq47h.js:490340-490416 layout
/**
 * 能力 rejects_disabled_thinking 明确为真且模型拒绝关闭思考。
 */
function isThinkingAlwaysOn(model) {
  return (
    modelSupportsCapability(getCanonicalName(model), "rejects_disabled_thinking", model) === true &&
    modelRejectsDisabledThinking(model)
  );
}
//@ chunk-exfmq47h.js:490416-490522 layout
/**
 * "Thinking can't be turned off for <模型>"（总是开思考的模型）。
 */
function getThinkingCannotBeDisabledMessage(model) {
  if (!isThinkingAlwaysOn(model)) return;
  return `Thinking can't be turned off for ${sanitizeTitle(
    renderModelName(
      getCanonicalName(model, {
        identity: true,
      }),
    ),
  )}`;
}
//@ chunk-exfmq47h.js:490522-490700 layout
/**
 * 模型思考常开时，把非机械关闭的 disabled 配置改成 adaptive（display 沿用或按 showThinkingSummaries 设为 summarized）。
 */
function upgradeDisabledThinkingForModel(thinkingConfig, thinkingAlwaysOn) {
  if (!thinkingAlwaysOn || thinkingConfig.type !== "disabled" || thinkingConfig.mechanical === true)
    return thinkingConfig;
  return {
    type: "adaptive",
    display: thinkingConfig.display ?? (showThinkingSummaries() ? "summarized" : undefined),
    displayExplicit: thinkingConfig.displayExplicit,
  };
}
//@ chunk-exfmq47h.js:490700-490740 layout
/**
 * 设置未显式关闭或模型思考常开。
 */
function isThinkingEffectivelyEnabled(model, thinkingEnabled) {
  return thinkingEnabled !== false || isThinkingAlwaysOn(model);
}
//@ chunk-exfmq47h.js:490740-490798 layout
/**
 * 辅助查询的思考设置：模型拒绝关闭思考时 [undefined, 2048]，否则 [false, 0]。
 */
function getSideQueryThinkingSettings(model) {
  if (modelRejectsDisabledThinking(model)) return [undefined, 2048];
  return [false, 0];
}
//@ chunk-exfmq47h.js:490798-490835 layout
/**
 * 同上，但暂停服务端目录查询（JN）。
 */
function getSideQueryThinkingSettingsOffline(model) {
  return withCatalogSuppressed(() => getSideQueryThinkingSettings(model));
}
//@ chunk-exfmq47h.js:490835-491062 file-local
/**
 * thinking 类型：运行时覆盖优先；模型支持 adaptive（且未用 CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING 关掉 4.6）为 adaptive，否则 enabled（带 budget_tokens）。
 */
function modelSupportsAdaptiveThinking({ runtimeOverride, resolvedModel, canonicalModel }) {
  if (runtimeOverride !== undefined) return runtimeOverride;
  let opts =
    env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING &&
    (canonicalModel.includes("opus-4-6") || canonicalModel.includes("sonnet-4-6"));
  return modelSupportsAdaptiveThinkingByCatalog(resolvedModel) && !opts ? "adaptive" : "enabled";
}
//@ chunk-exfmq47h.js:491062-491433 layout
/**
 * 能力覆盖 → 旧模型黑名单 → catalog 能力 adaptive_thinking → mythos-5 → 第一方类提供商默认。
 */
function modelSupportsAdaptiveThinkingByCatalog(model) {
  let capabilityOverride = getCapabilityOverrideCached(model, "adaptive_thinking");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(model);
  if (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-sonnet-4-0" ||
    canonicalName === "claude-sonnet-4-5" ||
    canonicalName === "claude-haiku-4-5"
  )
    return false;
  let capabilityOverride_2 = modelSupportsCapability(canonicalName, "adaptive_thinking", model);
  if (capabilityOverride_2 !== undefined) return capabilityOverride_2;
  if (canonicalName === "claude-mythos-5") return true;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-exfmq47h.js:491433-491641 fingerprint (2.1.88 match: shouldEnableThinkingByDefault, 0.592)
/**
 * 默认关闭思考的原因：MAX_THINKING_TOKENS<=0 或 settings.alwaysThinkingEnabled=false；否则 null（默认开）。
 */
function shouldEnableThinkingByDefault() {
  if (process.env.MAX_THINKING_TOKENS)
    return parseIntLoose(process.env.MAX_THINKING_TOKENS) > 0 ? null : "MAX_THINKING_TOKENS";
  let { settings } = getSettingsWithErrors();
  return settings.alwaysThinkingEnabled === false ? "alwaysThinkingEnabled" : null;
}
export {
  showThinkingSummaries,
  upgradeDisabledThinkingForModel,
  isThinkingAlwaysOn,
  modelRejectsDisabledThinking,
  modelSupportsAdaptiveThinking,
  modelSupportsAdaptiveThinkingByCatalog,
  modelSupportsThinking,
  isUltrathinkEnabled,
  hasUltrathinkKeyword,
  shouldEnableThinkingByDefault,
  getSideQueryThinkingSettingsOffline,
  getSideQueryThinkingSettings,
  isThinkingEffectivelyEnabled,
  getRainbowColor,
  getThinkingDisplayOverride,
  resolveThinkingDisplay,
  suppressesThinkingDisplay,
  getThinkingCannotBeDisabledMessage,
  resolveThinkingConfig,
  applySubagentThinkingDisplay,
};
