/**
 * cli/print/setMaxThinkingTokens.ts
 *
 * 2.1.316 新增：set_max_thinking_tokens 控制请求：thinking 预算与 thinking_display（含 highlights）切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (7)
 * attribution: placement 7
 */
import { setThinkingDisplayExplicit, isThinkingHighlightsRefused } from "../../bootstrap/state.js";
import { shouldSendInterleavedThinkingBeta } from "../../services/api/claude.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { areExperimentalBetasDisabled, isBetaHeaderAllowed } from "../../utils/betas.js";
import {
  isValidThinkingSettingsRequest,
  THINKING_SETTINGS_INVALID_MESSAGE,
} from "../../bridge/controlRequests.js";
import { WireSafeControlError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nh1pvp1m.js:84861-85341 placement
class ThinkingDisplayState {
  display;
  config;
  resetAnchor;
  holdsDefault = true;
  constructor(thinkingConfig, resetAnchor) {
    this.display = thinkingConfig && thinkingConfig.type !== "disabled" ? thinkingConfig.display : undefined;
    this.config = thinkingConfig;
    this.resetAnchor = resetAnchor;
  }
  current() {
    return this.config;
  }
  apply(maxThinkingTokens, display) {
    if (display !== undefined) {
      this.display = display ?? undefined;
      setThinkingDisplayExplicit(display !== null);
    }
    if (maxThinkingTokens === undefined) this.config = thinkingConfigFor(null, this.display, this.config);
    else {
      this.holdsDefault = maxThinkingTokens === null;
      this.config = thinkingConfigFor(maxThinkingTokens, this.display, this.resetAnchor);
    }
  }
  refreshDefault() {
    if (this.holdsDefault) this.config = thinkingConfigFor(null, this.display, this.resetAnchor);
  }
}
//@ chunk-nh1pvp1m.js:85341-85602 placement
var HIGHLIGHTS_UNAVAILABLE_REASONS; // deferred: uses formatHighlightsRefusal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nh1pvp1m.js:85341", () => {
  HIGHLIGHTS_UNAVAILABLE_REASONS = {
    experimentalBetasOff: formatHighlightsRefusal(
      "experimental betas are off (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS or organization policy)",
    ),
    model: formatHighlightsRefusal("this session's model does not support it on this API provider"),
    apiRejected: formatHighlightsRefusal('the API has already rejected "highlights"'),
  };
});
//@ chunk-nh1pvp1m.js:85602-85794 placement
function highlightsRefusal(display) {
  if (display !== "highlights") return;
  let reasons = HIGHLIGHTS_UNAVAILABLE_REASONS;
  if (shouldSendInterleavedThinkingBeta(getMainLoopModel()))
    return isThinkingHighlightsRefused()
      ? {
          ok: false,
          error: reasons.apiRejected,
        }
      : undefined;
  if (areExperimentalBetasDisabled())
    return {
      ok: false,
      error: reasons.experimentalBetasOff,
    };
  return {
    ok: false,
    error: reasons.model,
  };
}
//@ chunk-nh1pvp1m.js:85794-85904 placement
/**
 * 应用思考预算与显示设置：显示设置被拒时视请求情况返回错误或只应用预算。
 */
function applyThinkingBudget(state, tokenCount, display) {
  let refusal = highlightsRefusal(display);
  if (!refusal) return state.apply(tokenCount, display);
  if (tokenCount === undefined) return refusal;
  return state.apply(tokenCount, undefined) ?? refusal;
}
//@ chunk-nh1pvp1m.js:85904-86101 placement
/**
 * 处理 set_max_thinking_tokens 控制请求：校验请求，应用预算与显示设置，部分被拒时抛出可回传的错误。
 */
var handleSetMaxThinkingTokens = (request, host) => {
  if (!isValidThinkingSettingsRequest(request))
    throw new WireSafeControlError(THINKING_SETTINGS_INVALID_MESSAGE);
  let refusal = applyThinkingBudget(
    host.thinkingBudget,
    request.max_thinking_tokens,
    request.thinking_display,
  );
  if (refusal)
    throw new WireSafeControlError(refusal.error, "set_max_thinking_tokens: part of the request refused");
};
//@ chunk-nh1pvp1m.js:86101-86325 placement
/**
 * 由预算生成 thinking 配置：null 时沿用现有配置或（允许时）用 adaptive，0 为禁用，其他为 enabled 带预算，都附带 display。
 */
function thinkingConfigFor(maxThinkingTokens, display, existing) {
  if (maxThinkingTokens === null) {
    if (existing)
      return existing.type !== "disabled"
        ? {
            ...existing,
            display,
          }
        : existing;
    return display !== undefined && isBetaHeaderAllowed()
      ? {
          type: "adaptive",
          display,
        }
      : undefined;
  }
  if (maxThinkingTokens === 0)
    return {
      type: "disabled",
    };
  return {
    type: "enabled",
    budgetTokens: maxThinkingTokens,
    display,
  };
}
//@ chunk-nh1pvp1m.js:86325-86562 placement
function formatHighlightsRefusal(reason) {
  return `set_max_thinking_tokens: thinking_display "highlights" was not applied because ${reason}; the display stays as it was. max_thinking_tokens was applied if the request carried it. "summarized" and "omitted" are accepted.`;
}
export {
  ThinkingDisplayState,
  applyThinkingBudget,
  handleSetMaxThinkingTokens,
  highlightsRefusal,
  thinkingConfigFor,
};
