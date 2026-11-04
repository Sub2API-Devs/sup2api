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
import { strip1mSuffix } from "./modelIds.js";
import { getAPIProvider, usesFirstPartyModelIds } from "./providers.js";
import {
  isLegacyOpusFirstParty,
  isLegacyModelRemapEnabled,
  getDefaultOpusModel,
  getMarketingNameForModel,
} from "./model.js";

//@ chunk-aepeg2w5.js:404666-406067 fingerprint (2.1.88 match: DEPRECATED_MODELS, 0.677)
/**
 * 弃用模型：opus-4-1、opus-4-0（重映射到最新 Opus）、sonnet-4-0、3-opus、3-7-sonnet、3-5-haiku，各提供商退役日期。
 */
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
//@ chunk-aepeg2w5.js:406067-406526 fingerprint (2.1.88 match: getDeprecatedModelInfo, 0.495)
/**
 * 查模型弃用信息：命中表且当前提供商有退役日期或属于旧 Opus 重映射时返回 {isDeprecated, modelName, copy:{kind: remap/retirement/none}}。
 */
function getDeprecatedModelInfo(modelId) {
  let canonicalName = getCanonicalName(strip1mSuffix(modelId), {
    identity: true,
  });
  let provider = getAPIProvider();
  let trimmed = strip1mSuffix(modelId.trim().toLowerCase()).trim();
  let remapEnabled =
    usesFirstPartyModelIds() && isLegacyOpusFirstParty(trimmed) && isLegacyModelRemapEnabled();
  let entry = Object.hasOwn(DEPRECATED_MODELS, canonicalName) ? DEPRECATED_MODELS[canonicalName] : undefined;
  if (entry) {
    let retirementDate = entry.retirementDates[provider];
    if (retirementDate || remapEnabled) {
      let copy = {
        kind: "none",
      };
      if (remapEnabled && entry.remappedTo)
        copy = {
          kind: "remap",
          remappedTo: entry.remappedTo,
        };
      else if (retirementDate) {
        let date = new Date(retirementDate);
        copy = {
          kind: "retirement",
          retirementDate,
          isPast: !Number.isNaN(date.getTime()) && date < new Date(),
        };
      }
      return {
        isDeprecated: true,
        modelName: entry.modelName,
        copy,
      };
    }
  }
  return {
    isDeprecated: false,
  };
}
//@ chunk-aepeg2w5.js:406526-406568 layout
/**
 * 是否在弃用表中且对当前提供商生效。
 */
function isModelDeprecated(modelId) {
  return getDeprecatedModelInfo(modelId).isDeprecated;
}
//@ chunk-aepeg2w5.js:406568-406777 layout
/**
 * 旧 Opus 将被重映射，或弃用且已重映射/已过退役日期。
 */
function isModelRemappedOrRetired(modelId) {
  if (
    usesFirstPartyModelIds() &&
    isLegacyOpusFirstParty(
      getCanonicalName(strip1mSuffix(modelId), {
        identity: true,
      }),
    ) &&
    isLegacyModelRemapEnabled()
  )
    return true;
  let deprecatedModelInfo = getDeprecatedModelInfo(modelId);
  if (!deprecatedModelInfo.isDeprecated) return false;
  switch (deprecatedModelInfo.copy.kind) {
    case "remap":
      return true;
    case "retirement":
      return deprecatedModelInfo.copy.isPast;
    case "none":
      return false;
  }
}
//@ chunk-aepeg2w5.js:406777-407140 layout
/**
 * 弃用通知 {message, action}（"now runs as …" 或 "retired/retires …"）。
 */
function getDeprecationNotice(modelId) {
  if (!modelId) return null;
  let deprecatedModelInfo = getDeprecatedModelInfo(modelId);
  if (!deprecatedModelInfo.isDeprecated) return null;
  switch (deprecatedModelInfo.copy.kind) {
    case "remap":
      return {
        message: `${deprecatedModelInfo.modelName} now runs as ${deprecatedModelInfo.copy.remappedTo}`,
        action: "/model to change",
      };
    case "retirement":
      return {
        message: `${deprecatedModelInfo.modelName} ${deprecatedModelInfo.copy.isPast ? "retired" : "retires"} ${deprecatedModelInfo.copy.retirementDate}`,
        action: "/model to switch",
      };
    case "none":
      return null;
  }
}
//@ chunk-aepeg2w5.js:407140-407383 layout
/**
 * 简短弃用提示；remap 时 "⚠ X remaps to …"，否则走完整警告。
 */
function getDeprecationStatusLine(modelId) {
  if (!modelId) return null;
  let deprecatedModelInfo = getDeprecatedModelInfo(modelId);
  if (!deprecatedModelInfo.isDeprecated || deprecatedModelInfo.copy.kind !== "remap")
    return getModelDeprecationWarning(modelId);
  let defaultOpusModel = getDefaultOpusModel();
  let targetName = getMarketingNameForModel(defaultOpusModel) ?? defaultOpusModel;
  return `\u26A0 ${deprecatedModelInfo.modelName.replace(/^Claude /, "")} remaps to ${targetName}. CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 opts out`;
}
//@ chunk-aepeg2w5.js:407383-407872 fingerprint (2.1.88 match: getModelDeprecationWarning, 0.531)
/**
 * 完整弃用警告文案（remap 指明目标模型与关闭变量；退役给出日期）。
 */
function getModelDeprecationWarning(modelId) {
  if (!modelId) return null;
  let info = getDeprecatedModelInfo(modelId);
  if (!info.isDeprecated) return null;
  switch (info.copy.kind) {
    case "remap": {
      let defaultOpusModel = getDefaultOpusModel();
      let targetName = getMarketingNameForModel(defaultOpusModel) ?? defaultOpusModel;
      return `\u26A0 ${modelId.trim()} is automatically remapped to ${targetName} (${info.copy.remappedTo}). Set CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 to keep the requested model.`;
    }
    case "retirement": {
      let verb = info.copy.isPast ? "was retired on" : "will be retired on";
      return `\u26A0 ${info.modelName} ${verb} ${info.copy.retirementDate}. Consider switching to a newer model.`;
    }
    case "none":
      return null;
  }
}
export {
  isModelRemappedOrRetired,
  getModelDeprecationWarning,
  getDeprecationNotice,
  getDeprecationStatusLine,
  isModelDeprecated,
};
