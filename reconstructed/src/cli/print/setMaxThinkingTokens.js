/**
 * cli/print/setMaxThinkingTokens.ts
 *
 * 2.1.316 新增：set_max_thinking_tokens 控制请求：thinking 预算与 thinking_display（含 highlights）切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (7)
 * attribution: placement 7
 */
import { setThinkingDisplayExplicit, isThinkingHighlightsRefused } from "../../bootstrap/state.js";
import { _Jn } from "../../services/api/claude.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { areExperimentalBetasDisabled, isBetaHeaderAllowed } from "../../utils/betas.js";
import { isValidThinkingSettingsRequest, c7r } from "../../bridge/controlRequests.js";
import { WireSafeControlError } from "../../utils/errors.js";

//@ chunk-0sfjpx19.js:135581-136061 placement
class ThinkingDisplayState {
  display;
  config;
  resetAnchor;
  holdsDefault = !0;
  constructor(e, n) {
    ((this.display = e && e.type !== "disabled" ? e.display : void 0),
      (this.config = e),
      (this.resetAnchor = n));
  }
  current() {
    return this.config;
  }
  apply(e, n) {
    if (n !== void 0) ((this.display = n ?? void 0), setThinkingDisplayExplicit(n !== null));
    if (e === void 0) this.config = thinkingConfigFor(null, this.display, this.config);
    else
      ((this.holdsDefault = e === null),
        (this.config = thinkingConfigFor(e, this.display, this.resetAnchor)));
  }
  refreshDefault() {
    if (this.holdsDefault) this.config = thinkingConfigFor(null, this.display, this.resetAnchor);
  }
}
//@ chunk-0sfjpx19.js:136061-136322 placement
var HIGHLIGHTS_UNAVAILABLE_REASONS = {
  experimentalBetasOff: formatHighlightsRefusal(
    "experimental betas are off (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS or organization policy)",
  ),
  model: formatHighlightsRefusal("this session's model does not support it on this API provider"),
  apiRejected: formatHighlightsRefusal('the API has already rejected "highlights"'),
};
//@ chunk-0sfjpx19.js:136322-136513 placement
function highlightsRefusal(e) {
  if (e !== "highlights") return;
  let n = HIGHLIGHTS_UNAVAILABLE_REASONS;
  if (_Jn(getMainLoopModel()))
    return isThinkingHighlightsRefused() ? { ok: !1, error: n.apiRejected } : void 0;
  if (areExperimentalBetasDisabled()) return { ok: !1, error: n.experimentalBetasOff };
  return { ok: !1, error: n.model };
}
/**
 * 应用思考预算与显示设置：显示设置被拒时视请求情况返回错误或只应用预算。
 */
//@ chunk-0sfjpx19.js:136513-136622 placement
function applyThinkingBudget(e, n, r) {
  let s = highlightsRefusal(r);
  if (!s) return e.apply(n, r);
  if (n === void 0) return s;
  return e.apply(n, void 0) ?? s;
}
/**
 * 处理 set_max_thinking_tokens 控制请求：校验请求，应用预算与显示设置，部分被拒时抛出可回传的错误。
 */
//@ chunk-0sfjpx19.js:136622-136819 placement
var handleSetMaxThinkingTokens = (e, n) => {
  if (!isValidThinkingSettingsRequest(e)) throw new WireSafeControlError(c7r);
  let r = applyThinkingBudget(n.thinkingBudget, e.max_thinking_tokens, e.thinking_display);
  if (r) throw new WireSafeControlError(r.error, "set_max_thinking_tokens: part of the request refused");
};
/**
 * 由预算生成 thinking 配置：null 时沿用现有配置或（允许时）用 adaptive，0 为禁用，其他为 enabled 带预算，都附带 display。
 */
//@ chunk-0sfjpx19.js:136819-137043 placement
function thinkingConfigFor(e, n, r) {
  if (e === null) {
    if (r) return r.type !== "disabled" ? { ...r, display: n } : r;
    return n !== void 0 && isBetaHeaderAllowed() ? { type: "adaptive", display: n } : void 0;
  }
  if (e === 0) return { type: "disabled" };
  return { type: "enabled", budgetTokens: e, display: n };
}
//@ chunk-0sfjpx19.js:137043-137280 placement
function formatHighlightsRefusal(e) {
  return `set_max_thinking_tokens: thinking_display "highlights" was not applied because ${e}; the display stays as it was. max_thinking_tokens was applied if the request carried it. "summarized" and "omitted" are accepted.`;
}

export { handleSetMaxThinkingTokens, ThinkingDisplayState, applyThinkingBudget, thinkingConfigFor };
