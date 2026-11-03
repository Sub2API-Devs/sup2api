/**
 * utils/model/modelStrings.ts
 *
 * 当前提供商下每个模型键对应的模型字符串（Bedrock 按区域前缀与推理配置文件解析），以及 settings.modelOverrides 的应用与反查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelStrings.ts
 * pieces: chunk-aepeg2w5.js (13)
 * attribution: file-local 2, fingerprint 2, layout 6, callgraph-fingerprint 2, placement 1
 */
import { No } from "./modelCatalog.js";
import {
  getBedrockRegionPrefix,
  nI,
  withBedrockRegionPrefix,
  bedrockRegionGroup,
  findFirstMatch,
} from "./bedrock.js";
import { getAwsRegionSync, resolveAwsRegion } from "../awsRegion.js";
import { logForDebugging } from "../debug.js";
import { getBedrockInferenceProfiles } from "../../services/analytics/telemetryCredentialGuard.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
import { Sv } from "./modelIds.js";
import { serializeCalls } from "../promiseQueue.js";
import { getModelStrings as getModelStrings_2, setModelStrings } from "../../bootstrap/state.js";
import { getAPIProvider } from "./providers.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { Uc, Yte, getProviderModelIdForEntry } from "./modelCatalog/servedCatalog.js";
import { fn } from "./modelCatalog/catalogCapabilities.js";
import { toBedrockFoundationModelId, Tb } from "./modelCatalog/catalogSeed.js";
import { zN } from "../../services/gateway/hostCheck.js";

/**
 * 所有 catalog 模型键。
 */
//@ chunk-aepeg2w5.js:229259-229282 file-local
var MODEL_KEYS = Object.keys(No);
/**
 * 某提供商的模型字符串表（旧版名 getBedrockModelStrings 只覆盖 Bedrock，316 对所有提供商通用）：该提供商没有该模型时借用最先有值模型的同提供商 id 或第一方 id；Bedrock 加区域前缀（ANTHROPIC_BEDROCK_REGION_PREFIX 或按 AWS 区域推断）。
 */
//@ chunk-aepeg2w5.js:229282-229471 fingerprint = getBedrockModelStrings (1)
function getModelStringsForProvider(provider, awsRegion) {
  let found = MODEL_KEYS.find((y) => No[y][provider] !== null),
    s = provider === "bedrock" ? getBedrockRegionPrefix(awsRegion ?? getAwsRegionSync()) : void 0,
    out = {};
  for (let key of MODEL_KEYS) {
    let S = No[key][provider] ?? (found ? No[found][provider] : No[key].firstParty);
    out[key] = nI(s ? withBedrockRegionPrefix(S, s) : S);
  }
  return out;
}
/**
 * 列出 Bedrock 系统推理配置文件，为每个模型找匹配前缀的 profile，找不到用硬编码；首选前缀不可用时告警。
 */
//@ chunk-aepeg2w5.js:229471-230421 layout
async function getBedrockModelStringsFromProfiles() {
  let e = await resolveAwsRegion(),
    n = getBedrockRegionPrefix(e),
    r = bedrockRegionGroup(e),
    s = getModelStringsForProvider("bedrock", e),
    h = () => {
      if (n !== r)
        logForDebugging(
          `ANTHROPIC_BEDROCK_REGION_PREFIX=${n} is being applied without an availability check (inference-profile discovery is unavailable). If requests 400, ensure ${n}.* cross-region inference profiles are enabled in this account, or unset the variable to fall back to ${r}.*.`,
          { level: "warn" },
        );
    },
    y;
  try {
    y = await getBedrockInferenceProfiles();
  } catch (error) {
    return (
      logForDebugging(
        `Failed to list Bedrock inference profiles, falling back to hardcoded models: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      h(),
      s
    );
  }
  if (!y?.length) return (h(), s);
  let S = {},
    w = [];
  for (let R of MODEL_KEYS) {
    let firstParty = No[R].firstParty,
      P = findFirstMatch(y, firstParty, n) || s[R];
    if (((S[R] = nI(P)), n !== r && !P.startsWith(`${n}.`))) w.push(firstParty);
  }
  if (w.length > 0)
    logForDebugging(
      `ANTHROPIC_BEDROCK_REGION_PREFIX=${n}: ${w.length} model(s) resolved to a different prefix (no ${n}.* profile in this account): ${w.join(", ")}. This is a preference, not a residency guarantee.`,
      { level: "warn" },
    );
  return S;
}
/**
 * 把 settings.modelOverrides（第一方 id 到自定义 id）应用到模型字符串表。
 */
//@ chunk-aepeg2w5.js:230421-230564 fingerprint = applyModelOverrides (1)
function applyModelOverrides(ms) {
  let overrides = getInitialSettings_2().modelOverrides;
  if (!overrides) return ms;
  let out = { ...ms };
  for (let [s, h] of Object.entries(overrides)) {
    let key = MODEL_KEY_BY_FIRST_PARTY_ID[s];
    if (key && h) out[key] = nI(h);
  }
  return out;
}
/**
 * 自定义 id 反查回 modelOverrides 的第一方键。
 */
//@ chunk-aepeg2w5.js:230564-230704 layout = applyModelOverrides (1)
function reverseModelOverride(ms) {
  let n;
  try {
    n = getInitialSettings_2().modelOverrides;
  } catch {
    return ms;
  }
  if (!n) return ms;
  for (let [r, s] of Object.entries(n)) if (Sv(s, ms)) return r;
  return ms;
}
/**
 * 惰性执行一次：模型字符串缓存为空时取 Bedrock 推理配置文件并写回缓存（仅 bedrock）。
 */
//@ chunk-aepeg2w5.js:230704-230819 layout = getModelBetas (1)
var refreshBedrockModelStrings = serializeCalls(async () => {
  if (getModelStrings_2() !== null) return;
  try {
    let e = await getBedrockModelStringsFromProfiles();
    if (getAPIProvider() !== "bedrock") return;
    setModelStrings(e);
  } catch (error) {
    logError(error);
  }
});
/**
 * 初始化模型字符串：非 Bedrock 同步计算并写入状态；Bedrock 异步走推理配置文件发现。
 */
//@ chunk-aepeg2w5.js:230819-230903 callgraph-fingerprint = initModelStrings (1)
function initModelStrings() {
  if (getModelStrings_2() !== null) return;
  if (getAPIProvider() !== "bedrock") {
    setModelStrings(getModelStringsForProvider(getAPIProvider()));
    return;
  }
  refreshBedrockModelStrings();
}
/**
 * 当前模型字符串表（已应用 modelOverrides）；未初始化时先初始化。
 */
//@ chunk-aepeg2w5.js:230903-230979 layout
function getModelStrings() {
  let e = getModelStrings_2();
  if (e === null)
    return (initModelStrings(), applyModelOverrides(getModelStringsForProvider(getAPIProvider())));
  return applyModelOverrides(e);
}
/**
 * 未应用 modelOverrides 的模型字符串表。
 */
//@ chunk-aepeg2w5.js:230979-231048 layout
function getRawModelStrings() {
  let e = getModelStrings_2();
  if (e === null) return (initModelStrings(), getModelStringsForProvider(getAPIProvider()));
  return e;
}
/**
 * 确保模型字符串已初始化（Bedrock 等待 profile 发现；宿主托管提供商时只取区域）。
 */
//@ chunk-aepeg2w5.js:231048-231241 callgraph-fingerprint = ensureModelStringsInitialized (0.576)
async function ensureModelStringsInitialized(e) {
  if (getModelStrings_2() !== null) return;
  if (getAPIProvider() !== "bedrock") {
    setModelStrings(getModelStringsForProvider(getAPIProvider()));
    return;
  }
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && e?.sessionModelIsProviderId) {
    (await resolveAwsRegion(), initModelStrings());
    return;
  }
  await refreshBedrockModelStrings();
}
/**
 * 该模型在提供商下有 id，或 modelOverrides 为其第一方 id 配置了覆盖。auto 名 resolveOverriddenModel 不准确。
 */
//@ chunk-aepeg2w5.js:231241-231351 file-local
function isModelAvailableOnProvider(e, n = getAPIProvider()) {
  let r = No[e];
  if (r[n] !== null) return !0;
  return Boolean(getInitialSettings_2().modelOverrides?.[r.firstParty]);
}
/**
 * 把目录条目解析成当前提供商的模型 id：第一方/网关用 id；已知键看可用性；否则 modelOverrides 或目录提供商 id。旧版名 applyModelOverrides_3 为错配。
 */
//@ chunk-aepeg2w5.js:231351-231570 layout = applyModelOverrides (1)
function resolveProviderModelId(e, n) {
  let r = getAPIProvider();
  if (Uc(r)) return e.id;
  let s = Yte(e.id);
  if (s !== void 0) return isModelAvailableOnProvider(s, r) ? getModelStrings()[s] : void 0;
  let overrides = getInitialSettings_2().modelOverrides,
    y = overrides !== void 0 && Object.hasOwn(overrides, e.id) ? overrides[e.id] : void 0;
  return y && (n ?? fn(e.id)) ? y : gatewayModelIdFor(e);
}
//@ chunk-aepeg2w5.js:231570-231706 placement
function gatewayModelIdFor(e) {
  let n = getAPIProvider(),
    r = getProviderModelIdForEntry(e, n);
  if (r === void 0) return;
  let s = n === "bedrock" ? toBedrockFoundationModelId(r) : void 0,
    h = s !== void 0 ? zN(s) : r;
  return Tb(h, n) ? void 0 : h;
}

export {
  getModelStrings,
  resolveProviderModelId,
  getRawModelStrings,
  gatewayModelIdFor,
  ensureModelStringsInitialized,
  reverseModelOverride,
  isModelAvailableOnProvider,
};
