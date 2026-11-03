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
  Mc,
  MODEL_PLACEHOLDER_VALUES,
  isPublicModelId,
} from "./catalogEntries.js";
import { parseModelId } from "../modelIds.js";
import { getProviderState } from "../providerCaches.js";
import {
  getAPIProvider,
  isFirstPartyApiBackend,
  catalogModels,
  D3,
  getRowFamily,
  Fy,
  a6e,
  providerCatalogKey,
} from "../providers.js";
import {
  getCatalogState,
  resolveCatalogAlias,
  getCatalogEntry,
  catalogIdForProviderModelId,
} from "../modelCatalog.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, E, o, A, pe, oe, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../json.js";
import { logForDebugging } from "../../debug.js";
import { uniq } from "../../collections.js";
import { logError } from "../../log.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../configs.js";

/**
 * 含 claude- 且可解析为版本化模型。
 */
//@ chunk-aepeg2w5.js:143350-143420 placement = modelMatchesVersionPrefix (1)
function isVersionedClaudeModelSpec(e) {
  let n = normalizeModelId(e);
  return n.includes("claude-") && parseModelId(n) !== null;
}
/**
 * 对字段值（字符串或数组）中的模型 id 做遮盖，无变化时返回原值。
 */
//@ chunk-aepeg2w5.js:143420-143564 placement
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
    return containsMaskedId(S, getMaskedModelIds()) || (r && ob(S)) ? CONFIDENTIAL_MODEL_ID : S;
  };
  if (!e.includes(",")) return s(e);
  let h = !1,
    mapped = e.split(",").map((S) => {
      let w = s(S);
      if (w !== S) h = !0;
      return w;
    });
  return h ? mapped.join(",") : e;
}
//@ chunk-aepeg2w5.js:143813-143904 placement
function ob(e) {
  let n = normalizeModelId(e);
  return (
    Mc() && !/[-0-9,]/.test(e) && n.length > 0 && !MODEL_PLACEHOLDER_VALUES.has(n) && !isPublicModelId(n)
  );
}
/**
 * 当前目录来源。
 */
//@ chunk-aepeg2w5.js:143904-143959 placement
function servedCatalogSource() {
  return getProviderState().servedCatalogActive?.source;
}
//@ chunk-aepeg2w5.js:143959-144006 placement
function O3t() {
  return getProviderState().servedCatalogActive;
}
/**
 * 当前生效的服务端目录（被抑制时为 null）。
 */
//@ chunk-aepeg2w5.js:144006-144173 placement
function activeServedCatalog() {
  let e = getProviderState();
  if (e.servedCatalogSuppressDepth > 0) return null;
  let servedCatalogActive = e.servedCatalogActive,
    r = servedCatalogActive?.catalog ?? null;
  if (r === null || !rN(servedCatalogActive?.source)) return null;
  return r;
}
//@ chunk-aepeg2w5.js:144173-144243 placement
function rN(e) {
  if (e === "published") return getAPIProvider() !== "gateway";
  return isFirstPartyApiBackend();
}
/**
 * 返回生效的服务端目录（激活的目录，或第一方后端下保留的停用行）。
 */
//@ chunk-aepeg2w5.js:144243-144407 placement
function getEffectiveServedCatalog() {
  let e = activeServedCatalog();
  if (e !== null) return e;
  let n = getProviderState(),
    servedCatalogDeactivatedRows = n.servedCatalogDeactivatedRows;
  if (
    servedCatalogDeactivatedRows === void 0 ||
    n.servedCatalogSuppressDepth > 0 ||
    !isFirstPartyApiBackend()
  )
    return null;
  return servedCatalogDeactivatedRows;
}
//@ chunk-aepeg2w5.js:144407-144486 placement
function Vte() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "served";
}
/**
 * 是否使用已发布目录。
 */
//@ chunk-aepeg2w5.js:144486-144568 placement
function isPublishedCatalogActive() {
  return activeServedCatalog() !== null && getProviderState().servedCatalogActive?.source === "published";
}
/**
 * 已发布目录生效且启用。
 */
//@ chunk-aepeg2w5.js:144568-144602 placement
function isPublishedCatalogInUse() {
  return isPublishedCatalogActive() && isFirstPartyApiBackend();
}
//@ chunk-aepeg2w5.js:144602-144636 placement
function Cpr() {
  return activeServedCatalog() !== null;
}
//@ chunk-aepeg2w5.js:144636-144686 placement
function fo() {
  let e = activeServedCatalog();
  return e === null ? [] : catalogModels(e);
}
/**
 * 在抑制目录的状态下执行。
 */
//@ chunk-aepeg2w5.js:144686-144798 placement
function withCatalogSuppressed(e) {
  let n = getProviderState();
  n.servedCatalogSuppressDepth++;
  try {
    return e();
  } finally {
    n.servedCatalogSuppressDepth--;
  }
}
/**
 * 目录是否被抑制。
 */
//@ chunk-aepeg2w5.js:144798-144853 placement
function isCatalogSuppressed() {
  return getProviderState().servedCatalogSuppressDepth > 0;
}
//@ chunk-aepeg2w5.js:144853-144890 placement
function UUe(...e) {
  return findServedEntry(getEffectiveServedCatalog(), e);
}
/**
 * 在服务端目录中查找模型。
 */
//@ chunk-aepeg2w5.js:144890-144926 placement
function findServedModel(...e) {
  return findServedEntry(activeServedCatalog(), e);
}
//@ chunk-aepeg2w5.js:144926-144996 placement
function uto(e) {
  let n = activeServedCatalog();
  if (n === null) return;
  return D3(n, e) ?? findByIdentitySpelling(n, e);
}
//@ chunk-aepeg2w5.js:144996-145265 placement
function findServedEntry(e, n) {
  if (e === null) return;
  let [r, ...s] = n,
    h =
      r !== void 0 &&
      isPublishedCatalogInUse() &&
      getCatalogState().modelKnowledge?.isModelOverrideValue(r) === !0;
  if (r !== void 0 && !h) {
    let y = D3(e, r) ?? findByIdentitySpelling(e, r);
    if (y !== void 0) return y;
  }
  for (let y of s) {
    if (y === void 0) continue;
    let S = D3(e, y);
    if (S !== void 0) return S;
  }
  return;
}
//@ chunk-aepeg2w5.js:145265-145467 placement
function findByIdentitySpelling(e, n) {
  let r = getCatalogState().modelKnowledge?.identitySpelling;
  if (r === void 0) return;
  let s = normalizeModelId(r(n));
  if (s !== normalizeModelId(n)) {
    let h = D3(e, s);
    if (h !== void 0) return h;
  }
  return catalogModels(e).find((h) => normalizeModelId(h.id) !== s && normalizeModelId(r(h.id)) === s);
}
//@ chunk-aepeg2w5.js:145467-145511 placement
function dn(...e) {
  return UUe(...e)?.runtime;
}
//@ chunk-aepeg2w5.js:145511-145562 placement
var Ic = { min: 1e5, max: 1e7 },
  Axt = { min: 1024, max: 128000 };
//@ chunk-aepeg2w5.js:145562-145601 placement
function bi(...e) {
  return Nc(UUe(...e));
}
//@ chunk-aepeg2w5.js:145601-145679 placement
function Nc(e) {
  return l6e(e?.runtime?.max_input_tokens ?? e?.context_window, Ic);
}
//@ chunk-aepeg2w5.js:145679-145741 placement
function ub(...e) {
  return l6e(dn(...e)?.max_output_tokens, Axt);
}
//@ chunk-aepeg2w5.js:145741-145807 placement
function Fc(...e) {
  return l6e(dn(...e)?.default_output_tokens, Axt);
}
/**
 * 模型支持的 effort 级别。
 */
//@ chunk-aepeg2w5.js:145807-145891 placement
function modelEffortLevels(...e) {
  return dn(...e)?.effort_levels?.map((n) => n.trim().toLowerCase());
}
//@ chunk-aepeg2w5.js:145891-145989 placement
function twi(...e) {
  let n = dn(...e)?.default_effort;
  return n === void 0 ? void 0 : n.trim().toLowerCase();
}
//@ chunk-aepeg2w5.js:145989-146038 placement
function $os(...e) {
  return dn(...e)?.capabilities;
}
/**
 * 判断名字是否在目录列表中（以 - 前缀表示显式排除），未列出返回 undefined。
 */
//@ chunk-aepeg2w5.js:146038-146221 placement
function matchesCatalogList(e, ...n) {
  let r = $os(...n)?.map((h) => h.trim().toLowerCase());
  if (r === void 0) return;
  let lower = e.trim().toLowerCase();
  if (r.includes(lower)) return !0;
  return r.includes(`-${lower}`) ? !1 : void 0;
}
//@ chunk-aepeg2w5.js:146221-146287 placement
function lb(...e) {
  let n = UUe(...e);
  return n === void 0 ? void 0 : getRowFamily(n);
}
/**
 * 组织强制/配置的默认模型。
 */
//@ chunk-aepeg2w5.js:146287-146702 placement
function orgDefaultModelState() {
  let e = activeServedCatalog()?.state;
  if (e === void 0) return;
  let n = e.org_enforced_default_model?.trim();
  if (n) return { model: n, orgConfigured: !0, enforced: !0, accountResolved: !0 };
  let r = e.model?.trim();
  if (!r) return;
  let s = e.selection_source === "org_configuration" || e.selection_source === "custom_role_configuration",
    h = e.selection_source?.trim();
  return { model: r, orgConfigured: s, enforced: !1, accountResolved: s || (!!h && h !== "global_default") };
}
//@ chunk-aepeg2w5.js:146702-146788 placement
function l6e(e, n) {
  return e !== void 0 && Number.isInteger(e) && e >= n.min && e <= n.max ? e : void 0;
}
/**
 * 内置的模型目录 JSON（version 3444）。
 */
//@ chunk-aepeg2w5.js:146788-210373 placement
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
          thinking: { type: "effort", effort: "medium" },
          thinking_by_model: [
            { id: "claude-fable-5-1", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-sonnet-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-haiku-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-fable-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-8", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-7", thinking: { type: "effort", effort: "xhigh" } },
            { id: "claude-opus-4-6", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-4-6", thinking: { type: "effort", effort: "high" } },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: { type: "none" },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-opus-4-1-20250805",
              name: "Opus 4.1",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: { type: "none" },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 32000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "opus",
              },
              offered_on: ["bedrock"],
            },
          ],
          settings_vocabulary: {
            create_mode: { default: 1 },
            effort_level: { high: 3, low: 1, max: 5, medium: 2, xhigh: 4 },
            thinking_mode: { auto: 2, extended: 1, off: 3 },
          },
          provider_alias_targets: {
            fable: { default: "claude-fable-5-1", per_provider: { gateway: "claude-fable-5" } },
            haiku: { default: "claude-haiku-5-5" },
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
              per_provider: { anthropic_aws: "claude-sonnet-4-6", gateway: "claude-sonnet-4-6" },
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
          thinking: { type: "effort", effort: "medium" },
          thinking_by_model: [
            { id: "claude-fable-5-1", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-sonnet-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-haiku-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-fable-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-8", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-7", thinking: { type: "effort", effort: "xhigh" } },
            { id: "claude-opus-4-6", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-4-6", thinking: { type: "effort", effort: "high" } },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: { type: "none" },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-opus-4-1-20250805",
              name: "Opus 4.1",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: { type: "none" },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 32000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "opus",
              },
              offered_on: ["bedrock"],
            },
          ],
          settings_vocabulary: {
            create_mode: { default: 1 },
            effort_level: { high: 3, low: 1, max: 5, medium: 2, xhigh: 4 },
            thinking_mode: { auto: 2, extended: 1, off: 3 },
          },
          provider_alias_targets: {
            fable: { default: "claude-fable-5-1", per_provider: { gateway: "claude-fable-5" } },
            haiku: { default: "claude-haiku-5-5" },
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
              per_provider: { anthropic_aws: "claude-sonnet-4-6", gateway: "claude-sonnet-4-6" },
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
          thinking: { type: "effort", effort: "medium" },
          thinking_by_model: [
            { id: "claude-fable-5-1", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-sonnet-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-haiku-5-5", thinking: { type: "effort", effort: "medium" } },
            { id: "claude-fable-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-8", thinking: { type: "effort", effort: "high" } },
            { id: "claude-opus-4-7", thinking: { type: "effort", effort: "xhigh" } },
            { id: "claude-opus-4-6", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-5", thinking: { type: "effort", effort: "high" } },
            { id: "claude-sonnet-4-6", thinking: { type: "effort", effort: "high" } },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              min_claude_code_version: "2.1.280",
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
              quick_select: !0,
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "medium",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: { type: "none" },
              auto_permission_mode: "unavailable",
              runtime: {
                max_input_tokens: 200000,
                max_output_tokens: 64000,
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "xhigh", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 2576, max_height: 2576, max_image_tokens: 4784 },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                  { id: "fast", name: "Enable fast mode", selector_label: "Fast" },
                  { id: "off", name: "Off" },
                ],
              },
              runtime: {
                max_input_tokens: 1e6,
                max_output_tokens: 128000,
                effort_levels: ["low", "medium", "high", "max"],
                default_effort: "high",
                capabilities: ["compass", "gsuite_tools", "mm_images", "mm_pdf", "web_search"],
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "opus",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High", badge: { message: "Recommended", variant: "neutral" } },
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
                image_limits: { max_width: 1568, max_height: 1568, max_image_tokens: 1568 },
                family: "sonnet",
              },
              offered_on: ["first_party", "anthropic_aws", "bedrock", "vertex", "foundry", "gateway"],
            },
          ],
          settings_vocabulary: {
            create_mode: { default: 1 },
            effort_level: { high: 3, low: 1, max: 5, medium: 2, xhigh: 4 },
            thinking_mode: { auto: 2, extended: 1, off: 3 },
          },
          provider_alias_targets: {
            fable: { default: "claude-fable-5-1", per_provider: { gateway: "claude-fable-5" } },
            haiku: { default: "claude-haiku-5-5" },
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
              per_provider: { anthropic_aws: "claude-sonnet-4-6", gateway: "claude-sonnet-4-6" },
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
          thinking: { type: "effort_and_mode", effort: "low", mode: "off" },
          thinking_by_model: [
            { id: "claude-fable-5-1", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            { id: "claude-opus-5-5", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            {
              id: "claude-sonnet-5-5",
              thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" },
            },
            { id: "claude-haiku-5-5", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            { id: "claude-fable-5", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-5", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-4-8", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-4-7", thinking: { type: "effort_and_mode", effort: "xhigh", mode: "auto" } },
            {
              id: "claude-opus-4-6",
              thinking: { type: "effort_and_mode", effort: "medium", mode: "extended" },
            },
            { id: "claude-sonnet-5", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            { id: "claude-sonnet-4-6", thinking: { type: "effort_and_mode", effort: "low", mode: "off" } },
            { id: "claude-haiku-4-5-20251001", thinking: { type: "mode", mode: "extended" } },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
              },
              hard_limit: 950000,
              voice_model: "claude-opus-5",
              min_claude_code_version: "2.1.251",
              quick_select: !0,
            },
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              description: "For complex work and everyday tasks",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
              voice_model: "claude-opus-5",
              min_claude_code_version: "2.1.280",
              quick_select: !0,
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              description: "Most efficient for simpler tasks",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              voice_model: "claude-sonnet-5",
              quick_select: !0,
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              description: "Fastest for quick answers",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              voice_model: "claude-haiku-4-5-20251001",
              quick_select: !0,
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
                  {
                    id: "xhigh",
                    name: "Extra",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
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
                  { id: "extended", name: "Extended", description: "Always uses deep reasoning" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 449000,
              supports_fast_mode: !0,
              voice_model: "claude-opus-5",
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 950000,
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  {
                    id: "low",
                    name: "Low",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "mode",
                mode_options: [
                  { id: "extended", name: "Extended", description: "Always uses deep reasoning" },
                  { id: "off", name: "Off" },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                ],
                mode_options: [
                  { id: "extended", name: "Extended", description: "Always uses deep reasoning" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 190000,
              auto_permission_mode: "unavailable",
              voice_model: "claude-opus-5",
              disabled: !0,
            },
          ],
          settings_vocabulary: {
            create_mode: { default: 1 },
            effort_level: { high: 3, low: 1, max: 5, medium: 2, xhigh: 4 },
            thinking_mode: { auto: 2, extended: 1, off: 3 },
          },
        },
      ],
    },
    cowork: {
      model_selector_state: [
        {
          id: "cowork",
          model: "claude-sonnet-4-6",
          thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" },
          thinking_by_model: [
            { id: "claude-fable-5-1", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            { id: "claude-opus-5-5", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            {
              id: "claude-sonnet-5-5",
              thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" },
            },
            { id: "claude-haiku-5-5", thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" } },
            { id: "claude-fable-5", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-5", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-4-8", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            { id: "claude-opus-4-7", thinking: { type: "effort_and_mode", effort: "xhigh", mode: "auto" } },
            {
              id: "claude-opus-4-6",
              thinking: { type: "effort_and_mode", effort: "medium", mode: "extended" },
            },
            { id: "claude-sonnet-5", thinking: { type: "effort_and_mode", effort: "high", mode: "auto" } },
            {
              id: "claude-sonnet-4-6",
              thinking: { type: "effort_and_mode", effort: "medium", mode: "auto" },
            },
            { id: "claude-haiku-4-5-20251001", thinking: { type: "mode", mode: "extended" } },
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
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
              },
              hard_limit: 950000,
              min_claude_code_version: "2.1.251",
              quick_select: !0,
            },
            {
              id: "claude-opus-5-5",
              name: "Opus 5.5",
              short_name: "Opus",
              description: "For complex work and everyday tasks",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
              min_claude_code_version: "2.1.280",
              quick_select: !0,
            },
            {
              id: "claude-sonnet-5-5",
              name: "Sonnet 5.5",
              short_name: "Sonnet",
              description: "Most efficient for simpler tasks",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              quick_select: !0,
            },
            {
              id: "claude-haiku-5-5",
              name: "Haiku 5.5",
              short_name: "Haiku",
              description: "Fastest for quick answers",
              section: "main",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              quick_select: !0,
            },
            {
              id: "claude-fable-5",
              name: "Fable 5",
              short_name: "Fable",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-opus-5",
              name: "Opus 5",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                ],
                always_on: !0,
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
            },
            {
              id: "claude-opus-4-8",
              name: "Opus 4.8",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 950000,
              supports_fast_mode: !0,
            },
            {
              id: "claude-opus-4-7",
              name: "Opus 4.7",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  { id: "high", name: "High" },
                  {
                    id: "xhigh",
                    name: "Extra",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-opus-4-6",
              name: "Opus 4.6",
              short_name: "Opus",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
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
                  { id: "extended", name: "Extended", description: "Always uses deep reasoning" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 449000,
              supports_fast_mode: !0,
            },
            {
              id: "claude-sonnet-5",
              name: "Sonnet 5",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  { id: "medium", name: "Medium" },
                  {
                    id: "high",
                    name: "High",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "xhigh", name: "Extra" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 950000,
            },
            {
              id: "claude-sonnet-4-6",
              name: "Sonnet 4.6",
              short_name: "Sonnet",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "effort_and_mode",
                description:
                  "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
                effort_options: [
                  { id: "low", name: "Low" },
                  {
                    id: "medium",
                    name: "Medium",
                    recommended: !0,
                    badge: { message: "Recommended", variant: "neutral" },
                  },
                  { id: "high", name: "High" },
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
                  { id: "auto", name: "Thinking", description: "Can think for more complex tasks" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 449000,
            },
            {
              id: "claude-haiku-4-5-20251001",
              name: "Haiku 4.5",
              short_name: "Haiku",
              section: "overflow",
              capabilities: { compass: !0, gsuite_tools: !0, mm_images: !0, mm_pdf: !0, web_search: !0 },
              thinking: {
                type: "mode",
                mode_options: [
                  { id: "extended", name: "Extended", description: "Always uses deep reasoning" },
                  { id: "off", name: "Off" },
                ],
              },
              hard_limit: 190000,
              auto_permission_mode: "unavailable",
            },
          ],
          settings_vocabulary: {
            create_mode: { default: 1 },
            effort_level: { high: 3, low: 1, max: 5, medium: 2, xhigh: 4 },
            thinking_mode: { auto: 2, extended: 1, off: 3 },
          },
        },
      ],
    },
  },
};
//@ chunk-aepeg2w5.js:210373-210446 placement
var iN = "claude-code-client-data-v1\x00",
  nwi = /^\/[A-Za-z0-9_./-]{1,300}$/;
//@ chunk-aepeg2w5.js:210446-210484 placement
function rwi(e) {
  return `${iN}${e}\x00`;
}
//@ chunk-aepeg2w5.js:210484-210746 placement
var CLIENT_DATA_SCHEMA_VERSIONS = [1, 2],
  SEMVER_RE = /^\d{1,9}\.\d{1,9}\.\d{1,9}$/,
  clientDataConfigSchema = DoctorLazy(() =>
    u({
      schema_version: T(CLIENT_DATA_SCHEMA_VERSIONS),
      version: E().int().nonnegative(),
      min_claude_code_version: o().regex(SEMVER_RE).optional(),
      configs: A(u({ model_pattern: o().min(1).max(200), client_data: pe(o(), oe()) }).loose()).max(50),
    }).loose(),
  );
/**
 * 解析目录文档字节。
 */
//@ chunk-aepeg2w5.js:210746-211370 placement
function parseCatalogDocument(e) {
  let n = safeParseJSON(Buffer.from(e).toString("utf8"), !1);
  if (n === null || typeof n !== "object" || !("schema_version" in n))
    return { ok: !1, reason: "parse_failed" };
  if (!CLIENT_DATA_SCHEMA_VERSIONS.some((h) => h === n.schema_version))
    return { ok: !1, reason: typeof n.schema_version === "number" ? "unsupported_schema" : "parse_failed" };
  let safeParse = clientDataConfigSchema().safeParse(n);
  if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
  let s = [];
  for (let config of safeParse.data.configs)
    try {
      s.push({ pattern: new RegExp(config.model_pattern), clientData: config.client_data });
    } catch {
      return { ok: !1, reason: "parse_failed" };
    }
  return {
    ok: !0,
    document: {
      version: safeParse.data.version,
      minClaudeCodeVersion: safeParse.data.min_claude_code_version,
      entries: s,
    },
  };
}
/**
 * 匹配模型的客户端数据。
 */
//@ chunk-aepeg2w5.js:211370-211452 placement
function clientDataForModel(e, n) {
  return e.entries.find((entry) => entry.pattern.test(n))?.clientData ?? null;
}
//@ chunk-aepeg2w5.js:211452-211532 placement
var Rpr = ["cc", "ccr", "ccd"],
  M3t = 2097152,
  aN = /^(?:W\/)?"[!#-~\x80-\xff]*"$/,
  uN = 256;
/**
 * 是否为合法 ETag。
 */
//@ chunk-aepeg2w5.js:211532-211612 placement
function isValidEtag(e) {
  return typeof e === "string" && e.length > 0 && e.length <= uN && aN.test(e);
}
/**
 * 目录通知（标题、文本、按钮）schema。
 */
//@ chunk-aepeg2w5.js:211612-213697 placement
var CatalogNoticeSchema = DoctorLazy(() =>
    u({
      title: o().nullish(),
      text: o().nullish(),
      cta: u({ copy: o().nullish(), intent: o().nullish(), redirect_hint: o().nullish() }).loose().nullish(),
      is_dismissible: M().nullish(),
    }).loose(),
  ),
  _b = DoctorLazy(() => u({ id: o().optional(), name: o().optional(), description: o().optional() }).loose()),
  lN = DoctorLazy(() =>
    u({
      type: o().optional(),
      description: o().optional(),
      effort_options: A(_b()).optional(),
      mode_options: A(_b()).optional(),
      always_on: M().optional(),
    }).loose(),
  ),
  dN = DoctorLazy(() => {
    let max = E().min(0.005).max(1e4),
      n = { input: max, output: max, cache_write_5m: max, cache_write_1h: max, cache_read: max };
    return u({
      ...n,
      web_search: max,
      long_prompt: u({ above_prompt_tokens: E().int().positive(), ...n }).optional(),
    }).loose();
  }),
  cN = DoctorLazy(() =>
    u({
      max_input_tokens: E().optional(),
      max_output_tokens: E().optional(),
      default_output_tokens: E().optional(),
      effort_levels: A(o()).optional(),
      default_effort: o().optional(),
      capabilities: A(o()).optional(),
      family: o().optional(),
      knowledge_cutoff: o().optional(),
      default_for_family: o().optional(),
      fast_default_for_family: o().optional(),
      image_limits: u({
        max_width: E()
          .optional()
          .catch(void 0),
        max_height: E()
          .optional()
          .catch(void 0),
      })
        .loose()
        .nullish()
        .catch(void 0),
      eager_input_streaming: u({
        bedrock: M()
          .optional()
          .catch(void 0),
        vertex: M()
          .optional()
          .catch(void 0),
      })
        .loose()
        .nullish()
        .catch(void 0),
      pricing: dN()
        .nullish()
        .catch(void 0),
    }).loose(),
  ),
  fN = DoctorLazy(() =>
    u({
      id: o(),
      name: o().optional(),
      short_name: o().optional(),
      description: o().optional(),
      section: o().optional(),
      disabled: M().optional(),
      confidential: M().optional(),
      early_access: M().optional().catch(!0),
      notice: CatalogNoticeSchema().nullish(),
      selection_notice: CatalogNoticeSchema().nullish(),
      badge: u({ message: o().optional(), variant: o().optional() }).loose().nullish(),
      tooltip: u({ content: o().optional() }).loose().nullish(),
      capabilities: pe(o(), M()).optional(),
      thinking: lN().optional(),
      fast_mode: u({}).loose().optional(),
      hard_limit: E().optional(),
      context_window: E().optional(),
      quick_select: M().optional(),
      runtime: cN().optional(),
      behaves_as: o().nullish(),
      provider_ids: pe(o(), o().nullish()).nullish(),
      offered_on: A(o())
        .nullish()
        .catch(void 0),
      min_claude_code_version: o().regex(SEMVER_RE).nullish().catch(null),
    }).loose(),
  ),
  hb = 64;
/**
 * 把目录模型分为有效、部分有效、无效。
 */
//@ chunk-aepeg2w5.js:213697-214096 placement
function partitionCatalogModels(e) {
  let n = fN(),
    r = idOnlySchema(),
    s = confidentialMarkerSchema(),
    h = [],
    y = [],
    S = [],
    w = 0;
  for (let R of e) {
    let safeParse = n.safeParse(R);
    if (safeParse.success) {
      h.push(safeParse.data);
      continue;
    }
    let safeParse_2 = r.safeParse(R);
    if (!safeParse_2.success || normalizeModelId(safeParse_2.data.id).length === 0 || y.length >= hb) {
      w += 1;
      continue;
    }
    if ((y.push(safeParse_2.data.id), s.safeParse(R).success)) S.push(safeParse_2.data.id);
  }
  return {
    rows: h,
    invalidCount: e.length - h.length,
    droppedModelIds: y,
    droppedConfidentialIds: S,
    unidentifiedDropCount: w,
  };
}
//@ chunk-aepeg2w5.js:214096-214288 placement
var idOnlySchema = DoctorLazy(() => u({ id: o() })),
  confidentialMarkerSchema = DoctorLazy(() => u({ confidential: T(!0) })),
  aliasEntrySchema = DoctorLazy(() =>
    u({
      default: o()
        .nullish()
        .catch(void 0),
      per_provider: pe(
        o(),
        o()
          .nullish()
          .catch(void 0),
      )
        .nullish()
        .catch(void 0),
    }).loose(),
  );
/**
 * 目录模型 schema（wire/stored 两种）。
 */
//@ chunk-aepeg2w5.js:214288-215471 placement
function catalogModelSchema(e) {
  let n = () =>
      oe()
        .optional()
        .transform(() => {
          return;
        }),
    r = e === "stored" ? A(o()).optional() : n(),
    s = e === "stored" ? M().optional() : n();
  return u({
    id: o(),
    models: A(oe()).optional(),
    description: o().optional(),
    auto_compact_window: E().optional(),
    provider_alias_targets: pe(
      o(),
      aliasEntrySchema()
        .nullish()
        .catch(void 0),
    )
      .nullish()
      .catch(void 0),
    dropped_model_ids: r,
    dropped_confidential_ids: r,
    dropped_unidentified_rows: s,
  })
    .loose()
    .transform((h) => {
      let {
          dropped_model_ids: dropped_model_ids,
          dropped_confidential_ids: dropped_confidential_ids,
          dropped_unidentified_rows: dropped_unidentified_rows,
          ...R
        } = h,
        x =
          e === "stored"
            ? {
                ids: dropped_model_ids ?? [],
                confidentialIds: dropped_confidential_ids ?? [],
                unidentified: dropped_unidentified_rows === !0,
              }
            : { ids: [], confidentialIds: [], unidentified: !1 },
        P = R.models === void 0 ? void 0 : partitionCatalogModels(R.models);
      if (P !== void 0 && P.invalidCount > 0)
        logForDebugging(
          `[servedCatalog] surface ${R.id}: ${P.invalidCount} of ${R.models?.length ?? 0} served rows failed row validation`,
        );
      let F = uniq([...x.ids, ...(P?.droppedModelIds ?? [])]),
        sliced = F.slice(0, hb),
        filtered = uniq([...x.confidentialIds, ...(P?.droppedConfidentialIds ?? [])]).filter((ee) =>
          sliced.includes(ee),
        ),
        j = x.unidentified || (P?.unidentifiedDropCount ?? 0) > 0 || F.length > sliced.length;
      return {
        ...R,
        models: P?.rows,
        ...(sliced.length > 0 && { dropped_model_ids: sliced }),
        ...(filtered.length > 0 && { dropped_confidential_ids: filtered }),
        ...(j && { dropped_unidentified_rows: !0 }),
      };
    });
}
/**
 * 目录模型 wire/stored schema 实例。
 */
//@ chunk-aepeg2w5.js:215471-215973 placement
var CatalogModelWireSchema = DoctorLazy(() => catalogModelSchema("wire")),
  swi = DoctorLazy(() => catalogModelSchema("stored")),
  vCn = DoctorLazy(() =>
    u({
      id: o(),
      model: o().optional(),
      selection_source: o().optional(),
      org_enforced_default_model: o().optional(),
      thinking: oe().optional(),
      thinking_by_model: oe().optional(),
    }).loose(),
  ),
  xpr = [
    "token_org",
    "membership",
    "api_key_org",
    "console_org",
    "federation_org",
    "service_key_org",
    "public",
  ],
  pto = DoctorLazy(() =>
    u({
      model_selector_state: A(vCn()).optional(),
      model_selector_config: A(CatalogModelWireSchema()).optional(),
      organization_uuid: o().optional(),
      resolution: o().optional(),
    }).loose(),
  );
/**
 * 取目录中某选择器界面的配置与状态。
 */
//@ chunk-aepeg2w5.js:215973-216153 placement
function getSelectorSurface(e, n) {
  let r = e.model_selector_config?.find((h) => h.id === n);
  if (!r) return null;
  let s = e.model_selector_state?.find((h) => h.id === n);
  return { surface: n, config: r, ...(s && { state: s }) };
}
/**
 * 已发布目录常量：schema 版本、全部保留标记、大小上限、签名 schema 与时间戳正则。
 */
//@ chunk-aepeg2w5.js:216153-216422 placement
var CATALOG_SCHEMA_VERSION = 1,
  HOLD_ALL = "*",
  CATALOG_SCHEMA = M3t,
  MAX_DOCUMENT_CHARS = 16384,
  SIGNATURE_SCHEMA_VERSION = 1,
  RSASSA_PKCS1_V1_5_SHA512 = "RSASSA-PKCS1-v1_5-SHA512",
  catalogSignatureSchema = DoctorLazy(() =>
    u({
      schema: T(SIGNATURE_SCHEMA_VERSION),
      algorithm: T(RSASSA_PKCS1_V1_5_SHA512),
      signature: o().min(1),
      publicKeySha256: o().regex(/^[0-9a-f]{64}$/),
    }).loose(),
  ),
  ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;
/**
 * 解析 ISO 时间戳字符串为毫秒。
 */
//@ chunk-aepeg2w5.js:216422-216527 placement
function parseIsoTimestamp(e) {
  if (e === void 0 || !ISO_TIMESTAMP_RE.test(e)) return;
  let parse = Date.parse(e);
  return Number.isFinite(parse) ? parse : void 0;
}
/**
 * 目录文档 schema。
 */
//@ chunk-aepeg2w5.js:216527-216763 placement
var CatalogDocumentSchema = DoctorLazy(() =>
  u({
    $schema: o().optional(),
    schema_version: T(CATALOG_SCHEMA_VERSION),
    version: E().int().nonnegative(),
    issued_at: o().optional(),
    expires_at: o().optional(),
    key_id: o().optional(),
    hold: A(o()).optional().catch([HOLD_ALL]),
    surfaces: pe(o(), pto()),
  }).loose(),
);
/**
 * 判断条目是否对某模型（或全部）保留。
 */
//@ chunk-aepeg2w5.js:216763-216863 placement
function isHeldForModel(e, n) {
  return (e.hold ?? []).some((r) => {
    let lower = r.trim().toLowerCase();
    return lower === HOLD_ALL || lower === n;
  });
}
/**
 * 读取文档的 schema_version 数字。
 */
//@ chunk-aepeg2w5.js:216863-217003 placement
function getSchemaVersion(e) {
  if (e === null || typeof e !== "object" || !("schema_version" in e)) return;
  let schema_version = e.schema_version;
  return typeof schema_version === "number" ? schema_version : void 0;
}
/**
 * 取指定界面（cc/ccr/ccd）的目录状态。
 */
//@ chunk-aepeg2w5.js:217003-217348 placement
function surfaceStateFor(e, n) {
  for (let [r, s] of [
    [n, e.surfaces[n]],
    ["cc", e.surfaces.cc],
  ]) {
    if (s === void 0) continue;
    let h = getSelectorSurface(s, r);
    if (h === null) continue;
    if (h.state === void 0) return { surface: n, config: h.config, origin: "published" };
    let {
      org_enforced_default_model: org_enforced_default_model,
      selection_source: selection_source,
      ...w
    } = h.state;
    return { surface: n, config: h.config, state: w, origin: "published" };
  }
  return null;
}
/**
 * 列出文档所有界面选择器配置中的模型。
 */
//@ chunk-aepeg2w5.js:217348-217467 placement
function listSurfaceModels(e) {
  return Object.values(e.surfaces).flatMap((n) =>
    (n.model_selector_config ?? []).flatMap((r) => r.models ?? []),
  );
}
//@ chunk-aepeg2w5.js:217467-217618 placement
var bundledCatalogSeed = DoctorLazy(() => {
  let safeParse = CatalogDocumentSchema().safeParse(BUNDLED_MODEL_CATALOG);
  if (!safeParse.success) logError(Error("published model-catalog seed does not parse"));
  return { document: safeParse.success ? safeParse.data : null };
});
//@ chunk-aepeg2w5.js:217618-217654 placement
function kCn() {
  return bundledCatalogSeed().document;
}
//@ chunk-aepeg2w5.js:217654-217694 placement
function dwi() {
  return kCn()?.version ?? 0;
}
//@ chunk-aepeg2w5.js:217694-217752 placement
function cwi(e) {
  let n = kCn();
  return n === null ? null : surfaceStateFor(n, e);
}
//@ chunk-aepeg2w5.js:217752-217802 placement
function vb(e) {
  return normalizeModelId(e).replace(/-\d{8}$/, "");
}
/**
 * 查找目录中缺少的族默认模型（种子有、编译期有但目录没有）。
 */
//@ chunk-aepeg2w5.js:217802-218052 placement
function findMissingFamilyDefault(e) {
  let n = new Set(catalogModels(e).map((s) => vb(s.id))),
    r = Fy(e);
  for (let s of a6e) {
    let h = r[s],
      y = resolveCatalogAlias(s, "first_party");
    if (h === void 0 || y === void 0) continue;
    if (n.has(y)) continue;
    if (getCatalogEntry(vb(h)) === void 0) continue;
    return { family: s, compiled: y, seed: h };
  }
  return null;
}
//@ chunk-aepeg2w5.js:218052-218106 placement
function Uc(e) {
  return e === "firstParty" || e === "gateway";
}
//@ chunk-aepeg2w5.js:218106-218152 placement
var EN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
/**
 * 取目录条目在指定提供商下的模型 id（不合法时返回 undefined）。
 */
//@ chunk-aepeg2w5.js:218152-218260 placement
function getProviderModelIdForEntry(e, n) {
  let r = e.provider_ids?.[providerCatalogKey(n)]?.trim();
  if (r !== void 0 && !EN.test(r)) return;
  return r ? r : void 0;
}
//@ chunk-aepeg2w5.js:218260-218340 placement
function Yte(e) {
  let n = Hc(e);
  return n !== void 0 && Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, n)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[n]
    : void 0;
}
//@ chunk-aepeg2w5.js:218340-218439 placement
function Hc(e) {
  let n = catalogIdForProviderModelId(normalizeModelId(e));
  if (n === void 0) return;
  return getCatalogEntry(n)?.provider_ids.first_party ?? void 0;
}
//@ chunk-aepeg2w5.js:218439-218511 placement
function Bae(e) {
  let n = Yte(e);
  return n === void 0 ? `id:${normalizeModelId(e)}` : `key:${n}`;
}

export {
  findServedModel,
  Cpr,
  Vte,
  activeServedCatalog,
  fo,
  Yte,
  UUe,
  bi,
  modelEffortLevels,
  twi,
  dn,
  withCatalogSuppressed,
  xpr,
  isValidEtag,
  CATALOG_SCHEMA,
  getSchemaVersion,
  CATALOG_SCHEMA_VERSION,
  CatalogDocumentSchema,
  dwi,
  O3t,
  kCn,
  isHeldForModel,
  findMissingFamilyDefault,
  Bae,
  surfaceStateFor,
  cwi,
  l6e,
  Axt,
  servedCatalogSource,
  clientDataForModel,
  nwi,
  rwi,
  parseCatalogDocument,
  ob,
  maskModelFieldValue,
  Uc,
  getEffectiveServedCatalog,
  Fc,
  isCatalogSuppressed,
  listSurfaceModels,
  Ic,
  getProviderModelIdForEntry,
  Hc,
  lb,
  isPublishedCatalogInUse,
  matchesCatalogList,
  uto,
  isPublishedCatalogActive,
  orgDefaultModelState,
  Nc,
  ub,
  Rpr,
  swi,
  vCn,
  M3t,
  pto,
  getSelectorSurface,
  MAX_DOCUMENT_CHARS,
  catalogSignatureSchema,
  $os,
  parseIsoTimestamp,
};
