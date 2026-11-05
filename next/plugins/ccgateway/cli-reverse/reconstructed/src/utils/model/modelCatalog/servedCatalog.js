/**
 * utils/model/modelCatalog/servedCatalog.ts
 *
 * 2.1.316 新增：内置的模型目录 JSON（version 3444）；目录通知（标题、文本、按钮）schema等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (67)
 * attribution: placement 67
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  objectSchema,
  literal,
  numberSchema,
  stringSchema,
  array,
  record,
  unknown,
  booleanSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../json.js";
import { logForDebugging } from "../../debug.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { logError } from "../../log.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../configs.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:152861-152931 placement (2.1.88 match: modelMatchesVersionPrefix, 1)
/**
 * 含 claude- 且可解析为版本化模型。
 */
function isVersionedClaudeModelSpec(modelSpec) {
  let normalized = normalizeModelId(modelSpec);
  return normalized.includes("claude-") && parseModelId(normalized) !== null;
}
//@ chunk-exfmq47h.js:152931-153075 placement
/**
 * 对字段值（字符串或数组）中的模型 id 做遮盖，无变化时返回原值。
 */
function maskModelFieldValue(value, maskAll, isModelField) {
  if (typeof value === "string") return maskModelIdList(value, maskAll, isModelField);
  let mapped = value.map((item) =>
    typeof item === "string" ? maskModelIdList(item, maskAll, isModelField) : item,
  );
  return mapped.some((item, index) => item !== value[index]) ? mapped : value;
}
//@ chunk-exfmq47h.js:153075-153324 placement
function maskModelIdList(value, maskAll, shorthandOk) {
  let maskPart = (part) => {
    if (maskAll && (shorthandOk ? /[-0-9]/.test(part) : isVersionedClaudeModelSpec(part)))
      return maskModelIdForTelemetry(part) === CONFIDENTIAL_MODEL_ID ? CONFIDENTIAL_MODEL_ID : part;
    return containsMaskedId(part, getMaskedModelIds()) || (shorthandOk && isConfidentialShorthand(part))
      ? CONFIDENTIAL_MODEL_ID
      : part;
  };
  if (!value.includes(",")) return maskPart(value);
  let changed = false;
  let mapped = value.split(",").map((part) => {
    let masked = maskPart(part);
    if (masked !== part) changed = true;
    return masked;
  });
  return changed ? mapped.join(",") : value;
}
//@ chunk-exfmq47h.js:153324-153416 placement
/**
 * 判断字符串是否为需遮盖的保密模型简写。
 */
function isConfidentialShorthand(value) {
  let normalized = normalizeModelId(value);
  return (
    masksEveryId() &&
    !/[-0-9,]/.test(value) &&
    normalized.length > 0 &&
    !MODEL_PLACEHOLDER_VALUES.has(normalized) &&
    !isPublicModelId(normalized)
  );
}
//@ chunk-exfmq47h.js:153416-153471 placement
/**
 * 当前目录来源。
 */
function servedCatalogSource() {
  return getProviderState().servedCatalogActive?.source;
}
//@ chunk-exfmq47h.js:153471-153518 placement
/**
 * 取当前生效的服务端目录激活信息。
 */
function servedCatalogActive() {
  return getProviderState().servedCatalogActive;
}
//@ chunk-exfmq47h.js:153518-153685 placement
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
//@ chunk-exfmq47h.js:153685-153755 placement
function catalogSourceAllowed(source) {
  if (source === "published") return getAPIProvider() !== "gateway";
  return isFirstPartyApiBackend();
}
//@ chunk-exfmq47h.js:153755-153919 placement
/**
 * 返回生效的服务端目录（激活的目录，或第一方后端下保留的停用行）。
 */
function getEffectiveServedCatalog() {
  let catalog = activeServedCatalog();
  if (catalog !== null) return catalog;
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
//@ chunk-exfmq47h.js:153919-153998 placement
/**
 * 判断生效目录的来源是否为 served（服务端下发）。
 */
function isServedCatalogActive() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "served";
}
//@ chunk-exfmq47h.js:153998-154080 placement
/**
 * 是否使用已发布目录。
 */
function isPublishedCatalogActive() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "published";
}
//@ chunk-exfmq47h.js:154080-154114 placement
/**
 * 已发布目录生效且启用。
 */
function isPublishedCatalogInUse() {
  return isPublishedCatalogActive() && isFirstPartyApiBackend();
}
//@ chunk-exfmq47h.js:154114-154148 placement
/**
 * 判断当前是否有生效目录。
 */
function isEffectiveCatalogActive() {
  return activeServedCatalog() !== null;
}
//@ chunk-exfmq47h.js:154148-154198 placement
/**
 * 取生效目录中的模型行列表。
 */
function activeCatalogModels() {
  let catalog = activeServedCatalog();
  return catalog === null ? [] : catalogModels(catalog);
}
//@ chunk-exfmq47h.js:154198-154310 placement
/**
 * 在抑制目录的状态下执行。
 */
function withCatalogSuppressed(fn) {
  let providerState = getProviderState();
  providerState.servedCatalogSuppressDepth++;
  try {
    return fn();
  } finally {
    providerState.servedCatalogSuppressDepth--;
  }
}
//@ chunk-exfmq47h.js:154310-154365 placement
/**
 * 目录是否被抑制。
 */
function isCatalogSuppressed() {
  return getProviderState().servedCatalogSuppressDepth > 0;
}
//@ chunk-exfmq47h.js:154365-154402 placement
/**
 * 在生效目录中查找模型条目。
 */
function findEffectiveServedEntry(...modelIds) {
  return findServedEntry(getEffectiveServedCatalog(), modelIds);
}
//@ chunk-exfmq47h.js:154402-154438 placement
/**
 * 在服务端目录中查找模型。
 */
function findServedModel(...modelIds) {
  return findServedEntry(activeServedCatalog(), modelIds);
}
//@ chunk-exfmq47h.js:154438-154508 placement
/**
 * 按 id 或身份拼写在生效目录中查模型条目。
 */
function findActiveServedByIdentity(identity) {
  let catalog = activeServedCatalog();
  if (catalog === null) return;
  return findServedCatalogRow(catalog, identity) ?? findByIdentitySpelling(catalog, identity);
}
//@ chunk-exfmq47h.js:154508-154777 placement
function findServedEntry(catalog, modelIds) {
  if (catalog === null) return;
  let [first, ...rest] = modelIds;
  let isOverrideValue =
    first !== undefined &&
    isPublishedCatalogInUse() &&
    getCatalogState().modelKnowledge?.isModelOverrideValue(first) === true;
  if (first !== undefined && !isOverrideValue) {
    let row = findServedCatalogRow(catalog, first) ?? findByIdentitySpelling(catalog, first);
    if (row !== undefined) return row;
  }
  for (let modelId of rest) {
    if (modelId === undefined) continue;
    let servedCatalogRow = findServedCatalogRow(catalog, modelId);
    if (servedCatalogRow !== undefined) return servedCatalogRow;
  }
  return;
}
//@ chunk-exfmq47h.js:154777-154979 placement
function findByIdentitySpelling(catalog, modelId) {
  let identitySpelling = getCatalogState().modelKnowledge?.identitySpelling;
  if (identitySpelling === undefined) return;
  let identity = normalizeModelId(identitySpelling(modelId));
  if (identity !== normalizeModelId(modelId)) {
    let servedCatalogRow = findServedCatalogRow(catalog, identity);
    if (servedCatalogRow !== undefined) return servedCatalogRow;
  }
  return catalogModels(catalog).find(
    (row) => normalizeModelId(row.id) !== identity && normalizeModelId(identitySpelling(row.id)) === identity,
  );
}
//@ chunk-exfmq47h.js:154979-155023 placement
/**
 * 取生效目录中某模型的 runtime 信息。
 */
function servedRuntime(...modelIds) {
  return findEffectiveServedEntry(...modelIds)?.runtime;
}
//@ chunk-exfmq47h.js:155023-155074 placement
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
//@ chunk-exfmq47h.js:155074-155113 placement
/**
 * 取生效目录模型的 max_input_tokens（限制在合法区间）。
 */
function servedMaxInputTokens(...modelIds) {
  return clampInputTokens(findEffectiveServedEntry(...modelIds));
}
//@ chunk-exfmq47h.js:155113-155191 placement
/**
 * 把输入 token 值限制在合法区间，不合法返回 undefined。
 */
function clampInputTokens(effectiveServedEntry) {
  return clampInRange(
    effectiveServedEntry?.runtime?.max_input_tokens ?? effectiveServedEntry?.context_window,
    MAX_INPUT_TOKEN_RANGE,
  );
}
//@ chunk-exfmq47h.js:155191-155253 placement
/**
 * 取生效目录模型的 max_output_tokens。
 */
function servedMaxOutputTokens(...modelIds) {
  return clampInRange(servedRuntime(...modelIds)?.max_output_tokens, OUTPUT_TOKEN_RANGE);
}
//@ chunk-exfmq47h.js:155253-155319 placement
/**
 * 取生效目录模型的 default_output_tokens。
 */
function servedDefaultOutputTokens(...modelIds) {
  return clampInRange(servedRuntime(...modelIds)?.default_output_tokens, OUTPUT_TOKEN_RANGE);
}
//@ chunk-exfmq47h.js:155319-155403 placement
/**
 * 模型支持的 effort 级别。
 */
function modelEffortLevels(...modelIds) {
  return servedRuntime(...modelIds)?.effort_levels?.map((effortLevel) => effortLevel.trim().toLowerCase());
}
//@ chunk-exfmq47h.js:155403-155501 placement
/**
 * 取生效目录模型的默认 effort 级别（小写）。
 */
function servedDefaultEffort(...modelIds) {
  let defaultEffort = servedRuntime(...modelIds)?.default_effort;
  return defaultEffort === undefined ? undefined : defaultEffort.trim().toLowerCase();
}
//@ chunk-exfmq47h.js:155501-155550 placement
/**
 * 取生效目录模型的能力列表。
 */
function servedCapabilities(...modelIds) {
  return servedRuntime(...modelIds)?.capabilities;
}
//@ chunk-exfmq47h.js:155550-155733 placement
/**
 * 判断名字是否在目录列表中（以 - 前缀表示显式排除），未列出返回 undefined。
 */
function matchesCatalogList(name, ...modelIds) {
  let mapped = servedCapabilities(...modelIds)?.map((capability) => capability.trim().toLowerCase());
  if (mapped === undefined) return;
  let lower = name.trim().toLowerCase();
  if (mapped.includes(lower)) return true;
  return mapped.includes(`-${lower}`) ? false : undefined;
}
//@ chunk-exfmq47h.js:155733-155799 placement
/**
 * 取生效目录模型所属的模型族。
 */
function servedRowFamily(...modelIds) {
  let effectiveServedEntry = findEffectiveServedEntry(...modelIds);
  return effectiveServedEntry === undefined ? undefined : getRowFamily(effectiveServedEntry);
}
//@ chunk-exfmq47h.js:155799-156214 placement
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
  let orgConfigured =
    state.selection_source === "org_configuration" || state.selection_source === "custom_role_configuration";
  let trimmed_3 = state.selection_source?.trim();
  return {
    model: trimmed_2,
    orgConfigured,
    enforced: false,
    accountResolved: orgConfigured || (!!trimmed_3 && trimmed_3 !== "global_default"),
  };
}
//@ chunk-exfmq47h.js:156214-156300 placement
/**
 * 整数且在区间内时返回原值，否则 undefined。
 */
function clampInRange(value, range) {
  return value !== undefined && Number.isInteger(value) && value >= range.min && value <= range.max
    ? value
    : undefined;
}
//@ chunk-exfmq47h.js:156300-219885 placement
/**
 * 内置的模型目录 JSON（version 3444）。
 */
var BUNDLED_MODEL_CATALOG = {
  $schema: "https://downloads.claude.ai/model-catalog/v1/schema.json",
  schema_version: 1,
  version: 3819,
  issued_at: "2026-11-03T01:58:05Z",
  expires_at: "2026-11-10T01:58:05Z",
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
//@ chunk-exfmq47h.js:219885-219958 placement
/**
 * 客户端数据缓存的键前缀与合法路径正则。
 */
var CLIENT_DATA_CACHE_PREFIX = "claude-code-client-data-v1\x00";
var CLIENT_DATA_PATH_RE = /^\/[A-Za-z0-9_./-]{1,300}$/;
//@ chunk-exfmq47h.js:219958-219996 placement
/**
 * 拼出某客户端的缓存键。
 */
function clientDataSchema(pathname) {
  return `${CLIENT_DATA_CACHE_PREFIX}${pathname}\x00`;
}
//@ chunk-exfmq47h.js:219996-220258 placement
var CLIENT_DATA_SCHEMA_VERSIONS; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SEMVER_RE_2;
var clientDataConfigSchema;
deferInit("chunk-exfmq47h.js:219996", () => {
  CLIENT_DATA_SCHEMA_VERSIONS = [1, 2];
  SEMVER_RE_2 = /^\d{1,9}\.\d{1,9}\.\d{1,9}$/;
  clientDataConfigSchema = DoctorLazy(() =>
    objectSchema({
      schema_version: literal(CLIENT_DATA_SCHEMA_VERSIONS),
      version: numberSchema().int().nonnegative(),
      min_claude_code_version: stringSchema().regex(SEMVER_RE_2).optional(),
      configs: array(
        objectSchema({
          model_pattern: stringSchema().min(1).max(200),
          client_data: record(stringSchema(), unknown()),
        }).loose(),
      ).max(50),
    }).loose(),
  );
});
//@ chunk-exfmq47h.js:220258-220882 placement
/**
 * 解析目录文档字节。
 */
function parseCatalogDocument(documentBytes) {
  let parsed = safeParseJSON(Buffer.from(documentBytes).toString("utf8"), false);
  if (parsed === null || typeof parsed !== "object" || !("schema_version" in parsed))
    return {
      ok: false,
      reason: "parse_failed",
    };
  if (!CLIENT_DATA_SCHEMA_VERSIONS.some((version) => version === parsed.schema_version))
    return {
      ok: false,
      reason: typeof parsed.schema_version === "number" ? "unsupported_schema" : "parse_failed",
    };
  let validated = clientDataConfigSchema().safeParse(parsed);
  if (!validated.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  let entries = [];
  for (let config of validated.data.configs)
    try {
      entries.push({
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
      version: validated.data.version,
      minClaudeCodeVersion: validated.data.min_claude_code_version,
      entries,
    },
  };
}
//@ chunk-exfmq47h.js:220882-220964 placement
/**
 * 匹配模型的客户端数据。
 */
function clientDataForModel(catalog, modelId) {
  return catalog.entries.find((entry) => entry.pattern.test(modelId))?.clientData ?? null;
}
//@ chunk-exfmq47h.js:220964-221044 placement
/**
 * 目录表面的名单与体量常量：Rpr = ["cc","ccr","ccd"]；M3t 响应体上限 2 MiB（作 maxContentLength）；aN 是 ETag 格式正则；uN 是 ETag 字符上限 256。
 */
var SURFACE_NAMES = ["cc", "ccr", "ccd"];
var MAX_CATALOG_RESPONSE_BYTES = 2097152;
var ETAG_PATTERN = /^(?:W\/)?"[!#-~\x80-\xff]*"$/;
var MAX_ETAG_CHARS = 256;
//@ chunk-exfmq47h.js:221044-221124 placement
/**
 * 是否为合法 ETag。
 */
function isValidEtag(etag) {
  return (
    typeof etag === "string" && etag.length > 0 && etag.length <= MAX_ETAG_CHARS && ETAG_PATTERN.test(etag)
  );
}
//@ chunk-exfmq47h.js:221124-223209 placement
/**
 * 目录（catalog）的 schema 组：gb 是目录通知 notice schema；_b 单个选项 schema；lN 选项组 schema；dN 价格 schema；cN 运行时（token 上限、effort 等级）schema；fN 模型行 schema；hb 是解析目录行时的行数上限 64。
 */
var CatalogNoticeSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var optionSchema;
var optionGroupSchema;
var pricingSchema;
var runtimeSchema;
var modelRowSchema;
var MAX_CATALOG_ROWS;
deferInit("chunk-exfmq47h.js:221124", () => {
  CatalogNoticeSchema = DoctorLazy(() =>
    objectSchema({
      title: stringSchema().nullish(),
      text: stringSchema().nullish(),
      cta: objectSchema({
        copy: stringSchema().nullish(),
        intent: stringSchema().nullish(),
        redirect_hint: stringSchema().nullish(),
      })
        .loose()
        .nullish(),
      is_dismissible: booleanSchema().nullish(),
    }).loose(),
  );
  optionSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().optional(),
      name: stringSchema().optional(),
      description: stringSchema().optional(),
    }).loose(),
  );
  optionGroupSchema = DoctorLazy(() =>
    objectSchema({
      type: stringSchema().optional(),
      description: stringSchema().optional(),
      effort_options: array(optionSchema()).optional(),
      mode_options: array(optionSchema()).optional(),
      always_on: booleanSchema().optional(),
    }).loose(),
  );
  pricingSchema = DoctorLazy(() => {
    let tokenPrice = numberSchema().min(0.005).max(1e4);
    let basePrices = {
      input: tokenPrice,
      output: tokenPrice,
      cache_write_5m: tokenPrice,
      cache_write_1h: tokenPrice,
      cache_read: tokenPrice,
    };
    return objectSchema({
      ...basePrices,
      web_search: tokenPrice,
      long_prompt: objectSchema({
        above_prompt_tokens: numberSchema().int().positive(),
        ...basePrices,
      }).optional(),
    }).loose();
  });
  runtimeSchema = DoctorLazy(() =>
    objectSchema({
      max_input_tokens: numberSchema().optional(),
      max_output_tokens: numberSchema().optional(),
      default_output_tokens: numberSchema().optional(),
      effort_levels: array(stringSchema()).optional(),
      default_effort: stringSchema().optional(),
      capabilities: array(stringSchema()).optional(),
      family: stringSchema().optional(),
      knowledge_cutoff: stringSchema().optional(),
      default_for_family: stringSchema().optional(),
      fast_default_for_family: stringSchema().optional(),
      image_limits: objectSchema({
        max_width: numberSchema().optional().catch(undefined),
        max_height: numberSchema().optional().catch(undefined),
      })
        .loose()
        .nullish()
        .catch(undefined),
      eager_input_streaming: objectSchema({
        bedrock: booleanSchema().optional().catch(undefined),
        vertex: booleanSchema().optional().catch(undefined),
      })
        .loose()
        .nullish()
        .catch(undefined),
      pricing: pricingSchema().nullish().catch(undefined),
    }).loose(),
  );
  modelRowSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      name: stringSchema().optional(),
      short_name: stringSchema().optional(),
      description: stringSchema().optional(),
      section: stringSchema().optional(),
      disabled: booleanSchema().optional(),
      confidential: booleanSchema().optional(),
      early_access: booleanSchema().optional().catch(true),
      notice: CatalogNoticeSchema().nullish(),
      selection_notice: CatalogNoticeSchema().nullish(),
      badge: objectSchema({
        message: stringSchema().optional(),
        variant: stringSchema().optional(),
      })
        .loose()
        .nullish(),
      tooltip: objectSchema({
        content: stringSchema().optional(),
      })
        .loose()
        .nullish(),
      capabilities: record(stringSchema(), booleanSchema()).optional(),
      thinking: optionGroupSchema().optional(),
      fast_mode: objectSchema({}).loose().optional(),
      hard_limit: numberSchema().optional(),
      context_window: numberSchema().optional(),
      quick_select: booleanSchema().optional(),
      runtime: runtimeSchema().optional(),
      behaves_as: stringSchema().nullish(),
      provider_ids: record(stringSchema(), stringSchema().nullish()).nullish(),
      offered_on: array(stringSchema()).nullish().catch(undefined),
      min_claude_code_version: stringSchema().regex(SEMVER_RE_2).nullish().catch(null),
    }).loose(),
  );
  MAX_CATALOG_ROWS = 64;
});
//@ chunk-exfmq47h.js:223209-223608 placement
/**
 * 把目录模型分为有效、部分有效、无效。
 */
function partitionCatalogModels(models) {
  let rowSchema = modelRowSchema();
  let idOnly = idOnlySchema();
  let confidentialMarker = confidentialMarkerSchema();
  let rows = [];
  let droppedIds = [];
  let droppedConfidentialIds = [];
  let unidentifiedDropCount = 0;
  for (let model of models) {
    let rowResult = rowSchema.safeParse(model);
    if (rowResult.success) {
      rows.push(rowResult.data);
      continue;
    }
    let idResult = idOnly.safeParse(model);
    if (
      !idResult.success ||
      normalizeModelId(idResult.data.id).length === 0 ||
      droppedIds.length >= MAX_CATALOG_ROWS
    ) {
      unidentifiedDropCount += 1;
      continue;
    }
    droppedIds.push(idResult.data.id);
    if (confidentialMarker.safeParse(model).success) droppedConfidentialIds.push(idResult.data.id);
  }
  return {
    rows,
    invalidCount: models.length - rows.length,
    droppedModelIds: droppedIds,
    droppedConfidentialIds,
    unidentifiedDropCount,
  };
}
//@ chunk-exfmq47h.js:223608-223800 placement
var idOnlySchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var confidentialMarkerSchema;
var aliasEntrySchema;
deferInit("chunk-exfmq47h.js:223608", () => {
  idOnlySchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
    }),
  );
  confidentialMarkerSchema = DoctorLazy(() =>
    objectSchema({
      confidential: literal(true),
    }),
  );
  aliasEntrySchema = DoctorLazy(() =>
    objectSchema({
      default: stringSchema().nullish().catch(undefined),
      per_provider: record(stringSchema(), stringSchema().nullish().catch(undefined))
        .nullish()
        .catch(undefined),
    }).loose(),
  );
});
//@ chunk-exfmq47h.js:223800-224983 placement
/**
 * 目录模型 schema（wire/stored 两种）。
 */
function catalogModelSchema(mode) {
  let absentField = () =>
    unknown()
      .optional()
      .transform(() => {
        return;
      });
  let droppedIdsField = mode === "stored" ? array(stringSchema()).optional() : absentField();
  let droppedUnidentifiedRows = mode === "stored" ? booleanSchema().optional() : absentField();
  return objectSchema({
    id: stringSchema(),
    models: array(unknown()).optional(),
    description: stringSchema().optional(),
    auto_compact_window: numberSchema().optional(),
    provider_alias_targets: record(stringSchema(), aliasEntrySchema().nullish().catch(undefined))
      .nullish()
      .catch(undefined),
    dropped_model_ids: droppedIdsField,
    dropped_confidential_ids: droppedIdsField,
    dropped_unidentified_rows: droppedUnidentifiedRows,
  })
    .loose()
    .transform((value) => {
      let {
        dropped_model_ids: droppedModelIds,
        dropped_confidential_ids: droppedConfidentialIds,
        dropped_unidentified_rows: droppedUnidentifiedRows,
        ...rest
      } = value;
      let drops =
        mode === "stored"
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
      let partition = rest.models === undefined ? undefined : partitionCatalogModels(rest.models);
      if (partition !== undefined && partition.invalidCount > 0)
        logForDebugging(
          `[servedCatalog] surface ${rest.id}: ${partition.invalidCount} of ${rest.models?.length ?? 0} served rows failed row validation`,
        );
      let allDropped = normalizeCaseForComparison_2([...drops.ids, ...(partition?.droppedModelIds ?? [])]);
      let sliced = allDropped.slice(0, MAX_CATALOG_ROWS);
      let filtered = normalizeCaseForComparison_2([
        ...drops.confidentialIds,
        ...(partition?.droppedConfidentialIds ?? []),
      ]).filter((id) => sliced.includes(id));
      let unidentified =
        drops.unidentified ||
        (partition?.unidentifiedDropCount ?? 0) > 0 ||
        allDropped.length > sliced.length;
      return {
        ...rest,
        models: partition?.rows,
        ...(sliced.length > 0 && {
          dropped_model_ids: sliced,
        }),
        ...(filtered.length > 0 && {
          dropped_confidential_ids: filtered,
        }),
        ...(unidentified && {
          dropped_unidentified_rows: true,
        }),
      };
    });
}
//@ chunk-exfmq47h.js:224983-225485 placement
/**
 * 目录模型 wire/stored schema 实例。
 */
var CatalogModelWireSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var storedRowSchema;
var selectorStateSchema;
var ACCOUNT_KIND_VALUES;
var catalogDocumentSchema;
deferInit("chunk-exfmq47h.js:224983", () => {
  CatalogModelWireSchema = DoctorLazy(() => catalogModelSchema("wire"));
  storedRowSchema = DoctorLazy(() => catalogModelSchema("stored"));
  selectorStateSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      model: stringSchema().optional(),
      selection_source: stringSchema().optional(),
      org_enforced_default_model: stringSchema().optional(),
      thinking: unknown().optional(),
      thinking_by_model: unknown().optional(),
    }).loose(),
  );
  ACCOUNT_KIND_VALUES = [
    "token_org",
    "membership",
    "api_key_org",
    "console_org",
    "federation_org",
    "service_key_org",
    "public",
  ];
  catalogDocumentSchema = DoctorLazy(() =>
    objectSchema({
      model_selector_state: array(selectorStateSchema()).optional(),
      model_selector_config: array(CatalogModelWireSchema()).optional(),
      organization_uuid: stringSchema().optional(),
      resolution: stringSchema().optional(),
    }).loose(),
  );
});
//@ chunk-exfmq47h.js:225485-225665 placement
/**
 * 取目录中某选择器界面的配置与状态。
 */
function getSelectorSurface(catalog, surface) {
  let found = catalog.model_selector_config?.find((config) => config.id === surface);
  if (!found) return null;
  let found_2 = catalog.model_selector_state?.find((state) => state.id === surface);
  return {
    surface,
    config: found,
    ...(found_2 && {
      state: found_2,
    }),
  };
}
//@ chunk-exfmq47h.js:225665-225934 placement
/**
 * 已发布目录常量：schema 版本、全部保留标记、大小上限、签名 schema 与时间戳正则。
 */
var CATALOG_SCHEMA_VERSION; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HOLD_ALL;
var CATALOG_SCHEMA;
var MAX_DOCUMENT_CHARS;
var SIGNATURE_SCHEMA_VERSION;
var RSASSA_PKCS1_V1_5_SHA512;
var catalogSignatureSchema;
var ISO_TIMESTAMP_RE_2;
deferInit("chunk-exfmq47h.js:225665", () => {
  CATALOG_SCHEMA_VERSION = 1;
  HOLD_ALL = "*";
  CATALOG_SCHEMA = MAX_CATALOG_RESPONSE_BYTES;
  MAX_DOCUMENT_CHARS = 16384;
  SIGNATURE_SCHEMA_VERSION = 1;
  RSASSA_PKCS1_V1_5_SHA512 = "RSASSA-PKCS1-v1_5-SHA512";
  catalogSignatureSchema = DoctorLazy(() =>
    objectSchema({
      schema: literal(SIGNATURE_SCHEMA_VERSION),
      algorithm: literal(RSASSA_PKCS1_V1_5_SHA512),
      signature: stringSchema().min(1),
      publicKeySha256: stringSchema().regex(/^[0-9a-f]{64}$/),
    }).loose(),
  );
  ISO_TIMESTAMP_RE_2 = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;
});
//@ chunk-exfmq47h.js:225934-226039 placement
/**
 * 解析 ISO 时间戳字符串为毫秒。
 */
function parseIsoTimestamp(expiresAt) {
  if (expiresAt === undefined || !ISO_TIMESTAMP_RE_2.test(expiresAt)) return;
  let timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
//@ chunk-exfmq47h.js:226039-226275 placement
/**
 * 目录文档 schema。
 */
var CatalogDocumentSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:226039", () => {
  CatalogDocumentSchema = DoctorLazy(() =>
    objectSchema({
      $schema: stringSchema().optional(),
      schema_version: literal(CATALOG_SCHEMA_VERSION),
      version: numberSchema().int().nonnegative(),
      issued_at: stringSchema().optional(),
      expires_at: stringSchema().optional(),
      key_id: stringSchema().optional(),
      hold: array(stringSchema()).optional().catch([HOLD_ALL]),
      surfaces: record(stringSchema(), catalogDocumentSchema()),
    }).loose(),
  );
});
//@ chunk-exfmq47h.js:226275-226375 placement
/**
 * 判断条目是否对某模型（或全部）保留。
 */
function isHeldForModel(entry, modelId) {
  return (entry.hold ?? []).some((value) => {
    let lower = value.trim().toLowerCase();
    return lower === HOLD_ALL || lower === modelId;
  });
}
//@ chunk-exfmq47h.js:226375-226515 placement
/**
 * 读取文档的 schema_version 数字。
 */
function getSchemaVersion(catalogDocument) {
  if (
    catalogDocument === null ||
    typeof catalogDocument !== "object" ||
    !("schema_version" in catalogDocument)
  )
    return;
  let schemaVersion = catalogDocument.schema_version;
  return typeof schemaVersion === "number" ? schemaVersion : undefined;
}
//@ chunk-exfmq47h.js:226515-226860 placement
/**
 * 取指定界面（cc/ccr/ccd）的目录状态。
 */
function surfaceStateFor(catalog, surface) {
  for (let [surfaceName, surfaceDoc] of [
    [surface, catalog.surfaces[surface]],
    ["cc", catalog.surfaces.cc],
  ]) {
    if (surfaceDoc === undefined) continue;
    let selectorSurface = getSelectorSurface(surfaceDoc, surfaceName);
    if (selectorSurface === null) continue;
    if (selectorSurface.state === undefined)
      return {
        surface,
        config: selectorSurface.config,
        origin: "published",
      };
    let {
      org_enforced_default_model: orgEnforcedDefaultModel,
      selection_source: selectionSource,
      ...stateRest
    } = selectorSurface.state;
    return {
      surface,
      config: selectorSurface.config,
      state: stateRest,
      origin: "published",
    };
  }
  return null;
}
//@ chunk-exfmq47h.js:226860-226979 placement
/**
 * 列出文档所有界面选择器配置中的模型。
 */
function listSurfaceModels(catalog) {
  return Object.values(catalog.surfaces).flatMap((surface) =>
    (surface.model_selector_config ?? []).flatMap((config) => config.models ?? []),
  );
}
//@ chunk-exfmq47h.js:226979-227130 placement
var bundledCatalogSeed; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:226979", () => {
  bundledCatalogSeed = DoctorLazy(() => {
    let parsed = CatalogDocumentSchema().safeParse(BUNDLED_MODEL_CATALOG);
    if (!parsed.success) logError(Error("published model-catalog seed does not parse"));
    return {
      document: parsed.success ? parsed.data : null,
    };
  });
});
//@ chunk-exfmq47h.js:227130-227166 placement
/**
 * 取内置的模型目录文档。
 */
function bundledCatalogDocument() {
  return bundledCatalogSeed().document;
}
//@ chunk-exfmq47h.js:227166-227206 placement
/**
 * 取内置目录的版本号。
 */
function bundledCatalogVersion() {
  return bundledCatalogDocument()?.version ?? 0;
}
//@ chunk-exfmq47h.js:227206-227264 placement
/**
 * 取内置目录在某表面下的状态。
 */
function bundledSurfaceState(surface) {
  let cachedDocument = bundledCatalogDocument();
  return cachedDocument === null ? null : surfaceStateFor(cachedDocument, surface);
}
//@ chunk-exfmq47h.js:227264-227314 placement
function stripDateSuffixFromId(id) {
  return normalizeModelId(id).replace(/-\d{8}$/, "");
}
//@ chunk-exfmq47h.js:227314-227564 placement
/**
 * 查找目录中缺少的族默认模型（种子有、编译期有但目录没有）。
 */
function findMissingFamilyDefault(catalog) {
  let ids = new Set(catalogModels(catalog).map((row) => stripDateSuffixFromId(row.id)));
  let defaults = familyDefaultMap(catalog);
  for (let family of MODEL_FAMILY_NAMES) {
    let compiledDefault = defaults[family];
    let catalogAlias = resolveCatalogAlias(family, "first_party");
    if (compiledDefault === undefined || catalogAlias === undefined) continue;
    if (ids.has(catalogAlias)) continue;
    if (getCatalogEntry(stripDateSuffixFromId(compiledDefault)) === undefined) continue;
    return {
      family,
      compiled: catalogAlias,
      seed: compiledDefault,
    };
  }
  return null;
}
//@ chunk-exfmq47h.js:227564-227618 placement
/**
 * 判断后端是否属于目录表面（firstParty/gateway）。
 */
function isCatalogSurfaceBackend(provider) {
  return provider === "firstParty" || provider === "gateway";
}
//@ chunk-exfmq47h.js:227618-227664 placement
var PROVIDER_MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
//@ chunk-exfmq47h.js:227664-227772 placement
/**
 * 取目录条目在指定提供商下的模型 id（不合法时返回 undefined）。
 */
function getProviderModelIdForEntry(entry, provider) {
  let trimmed = entry.provider_ids?.[providerCatalogKey(provider)]?.trim();
  if (trimmed !== undefined && !PROVIDER_MODEL_ID_RE.test(trimmed)) return;
  return trimmed ? trimmed : undefined;
}
//@ chunk-exfmq47h.js:227772-227852 placement
/**
 * 取目录条目的模型键（按 firstParty id 查表）。
 */
function entryModelKey(id) {
  let firstPartyId = firstPartyIdFromCatalog(id);
  return firstPartyId !== undefined && Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, firstPartyId)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[firstPartyId]
    : undefined;
}
//@ chunk-exfmq47h.js:227852-227952 placement
/**
 * 从目录解析模型的 firstParty id。
 */
function firstPartyIdFromCatalog(id) {
  let catalogId = catalogIdForProviderModelId(normalizeModelId(id));
  if (catalogId === undefined) return;
  return getCatalogEntry(catalogId)?.provider_ids.first_party ?? undefined;
}
//@ chunk-exfmq47h.js:227952-228024 placement
/**
 * 生成模型的身份键（有模型键用 key:，否则 id:）。
 */
function modelIdentityKey(id) {
  let key = entryModelKey(id);
  return key === undefined ? `id:${normalizeModelId(id)}` : `key:${key}`;
}
export {
  withCatalogSuppressed,
  isServedCatalogActive,
  findServedModel,
  CATALOG_SCHEMA,
  MAX_DOCUMENT_CHARS,
  isValidEtag,
  catalogSignatureSchema,
  modelEffortLevels,
  servedDefaultEffort,
  findEffectiveServedEntry,
  clampInputTokens,
  isPublishedCatalogInUse,
  isEffectiveCatalogActive,
  activeServedCatalog,
  activeCatalogModels,
  entryModelKey,
  servedMaxInputTokens,
  isCatalogSuppressed,
  servedMaxOutputTokens,
  servedDefaultOutputTokens,
  servedRuntime,
  CatalogDocumentSchema,
  SURFACE_NAMES,
  getSelectorSurface,
  parseIsoTimestamp,
  servedCatalogActive,
  ACCOUNT_KIND_VALUES,
  storedRowSchema,
  selectorStateSchema,
  MAX_CATALOG_RESPONSE_BYTES,
  catalogDocumentSchema,
  getSchemaVersion,
  CATALOG_SCHEMA_VERSION,
  bundledCatalogVersion,
  bundledCatalogDocument,
  isHeldForModel,
  findMissingFamilyDefault,
  modelIdentityKey,
  surfaceStateFor,
  bundledSurfaceState,
  clampInRange,
  OUTPUT_TOKEN_RANGE,
  servedCatalogSource,
  isConfidentialShorthand,
  maskModelFieldValue,
  isCatalogSurfaceBackend,
  getEffectiveServedCatalog,
  listSurfaceModels,
  MAX_INPUT_TOKEN_RANGE,
  getProviderModelIdForEntry,
  firstPartyIdFromCatalog,
  servedRowFamily,
  matchesCatalogList,
  findActiveServedByIdentity,
  isPublishedCatalogActive,
  orgDefaultModelState,
  clientDataForModel,
  CLIENT_DATA_PATH_RE,
  clientDataSchema,
  parseCatalogDocument,
  servedCapabilities,
};
