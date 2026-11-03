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
function sanitizeEntryForDisplay(e) {
  let replaced = e.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
  return replaced.length > 128 ? `${replaced.slice(0, 128)}\u2026` : replaced;
}
//@ chunk-dcmhvw5a.js:417414-417504 placement
function formatModelFamilyList() {
  let e = [...MODEL_KEY_NAMES];
  let n = e.pop();
  return e.length === 0 ? (n ?? "") : `${e.join(", ")} or ${n}`;
}
//@ chunk-dcmhvw5a.js:417504-417563 placement = capitalize (1)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-dcmhvw5a.js:417563-418499 placement
/**
 * 解析 deniedModels 的一个条目：族名（如 opus）、具体版本或字面量，并给出说明其屏蔽范围的警告文字；忽略 [1m] 等上下文标签。
 */
function parseDeniedModelEntry(e) {
  let lower = e.trim().toLowerCase();
  let trimmed = stripAnyVersatileSuffix(lower).trim();
  let s =
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
      ...(s !== "" && {
        warning: `"${sanitizeEntryForDisplay(e)}" blocks every ${capitalize(trimmed)} model.${s}`,
      }),
    };
  if (isModelKeyAlias(trimmed) || trimmed === "default")
    return {
      entry: null,
      warning: `"${sanitizeEntryForDisplay(e)}" was ignored: it names a different model depending on the release and settings. Name the model instead, for example "claude-opus-5-5".`,
    };
  let modelId = parseModelId(trimmed);
  let c = modelId !== null || trimmed.startsWith("claude-") ? trimmed : `claude-${trimmed}`;
  let g = modelId ?? (c !== trimmed ? parseModelId(c) : null);
  if (g) {
    let index = c.lastIndexOf(g.base);
    let f = index === -1 ? "" : c.slice(index + g.base.length);
    let h = g.trailer === undefined && f !== "" ? ` "${sanitizeEntryForDisplay(f)}" is ignored.` : "";
    return {
      entry: {
        kind: "model",
        id: g,
      },
      ...((s !== "" || h !== "") && {
        warning: `"${sanitizeEntryForDisplay(e)}" blocks ${describeVersionBlock(g)}.${h}${s}`,
      }),
    };
  }
  return {
    entry: {
      kind: "literal",
      value: trimmed,
    },
    warning: getExactModelBlockWarning(e, trimmed),
  };
}
//@ chunk-dcmhvw5a.js:418499-418649 placement
function describeVersionBlock(e) {
  let n = capitalize(e.family);
  return e.minor === undefined
    ? `every ${n} ${e.major}.x model`
    : `${n} ${e.major}.${e.minor} in every spelling and snapshot`;
}
//@ chunk-dcmhvw5a.js:418649-419484 placement
/**
 * deniedModels 条目只按精确名字阻止时的提示（建议其他拼写）。
 */
function getExactModelBlockWarning(e, n) {
  let r = `"${sanitizeEntryForDisplay(e)}" blocks only the exact model name "${sanitizeEntryForDisplay(n)}"; other spellings of the same model are not blocked.`;
  let replaced = n.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== n) {
    let c = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(c) !== null)
      return `${r} To block a version, write it with a hyphen: "${sanitizeEntryForDisplay(c)}".`;
  }
  let match = new RegExp(`^(${MODEL_KEY_NAMES.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if (match) {
    let [, c, g, m] = match;
    return m !== undefined
      ? `${r} To block a version, write its model ID, for example "claude-${c}-${g}-${m}".`
      : `${r} To block only version ${g}, write "claude-${c}-${g}-0"; "claude-${c}-${g}" blocks every ${capitalize(c)} ${g}.x model.`;
  }
  if (/^[a-z]+$/.test(n)) {
    let found = MODEL_KEY_NAMES.find((g) => boundedEditDistance(n, g, 1) === 1);
    return found !== undefined
      ? `${r} If you meant the ${capitalize(found)} family, write "${found}".`
      : `${r} To block a model family other than ${formatModelFamilyList()}, list its versioned IDs.`;
  }
  return r;
}
//@ chunk-dcmhvw5a.js:419484-419709 placement
function versionEntryMatches(id, n) {
  if (id.family !== n.family || id.major !== n.major) return false;
  if (id.minor !== undefined && (n.minor ?? 0) !== id.minor) return false;
  if (id.trailer === undefined) return true;
  let trailer = n.trailer ?? "";
  return trailer === id.trailer || trailer.startsWith(`${id.trailer}-`);
}
//@ chunk-dcmhvw5a.js:419709-420118 placement
/**
 * 把模型名条目解析为 family / model / literal / ignored，供 availableModels 匹配。
 */
function classifyModelListEntry(e) {
  let n = strip1mSuffix(e.trim().toLowerCase());
  if (n === "")
    return {
      kind: "ignored",
    };
  if (isBaseModelKey(n))
    return {
      kind: "family",
      family: n,
    };
  let r = n.startsWith("claude-") ? n.slice(7) : "";
  if (isBaseModelKey(r))
    return {
      kind: "family",
      family: r,
    };
  if (isModelKeyAlias(n) || n === "default")
    return {
      kind: "ignored",
    };
  let s = parseModelId(n) !== null || n.startsWith("claude-") ? n : `claude-${n}`;
  let modelId = parseModelId(s);
  return modelId !== null
    ? {
        kind: "model",
        id: modelId,
        latest: isLatestAlias(s, modelId),
        spelling: s,
      }
    : {
        kind: "literal",
        value: n,
      };
}
//@ chunk-dcmhvw5a.js:420118-420223 placement
function getModelIdTrailer(e, n) {
  let lower = e.toLowerCase();
  let index = lower.lastIndexOf(n.base);
  return index === -1 ? "" : lower.slice(index + n.base.length);
}
//@ chunk-dcmhvw5a.js:420223-420394 placement
var PROVIDER_MODEL_ID_PREFIX_PATTERN =
  /^(?:arn:aws(?:-[a-z]+)*:bedrock:[a-z0-9-]*:\d*:(?:foundation-model|inference-profile)\/|(?:projects\/[^/]+\/locations\/[^/]+\/)?publishers\/anthropic\/models\/)$/;
//@ chunk-dcmhvw5a.js:420394-420543 placement
function hasProviderModelPrefix(e, modelId) {
  let lower = e.toLowerCase();
  let index = lower.lastIndexOf(modelId.base);
  if (index === -1) return false;
  let sliced = lower.slice(0, lower.lastIndexOf("/", index) + 1);
  return sliced === "" || PROVIDER_MODEL_ID_PREFIX_PATTERN.test(sliced);
}
//@ chunk-dcmhvw5a.js:420543-420618 placement
function isLatestAlias(e, modelId) {
  return modelId.trailer === undefined && getModelIdTrailer(e, modelId).startsWith("-latest");
}
//@ chunk-dcmhvw5a.js:420618-420711 placement
function modelEntryMatches(e, modelId, r) {
  return (
    isSameModelVersion(e.id, modelId) && (e.id.trailer ?? "") === (modelId.trailer ?? "") && (!r || e.latest)
  );
}
//@ chunk-dcmhvw5a.js:420711-420864 placement
function anyEntryHasModelPrefix(e, n) {
  for (let r of n) {
    if (isBaseModelKey(r)) continue;
    let index = r.indexOf(e);
    if (index === -1) continue;
    let a = index + e.length;
    if (a === r.length || r[a] === "-") return true;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:420864-420923 placement = capitalize (1)
function capitalize_2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-dcmhvw5a.js:420923-421068 placement
function findLatestLegacyBase(family) {
  let n;
  for (let r of LEGACY_MODEL_IDS_2) {
    let modelId = parseModelId(r);
    if (
      modelId !== null &&
      modelId.family === family &&
      !modelId.legacyVersionFirst &&
      (n === undefined || compareVersion(modelId, n) > 0)
    )
      n = modelId;
  }
  return n?.base;
}
//@ chunk-dcmhvw5a.js:421068-421939 placement
/**
 * 生成 availableModels 条目被忽略或受限的说明。
 */
function availableModelsEntryWarning(availableModel, availableModels) {
  let r = classifyModelListEntry(availableModel);
  switch (r.kind) {
    case "ignored": {
      if (availableModel.trim() === "") return "An empty availableModels entry was ignored.";
      let latestLegacyBase = findLatestLegacyBase("opus");
      return `"${sanitizeEntryForDisplay(availableModel)}" in availableModels was ignored, because "availableModelsMatch" is "exact" and this name means a different model depending on the release and settings. List the model IDs you want to allow instead${latestLegacyBase === undefined ? "" : `, for example "${latestLegacyBase}"`}.`;
    }
    case "family": {
      let mapped = availableModels
        .filter((c) => classifyModelListEntry(c).kind !== "ignored")
        .map((c) => strip1mSuffix(c.trim().toLowerCase()));
      if (isBaseModelKey(availableModel.trim().toLowerCase()) && anyEntryHasModelPrefix(r.family, mapped))
        return;
      let latestLegacyBase = findLatestLegacyBase(r.family);
      return `"${sanitizeEntryForDisplay(availableModel)}" in availableModels allows every ${capitalize_2(r.family)} model, including future releases, even though "availableModelsMatch" is "exact". To allow only some versions, list their model IDs instead${latestLegacyBase === undefined ? "" : `, for example "${latestLegacyBase}"`}.`;
    }
    case "model":
      return;
    case "literal":
      return exactAvailableNameWarning(availableModel, r.value);
  }
}
//@ chunk-dcmhvw5a.js:421939-422424 placement
/**
 * availableModels 条目只允许精确名字时的提示。
 */
function exactAvailableNameWarning(e, n) {
  let r = `"${sanitizeEntryForDisplay(e)}" in availableModels allows only a model named exactly "${sanitizeEntryForDisplay(n)}".`;
  let replaced = n.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== n) {
    let c = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(c) !== null)
      return `${r} To allow a version, write it with a hyphen: "${sanitizeEntryForDisplay(c)}".`;
  }
  let match = new RegExp(`^(${MODEL_KEY_NAMES.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if (match) {
    let [, c, g, m] = match;
    return `${r} To allow a version, write its model ID, for example "claude-${c}-${g}${m !== undefined ? `-${m}` : ""}".`;
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
