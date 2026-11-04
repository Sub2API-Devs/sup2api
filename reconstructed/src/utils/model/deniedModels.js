/**
 * utils/model/deniedModels.ts
 *
 * 2.1.316 新增：解析一条 deniedModels 条目（忽略上下文标签、空条目警告）；生成 availableModels 条目被忽略或受限的说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (18)
 * attribution: affinity 1, placement 17
 */
import {
  MODEL_KEY_NAMES,
  stripAnyVersatileSuffix,
  isBaseModelKey,
  isModelKeyAlias,
  parseModelId,
  strip1mSuffix,
  isSameModelVersion,
  LEGACY_MODEL_IDS_2,
  compareVersion,
} from "./modelIds.js";
import { boundedEditDistance } from "../settings/managedEnvKeys.js";

//@ chunk-dcmhvw5a.js:417298-417414 affinity
function sanitizeEntryForDisplay(entry) {
  let replaced = entry.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
  return replaced.length > 128 ? `${replaced.slice(0, 128)}\u2026` : replaced;
}
//@ chunk-dcmhvw5a.js:417414-417504 placement
function formatModelFamilyList() {
  let names = [...MODEL_KEY_NAMES];
  let last = names.pop();
  return names.length === 0 ? (last ?? "") : `${names.join(", ")} or ${last}`;
}
//@ chunk-dcmhvw5a.js:417504-417563 placement = capitalize (1)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-dcmhvw5a.js:417563-418499 placement
/**
 * 解析 deniedModels 的一个条目：族名（如 opus）、具体版本或字面量，并给出说明其屏蔽范围的警告文字；忽略 [1m] 等上下文标签。
 */
function parseDeniedModelEntry(raw) {
  let lower = raw.trim().toLowerCase();
  let trimmed = stripAnyVersatileSuffix(lower).trim();
  let contextSuffixNote =
    trimmed !== lower
      ? " Context-size tags such as [1m] are ignored: the entry blocks the model at every context size."
      : "";
  if (trimmed === "")
    return {
      entry: null,
      warning: "An empty deniedModels entry was ignored.",
    };
  if (isBaseModelKey(trimmed))
    return {
      entry: {
        kind: "family",
        family: trimmed,
      },
      ...(contextSuffixNote !== "" && {
        warning: `"${sanitizeEntryForDisplay(raw)}" blocks every ${capitalize(trimmed)} model.${contextSuffixNote}`,
      }),
    };
  if (isModelKeyAlias(trimmed) || trimmed === "default")
    return {
      entry: null,
      warning: `"${sanitizeEntryForDisplay(raw)}" was ignored: it names a different model depending on the release and settings. Name the model instead, for example "claude-opus-5-5".`,
    };
  let modelId = parseModelId(trimmed);
  let key = modelId !== null || trimmed.startsWith("claude-") ? trimmed : `claude-${trimmed}`;
  let parsed = modelId ?? (key !== trimmed ? parseModelId(key) : null);
  if (parsed) {
    let index = key.lastIndexOf(parsed.base);
    let suffix = index === -1 ? "" : key.slice(index + parsed.base.length);
    let suffixNote =
      parsed.trailer === undefined && suffix !== ""
        ? ` "${sanitizeEntryForDisplay(suffix)}" is ignored.`
        : "";
    return {
      entry: {
        kind: "model",
        id: parsed,
      },
      ...((contextSuffixNote !== "" || suffixNote !== "") && {
        warning: `"${sanitizeEntryForDisplay(raw)}" blocks ${describeVersionBlock(parsed)}.${suffixNote}${contextSuffixNote}`,
      }),
    };
  }
  return {
    entry: {
      kind: "literal",
      value: trimmed,
    },
    warning: getExactModelBlockWarning(raw, trimmed),
  };
}
//@ chunk-dcmhvw5a.js:418499-418649 placement
function describeVersionBlock(version) {
  let familyLabel = capitalize(version.family);
  return version.minor === undefined
    ? `every ${familyLabel} ${version.major}.x model`
    : `${familyLabel} ${version.major}.${version.minor} in every spelling and snapshot`;
}
//@ chunk-dcmhvw5a.js:418649-419484 placement
/**
 * deniedModels 条目只按精确名字阻止时的提示（建议其他拼写）。
 */
function getExactModelBlockWarning(raw, value) {
  let base = `"${sanitizeEntryForDisplay(raw)}" blocks only the exact model name "${sanitizeEntryForDisplay(value)}"; other spellings of the same model are not blocked.`;
  let replaced = value.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== value) {
    let candidate = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(candidate) !== null)
      return `${base} To block a version, write it with a hyphen: "${sanitizeEntryForDisplay(candidate)}".`;
  }
  let match = new RegExp(`^(${MODEL_KEY_NAMES.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(value);
  if (match) {
    let [, family, major, minor] = match;
    return minor !== undefined
      ? `${base} To block a version, write its model ID, for example "claude-${family}-${major}-${minor}".`
      : `${base} To block only version ${major}, write "claude-${family}-${major}-0"; "claude-${family}-${major}" blocks every ${capitalize(family)} ${major}.x model.`;
  }
  if (/^[a-z]+$/.test(value)) {
    let found = MODEL_KEY_NAMES.find((name) => boundedEditDistance(value, name, 1) === 1);
    return found !== undefined
      ? `${base} If you meant the ${capitalize(found)} family, write "${found}".`
      : `${base} To block a model family other than ${formatModelFamilyList()}, list its versioned IDs.`;
  }
  return base;
}
//@ chunk-dcmhvw5a.js:419484-419709 placement
function versionEntryMatches(id, parsed) {
  if (id.family !== parsed.family || id.major !== parsed.major) return false;
  if (id.minor !== undefined && (parsed.minor ?? 0) !== id.minor) return false;
  if (id.trailer === undefined) return true;
  let trailer = parsed.trailer ?? "";
  return trailer === id.trailer || trailer.startsWith(`${id.trailer}-`);
}
//@ chunk-dcmhvw5a.js:419709-420118 placement
/**
 * 把模型名条目解析为 family / model / literal / ignored，供 availableModels 匹配。
 */
function classifyModelListEntry(entry) {
  let lower = strip1mSuffix(entry.trim().toLowerCase());
  if (lower === "")
    return {
      kind: "ignored",
    };
  if (isBaseModelKey(lower))
    return {
      kind: "family",
      family: lower,
    };
  let withoutPrefix = lower.startsWith("claude-") ? lower.slice(7) : "";
  if (isBaseModelKey(withoutPrefix))
    return {
      kind: "family",
      family: withoutPrefix,
    };
  if (isModelKeyAlias(lower) || lower === "default")
    return {
      kind: "ignored",
    };
  let key = parseModelId(lower) !== null || lower.startsWith("claude-") ? lower : `claude-${lower}`;
  let modelId = parseModelId(key);
  return modelId !== null
    ? {
        kind: "model",
        id: modelId,
        latest: isLatestAlias(key, modelId),
        spelling: key,
      }
    : {
        kind: "literal",
        value: lower,
      };
}
//@ chunk-dcmhvw5a.js:420118-420223 placement
function getModelIdTrailer(text, modelId) {
  let lower = text.toLowerCase();
  let index = lower.lastIndexOf(modelId.base);
  return index === -1 ? "" : lower.slice(index + modelId.base.length);
}
//@ chunk-dcmhvw5a.js:420223-420394 placement
var PROVIDER_MODEL_ID_PREFIX_PATTERN =
  /^(?:arn:aws(?:-[a-z]+)*:bedrock:[a-z0-9-]*:\d*:(?:foundation-model|inference-profile)\/|(?:projects\/[^/]+\/locations\/[^/]+\/)?publishers\/anthropic\/models\/)$/;
//@ chunk-dcmhvw5a.js:420394-420543 placement
function hasProviderModelPrefix(text, modelId) {
  let lower = text.toLowerCase();
  let index = lower.lastIndexOf(modelId.base);
  if (index === -1) return false;
  let sliced = lower.slice(0, lower.lastIndexOf("/", index) + 1);
  return sliced === "" || PROVIDER_MODEL_ID_PREFIX_PATTERN.test(sliced);
}
//@ chunk-dcmhvw5a.js:420543-420618 placement
function isLatestAlias(text, modelId) {
  return modelId.trailer === undefined && getModelIdTrailer(text, modelId).startsWith("-latest");
}
//@ chunk-dcmhvw5a.js:420618-420711 placement
function modelEntryMatches(entry, modelId, latestOnly) {
  return (
    isSameModelVersion(entry.id, modelId) &&
    (entry.id.trailer ?? "") === (modelId.trailer ?? "") &&
    (!latestOnly || entry.latest)
  );
}
//@ chunk-dcmhvw5a.js:420711-420864 placement
function anyEntryHasModelPrefix(base, entries) {
  for (let entry of entries) {
    if (isBaseModelKey(entry)) continue;
    let index = entry.indexOf(base);
    if (index === -1) continue;
    let endIndex = index + base.length;
    if (endIndex === entry.length || entry[endIndex] === "-") return true;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:420864-420923 placement = capitalize (1)
function capitalize_2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-dcmhvw5a.js:420923-421068 placement
function findLatestLegacyBase(family) {
  let best;
  for (let id of LEGACY_MODEL_IDS_2) {
    let modelId = parseModelId(id);
    if (
      modelId !== null &&
      modelId.family === family &&
      !modelId.legacyVersionFirst &&
      (best === undefined || compareVersion(modelId, best) > 0)
    )
      best = modelId;
  }
  return best?.base;
}
//@ chunk-dcmhvw5a.js:421068-421939 placement
/**
 * 生成 availableModels 条目被忽略或受限的说明。
 */
function availableModelsEntryWarning(raw, availableModels) {
  let classified = classifyModelListEntry(raw);
  switch (classified.kind) {
    case "ignored": {
      if (raw.trim() === "") return "An empty availableModels entry was ignored.";
      let latestLegacyBase = findLatestLegacyBase("opus");
      return `"${sanitizeEntryForDisplay(raw)}" in availableModels was ignored, because "availableModelsMatch" is "exact" and this name means a different model depending on the release and settings. List the model IDs you want to allow instead${latestLegacyBase === undefined ? "" : `, for example "${latestLegacyBase}"`}.`;
    }
    case "family": {
      let entries = availableModels
        .filter((entry) => classifyModelListEntry(entry).kind !== "ignored")
        .map((entry) => strip1mSuffix(entry.trim().toLowerCase()));
      if (isBaseModelKey(raw.trim().toLowerCase()) && anyEntryHasModelPrefix(classified.family, entries))
        return;
      let latestLegacyBase = findLatestLegacyBase(classified.family);
      return `"${sanitizeEntryForDisplay(raw)}" in availableModels allows every ${capitalize_2(classified.family)} model, including future releases, even though "availableModelsMatch" is "exact". To allow only some versions, list their model IDs instead${latestLegacyBase === undefined ? "" : `, for example "${latestLegacyBase}"`}.`;
    }
    case "model":
      return;
    case "literal":
      return exactAvailableNameWarning(raw, classified.value);
  }
}
//@ chunk-dcmhvw5a.js:421939-422424 placement
/**
 * availableModels 条目只允许精确名字时的提示。
 */
function exactAvailableNameWarning(raw, value) {
  let base = `"${sanitizeEntryForDisplay(raw)}" in availableModels allows only a model named exactly "${sanitizeEntryForDisplay(value)}".`;
  let replaced = value.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== value) {
    let candidate = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(candidate) !== null)
      return `${base} To allow a version, write it with a hyphen: "${sanitizeEntryForDisplay(candidate)}".`;
  }
  let match = new RegExp(`^(${MODEL_KEY_NAMES.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(value);
  if (match) {
    let [, family, major, minor] = match;
    return `${base} To allow a version, write its model ID, for example "claude-${family}-${major}${minor !== undefined ? `-${minor}` : ""}".`;
  }
  return;
}
export {
  classifyModelListEntry,
  modelEntryMatches,
  isLatestAlias,
  parseDeniedModelEntry,
  versionEntryMatches,
  anyEntryHasModelPrefix,
  hasProviderModelPrefix,
  availableModelsEntryWarning,
};
