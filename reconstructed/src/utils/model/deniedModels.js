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
import { v8, Bn, I_, Nb, parseModelId, Lt, isSameModelVersion, LEGACY_MODEL_IDS, K3e } from "./modelIds.js";
import { boundedEditDistance } from "../settings/managedEnvKeys.js";

//@ chunk-dcmhvw5a.js:417298-417414 affinity
function sanitizeEntryForDisplay(e) {
  let replaced = e.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
  return replaced.length > 128 ? `${replaced.slice(0, 128)}\u2026` : replaced;
}
//@ chunk-dcmhvw5a.js:417414-417504 placement
function formatModelFamilyList() {
  let e = [...v8],
    n = e.pop();
  return e.length === 0 ? (n ?? "") : `${e.join(", ")} or ${n}`;
}
//@ chunk-dcmhvw5a.js:417504-417563 placement = capitalize (1)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * 解析 deniedModels 的一个条目：族名（如 opus）、具体版本或字面量，并给出说明其屏蔽范围的警告文字；忽略 [1m] 等上下文标签。
 */
//@ chunk-dcmhvw5a.js:417563-418499 placement
function parseDeniedModelEntry(e) {
  let lower = e.trim().toLowerCase(),
    trimmed = Bn(lower).trim(),
    s =
      trimmed !== lower
        ? " Context-size tags such as [1m] are ignored: the entry blocks the model at every context size."
        : "";
  if (trimmed === "") return { entry: null, warning: "An empty deniedModels entry was ignored." };
  if (I_(trimmed))
    return {
      entry: { kind: "family", family: trimmed },
      ...(s !== "" && {
        warning: `"${sanitizeEntryForDisplay(e)}" blocks every ${capitalize(trimmed)} model.${s}`,
      }),
    };
  if (Nb(trimmed) || trimmed === "default")
    return {
      entry: null,
      warning: `"${sanitizeEntryForDisplay(e)}" was ignored: it names a different model depending on the release and settings. Name the model instead, for example "claude-opus-5-5".`,
    };
  let a = parseModelId(trimmed),
    c = a !== null || trimmed.startsWith("claude-") ? trimmed : `claude-${trimmed}`,
    g = a ?? (c !== trimmed ? parseModelId(c) : null);
  if (g) {
    let index = c.lastIndexOf(g.base),
      f = index === -1 ? "" : c.slice(index + g.base.length),
      h = g.trailer === void 0 && f !== "" ? ` "${sanitizeEntryForDisplay(f)}" is ignored.` : "";
    return {
      entry: { kind: "model", id: g },
      ...((s !== "" || h !== "") && {
        warning: `"${sanitizeEntryForDisplay(e)}" blocks ${describeVersionBlock(g)}.${h}${s}`,
      }),
    };
  }
  return { entry: { kind: "literal", value: trimmed }, warning: getExactModelBlockWarning(e, trimmed) };
}
//@ chunk-dcmhvw5a.js:418499-418649 placement
function describeVersionBlock(e) {
  let n = capitalize(e.family);
  return e.minor === void 0
    ? `every ${n} ${e.major}.x model`
    : `${n} ${e.major}.${e.minor} in every spelling and snapshot`;
}
/**
 * deniedModels 条目只按精确名字阻止时的提示（建议其他拼写）。
 */
//@ chunk-dcmhvw5a.js:418649-419484 placement
function getExactModelBlockWarning(e, n) {
  let r = `"${sanitizeEntryForDisplay(e)}" blocks only the exact model name "${sanitizeEntryForDisplay(n)}"; other spellings of the same model are not blocked.`,
    replaced = n.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== n) {
    let c = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(c) !== null)
      return `${r} To block a version, write it with a hyphen: "${sanitizeEntryForDisplay(c)}".`;
  }
  let match = new RegExp(`^(${v8.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if (match) {
    let [, c, g, m] = match;
    return m !== void 0
      ? `${r} To block a version, write its model ID, for example "claude-${c}-${g}-${m}".`
      : `${r} To block only version ${g}, write "claude-${c}-${g}-0"; "claude-${c}-${g}" blocks every ${capitalize(c)} ${g}.x model.`;
  }
  if (/^[a-z]+$/.test(n)) {
    let found = v8.find((g) => boundedEditDistance(n, g, 1) === 1);
    return found !== void 0
      ? `${r} If you meant the ${capitalize(found)} family, write "${found}".`
      : `${r} To block a model family other than ${formatModelFamilyList()}, list its versioned IDs.`;
  }
  return r;
}
//@ chunk-dcmhvw5a.js:419484-419709 placement
function versionEntryMatches(e, n) {
  if (e.family !== n.family || e.major !== n.major) return !1;
  if (e.minor !== void 0 && (n.minor ?? 0) !== e.minor) return !1;
  if (e.trailer === void 0) return !0;
  let r = n.trailer ?? "";
  return r === e.trailer || r.startsWith(`${e.trailer}-`);
}
/**
 * 把模型名条目解析为 family / model / literal / ignored，供 availableModels 匹配。
 */
//@ chunk-dcmhvw5a.js:419709-420118 placement
function classifyModelListEntry(e) {
  let n = Lt(e.trim().toLowerCase());
  if (n === "") return { kind: "ignored" };
  if (I_(n)) return { kind: "family", family: n };
  let r = n.startsWith("claude-") ? n.slice(7) : "";
  if (I_(r)) return { kind: "family", family: r };
  if (Nb(n) || n === "default") return { kind: "ignored" };
  let s = parseModelId(n) !== null || n.startsWith("claude-") ? n : `claude-${n}`,
    a = parseModelId(s);
  return a !== null
    ? { kind: "model", id: a, latest: isLatestAlias(s, a), spelling: s }
    : { kind: "literal", value: n };
}
//@ chunk-dcmhvw5a.js:420118-420223 placement
function getModelIdTrailer(e, n) {
  let lower = e.toLowerCase(),
    index = lower.lastIndexOf(n.base);
  return index === -1 ? "" : lower.slice(index + n.base.length);
}
//@ chunk-dcmhvw5a.js:420223-420394 placement
var PROVIDER_MODEL_ID_PREFIX_PATTERN =
  /^(?:arn:aws(?:-[a-z]+)*:bedrock:[a-z0-9-]*:\d*:(?:foundation-model|inference-profile)\/|(?:projects\/[^/]+\/locations\/[^/]+\/)?publishers\/anthropic\/models\/)$/;
//@ chunk-dcmhvw5a.js:420394-420543 placement
function hasProviderModelPrefix(e, n) {
  let lower = e.toLowerCase(),
    index = lower.lastIndexOf(n.base);
  if (index === -1) return !1;
  let sliced = lower.slice(0, lower.lastIndexOf("/", index) + 1);
  return sliced === "" || PROVIDER_MODEL_ID_PREFIX_PATTERN.test(sliced);
}
//@ chunk-dcmhvw5a.js:420543-420618 placement
function isLatestAlias(e, n) {
  return n.trailer === void 0 && getModelIdTrailer(e, n).startsWith("-latest");
}
//@ chunk-dcmhvw5a.js:420618-420711 placement
function modelEntryMatches(e, n, r) {
  return isSameModelVersion(e.id, n) && (e.id.trailer ?? "") === (n.trailer ?? "") && (!r || e.latest);
}
//@ chunk-dcmhvw5a.js:420711-420864 placement
function anyEntryHasModelPrefix(e, n) {
  for (let r of n) {
    if (I_(r)) continue;
    let index = r.indexOf(e);
    if (index === -1) continue;
    let a = index + e.length;
    if (a === r.length || r[a] === "-") return !0;
  }
  return !1;
}
//@ chunk-dcmhvw5a.js:420864-420923 placement = capitalize (1)
function capitalize_2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-dcmhvw5a.js:420923-421068 placement
function findLatestLegacyBase(e) {
  let n;
  for (let r of LEGACY_MODEL_IDS) {
    let s = parseModelId(r);
    if (s !== null && s.family === e && !s.legacyVersionFirst && (n === void 0 || K3e(s, n) > 0)) n = s;
  }
  return n?.base;
}
/**
 * 生成 availableModels 条目被忽略或受限的说明。
 */
//@ chunk-dcmhvw5a.js:421068-421939 placement
function availableModelsEntryWarning(e, n) {
  let r = classifyModelListEntry(e);
  switch (r.kind) {
    case "ignored": {
      if (e.trim() === "") return "An empty availableModels entry was ignored.";
      let s = findLatestLegacyBase("opus");
      return `"${sanitizeEntryForDisplay(e)}" in availableModels was ignored, because "availableModelsMatch" is "exact" and this name means a different model depending on the release and settings. List the model IDs you want to allow instead${s === void 0 ? "" : `, for example "${s}"`}.`;
    }
    case "family": {
      let mapped = n
        .filter((c) => classifyModelListEntry(c).kind !== "ignored")
        .map((c) => Lt(c.trim().toLowerCase()));
      if (I_(e.trim().toLowerCase()) && anyEntryHasModelPrefix(r.family, mapped)) return;
      let a = findLatestLegacyBase(r.family);
      return `"${sanitizeEntryForDisplay(e)}" in availableModels allows every ${capitalize_2(r.family)} model, including future releases, even though "availableModelsMatch" is "exact". To allow only some versions, list their model IDs instead${a === void 0 ? "" : `, for example "${a}"`}.`;
    }
    case "model":
      return;
    case "literal":
      return exactAvailableNameWarning(e, r.value);
  }
}
/**
 * availableModels 条目只允许精确名字时的提示。
 */
//@ chunk-dcmhvw5a.js:421939-422424 placement
function exactAvailableNameWarning(e, n) {
  let r = `"${sanitizeEntryForDisplay(e)}" in availableModels allows only a model named exactly "${sanitizeEntryForDisplay(n)}".`,
    replaced = n.replace(/(\d)\.(\d)/g, "$1-$2");
  if (replaced !== n) {
    let c = replaced.startsWith("claude-") ? replaced : `claude-${replaced}`;
    if (parseModelId(c) !== null)
      return `${r} To allow a version, write it with a hyphen: "${sanitizeEntryForDisplay(c)}".`;
  }
  let match = new RegExp(`^(${v8.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if (match) {
    let [, c, g, m] = match;
    return `${r} To allow a version, write its model ID, for example "claude-${c}-${g}${m !== void 0 ? `-${m}` : ""}".`;
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
