/**
 * utils/model/modelSupportOverrides.ts
 *
 * 第三方提供商用 ANTHROPIC_DEFAULT_<族>_MODEL_SUPPORTED_CAPABILITIES 声明自定义模型能力。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelSupportOverrides.ts
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: fingerprint 2, layout 1
 */
import { getProviderState } from "./providerCaches.js";
import { usesFirstPartyModelIds } from "./providers.js";
import { Sv } from "./modelIds.js";

/**
 * 档位环境变量对：ANTHROPIC_DEFAULT_{FABLE,OPUS,SONNET,HAIKU}_MODEL 与对应 _SUPPORTED_CAPABILITIES。
 */
//@ chunk-aepeg2w5.js:475473-476082 fingerprint = TIERS (0.771)
var TIERS = [
  {
    modelEnvVar: "ANTHROPIC_DEFAULT_FABLE_MODEL",
    capabilitiesEnvVar: "ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES",
  },
  {
    modelEnvVar: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    capabilitiesEnvVar: "ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES",
  },
  {
    modelEnvVar: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    capabilitiesEnvVar: "ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES",
  },
  {
    modelEnvVar: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    capabilitiesEnvVar: "ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES",
  },
  {
    modelEnvVar: "ANTHROPIC_CUSTOM_MODEL_OPTION",
    capabilitiesEnvVar: "ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES",
  },
];
/**
 * 按 模型:能力 缓存 get3PModelCapabilityOverride 结果。
 */
//@ chunk-aepeg2w5.js:476082-476239 layout
function getCapabilityOverrideCached(e, n) {
  let lower = e.toLowerCase(),
    s = `${lower}:${n}`,
    capabilityOverrides = getProviderState().providerCache.capabilityOverrides;
  if (capabilityOverrides.has(s)) return capabilityOverrides.get(s);
  let y = get3PModelCapabilityOverride(lower, n);
  return (capabilityOverrides.set(s, y), y);
}
/**
 * 非第一方类提供商时：模型等于某档 ANTHROPIC_DEFAULT_*_MODEL 且设了能力列表，则返回该能力是否在列表中；否则 undefined。
 */
//@ chunk-aepeg2w5.js:476239-476485 fingerprint = get3PModelCapabilityOverride (0.794)
function get3PModelCapabilityOverride(model, capability) {
  if (usesFirstPartyModelIds()) return;
  for (let tier of TIERS) {
    let s = process.env[tier.modelEnvVar]?.trim(),
      h = process.env[tier.capabilitiesEnvVar];
    if (!s || h === void 0) continue;
    if (!Sv(model, s)) continue;
    return h
      .toLowerCase()
      .split(",")
      .map((y) => y.trim())
      .includes(capability);
  }
  return;
}

export { getCapabilityOverrideCached };
