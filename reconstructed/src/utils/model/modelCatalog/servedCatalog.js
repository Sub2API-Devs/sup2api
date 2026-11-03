/**
 * utils/model/modelCatalog/servedCatalog.ts
 *
 * 2.1.316 新增：内置的模型目录 JSON（version 3444）；目录通知（标题、文本、按钮）schema等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (67)
 * attribution: placement 67
 */
import {
  normalizeModelId,
  maskModelIdForTelemetry,
  CONFIDENTIAL_MODEL_ID,
  containsMaskedId,
  getMaskedModelIds,
  masksEveryId,
  MODEL_PLACEHOLDER_VALUES,
  isPublicModelId,
} from "./catalogEntries.js";
import { parseModelId } from "../modelIds.js";
import { getProviderState } from "../providerCaches.js";
import {
  getAPIProvider,
  isFirstPartyApiBackend,
  catalogModels,
  findServedCatalogRow,
  getRowFamily,
  familyDefaultMap,
  MODEL_FAMILY_NAMES,
  providerCatalogKey,
} from "../providers.js";
import {
  getCatalogState,
  resolveCatalogAlias,
  getCatalogEntry,
  catalogIdForProviderModelId,
} from "../modelCatalog.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  u,
  literal,
  E,
  string,
  array,
  record,
  unknown,
  M,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../json.js";
import { logForDebugging } from "../../debug.js";
import { uniq } from "../../collections.js";
import { logError } from "../../log.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../configs.js";

//@ chunk-aepeg2w5.js:143350-143420 placement = modelMatchesVersionPrefix (1)
/**
 * 含 claude- 且可解析为版本化模型。
 */
function isVersionedClaudeModelSpec(e) {
  let n = normalizeModelId(e);
  return n.includes("claude-") && parseModelId(n) !== null;
}
//@ chunk-aepeg2w5.js:143420-143564 placement
/**
 * 对字段值（字符串或数组）中的模型 id 做遮盖，无变化时返回原值。
 */
function maskModelFieldValue(e, n, r) {
  if (typeof e === "string") return maskModelIdList(e, n, r);
  let mapped = e.map((h) => (typeof h === "string" ? maskModelIdList(h, n, r) : h));
  return mapped.some((h, y) => h !== e[y]) ? mapped : e;
}
//@ chunk-aepeg2w5.js:143564-143813 placement
function maskModelIdList(e, n, r) {
  let s = (S) => {
    if (n && (r ? /[-0-9]/.test(S) : isVersionedClaudeModelSpec(S)))
      return maskModelIdForTelemetry(S) === CONFIDENTIAL_MODEL_ID ? CONFIDENTIAL_MODEL_ID : S;
    return containsMaskedId(S, getMaskedModelIds()) || (r && isConfidentialShorthand(S))
      ? CONFIDENTIAL_MODEL_ID
      : S;
  };
  if (!e.includes(",")) return s(e);
  let h = false;
  let mapped = e.split(",").map((S) => {
    let w = s(S);
    if (w !== S) h = true;
    return w;
  });
  return h ? mapped.join(",") : e;
}
//@ chunk-aepeg2w5.js:143813-143904 placement
/**
 * 判断字符串是否为需遮盖的保密模型简写。
 */
function isConfidentialShorthand(e) {
  let n = normalizeModelId(e);
  return (
    masksEveryId() &&
    !/[-0-9,]/.test(e) &&
    n.length > 0 &&
    !MODEL_PLACEHOLDER_VALUES.has(n) &&
    !isPublicModelId(n)
  );
}
//@ chunk-aepeg2w5.js:143904-143959 placement
/**
 * 当前目录来源。
 */
function servedCatalogSource() {
  return getProviderState().servedCatalogActive?.source;
}
//@ chunk-aepeg2w5.js:143959-144006 placement
/**
 * 取当前生效的服务端目录激活信息。
 */
function servedCatalogActive() {
  return getProviderState().servedCatalogActive;
}
//@ chunk-aepeg2w5.js:144006-144173 placement
/**
 * 当前生效的服务端目录（被抑制时为 null）。
 */
function activeServedCatalog() {
  let providerState = getProviderState();
  if (providerState.servedCatalogSuppressDepth > 0) return null;
  let servedCatalogActive = providerState.servedCatalogActive;
  let catalog = servedCatalogActive?.catalog ?? null;
  if (catalog === null || !catalogSourceAllowed(servedCatalogActive?.source)) return null;
  return catalog;
}
//@ chunk-aepeg2w5.js:144173-144243 placement
function catalogSourceAllowed(source) {
  if (source === "published") return getAPIProvider() !== "gateway";
  return isFirstPartyApiBackend();
}
//@ chunk-aepeg2w5.js:144243-144407 placement
/**
 * 返回生效的服务端目录（激活的目录，或第一方后端下保留的停用行）。
 */
function getEffectiveServedCatalog() {
  let e = activeServedCatalog();
  if (e !== null) return e;
  let providerState = getProviderState();
  let servedCatalogDeactivatedRows = providerState.servedCatalogDeactivatedRows;
  if (
    servedCatalogDeactivatedRows === undefined ||
    providerState.servedCatalogSuppressDepth > 0 ||
    !isFirstPartyApiBackend()
  )
    return null;
  return servedCatalogDeactivatedRows;
}
//@ chunk-aepeg2w5.js:144407-144486 placement
/**
 * 判断生效目录的来源是否为 served（服务端下发）。
 */
function isServedCatalogActive() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "served";
}
//@ chunk-aepeg2w5.js:144486-144568 placement
/**
 * 是否使用已发布目录。
 */
function isPublishedCatalogActive() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "published";
}
//@ chunk-aepeg2w5.js:144568-144602 placement
/**
 * 已发布目录生效且启用。
 */
function isPublishedCatalogInUse() {
  return isPublishedCatalogActive() && isFirstPartyApiBackend();
}
//@ chunk-aepeg2w5.js:144602-144636 placement
/**
 * 判断当前是否有生效目录。
 */
function isEffectiveCatalogActive() {
  return activeServedCatalog() !== null;
}
//@ chunk-aepeg2w5.js:144636-144686 placement
/**
 * 取生效目录中的模型行列表。
 */
function activeCatalogModels() {
  let e = activeServedCatalog();
  return e === null ? [] : catalogModels(e);
}
//@ chunk-aepeg2w5.js:144686-144798 placement
/**
 * 在抑制目录的状态下执行。
 */
function withCatalogSuppressed(e) {
  let providerState = getProviderState();
  providerState.servedCatalogSuppressDepth++;
  try {
    return e();
  } finally {
    providerState.servedCatalogSuppressDepth--;
  }
}
//@ chunk-aepeg2w5.js:144798-144853 placement
/**
 * 目录是否被抑制。
 */
function isCatalogSuppressed() {
  return getProviderState().servedCatalogSuppressDepth > 0;
}
//@ chunk-aepeg2w5.js:144853-144890 placement
/**
 * 在生效目录中查找模型条目。
 */
function findEffectiveServedEntry(...e) {
  return findServedEntry(getEffectiveServedCatalog(), e);
}
//@ chunk-aepeg2w5.js:144890-144926 placement
/**
 * 在服务端目录中查找模型。
 */
function findServedModel(...e) {
  return findServedEntry(activeServedCatalog(), e);
}
//@ chunk-aepeg2w5.js:144926-144996 placement
/**
 * 按 id 或身份拼写在生效目录中查模型条目。
 */
function findActiveServedByIdentity(e) {
  let n = activeServedCatalog();
  if (n === null) return;
  return findServedCatalogRow(n, e) ?? findByIdentitySpelling(n, e);
}
//@ chunk-aepeg2w5.js:144996-145265 placement
function findServedEntry(e, n) {
  if (e === null) return;
  let [r, ...s] = n;
  let h =
    r !== undefined &&
    isPublishedCatalogInUse() &&
    getCatalogState().modelKnowledge?.isModelOverrideValue(r) === true;
  if (r !== undefined && !h) {
    let y = findServedCatalogRow(e, r) ?? findByIdentitySpelling(e, r);
    if (y !== undefined) return y;
  }
  for (let y of s) {
    if (y === undefined) continue;
    let servedCatalogRow = findServedCatalogRow(e, y);
    if (servedCatalogRow !== undefined) return servedCatalogRow;
  }
  return;
}
//@ chunk-aepeg2w5.js:145265-145467 placement
function findByIdentitySpelling(e, n) {
  let identitySpelling = getCatalogState().modelKnowledge?.identitySpelling;
  if (identitySpelling === undefined) return;
  let s = normalizeModelId(identitySpelling(n));
  if (s !== normalizeModelId(n)) {
    let servedCatalogRow = findServedCatalogRow(e, s);
    if (servedCatalogRow !== undefined) return servedCatalogRow;
  }
  return catalogModels(e).find(
    (h) => normalizeModelId(h.id) !== s && normalizeModelId(identitySpelling(h.id)) === s,
  );
}
//@ chunk-aepeg2w5.js:145467-145511 placement
/**
 * 取生效目录中某模型的 runtime 信息。
 */
function servedRuntime(...e) {
  return findEffectiveServedEntry(...e)?.runtime;
}
//@ chunk-aepeg2w5.js:145511-145562 placement
/**
 * 输入/输出 token 数的合法区间。
 */
var MAX_INPUT_TOKEN_RANGE = {
  min: 1e5,
  max: 1e7,
};
var OUTPUT_TOKEN_RANGE = {
  min: 1024,
  max: 128000,
};
//@ chunk-aepeg2w5.js:145562-145601 placement
/**
 * 取生效目录模型的 max_input_tokens（限制在合法区间）。
 */
function servedMaxInputTokens(...e) {
  return clampInputTokens(findEffectiveServedEntry(...e));
}
//@ chunk-aepeg2w5.js:145601-145679 placement
/**
 * 把输入 token 值限制在合法区间，不合法返回 undefined。
 */
function clampInputTokens(effectiveServedEntry) {
  return clampInRange(
    effectiveServedEntry?.runtime?.max_input_tokens ?? effectiveServedEntry?.context_window,
    MAX_INPUT_TOKEN_RANGE,
  );
}
//@ chunk-aepeg2w5.js:145679-145741 placement
/**
 * 取生效目录模型的 max_output_tokens。
 */
function servedMaxOutputTokens(...e) {
  return clampInRange(servedRuntime(...e)?.max_output_tokens, OUTPUT_TOKEN_RANGE);
}
//@ chunk-aepeg2w5.js:145741-145807 placement
/**
 * 取生效目录模型的 default_output_tokens。
 */
function servedDefaultOutputTokens(...e) {
  return clampInRange(servedRuntime(...e)?.default_output_tokens, OUTPUT_TOKEN_RANGE);
}
//@ chunk-aepeg2w5.js:145807-145891 placement
/**
 * 模型支持的 effort 级别。
 */
function modelEffortLevels(...e) {
  return servedRuntime(...e)?.effort_levels?.map((effortLevel) => effortLevel.trim().toLowerCase());
}
//@ chunk-aepeg2w5.js:145891-145989 placement
/**
 * 取生效目录模型的默认 effort 级别（小写）。
 */
function servedDefaultEffort(...e) {
  let defaultEffort = servedRuntime(...e)?.default_effort;
  return defaultEffort === undefined ? undefined : defaultEffort.trim().toLowerCase();
}
//@ chunk-aepeg2w5.js:145989-146038 placement
/**
 * 取生效目录模型的能力列表。
 */
function servedCapabilities(...e) {
  return servedRuntime(...e)?.capabilities;
}
//@ chunk-aepeg2w5.js:146038-146221 placement
/**
 * 判断名字是否在目录列表中（以 - 前缀表示显式排除），未列出返回 undefined。
 */
function matchesCatalogList(e, ...n) {
  let mapped = servedCapabilities(...n)?.map((h) => h.trim().toLowerCase());
  if (mapped === undefined) return;
  let lower = e.trim().toLowerCase();
  if (mapped.includes(lower)) return true;
  return mapped.includes(`-${lower}`) ? false : undefined;
}
//@ chunk-aepeg2w5.js:146221-146287 placement
/**
 * 取生效目录模型所属的模型族。
 */
function servedRowFamily(...e) {
  let effectiveServedEntry = findEffectiveServedEntry(...e);
  return effectiveServedEntry === undefined ? undefined : getRowFamily(effectiveServedEntry);
}
//@ chunk-aepeg2w5.js:146287-146702 placement
/**
 * 组织强制/配置的默认模型。
 */
function orgDefaultModelState() {
  let state = activeServedCatalog()?.state;
  if (state === undefined) return;
  let trimmed = state.org_enforced_default_model?.trim();
  if (trimmed)
    return {
      model: trimmed,
      orgConfigured: true,
      enforced: true,
      accountResolved: true,
    };
  let trimmed_2 = state.model?.trim();
  if (!trimmed_2) return;
  let s =
    state.selection_source === "org_configuration" || state.selection_source === "custom_role_configuration";
  let trimmed_3 = state.selection_source?.trim();
  return {
    model: trimmed_2,
    orgConfigured: s,
    enforced: false,
    accountResolved: s || (!!trimmed_3 && trimmed_3 !== "global_default"),
  };
}
//@ chunk-aepeg2w5.js:146702-146788 placement
/**
 * 整数且在区间内时返回原值，否则 undefined。
 */
function clampInRange(e, n) {
  return e !== undefined && Number.isInteger(e) && e >= n.min && e <= n.max ? e : undefined;
}
//@ chunk-aepeg2w5.js:146788-210373 placement
/**
 * 内置的模型目录 JSON（version 3444）。
 */
var BUNDLED_MODEL_CATALOG = {
  $schema: "https://downloads.claude.ai/model-catalog/v1/schema.json",
  schema_version: 1,
  version: 3444,
  issued_at: "2026-10-30T01:05:05Z",
  expires_at: "2026-11-06T01:05:05Z",
  key_id: "claude-code-release-signing-key",
  surfaces: {
    cc: {
      model_selector_state: [
        {
          id: "cc",
          model: "claude-opus-5-5",
          thinking: {
            type: "effort",
            effort: "medium",
          },
          thinking_by_model: [
            {
              id: "claude-fable-5-1",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-sonnet-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-haiku-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-fable-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-8",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-7",
              thinking: {
                type: "effort",
                effort: "xhigh",
              },
            },
            {
              id: "claude-opus-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
          ],
          selection_source: "global_default",
        },
      ],
      model_selector_config: [
        {
          id: "cc",
          models: [
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              description: "For complex work and everyday tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              description: "Most efficient for simpler tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5-1",
              name: "Fable 5.1",
              short_name: "Fable",
              description: "For your toughest challenges",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              min_claude_code_version: "2.1.251",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              description: "Fastest for quick answers",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "none",
              },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "xhigh",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-opus-4-1-20250805",
              name: "Opus 4.1",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "none",
              },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 32000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "opus",
              },
              offered_on: ["bedrock"],
            },
          ],
          settings_vocabulary: {
            create_mode: {
              default: 1,
            },
            effort_level: {
              high: 3,
              low: 1,
              max: 5,
              medium: 2,
              xhigh: 4,
            },
            thinking_mode: {
              auto: 2,
              extended: 1,
              off: 3,
            },
          },
          provider_alias_targets: {
            fable: {
              default: "claude-fable-5-1",
              per_provider: {
                gateway: "claude-fable-5",
              },
            },
            haiku: {
              default: "claude-haiku-5-5",
            },
            opus: {
              default: "claude-opus-5-5",
              per_provider: {
                anthropic_aws: "claude-opus-5-5",
                bedrock: "claude-opus-5-5",
                foundry: "claude-opus-4-6",
                gateway: "claude-opus-4-7",
                mantle: "claude-opus-5-5",
                vertex: "claude-opus-5-5",
              },
            },
            sonnet: {
              default: "claude-sonnet-5-5",
              per_provider: {
                anthropic_aws: "claude-sonnet-4-6",
                gateway: "claude-sonnet-4-6",
              },
            },
          },
        },
      ],
    },
    ccd: {
      model_selector_state: [
        {
          id: "ccd",
          model: "claude-opus-5-5",
          thinking: {
            type: "effort",
            effort: "medium",
          },
          thinking_by_model: [
            {
              id: "claude-fable-5-1",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-sonnet-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-haiku-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-fable-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-8",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-7",
              thinking: {
                type: "effort",
                effort: "xhigh",
              },
            },
            {
              id: "claude-opus-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
          ],
          selection_source: "global_default",
        },
      ],
      model_selector_config: [
        {
          id: "ccd",
          models: [
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5-1",
              name: "Fable 5.1",
              short_name: "Fable",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              min_claude_code_version: "2.1.251",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "none",
              },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "xhigh",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-opus-4-1-20250805",
              name: "Opus 4.1",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "none",
              },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 32000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "opus",
              },
              offered_on: ["bedrock"],
            },
          ],
          settings_vocabulary: {
            create_mode: {
              default: 1,
            },
            effort_level: {
              high: 3,
              low: 1,
              max: 5,
              medium: 2,
              xhigh: 4,
            },
            thinking_mode: {
              auto: 2,
              extended: 1,
              off: 3,
            },
          },
          provider_alias_targets: {
            fable: {
              default: "claude-fable-5-1",
              per_provider: {
                gateway: "claude-fable-5",
              },
            },
            haiku: {
              default: "claude-haiku-5-5",
            },
            opus: {
              default: "claude-opus-5-5",
              per_provider: {
                anthropic_aws: "claude-opus-5-5",
                bedrock: "claude-opus-5-5",
                foundry: "claude-opus-4-6",
                gateway: "claude-opus-4-7",
                mantle: "claude-opus-5-5",
                vertex: "claude-opus-5-5",
              },
            },
            sonnet: {
              default: "claude-sonnet-5-5",
              per_provider: {
                anthropic_aws: "claude-sonnet-4-6",
                gateway: "claude-sonnet-4-6",
              },
            },
          },
        },
      ],
    },
    ccr: {
      model_selector_state: [
        {
          id: "ccr",
          model: "claude-opus-5-5",
          thinking: {
            type: "effort",
            effort: "medium",
          },
          thinking_by_model: [
            {
              id: "claude-fable-5-1",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-sonnet-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-haiku-5-5",
              thinking: {
                type: "effort",
                effort: "medium",
              },
            },
            {
              id: "claude-fable-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-8",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-opus-4-7",
              thinking: {
                type: "effort",
                effort: "xhigh",
              },
            },
            {
              id: "claude-opus-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-5",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
            {
              id: "claude-sonnet-4-6",
              thinking: {
                type: "effort",
                effort: "high",
              },
            },
          ],
          selection_source: "global_default",
        },
      ],
      model_selector_config: [
        {
          id: "ccr",
          models: [
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5-1",
              name: "Fable 5.1",
              short_name: "Fable",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              min_claude_code_version: "2.1.251",
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              quick_select: true,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "none",
              },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "haiku",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "sonnet",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "fable",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "xhigh",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 2576,
                  max_height: 2576,
                  max_image_tokens: 4784,
                },
                family: "opus",
              },
              offered_on: [
                "first_party",
                "anthropic_aws",
                "bedrock",
                "vertex",
                "foundry",
                "mantle",
                "gateway",
              ],
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              fast_mode: {
                type: "toggle",
                name: "Fast mode",
                options: [
                  {
                    id: "fast",
                    name: "Enable fast mode",
                    selector_label: "Fast",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: {
                  max_width: 1568,
                  max_height: 1568,
                  max_image_tokens: 1568,
                },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
          ],
          settings_vocabulary: {
            create_mode: {
              default: 1,
            },
            effort_level: {
              high: 3,
              low: 1,
              max: 5,
              medium: 2,
              xhigh: 4,
            },
            thinking_mode: {
              auto: 2,
              extended: 1,
              off: 3,
            },
          },
          provider_alias_targets: {
            fable: {
              default: "claude-fable-5-1",
              per_provider: {
                gateway: "claude-fable-5",
              },
            },
            haiku: {
              default: "claude-haiku-5-5",
            },
            opus: {
              default: "claude-opus-5-5",
              per_provider: {
                anthropic_aws: "claude-opus-5-5",
                bedrock: "claude-opus-5-5",
                foundry: "claude-opus-4-6",
                gateway: "claude-opus-4-7",
                mantle: "claude-opus-5-5",
                vertex: "claude-opus-5-5",
              },
            },
            sonnet: {
              default: "claude-sonnet-5-5",
              per_provider: {
                anthropic_aws: "claude-sonnet-4-6",
                gateway: "claude-sonnet-4-6",
              },
            },
          },
        },
      ],
    },
    chat: {
      model_selector_state: [
        {
          id: "chat",
          model: "claude-sonnet-4-6",
          thinking: {
            type: "effort_and_mode",
            effort: "low",
            mode: "off",
          },
          thinking_by_model: [
            {
              id: "claude-fable-5-1",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-sonnet-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-haiku-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-fable-5",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-5",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-8",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-7",
              thinking: {
                type: "effort_and_mode",
                effort: "xhigh",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-6",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "extended",
              },
            },
            {
              id: "claude-sonnet-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-sonnet-4-6",
              thinking: {
                type: "effort_and_mode",
                effort: "low",
                mode: "off",
              },
            },
            {
              id: "claude-haiku-4-5-20251001",
              thinking: {
                type: "mode",
                mode: "extended",
              },
            },
          ],
          selection_source: "global_default",
        },
      ],
      model_selector_config: [
        {
          id: "chat",
          models: [
            {
              id: "claude-fable-5-1",
              name: "Fable 5.1",
              short_name: "Fable",
              description: "For your toughest challenges",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 950000,
              voice_model: "claude-opus-5",
              min_claude_code_version: "2.1.251",
              quick_select: true,
            },
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              description: "For complex work and everyday tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: true,
              voice_model: "claude-opus-5",
              min_claude_code_version: "2.1.280",
              quick_select: true,
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              description: "Most efficient for simpler tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              voice_model: "claude-sonnet-5",
              quick_select: true,
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              description: "Fastest for quick answers",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              voice_model: "claude-haiku-4-5-20251001",
              quick_select: true,
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 449000,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              supports_fast_mode: true,
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: true,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "extended",
                    name: "Extended",
                    description: "Always uses deep reasoning",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
              supports_fast_mode: true,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 950000,
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
              voice_model: "claude-sonnet-5",
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "mode",
                mode_options: [
                  {
                    id: "extended",
                    name: "Extended",
                    description: "Always uses deep reasoning",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 190000,
              auto_permission_mode: "unavailable",
            },
            {
              id: "claude-opus-4-5-20251101",
              name: "Opus 4.5",
              short_name: "Opus",
              section: "deprecated",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "extended",
                    name: "Extended",
                    description: "Always uses deep reasoning",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 190000,
              auto_permission_mode: "unavailable",
              voice_model: "claude-opus-5",
              disabled: true,
            },
          ],
          settings_vocabulary: {
            create_mode: {
              default: 1,
            },
            effort_level: {
              high: 3,
              low: 1,
              max: 5,
              medium: 2,
              xhigh: 4,
            },
            thinking_mode: {
              auto: 2,
              extended: 1,
              off: 3,
            },
          },
        },
      ],
    },
    cowork: {
      model_selector_state: [
        {
          id: "cowork",
          model: "claude-sonnet-4-6",
          thinking: {
            type: "effort_and_mode",
            effort: "medium",
            mode: "auto",
          },
          thinking_by_model: [
            {
              id: "claude-fable-5-1",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-sonnet-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-haiku-5-5",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-fable-5",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-5",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-8",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-7",
              thinking: {
                type: "effort_and_mode",
                effort: "xhigh",
                mode: "auto",
              },
            },
            {
              id: "claude-opus-4-6",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "extended",
              },
            },
            {
              id: "claude-sonnet-5",
              thinking: {
                type: "effort_and_mode",
                effort: "high",
                mode: "auto",
              },
            },
            {
              id: "claude-sonnet-4-6",
              thinking: {
                type: "effort_and_mode",
                effort: "medium",
                mode: "auto",
              },
            },
            {
              id: "claude-haiku-4-5-20251001",
              thinking: {
                type: "mode",
                mode: "extended",
              },
            },
          ],
          selection_source: "global_default",
        },
      ],
      model_selector_config: [
        {
          id: "cowork",
          models: [
            {
              id: "claude-fable-5-1",
              name: "Fable 5.1",
              short_name: "Fable",
              description: "For your toughest challenges",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 950000,
              min_claude_code_version: "2.1.251",
              quick_select: true,
            },
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              description: "For complex work and everyday tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: true,
              min_claude_code_version: "2.1.280",
              quick_select: true,
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              description: "Most efficient for simpler tasks",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              quick_select: true,
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              description: "Fastest for quick answers",
              section: "main",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              quick_select: true,
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                ],
                always_on: true,
              },
              hard_limit: 950000,
              supports_fast_mode: true,
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: true,
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "extended",
                    name: "Extended",
                    description: "Always uses deep reasoning",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
              supports_fast_mode: true,
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                  },
                  {
                    id: "high",
                    name: "High",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "xhigh",
                    name: "Extra",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 950000,
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                  },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: true,
                    badge: {
                      message: "Recommended",
                      variant: "neutral",
                    },
                  },
                  {
                    id: "high",
                    name: "High",
                  },
                  {
                    id: "max",
                    name: "Max",
                    tooltip: {
                      content:
                        "May use excessive tokens resulting in long response times and may hit token limits. Use sparingly for the hardest tasks.",
                    },
                  },
                ],
                mode_options: [
                  {
                    id: "auto",
                    name: "Thinking",
                    description: "Can think for more complex tasks",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: {
                compass: true,
                gsuite_tools: true,
                mm_images: true,
                mm_pdf: true,
                web_search: true,
              },
              thinking: {
                type: "mode",
                mode_options: [
                  {
                    id: "extended",
                    name: "Extended",
                    description: "Always uses deep reasoning",
                  },
                  {
                    id: "off",
                    name: "Off",
                  },
                ],
              },
              hard_limit: 190000,
              auto_permission_mode: "unavailable",
            },
          ],
          settings_vocabulary: {
            create_mode: {
              default: 1,
            },
            effort_level: {
              high: 3,
              low: 1,
              max: 5,
              medium: 2,
              xhigh: 4,
            },
            thinking_mode: {
              auto: 2,
              extended: 1,
              off: 3,
            },
          },
        },
      ],
    },
  },
};
//@ chunk-aepeg2w5.js:210373-210446 placement
/**
 * 客户端数据缓存的键前缀与合法路径正则。
 */
var CLIENT_DATA_CACHE_PREFIX = "claude-code-client-data-v1\x00";
var CLIENT_DATA_PATH_RE = /^\/[A-Za-z0-9_./-]{1,300}$/;
//@ chunk-aepeg2w5.js:210446-210484 placement
/**
 * 拼出某客户端的缓存键。
 */
function clientDataSchema(pathname) {
  return `${CLIENT_DATA_CACHE_PREFIX}${pathname}\x00`;
}
//@ chunk-aepeg2w5.js:210484-210746 placement
var CLIENT_DATA_SCHEMA_VERSIONS = [1, 2];
var SEMVER_RE_2 = /^\d{1,9}\.\d{1,9}\.\d{1,9}$/;
var clientDataConfigSchema = DoctorLazy(() =>
  u({
    schema_version: literal(CLIENT_DATA_SCHEMA_VERSIONS),
    version: E().int().nonnegative(),
    min_claude_code_version: string().regex(SEMVER_RE_2).optional(),
    configs: array(
      u({
        model_pattern: string().min(1).max(200),
        client_data: record(string(), unknown()),
      }).loose(),
    ).max(50),
  }).loose(),
);
//@ chunk-aepeg2w5.js:210746-211370 placement
/**
 * 解析目录文档字节。
 */
function parseCatalogDocument(documentBytes) {
  let n = safeParseJSON(Buffer.from(documentBytes).toString("utf8"), false);
  if (n === null || typeof n !== "object" || !("schema_version" in n))
    return {
      ok: false,
      reason: "parse_failed",
    };
  if (!CLIENT_DATA_SCHEMA_VERSIONS.some((h) => h === n.schema_version))
    return {
      ok: false,
      reason: typeof n.schema_version === "number" ? "unsupported_schema" : "parse_failed",
    };
  let r = clientDataConfigSchema().safeParse(n);
  if (!r.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  let s = [];
  for (let config of r.data.configs)
    try {
      s.push({
        pattern: new RegExp(config.model_pattern),
        clientData: config.client_data,
      });
    } catch {
      return {
        ok: false,
        reason: "parse_failed",
      };
    }
  return {
    ok: true,
    document: {
      version: r.data.version,
      minClaudeCodeVersion: r.data.min_claude_code_version,
      entries: s,
    },
  };
}
//@ chunk-aepeg2w5.js:211370-211452 placement
/**
 * 匹配模型的客户端数据。
 */
function clientDataForModel(e, n) {
  return e.entries.find((entry) => entry.pattern.test(n))?.clientData ?? null;
}
//@ chunk-aepeg2w5.js:211452-211532 placement
/**
 * 目录表面（cc/ccr/ccd）名单与文档体积、ETag 格式常量。
 */
var SURFACE_NAMES = ["cc", "ccr", "ccd"];
var ETAG_RE = 2097152;
var MAX_ETAG_CHARS = /^(?:W\/)?"[!#-~\x80-\xff]*"$/;
var catalogRowSchema = 256;
//@ chunk-aepeg2w5.js:211532-211612 placement
/**
 * 是否为合法 ETag。
 */
function isValidEtag(etag) {
  return (
    typeof etag === "string" &&
    etag.length > 0 &&
    etag.length <= catalogRowSchema &&
    MAX_ETAG_CHARS.test(etag)
  );
}
//@ chunk-aepeg2w5.js:211612-213697 placement
/**
 * 目录通知（标题、文本、按钮）schema。
 */
var CatalogNoticeSchema = DoctorLazy(() =>
  u({
    title: string().nullish(),
    text: string().nullish(),
    cta: u({
      copy: string().nullish(),
      intent: string().nullish(),
      redirect_hint: string().nullish(),
    })
      .loose()
      .nullish(),
    is_dismissible: M().nullish(),
  }).loose(),
);
var optionSchema = DoctorLazy(() =>
  u({
    id: string().optional(),
    name: string().optional(),
    description: string().optional(),
  }).loose(),
);
var optionGroupSchema = DoctorLazy(() =>
  u({
    type: string().optional(),
    description: string().optional(),
    effort_options: array(optionSchema()).optional(),
    mode_options: array(optionSchema()).optional(),
    always_on: M().optional(),
  }).loose(),
);
var pricingSchema = DoctorLazy(() => {
  let e = E().min(0.005).max(1e4);
  let n = {
    input: e,
    output: e,
    cache_write_5m: e,
    cache_write_1h: e,
    cache_read: e,
  };
  return u({
    ...n,
    web_search: e,
    long_prompt: u({
      above_prompt_tokens: E().int().positive(),
      ...n,
    }).optional(),
  }).loose();
});
var runtimeSchema = DoctorLazy(() =>
  u({
    max_input_tokens: E().optional(),
    max_output_tokens: E().optional(),
    default_output_tokens: E().optional(),
    effort_levels: array(string()).optional(),
    default_effort: string().optional(),
    capabilities: array(string()).optional(),
    family: string().optional(),
    knowledge_cutoff: string().optional(),
    default_for_family: string().optional(),
    fast_default_for_family: string().optional(),
    image_limits: u({
      max_width: E().optional().catch(undefined),
      max_height: E().optional().catch(undefined),
    })
      .loose()
      .nullish()
      .catch(undefined),
    eager_input_streaming: u({
      bedrock: M().optional().catch(undefined),
      vertex: M().optional().catch(undefined),
    })
      .loose()
      .nullish()
      .catch(undefined),
    pricing: pricingSchema().nullish().catch(undefined),
  }).loose(),
);
var modelRowSchema = DoctorLazy(() =>
  u({
    id: string(),
    name: string().optional(),
    short_name: string().optional(),
    description: string().optional(),
    section: string().optional(),
    disabled: M().optional(),
    confidential: M().optional(),
    early_access: M().optional().catch(true),
    notice: CatalogNoticeSchema().nullish(),
    selection_notice: CatalogNoticeSchema().nullish(),
    badge: u({
      message: string().optional(),
      variant: string().optional(),
    })
      .loose()
      .nullish(),
    tooltip: u({
      content: string().optional(),
    })
      .loose()
      .nullish(),
    capabilities: record(string(), M()).optional(),
    thinking: optionGroupSchema().optional(),
    fast_mode: u({}).loose().optional(),
    hard_limit: E().optional(),
    context_window: E().optional(),
    quick_select: M().optional(),
    runtime: runtimeSchema().optional(),
    behaves_as: string().nullish(),
    provider_ids: record(string(), string().nullish()).nullish(),
    offered_on: array(string()).nullish().catch(undefined),
    min_claude_code_version: string().regex(SEMVER_RE_2).nullish().catch(null),
  }).loose(),
);
var parseCatalogRows = 64;
//@ chunk-aepeg2w5.js:213697-214096 placement
/**
 * 把目录模型分为有效、部分有效、无效。
 */
function partitionCatalogModels(models) {
  let n = modelRowSchema();
  let r = idOnlySchema();
  let s = confidentialMarkerSchema();
  let h = [];
  let y = [];
  let S = [];
  let unidentifiedDropCount = 0;
  for (let R of models) {
    let x = n.safeParse(R);
    if (x.success) {
      h.push(x.data);
      continue;
    }
    let P = r.safeParse(R);
    if (!P.success || normalizeModelId(P.data.id).length === 0 || y.length >= parseCatalogRows) {
      unidentifiedDropCount += 1;
      continue;
    }
    y.push(P.data.id);
    if (s.safeParse(R).success) S.push(P.data.id);
  }
  return {
    rows: h,
    invalidCount: models.length - h.length,
    droppedModelIds: y,
    droppedConfidentialIds: S,
    unidentifiedDropCount,
  };
}
//@ chunk-aepeg2w5.js:214096-214288 placement
var idOnlySchema = DoctorLazy(() =>
  u({
    id: string(),
  }),
);
var confidentialMarkerSchema = DoctorLazy(() =>
  u({
    confidential: literal(true),
  }),
);
var aliasEntrySchema = DoctorLazy(() =>
  u({
    default: string().nullish().catch(undefined),
    per_provider: record(string(), string().nullish().catch(undefined)).nullish().catch(undefined),
  }).loose(),
);
//@ chunk-aepeg2w5.js:214288-215471 placement
/**
 * 目录模型 schema（wire/stored 两种）。
 */
function catalogModelSchema(e) {
  let n = () =>
    unknown()
      .optional()
      .transform(() => {
        return;
      });
  let r = e === "stored" ? array(string()).optional() : n();
  let droppedUnidentifiedRows = e === "stored" ? M().optional() : n();
  return u({
    id: string(),
    models: array(unknown()).optional(),
    description: string().optional(),
    auto_compact_window: E().optional(),
    provider_alias_targets: record(string(), aliasEntrySchema().nullish().catch(undefined))
      .nullish()
      .catch(undefined),
    dropped_model_ids: r,
    dropped_confidential_ids: r,
    dropped_unidentified_rows: droppedUnidentifiedRows,
  })
    .loose()
    .transform((h) => {
      let {
        dropped_model_ids: droppedModelIds,
        dropped_confidential_ids: droppedConfidentialIds,
        dropped_unidentified_rows: droppedUnidentifiedRows,
        ...R
      } = h;
      let x =
        e === "stored"
          ? {
              ids: droppedModelIds ?? [],
              confidentialIds: droppedConfidentialIds ?? [],
              unidentified: droppedUnidentifiedRows === true,
            }
          : {
              ids: [],
              confidentialIds: [],
              unidentified: false,
            };
      let P = R.models === undefined ? undefined : partitionCatalogModels(R.models);
      if (P !== undefined && P.invalidCount > 0)
        logForDebugging(
          `[servedCatalog] surface ${R.id}: ${P.invalidCount} of ${R.models?.length ?? 0} served rows failed row validation`,
        );
      let F = uniq([...x.ids, ...(P?.droppedModelIds ?? [])]);
      let sliced = F.slice(0, parseCatalogRows);
      let filtered = uniq([...x.confidentialIds, ...(P?.droppedConfidentialIds ?? [])]).filter((ee) =>
        sliced.includes(ee),
      );
      let j = x.unidentified || (P?.unidentifiedDropCount ?? 0) > 0 || F.length > sliced.length;
      return {
        ...R,
        models: P?.rows,
        ...(sliced.length > 0 && {
          dropped_model_ids: sliced,
        }),
        ...(filtered.length > 0 && {
          dropped_confidential_ids: filtered,
        }),
        ...(j && {
          dropped_unidentified_rows: true,
        }),
      };
    });
}
//@ chunk-aepeg2w5.js:215471-215973 placement
/**
 * 目录模型 wire/stored schema 实例。
 */
var CatalogModelWireSchema = DoctorLazy(() => catalogModelSchema("wire"));
var storedRowSchema = DoctorLazy(() => catalogModelSchema("stored"));
var selectorStateSchema = DoctorLazy(() =>
  u({
    id: string(),
    model: string().optional(),
    selection_source: string().optional(),
    org_enforced_default_model: string().optional(),
    thinking: unknown().optional(),
    thinking_by_model: unknown().optional(),
  }).loose(),
);
var ACCOUNT_KIND_VALUES = [
  "token_org",
  "membership",
  "api_key_org",
  "console_org",
  "federation_org",
  "service_key_org",
  "public",
];
var catalogDocumentSchema = DoctorLazy(() =>
  u({
    model_selector_state: array(selectorStateSchema()).optional(),
    model_selector_config: array(CatalogModelWireSchema()).optional(),
    organization_uuid: string().optional(),
    resolution: string().optional(),
  }).loose(),
);
//@ chunk-aepeg2w5.js:215973-216153 placement
/**
 * 取目录中某选择器界面的配置与状态。
 */
function getSelectorSurface(e, n) {
  let found = e.model_selector_config?.find((h) => h.id === n);
  if (!found) return null;
  let found_2 = e.model_selector_state?.find((h) => h.id === n);
  return {
    surface: n,
    config: found,
    ...(found_2 && {
      state: found_2,
    }),
  };
}
//@ chunk-aepeg2w5.js:216153-216422 placement
/**
 * 已发布目录常量：schema 版本、全部保留标记、大小上限、签名 schema 与时间戳正则。
 */
var CATALOG_SCHEMA_VERSION = 1;
var HOLD_ALL = "*";
var CATALOG_SCHEMA = ETAG_RE;
var MAX_DOCUMENT_CHARS = 16384;
var SIGNATURE_SCHEMA_VERSION = 1;
var RSASSA_PKCS1_V1_5_SHA512 = "RSASSA-PKCS1-v1_5-SHA512";
var catalogSignatureSchema = DoctorLazy(() =>
  u({
    schema: literal(SIGNATURE_SCHEMA_VERSION),
    algorithm: literal(RSASSA_PKCS1_V1_5_SHA512),
    signature: string().min(1),
    publicKeySha256: string().regex(/^[0-9a-f]{64}$/),
  }).loose(),
);
var ISO_TIMESTAMP_RE_2 = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;
//@ chunk-aepeg2w5.js:216422-216527 placement
/**
 * 解析 ISO 时间戳字符串为毫秒。
 */
function parseIsoTimestamp(expiresAt) {
  if (expiresAt === undefined || !ISO_TIMESTAMP_RE_2.test(expiresAt)) return;
  let timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
//@ chunk-aepeg2w5.js:216527-216763 placement
/**
 * 目录文档 schema。
 */
var CatalogDocumentSchema = DoctorLazy(() =>
  u({
    $schema: string().optional(),
    schema_version: literal(CATALOG_SCHEMA_VERSION),
    version: E().int().nonnegative(),
    issued_at: string().optional(),
    expires_at: string().optional(),
    key_id: string().optional(),
    hold: array(string()).optional().catch([HOLD_ALL]),
    surfaces: record(string(), catalogDocumentSchema()),
  }).loose(),
);
//@ chunk-aepeg2w5.js:216763-216863 placement
/**
 * 判断条目是否对某模型（或全部）保留。
 */
function isHeldForModel(e, n) {
  return (e.hold ?? []).some((r) => {
    let lower = r.trim().toLowerCase();
    return lower === HOLD_ALL || lower === n;
  });
}
//@ chunk-aepeg2w5.js:216863-217003 placement
/**
 * 读取文档的 schema_version 数字。
 */
function getSchemaVersion(e) {
  if (e === null || typeof e !== "object" || !("schema_version" in e)) return;
  let schemaVersion = e.schema_version;
  return typeof schemaVersion === "number" ? schemaVersion : undefined;
}
//@ chunk-aepeg2w5.js:217003-217348 placement
/**
 * 取指定界面（cc/ccr/ccd）的目录状态。
 */
function surfaceStateFor(e, n) {
  for (let [r, s] of [
    [n, e.surfaces[n]],
    ["cc", e.surfaces.cc],
  ]) {
    if (s === undefined) continue;
    let selectorSurface = getSelectorSurface(s, r);
    if (selectorSurface === null) continue;
    if (selectorSurface.state === undefined)
      return {
        surface: n,
        config: selectorSurface.config,
        origin: "published",
      };
    let {
      org_enforced_default_model: orgEnforcedDefaultModel,
      selection_source: selectionSource,
      ...w
    } = selectorSurface.state;
    return {
      surface: n,
      config: selectorSurface.config,
      state: w,
      origin: "published",
    };
  }
  return null;
}
//@ chunk-aepeg2w5.js:217348-217467 placement
/**
 * 列出文档所有界面选择器配置中的模型。
 */
function listSurfaceModels(e) {
  return Object.values(e.surfaces).flatMap((surface) =>
    (surface.model_selector_config ?? []).flatMap((r) => r.models ?? []),
  );
}
//@ chunk-aepeg2w5.js:217467-217618 placement
var bundledCatalogSeed = DoctorLazy(() => {
  let e = CatalogDocumentSchema().safeParse(BUNDLED_MODEL_CATALOG);
  if (!e.success) logError(Error("published model-catalog seed does not parse"));
  return {
    document: e.success ? e.data : null,
  };
});
//@ chunk-aepeg2w5.js:217618-217654 placement
/**
 * 取内置的模型目录文档。
 */
function bundledCatalogDocument() {
  return bundledCatalogSeed().document;
}
//@ chunk-aepeg2w5.js:217654-217694 placement
/**
 * 取内置目录的版本号。
 */
function bundledCatalogVersion() {
  return bundledCatalogDocument()?.version ?? 0;
}
//@ chunk-aepeg2w5.js:217694-217752 placement
/**
 * 取内置目录在某表面下的状态。
 */
function bundledSurfaceState(e) {
  let n = bundledCatalogDocument();
  return n === null ? null : surfaceStateFor(n, e);
}
//@ chunk-aepeg2w5.js:217752-217802 placement
function stripDateSuffixFromId(e) {
  return normalizeModelId(e).replace(/-\d{8}$/, "");
}
//@ chunk-aepeg2w5.js:217802-218052 placement
/**
 * 查找目录中缺少的族默认模型（种子有、编译期有但目录没有）。
 */
function findMissingFamilyDefault(catalog) {
  let n = new Set(catalogModels(catalog).map((s) => stripDateSuffixFromId(s.id)));
  let r = familyDefaultMap(catalog);
  for (let s of MODEL_FAMILY_NAMES) {
    let h = r[s];
    let catalogAlias = resolveCatalogAlias(s, "first_party");
    if (h === undefined || catalogAlias === undefined) continue;
    if (n.has(catalogAlias)) continue;
    if (getCatalogEntry(stripDateSuffixFromId(h)) === undefined) continue;
    return {
      family: s,
      compiled: catalogAlias,
      seed: h,
    };
  }
  return null;
}
//@ chunk-aepeg2w5.js:218052-218106 placement
/**
 * 判断后端是否属于目录表面（firstParty/gateway）。
 */
function isCatalogSurfaceBackend(e) {
  return e === "firstParty" || e === "gateway";
}
//@ chunk-aepeg2w5.js:218106-218152 placement
var PROVIDER_MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
//@ chunk-aepeg2w5.js:218152-218260 placement
/**
 * 取目录条目在指定提供商下的模型 id（不合法时返回 undefined）。
 */
function getProviderModelIdForEntry(e, n) {
  let trimmed = e.provider_ids?.[providerCatalogKey(n)]?.trim();
  if (trimmed !== undefined && !PROVIDER_MODEL_ID_RE.test(trimmed)) return;
  return trimmed ? trimmed : undefined;
}
//@ chunk-aepeg2w5.js:218260-218340 placement
/**
 * 取目录条目的模型键（按 firstParty id 查表）。
 */
function entryModelKey(id) {
  let n = firstPartyIdFromCatalog(id);
  return n !== undefined && Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, n)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[n]
    : undefined;
}
//@ chunk-aepeg2w5.js:218340-218439 placement
/**
 * 从目录解析模型的 firstParty id。
 */
function firstPartyIdFromCatalog(e) {
  let n = catalogIdForProviderModelId(normalizeModelId(e));
  if (n === undefined) return;
  return getCatalogEntry(n)?.provider_ids.first_party ?? undefined;
}
//@ chunk-aepeg2w5.js:218439-218511 placement
/**
 * 生成模型的身份键（有模型键用 key:，否则 id:）。
 */
function modelIdentityKey(e) {
  let n = entryModelKey(e);
  return n === undefined ? `id:${normalizeModelId(e)}` : `key:${n}`;
}
export {
  findServedModel,
  isEffectiveCatalogActive,
  isServedCatalogActive,
  activeServedCatalog,
  activeCatalogModels,
  entryModelKey,
  findEffectiveServedEntry,
  servedMaxInputTokens,
  modelEffortLevels,
  servedDefaultEffort,
  servedRuntime,
  withCatalogSuppressed,
  ACCOUNT_KIND_VALUES,
  isValidEtag,
  CATALOG_SCHEMA,
  getSchemaVersion,
  CATALOG_SCHEMA_VERSION,
  CatalogDocumentSchema,
  bundledCatalogVersion,
  servedCatalogActive,
  bundledCatalogDocument,
  isHeldForModel,
  findMissingFamilyDefault,
  modelIdentityKey,
  surfaceStateFor,
  bundledSurfaceState,
  clampInRange,
  OUTPUT_TOKEN_RANGE,
  servedCatalogSource,
  clientDataForModel,
  CLIENT_DATA_PATH_RE,
  clientDataSchema,
  parseCatalogDocument,
  isConfidentialShorthand,
  maskModelFieldValue,
  isCatalogSurfaceBackend,
  getEffectiveServedCatalog,
  listSurfaceModels,
  servedDefaultOutputTokens,
  isCatalogSuppressed,
  MAX_INPUT_TOKEN_RANGE,
  getProviderModelIdForEntry,
  firstPartyIdFromCatalog,
  servedRowFamily,
  isPublishedCatalogInUse,
  matchesCatalogList,
  findActiveServedByIdentity,
  isPublishedCatalogActive,
  orgDefaultModelState,
  clampInputTokens,
  servedMaxOutputTokens,
  SURFACE_NAMES,
  storedRowSchema,
  selectorStateSchema,
  ETAG_RE,
  catalogDocumentSchema,
  getSelectorSurface,
  MAX_DOCUMENT_CHARS,
  catalogSignatureSchema,
  servedCapabilities,
  parseIsoTimestamp,
};
