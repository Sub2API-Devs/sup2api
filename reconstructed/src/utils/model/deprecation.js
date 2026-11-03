/**
 * utils/model/deprecation.ts
 *
 * 弃用模型表与提示：各提供商退役日期、旧 Opus 4/4.1 自动重映射到最新 Opus（CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP 可关）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/deprecation.ts
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: fingerprint 3, layout 4
 */
import { getCanonicalName } from "./canonicalModelName.js";
import { Lt } from "./modelIds.js";
import { getAPIProvider, usesFirstPartyModelIds } from "./providers.js";
import {
  isLegacyOpusFirstParty,
  isLegacyModelRemapEnabled,
  getDefaultOpusModel,
  getMarketingNameForModel,
} from "./model.js";

/**
 * 弃用模型：opus-4-1、opus-4-0（重映射到最新 Opus）、sonnet-4-0、3-opus、3-7-sonnet、3-5-haiku，各提供商退役日期。
 */
//@ chunk-aepeg2w5.js:404666-406067 fingerprint = DEPRECATED_MODELS (0.677)
var DEPRECATED_MODELS = {
  "claude-opus-4-1": {
    modelName: "Claude Opus 4.1",
    retirementDates: {
      firstParty: null,
      bedrock: null,
      vertex: null,
      foundry: null,
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
    remappedTo: "the latest Opus",
  },
  "claude-opus-4-0": {
    modelName: "Claude Opus 4",
    retirementDates: {
      firstParty: "June 15, 2026",
      bedrock: "May 31, 2026",
      vertex: "September 14, 2026",
      foundry: null,
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
    remappedTo: "the latest Opus",
  },
  "claude-sonnet-4-0": {
    modelName: "Claude Sonnet 4",
    retirementDates: {
      firstParty: "June 15, 2026",
      bedrock: "October 14, 2026",
      vertex: "September 14, 2026",
      foundry: null,
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
  },
  "claude-3-opus": {
    modelName: "Claude 3 Opus",
    retirementDates: {
      firstParty: "January 5, 2026",
      bedrock: "January 15, 2026",
      vertex: "January 5, 2026",
      foundry: "January 5, 2026",
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
  },
  "claude-3-7-sonnet": {
    modelName: "Claude 3.7 Sonnet",
    retirementDates: {
      firstParty: "February 19, 2026",
      bedrock: "April 28, 2026",
      vertex: "May 11, 2026",
      foundry: "February 19, 2026",
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
  },
  "claude-3-5-haiku": {
    modelName: "Claude 3.5 Haiku",
    retirementDates: {
      firstParty: "February 19, 2026",
      bedrock: null,
      vertex: null,
      foundry: null,
      anthropicAws: null,
      anthropicGoogleCloud: null,
      mantle: null,
      gateway: null,
    },
  },
};
/**
 * 查模型弃用信息：命中表且当前提供商有退役日期或属于旧 Opus 重映射时返回 {isDeprecated, modelName, copy:{kind: remap/retirement/none}}。
 */
//@ chunk-aepeg2w5.js:406067-406526 fingerprint = getDeprecatedModelInfo (0.495)
function getDeprecatedModelInfo(modelId) {
  let n = getCanonicalName(Lt(modelId), { identity: !0 }),
    provider = getAPIProvider(),
    trimmed = Lt(modelId.trim().toLowerCase()).trim(),
    h = usesFirstPartyModelIds() && isLegacyOpusFirstParty(trimmed) && isLegacyModelRemapEnabled(),
    y = Object.hasOwn(DEPRECATED_MODELS, n) ? DEPRECATED_MODELS[n] : void 0;
  if (y) {
    let retirementDate = y.retirementDates[provider];
    if (retirementDate || h) {
      let w = { kind: "none" };
      if (h && y.remappedTo) w = { kind: "remap", remappedTo: y.remappedTo };
      else if (retirementDate) {
        let date = new Date(retirementDate);
        w = {
          kind: "retirement",
          retirementDate: retirementDate,
          isPast: !Number.isNaN(date.getTime()) && date < new Date(),
        };
      }
      return { isDeprecated: !0, modelName: y.modelName, copy: w };
    }
  }
  return { isDeprecated: !1 };
}
/**
 * 是否在弃用表中且对当前提供商生效。
 */
//@ chunk-aepeg2w5.js:406526-406568 layout
function isModelDeprecated(e) {
  return getDeprecatedModelInfo(e).isDeprecated;
}
/**
 * 旧 Opus 将被重映射，或弃用且已重映射/已过退役日期。
 */
//@ chunk-aepeg2w5.js:406568-406777 layout
function isModelRemappedOrRetired(e) {
  if (
    usesFirstPartyModelIds() &&
    isLegacyOpusFirstParty(getCanonicalName(Lt(e), { identity: !0 })) &&
    isLegacyModelRemapEnabled()
  )
    return !0;
  let n = getDeprecatedModelInfo(e);
  if (!n.isDeprecated) return !1;
  switch (n.copy.kind) {
    case "remap":
      return !0;
    case "retirement":
      return n.copy.isPast;
    case "none":
      return !1;
  }
}
/**
 * 弃用通知 {message, action}（"now runs as …" 或 "retired/retires …"）。
 */
//@ chunk-aepeg2w5.js:406777-407140 layout
function getDeprecationNotice(e) {
  if (!e) return null;
  let n = getDeprecatedModelInfo(e);
  if (!n.isDeprecated) return null;
  switch (n.copy.kind) {
    case "remap":
      return { message: `${n.modelName} now runs as ${n.copy.remappedTo}`, action: "/model to change" };
    case "retirement":
      return {
        message: `${n.modelName} ${n.copy.isPast ? "retired" : "retires"} ${n.copy.retirementDate}`,
        action: "/model to switch",
      };
    case "none":
      return null;
  }
}
/**
 * 简短弃用提示；remap 时 "⚠ X remaps to …"，否则走完整警告。
 */
//@ chunk-aepeg2w5.js:407140-407383 layout
function getDeprecationStatusLine(e) {
  if (!e) return null;
  let n = getDeprecatedModelInfo(e);
  if (!n.isDeprecated || n.copy.kind !== "remap") return getModelDeprecationWarning(e);
  let r = getDefaultOpusModel(),
    s = getMarketingNameForModel(r) ?? r;
  return `\u26A0 ${n.modelName.replace(/^Claude /, "")} remaps to ${s}. CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 opts out`;
}
/**
 * 完整弃用警告文案（remap 指明目标模型与关闭变量；退役给出日期）。
 */
//@ chunk-aepeg2w5.js:407383-407872 fingerprint = getModelDeprecationWarning (0.531)
function getModelDeprecationWarning(modelId) {
  if (!modelId) return null;
  let info = getDeprecatedModelInfo(modelId);
  if (!info.isDeprecated) return null;
  switch (info.copy.kind) {
    case "remap": {
      let r = getDefaultOpusModel(),
        s = getMarketingNameForModel(r) ?? r;
      return `\u26A0 ${modelId.trim()} is automatically remapped to ${s} (${info.copy.remappedTo}). Set CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 to keep the requested model.`;
    }
    case "retirement": {
      let r = info.copy.isPast ? "was retired on" : "will be retired on";
      return `\u26A0 ${info.modelName} ${r} ${info.copy.retirementDate}. Consider switching to a newer model.`;
    }
    case "none":
      return null;
  }
}

export {
  isModelRemappedOrRetired,
  getDeprecationNotice,
  getModelDeprecationWarning,
  getDeprecationStatusLine,
  isModelDeprecated,
};
