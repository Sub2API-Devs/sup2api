/**
 * utils/model/modelContextInfo.ts
 *
 * 2.1.316 新增：模型上下文信息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { getSubscriptionType } from "../auth.js";
import { getAutoCompactWindowSurface, getSdkBetas } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "../config.js";
import {
  cachedClientDataForContext,
  autoCompactWindowsCache,
  getContextWindowInfo,
  getContextWindow,
  believedContextWindow,
  getMaxContextWindowForEntry,
} from "./configs.js";
import { getCanonicalName, isRecognizedModel } from "./canonicalModelName.js";
import { getMaxOutputTokensForModel } from "../../services/api/claude.js";
import { getModelSettingsKey, modelCapsEffortWhenThinkingDisabled } from "../effort.js";
import { uses1mContext } from "./contextWindow1m.js";
import { strip1mSuffix } from "./modelIds.js";
import { antUpstreamContextWindow } from "./classifierModel.js";
import { anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { bytesPerTokenForModel } from "./modelDisplay.js";
import { modelSupportsThinking, isThinkingAlwaysOn, modelRejectsDisabledThinking } from "../thinking.js";
import { modelSupportsTemperature } from "../betas.js";

//@ chunk-5xgkngpb.js:975982-976054 placement
function contextFieldValue(bySubscription, subscriptionType) {
  if (subscriptionType && Object.hasOwn(bySubscription, subscriptionType))
    return bySubscription[subscriptionType];
  return bySubscription.default;
}
//@ chunk-5xgkngpb.js:976054-976323 placement
/**
 * 解析按入口与订阅类型区分的窗口配置值（数字或对象）。
 */
function resolveSurfaceWindow(config) {
  if (typeof config === "number") return config;
  if (typeof config !== "object" || config === null || Array.isArray(config)) return;
  let { surfaces, ...base } = config;
  let subscriptionType = getSubscriptionType();
  let surfaceKey = getAutoCompactWindowSurface() ?? env.CLAUDE_CODE_ENTRYPOINT;
  let surfaceValue =
    surfaceKey && surfaces && Object.hasOwn(surfaces, surfaceKey) ? surfaces[surfaceKey] : undefined;
  if (surfaceValue) {
    let resolved = contextFieldValue(surfaceValue, subscriptionType);
    if (resolved !== undefined) return resolved;
  }
  return contextFieldValue(base, subscriptionType);
}
//@ chunk-5xgkngpb.js:976323-976693 placement
/**
 * 从客户端数据（rowan_thicket 与另一来源）中读取某模型的自动压缩窗口（按入口/订阅类型解析、限制在合法范围内），并返回后者是否替换默认值。
 */
function getClientDataAutoCompactWindow(canonical) {
  let validWindow = (surfaceWindow) =>
    typeof surfaceWindow === "number" &&
    Number.isInteger(surfaceWindow) &&
    surfaceWindow >= TRANSPORT_LABELS &&
    surfaceWindow <= GLOBAL_CONFIG_FIELD_KINDS
      ? surfaceWindow
      : null;
  let readSource = (source) => {
    if (typeof source !== "object" || source === null || Array.isArray(source))
      return {
        window: null,
        present: false,
      };
    if (!Object.hasOwn(source, canonical))
      return {
        window: null,
        present: false,
      };
    return {
      window: validWindow(resolveSurfaceWindow(source[canonical])),
      present: true,
    };
  };
  let cached = readSource(cachedClientDataForContext()?.rowan_thicket);
  let current = readSource(autoCompactWindowsCache());
  return {
    window: cached.window ?? current.window,
    replacesDefault: current.present,
  };
}
//@ chunk-5xgkngpb.js:976693-977245 placement
/**
 * 汇总模型的上下文信息：规范名、上下文窗口、最大输出、1M 选用与 API 实际窗口、服务端窗口、是否识别、每 token 字节数、客户端自动压缩窗口、思考能力与温度支持。
 */
function getModelContextInfo(model, betas = getSdkBetas()) {
  let canonical = getCanonicalName(model);
  let servedWindow = getContextWindowInfo(model, canonical);
  return {
    model,
    contextWindow: getContextWindow(model, betas),
    maxOutputTokens: getMaxOutputTokensForModel(model),
    canonical,
    settingsKey: getModelSettingsKey(model),
    longContextWindowWithoutOptIn: believedContextWindow(model, canonical, servedWindow),
    optIn1mHonored: uses1mContext(model, betas),
    apiContextWindowWithoutOptIn: Math.max(
      getMaxContextWindowForEntry(canonical),
      getMaxContextWindowForEntry(
        getCanonicalName(model, {
          identity: true,
          overridesMap: {},
        }),
      ),
      getMaxContextWindowForEntry(getCanonicalName(strip1mSuffix(model))),
      servedWindow?.withoutOptIn ?? antUpstreamContextWindow(model) ?? 0,
    ),
    servedWindow,
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
