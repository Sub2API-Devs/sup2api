/**
 * utils/model/modelContextInfo.ts
 *
 * 2.1.316 新增：模型上下文信息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { getSubscriptionType } from "../auth.js";
import { getAutoCompactWindowSurface, getSdkBetas } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { Kx, d0 } from "../config.js";
import {
  uvi,
  fvi,
  getContextWindowInfo,
  getContextWindow,
  cvi,
  getMaxContextWindowForEntry,
} from "./configs.js";
import { getCanonicalName, isRecognizedModel } from "./canonicalModelName.js";
import { getMaxOutputTokensForModel } from "../../services/api/claude.js";
import { getModelSettingsKey, modelCapsEffortWhenThinkingDisabled } from "../effort.js";
import { kmr } from "./contextWindow1m.js";
import { Lt } from "./modelIds.js";
import { antUpstreamContextWindow } from "./classifierModel.js";
import { anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { bytesPerTokenForModel } from "./modelDisplay.js";
import { modelSupportsThinking, isThinkingAlwaysOn, modelRejectsDisabledThinking } from "../thinking.js";
import { modelSupportsTemperature } from "../betas.js";

//@ chunk-e6aww6q8.js:962673-962745 placement
function YUt(e, n) {
  if (n && Object.hasOwn(e, n)) return e[n];
  return e.default;
}
/**
 * 解析按入口与订阅类型区分的窗口配置值（数字或对象）。
 */
//@ chunk-e6aww6q8.js:962745-963014 placement
function resolveSurfaceWindow(e) {
  if (typeof e === "number") return e;
  if (typeof e !== "object" || e === null || Array.isArray(e)) return;
  let { surfaces: surfaces, ...r } = e,
    s = getSubscriptionType(),
    h = getAutoCompactWindowSurface() ?? env.CLAUDE_CODE_ENTRYPOINT,
    y = h && surfaces && Object.hasOwn(surfaces, h) ? surfaces[h] : void 0;
  if (y) {
    let S = YUt(y, s);
    if (S !== void 0) return S;
  }
  return YUt(r, s);
}
/**
 * 从客户端数据（rowan_thicket 与另一来源）中读取某模型的自动压缩窗口（按入口/订阅类型解析、限制在合法范围内），并返回后者是否替换默认值。
 */
//@ chunk-e6aww6q8.js:963014-963384 placement
function getClientDataAutoCompactWindow(e) {
  let n = (y) => (typeof y === "number" && Number.isInteger(y) && y >= Kx && y <= d0 ? y : null),
    r = (y) => {
      if (typeof y !== "object" || y === null || Array.isArray(y)) return { window: null, present: !1 };
      if (!Object.hasOwn(y, e)) return { window: null, present: !1 };
      return { window: n(resolveSurfaceWindow(y[e])), present: !0 };
    },
    s = r(uvi()?.rowan_thicket),
    h = r(fvi());
  return { window: s.window ?? h.window, replacesDefault: h.present };
}
/**
 * 汇总模型的上下文信息：规范名、上下文窗口、最大输出、1M 选用与 API 实际窗口、服务端窗口、是否识别、每 token 字节数、客户端自动压缩窗口、思考能力与温度支持。
 */
//@ chunk-e6aww6q8.js:963384-963936 placement
function getModelContextInfo(model, betas = getSdkBetas()) {
  let canonical = getCanonicalName(model),
    servedWindow = getContextWindowInfo(model, canonical);
  return {
    model: model,
    contextWindow: getContextWindow(model, betas),
    maxOutputTokens: getMaxOutputTokensForModel(model),
    canonical: canonical,
    settingsKey: getModelSettingsKey(model),
    longContextWindowWithoutOptIn: cvi(model, canonical, servedWindow),
    optIn1mHonored: kmr(model, betas),
    apiContextWindowWithoutOptIn: Math.max(
      getMaxContextWindowForEntry(canonical),
      getMaxContextWindowForEntry(getCanonicalName(model, { identity: !0, overridesMap: {} })),
      getMaxContextWindowForEntry(getCanonicalName(Lt(model))),
      servedWindow?.withoutOptIn ?? antUpstreamContextWindow(model) ?? 0,
    ),
    servedWindow: servedWindow,
    recognized: isRecognizedModel(model, canonical) || anyModelDescribed(model, canonical),
    bytesPerToken: bytesPerTokenForModel(model),
    clientDataAutoCompactWindow: getClientDataAutoCompactWindow(canonical),
    thinking: {
      supported: modelSupportsThinking(model),
      alwaysOn: isThinkingAlwaysOn(model),
      rejectsDisabled: modelRejectsDisabledThinking(model),
      capsEffortWhenDisabled: modelCapsEffortWhenThinkingDisabled(model),
    },
    acceptsTemperature: modelSupportsTemperature(model),
  };
}

export { getModelContextInfo, resolveSurfaceWindow };
