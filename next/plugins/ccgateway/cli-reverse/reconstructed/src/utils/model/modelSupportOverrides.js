/**
 * utils/model/modelSupportOverrides.ts
 *
 * 第三方提供商用 ANTHROPIC_DEFAULT_<族>_MODEL_SUPPORTED_CAPABILITIES 声明自定义模型能力。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelSupportOverrides.ts
 * pieces: chunk-exfmq47h.js (3)
 * attribution: fingerprint 2, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getProviderState } from "./providerCaches.js";
import { usesFirstPartyModelIds } from "./providers.js";
import { sameModelSpelling } from "./modelIds.js";

//@ chunk-exfmq47h.js:486871-487480 fingerprint (2.1.88 match: TIERS, 0.771)
/**
 * 档位环境变量对：ANTHROPIC_DEFAULT_{FABLE,OPUS,SONNET,HAIKU}_MODEL 与对应 _SUPPORTED_CAPABILITIES。
 */
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
//@ chunk-exfmq47h.js:487480-487637 layout
/**
 * 按 模型:能力 缓存 get3PModelCapabilityOverride 结果。
 */
function getCapabilityOverrideCached(model, capability) {
  let model_2 = model.toLowerCase();
  let cacheKey = `${model_2}:${capability}`;
  let capabilityOverrides = getProviderState().providerCache.capabilityOverrides;
  if (capabilityOverrides.has(cacheKey)) return capabilityOverrides.get(cacheKey);
  let override = get3PModelCapabilityOverride(model_2, capability);
  capabilityOverrides.set(cacheKey, override);
  return override;
}
//@ chunk-exfmq47h.js:487637-487883 fingerprint (2.1.88 match: get3PModelCapabilityOverride, 0.795)
/**
 * 非第一方类提供商时：模型等于某档 ANTHROPIC_DEFAULT_*_MODEL 且设了能力列表，则返回该能力是否在列表中；否则 undefined。
 */
function get3PModelCapabilityOverride(model, capability) {
  if (usesFirstPartyModelIds()) return;
  for (let tier of TIERS) {
    let pinned = process.env[tier.modelEnvVar]?.trim();
    let capabilities = process.env[tier.capabilitiesEnvVar];
    if (!pinned || capabilities === undefined) continue;
    if (!sameModelSpelling(model, pinned)) continue;
    return capabilities
      .toLowerCase()
      .split(",")
      .map((capability) => capability.trim())
      .includes(capability);
  }
  return;
}
export { getCapabilityOverrideCached };
