/**
 * tools/PluginSearchTool/PluginSearchTool.ts
 *
 * 2.1.316 新增。插件/skill 搜索与推荐工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zw5xhxkf.js (41)
 * attribution: placement 41
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  booleanSchema,
  objectSchema,
  array,
  zodStrictObject,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isPolicyAllowed,
  policyDenyKind,
  policyDeniedReason,
} from "../../services/policyLimits/policyVerdicts.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { pluginsScopeGate } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import {
  errorEnvelopeSchema,
  isPluginsSyncVetoed,
  isSyncRefusal,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { uniq } from "../../utils/collections.js";
import { isTaggedMarketplaceId } from "../../utils/plugins/syncedItems.js";
import { isAbortError, errorMessage, AbortError } from "../../utils/errors.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { sessionSkillManifestSlot } from "../../services/plugins/accountSync/sessionSkillManifest.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isPluginSkillToolEnabled, _registerSuggestRolloutPinReader } from "./pluginSkillToolGate.js";
import { RecentItemsCache } from "../../utils/recentItemsCache.js";
import {
  LISTPLUGINS,
  LISTSKILLS,
  SEARCHPLUGINS,
  SUGGESTSKILLS,
  SUGGESTPLUGININSTALL,
  SEARCHSKILLS,
} from "../pluginDiscoveryToolNames.js";
import { listAccountPlugins } from "../../services/plugins/accountSync/listPlugins.js";
import { fetchOrgSkillsListWithRetry } from "../../services/skillsSync/orgSkillsApi.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isCcsRemoteCowork, isChatOrTeams } from "../../utils/entrypointKinds.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { envSessionKind } from "../../utils/sessionShape.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { toolMatchesName } from "../../Tool.js";

//@ chunk-zw5xhxkf.js:5270-5474 placement
var pluginSearchRowSchema = DoctorLazy(() =>
  looseObject({
    id: stringSchema(),
    name: stringSchema(),
    display_name: stringSchema().nullish(),
    description: stringSchema().nullish(),
    enabled: booleanSchema().nullish(),
    presents_as: stringSchema().nullish(),
    installation_preference: stringSchema().nullish(),
  }),
);
var pluginSearchResponseSchema = DoctorLazy(() =>
  objectSchema({
    results: array(pluginSearchRowSchema()),
  }),
);
//@ chunk-zw5xhxkf.js:5474-5567 placement
class PluginSkillSearchUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "PluginSkillSearchUnavailableError";
  }
}
//@ chunk-zw5xhxkf.js:5567-5732 placement
var PLUGIN_SEARCH_TIMEOUT_MS = 15000;
var PLUGIN_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/plugins/search";
var SKILL_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/skills/search";
var PLUGINS_API_PATH = "/api/oauth/organizations/:orgUUID/plugins/";
//@ chunk-zw5xhxkf.js:5732-6334 placement
/**
 * 插件/技能搜索前的检查：组织策略 allow_plugin_skill_search 不允许时按原因记埋点并抛 PluginSkillSearchUnavailableError；需要 user:plugins scope 而会话没有时降级为空（返回 skip）。
 */
async function checkPluginSearchAllowed(feature, needsPluginsScope, session, client) {
  if (!isPolicyAllowed("allow_plugin_skill_search")) {
    let denyKind = policyDenyKind("allow_plugin_skill_search");
    logFeatureBad(
      feature,
      denyKind === "org_denied" || denyKind === "latched"
        ? "policy_denied"
        : denyKind === "unregistered"
          ? "policy_mirror_unregistered"
          : denyKind === "route_missing"
            ? "policy_route_missing"
            : "policy_cache_miss",
    );
    throw new PluginSkillSearchUnavailableError(
      policyDeniedReason("allow_plugin_skill_search", "Plugin and skill search", "is") ??
        "Plugin and skill search is unavailable right now; please try again.",
    );
  }
  if (needsPluginsScope && (await pluginsScopeGate(session, client)) === "skip_no_scope") {
    logForDebugging("[plugin-skill-search] degraded to empty: no user:plugins scope in this session", {
      level: "error",
    });
    logFeatureSad(feature, "no_plugins_scope");
    return "skip";
  }
  return "send";
}
//@ chunk-zw5xhxkf.js:6334-7335 placement
async function searchPluginsOrSkills(path, keywords, session, client) {
  let feature = path === SKILL_SEARCH_PATH ? "skill_search" : "plugin_search";
  if ((await checkPluginSearchAllowed(feature, path === PLUGIN_SEARCH_PATH, session, client)) === "skip")
    return [];
  let useTagMarketplaces = path === PLUGIN_SEARCH_PATH && env.CLAUDE_CODE_CCR_SURFACE === "tag";
  let response = await apiClient.post(
    path,
    useTagMarketplaces
      ? {
          keywords,
          included_default_marketplaces: ["claude-tag-plugins"],
        }
      : {
          keywords,
        },
    {
      auth: "teleport-org",
      timeout: PLUGIN_SEARCH_TIMEOUT_MS,
      signal: session,
      credentials: client,
    },
  );
  if (!response.ok)
    throw Error(
      response.reason === "no-auth"
        ? "Not authenticated with a claude.ai account."
        : `search route unavailable: ${response.reason}`,
    );
  if (response.status >= 400) {
    let errorEnvelope = errorEnvelopeSchema().safeParse(response.data);
    let errorText = errorEnvelope.success
      ? `search route ${response.status} ${errorEnvelope.data.error.type ?? "error_envelope_no_type"}${errorEnvelope.data.error.message ? `: ${errorEnvelope.data.error.message}` : ""}`
      : `search route ${response.status}`;
    if (
      errorEnvelope.success &&
      (response.status === 403 ||
        (response.status === 404 && errorEnvelope.data.error.type === "not_found_error"))
    ) {
      logForDebugging(`[plugin-skill-search] degraded to empty: ${errorText}`, {
        level: "error",
      });
      logFeatureSad(feature, "not_entitled");
      return [];
    }
    throw Error(errorText);
  }
  let parsed = pluginSearchResponseSchema().safeParse(response.data);
  if (!parsed.success) throw Error("malformed search response");
  logFeatureOk(path === SKILL_SEARCH_PATH ? "skill_search" : "plugin_search");
  return parsed.data.results;
}
//@ chunk-zw5xhxkf.js:7335-8335 placement
async function fetchPluginDetails(pluginIds, session, client) {
  let filtered = uniq(pluginIds).filter(isTaggedMarketplaceId);
  if (filtered.length === 0)
    return {
      found: [],
      unchecked: [],
      skippedNoScope: false,
    };
  if ((await checkPluginSearchAllowed("plugin_suggest", true, session, client)) === "skip")
    return {
      found: [],
      unchecked: filtered,
      skippedNoScope: true,
    };
  let found = [];
  let unchecked = [];
  await Promise.all(
    filtered.map(async (pluginId) => {
      try {
        let response = await apiClient.get(`${PLUGINS_API_PATH}${encodeURIComponent(pluginId)}`, {
          auth: "teleport-org",
          timeout: PLUGIN_SEARCH_TIMEOUT_MS,
          signal: session,
          credentials: client,
        });
        if (!response.ok) {
          logForDebugging(`[plugin-skill-search] plugin detail not sent: ${response.reason}`);
          unchecked.push(pluginId);
          return;
        }
        if (response.status >= 400) {
          if (!(errorEnvelopeSchema().safeParse(response.data).success && response.status === 404)) {
            logForDebugging(
              `[plugin-skill-search] plugin detail for ${pluginId} returned HTTP ${response.status}`,
              {
                level: "error",
              },
            );
            unchecked.push(pluginId);
          }
          return;
        }
        let parsedRow = pluginSearchRowSchema().safeParse(response.data);
        if (!parsedRow.success || parsedRow.data.id !== pluginId) {
          logForDebugging(
            `[plugin-skill-search] plugin detail for ${pluginId} did not parse as that plugin`,
            {
              level: "error",
            },
          );
          unchecked.push(pluginId);
          return;
        }
        found.push(parsedRow.data);
      } catch (error) {
        if (isAbortError(error) || session?.aborted) throw error;
        logForDebugging(
          `[plugin-skill-search] plugin detail for ${pluginId} failed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
        unchecked.push(pluginId);
      }
    }),
  );
  return {
    found,
    unchecked,
    skippedNoScope: false,
  };
}
//@ chunk-zw5xhxkf.js:8335-8377 placement
/**
 * 在插件目录里按关键词搜索（run 实现）。
 */
async function searchPluginsCatalog(keywords, signal, credentials) {
  return searchPluginsOrSkills(PLUGIN_SEARCH_PATH, keywords, signal, credentials);
}
//@ chunk-zw5xhxkf.js:8377-8419 placement
/**
 * 在技能目录里按关键词搜索。
 */
async function searchSkillsCatalog(keywords, signal, credentials) {
  return searchPluginsOrSkills(SKILL_SEARCH_PATH, keywords, signal, credentials);
}
//@ chunk-zw5xhxkf.js:8419-8561 placement
function logSearchFetchFailed(kind, error) {
  logForDebugging(`[plugin-skill-search] ${kind} failed: ${errorMessage(error)}`, {
    level: "error",
  });
  logFeatureBad(kind === "plugin" ? "plugin_search" : "skill_search", "fetch_failed");
}
//@ chunk-zw5xhxkf.js:8561-8789 placement
async function readPluginManifest(session, signal, feature) {
  if (!isSessionRefsSyncEnabled(session)) return null;
  if (isPluginsSyncVetoed()) return [];
  let manifestResult = await raceWithAbortSignal(
    sessionSkillManifestSlot.of(session).fetch(),
    signal,
    () => new AbortError("plugin manifest read aborted"),
  );
  if (!manifestResult.ok) {
    logFeatureBad(feature, "manifest_failed");
    throw new PluginSkillSearchUnavailableError(`manifest ${manifestResult.reason}`);
  }
  return manifestResult.plugins;
}
//@ chunk-zw5xhxkf.js:8789-8926 placement
var keywordsSchema = DoctorLazy(() =>
  array(stringSchema().min(1).max(64))
    .min(1)
    .max(8)
    .describe("Keyword phrases describing the user's intent."),
);
var listResultSchema = DoctorLazy(() =>
  objectSchema({
    results: array(pluginSearchRowSchema()),
  }),
);
//@ chunk-zw5xhxkf.js:8926-8996 placement
/**
 * 把工具结果序列化成 tool_result 内容块（JSON）。
 */
function jsonResultBlock(result, toolUseId) {
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: jsonStringify(result),
  };
}
//@ chunk-zw5xhxkf.js:8996-9044 placement
/**
 * 把输入里的关键词数组渲染成逗号分隔文本。
 */
function renderKeywords(input) {
  return (input.keywords ?? []).join(", ");
}
//@ chunk-zw5xhxkf.js:9044-9085 placement
/**
 * 渲染 contextLabel，缺省空串。
 */
function renderContextLabel(input) {
  return input.contextLabel ?? "";
}
//@ chunk-zw5xhxkf.js:9085-9208 placement
var listInputSchema = DoctorLazy(() =>
  zodStrictObject({
    keywords: array(stringSchema().min(1).max(64))
      .max(8)
      .optional()
      .describe("Optional filter; omit to list everything."),
  }),
);
//@ chunk-zw5xhxkf.js:9208-9295 placement
/**
 * 判断名称或描述是否包含任意关键词（忽略大小写）。
 */
function matchesAnyKeyword(text, keywords) {
  let lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}
//@ chunk-zw5xhxkf.js:9295-9410 placement
function filterByKeywords(rows, keywords) {
  if (!keywords?.length) return rows;
  return rows.filter(
    (row) =>
      matchesAnyKeyword(row.name, keywords) ||
      (row.description ? matchesAnyKeyword(row.description, keywords) : false),
  );
}
//@ chunk-zw5xhxkf.js:9410-10045 placement
/**
 * 构造"列出插件/技能"只读工具（可按关键词过滤，延迟加载）：调用 fetch 获取目录，按需记录目录行，返回 {results}。
 */
function buildCatalogListTool(spec) {
  return buildTool({
    name: spec.name,
    searchHint: `list ${spec.subject}`,
    backgrounding: "never",
    maxResultSizeChars: 50000,
    shouldDefer: true,
    get inputSchema() {
      return listInputSchema();
    },
    get outputSchema() {
      return listResultSchema();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => true,
    isReadOnly: () => true,
    description: async () => `List ${spec.subject}, optionally filtered by keyword.`,
    prompt: async () => spec.prompt,
    create(toolContext) {
      return {
        async call(input, callOptions) {
          let rows = await spec.fetch(callOptions.signal, toolContext.credentials, toolContext.session);
          if (spec.recordsCatalogRows) toolContext.toolState.get(RecentItemsCache).remember(rows);
          return {
            data: {
              results: filterByKeywords(rows, input.keywords),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam: spec.mapToolResultToToolResultBlockParam,
    renderToolUseMessage: renderKeywords,
  });
}
//@ chunk-zw5xhxkf.js:10045-12452 placement
/**
 * ListPlugins 工具：列出用户 claude.ai 账号启用的插件（非本地安装）。
 */
var LIST_PLUGINS_TOOL =
  "the plugins enabled on the user's claude.ai account (not plugins installed locally, such as with /plugin; in a channel session, the plugins the channel has)";
var ListPluginsTool = buildCatalogListTool({
  name: LISTPLUGINS,
  subject: LIST_PLUGINS_TOOL,
  recordsCatalogRows: true,
  async fetch(signal, credentials, session) {
    let pluginManifest = await readPluginManifest(session, signal, "plugin_list");
    if (pluginManifest !== null) {
      logFeatureOk("plugin_list");
      return pluginManifest.map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description || null,
        enabled: true,
      }));
    }
    let listResult = await listAccountPlugins({
      signal,
      credentials,
    });
    if (!listResult.success) {
      if (isSyncRefusal(listResult)) {
        logForDebugging(
          `[plugin-skill-list] degraded to empty: list-plugins ${listResult.status ?? listResult.kind} ${listResult.error}`,
          {
            level: "error",
          },
        );
        logFeatureSad("plugin_list", listResult.kind === "no_scope" ? "no_plugins_scope" : "not_entitled");
        return [];
      }
      logFeatureBad("plugin_list", "fetch_failed");
      throw new PluginSkillSearchUnavailableError(listResult.error);
    }
    logFeatureOk("plugin_list");
    return listResult.plugins.map((plugin) => ({
      id: plugin.pluginId,
      name: plugin.name,
      description: plugin.description || null,
      enabled: true,
      ...(plugin.presentsAs && {
        presents_as: plugin.presentsAs,
      }),
    }));
  },
  prompt: `List ${LIST_PLUGINS_TOOL}. Call this when the user asks what plugins they have, or to confirm what was installed after a SuggestPluginInstall card. Pass keywords to filter to a topic; omit to list all. To suggest a plugin they do NOT have yet, use SearchPlugins, then SuggestPluginInstall when it is among your tools; otherwise relay the relevant results in text instead.`,
  mapToolResultToToolResultBlockParam: jsonResultBlock,
});
var SKILL_SHARE_NOTE =
  "If the user asks to share a skill: you cannot share it for them, but where this list is shown as a card, their own skills may have a Share button, depending on their app, plan and organization. It shares only within that organization.";
var SuggestPluginInstallTool = buildCatalogListTool({
  name: LISTSKILLS,
  subject: "the user's enabled claude.ai skills",
  async fetch(signal, credentials) {
    let orgSkillsListWithRetry = await fetchOrgSkillsListWithRetry({
      credentials,
    });
    if (!orgSkillsListWithRetry.success) {
      if (isSyncRefusal(orgSkillsListWithRetry)) {
        logForDebugging(
          `[plugin-skill-list] degraded to empty: list-skills ${orgSkillsListWithRetry.status ?? orgSkillsListWithRetry.kind} ${orgSkillsListWithRetry.error}`,
          {
            level: "error",
          },
        );
        logFeatureSad("skill_list", "not_entitled");
        return [];
      }
      logFeatureBad("skill_list", "fetch_failed");
      throw new PluginSkillSearchUnavailableError(orgSkillsListWithRetry.error);
    }
    logFeatureOk("skill_list");
    return orgSkillsListWithRetry.skills.map((skill) => ({
      id: skill.skillId,
      name: skill.name,
      description: skill.description || null,
      enabled: true,
    }));
  },
  prompt:
    "List the user's enabled claude.ai skills. Call this when the user asks what skills they have. Pass keywords to filter to a topic; omit to list all. To recommend skills they do NOT have yet, use SuggestSkills when it is among your tools; otherwise use SearchSkills and relay the relevant results in text instead.",
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(
        result.results.length > 0
          ? {
              note: SKILL_SHARE_NOTE,
              results: result.results,
            }
          : result,
      ),
    };
  },
});
//@ chunk-zw5xhxkf.js:12452-15519 placement
/**
 * 建议来源字段（user_asked/proactive）。
 */
var SUGGEST_PLUGINS_TOOL = DoctorLazy(() => _enum(["user_asked", "proactive"]));
var suggestTriggerSchema = DoctorLazy(() =>
  SUGGEST_PLUGINS_TOOL().optional().describe("How this suggestion started: 'user_asked' or 'proactive'."),
);
var pluginSuggestionSchema = DoctorLazy(() =>
  zodStrictObject({
    pluginId: stringSchema().min(1).max(256),
    pluginName: stringSchema().min(1).max(256),
    description: stringSchema().max(1024),
    skills: array(
      objectSchema({
        name: stringSchema().max(256),
        description: stringSchema().max(1024).optional(),
      }),
    )
      .max(32)
      .optional(),
  }),
);
var suggestPluginsOutputSchema = DoctorLazy(() =>
  zodStrictObject({
    contextLabel: stringSchema().max(128).describe("Short header tying the suggestion to the user request."),
    plugins: array(pluginSuggestionSchema())
      .min(1)
      .max(16)
      .describe("Plugins sourced from SearchPlugins results."),
    trigger: suggestTriggerSchema(),
  }),
);
var suggestPluginsResultSchema = DoctorLazy(() =>
  objectSchema({
    contextLabel: stringSchema(),
    plugins: array(
      objectSchema({
        pluginId: stringSchema(),
        pluginName: stringSchema(),
        description: stringSchema(),
      }),
    ),
    note: stringSchema(),
    trigger: SUGGEST_PLUGINS_TOOL().optional(),
  }),
);
var SUGGEST_INSTALL_PROMPT = `Render an inline plugin install card. Call this after SearchPlugins returns relevant results \u2014 source pluginId, pluginName, description, and skills from those results. The card handles all UI; do not describe the plugins in text.

Do NOT call this if the suggestion is not relevant, you are unsure it would help, or you already rendered one this conversation and the user did not engage.`;
var SUGGEST_INSTALL_PROMPT_ALT = `Render an inline card of plugins the user can add to claude.ai, taken from ${SEARCHPLUGINS} results. The card handles all install UI; do not describe the plugins in text.

Offer one when the task is the kind a plugin could take over or make repeatable (deploys, reviews against a team process, or the ticket, data and document workflows a user's org may have packaged as plugins) and nothing enabled covers it; the user does not need to ask about plugins. Also when they ask for plugin recommendations. First call ${SEARCHPLUGINS} with keywords drawn from the task, then pass the relevant results here: pluginId from each result's id, pluginName from its name, description as returned. Set trigger ('proactive' when you initiated this from task context, 'user_asked' when they asked). Use ${LISTPLUGINS} for plugins they already have.

After the card, continue the task. Example: "ship this to staging" and a deploy plugin that is not enabled \u2192 contextLabel "For your deploys".

Do NOT call this for one-off questions you can answer directly, when you are unsure a plugin would help, when ${SEARCHPLUGINS} returned nothing relevant (then continue the task without mentioning the search), or if you already rendered a plugin or skill suggestion this conversation and the user didn't engage.`;
var CARD_RENDERED_NOTE =
  "Plugin card rendered. The user enables the plugin out of band \u2014 call ListPlugins on follow-up to discover what was actually installed.";
var NO_CARD_NOTE =
  "No card was rendered: none of the suggested pluginIds could be verified as plugins in the user's claude.ai catalog. Pass pluginId values exactly as SearchPlugins returns them and never guess ids; if you have no SearchPlugins result to draw from, call SearchPlugins first or continue without a card. Do not mention this to the user.";
var HOST_MAY_NOT_DRAW_CARD_NOTE = `The user's app may not draw this card. So when the call returns something to suggest, also name it in one short sentence, such as "I've suggested the Acme plugin.", and say nothing more about it. This overrides any line above about not describing it in text.`;
//@ chunk-zw5xhxkf.js:15519-15551 placement
/**
 * 是否处于 CCS 租户且非远端协作（决定是否附加 CCS 说明）。
 */
function isCcsTenantOnly() {
  return isCcsTenant() && !isCcsRemoteCowork();
}
//@ chunk-zw5xhxkf.js:15551-16173 placement
/**
 * 插件推荐卡片后的附注：卡片是否渲染、被丢弃的未知 id、属于技能的 id（改用 SuggestSkills）、暂时无法检查而未列出的 id。
 */
function suggestCardNote(counts) {
  if (counts.unknown && !counts.carded && !counts.skills && !counts.unchecked) return NO_CARD_NOTE;
  let notes = [counts.carded ? CARD_RENDERED_NOTE : "The card did not render."];
  if (counts.carded && isCcsTenantOnly()) notes.push(HOST_MAY_NOT_DRAW_CARD_NOTE);
  if (counts.unknown)
    notes.push(
      `(${counts.unknown} suggested id(s) not in the user's catalog were dropped; do not name them in text.)`,
    );
  if (counts.skills)
    notes.push(
      `(${counts.skills} suggested id(s) are skills, not plugins \u2014 surface them with ${SUGGESTSKILLS} when it is among your tools; otherwise name them in text.)`,
    );
  if (counts.unchecked)
    notes.push(
      `(${counts.unchecked} suggested id(s) could not be checked right now and were left off the card; continue without them and do not name them in text.)`,
    );
  return notes.join(" ");
}
//@ chunk-zw5xhxkf.js:16173-16192 placement
/**
 * 建议卡片里插件名的最大字符数（256）。
 */
var MAX_SUGGESTED_PLUGIN_NAME_CHARS = 256;
var MAX_SUGGESTED_PLUGIN_DESCRIPTION_CHARS = 1024;
//@ chunk-zw5xhxkf.js:16192-16711 placement
/**
 * 把模型建议的插件 id 转成推荐卡片：查目录得到显示名与描述（截断），丢弃未知/技能/不可安装/未核验的 id 并计数，返回卡片数据与给模型的说明。
 */
function buildSuggestCard(input, cache, uncheckedIds = new Set()) {
  let plugins = [];
  let counts = {
    carded: 0,
    unknown: 0,
    skills: 0,
    unchecked: 0,
  };
  for (let plugin of input.plugins) {
    let row = cache.get(plugin.pluginId);
    let displayName = row?.display_name || row?.name;
    if (!row || !displayName) {
      counts[uncheckedIds.has(plugin.pluginId) ? "unchecked" : "unknown"]++;
      continue;
    }
    if (row.presents_as === "skill") {
      counts.skills++;
      continue;
    }
    if (row.installation_preference === "not_available") {
      counts.unknown++;
      continue;
    }
    counts.carded++;
    plugins.push({
      pluginId: plugin.pluginId,
      pluginName: truncateToLength(displayName, MAX_SUGGESTED_PLUGIN_NAME_CHARS),
      description: truncateToLength(row.description ?? "", MAX_SUGGESTED_PLUGIN_DESCRIPTION_CHARS),
    });
  }
  return {
    contextLabel: input.contextLabel,
    plugins,
    note: suggestCardNote(counts),
    trigger: input.trigger,
    counts,
  };
}
//@ chunk-zw5xhxkf.js:16711-17840 placement
var renderPluginSuggestCard = buildTool({
  name: SUGGESTPLUGININSTALL,
  searchHint: "render a plugin install card",
  backgrounding: "never",
  maxResultSizeChars: 50000,
  get shouldDefer() {
    return !isSuggestionToolLoadedUpFront();
  },
  get inputSchema() {
    return suggestPluginsOutputSchema();
  },
  get outputSchema() {
    return suggestPluginsResultSchema();
  },
  isEnabled: isPluginSkillToolEnabled,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  description: async () => "Render an inline plugin install card from SearchPlugins results.",
  prompt: async () => {
    let basePrompt = isSuggestionToolLoadedUpFront() ? SUGGEST_INSTALL_PROMPT_ALT : SUGGEST_INSTALL_PROMPT;
    return isCcsTenantOnly()
      ? `${basePrompt}

${HOST_MAY_NOT_DRAW_CARD_NOTE}`
      : basePrompt;
  },
  create(toolContext) {
    return {
      async call(input, callOptions) {
        let cache = toolContext.toolState.get(RecentItemsCache);
        let pluginIds = input.plugins
          .map((plugin) => plugin.pluginId)
          .filter((pluginId) => cache.get(pluginId) === undefined);
        let uncheckedIds = new Set();
        let skippedNoScope = false;
        if (pluginIds.length > 0 && isSortedSuggestionEnabled()) {
          let pluginDetails = await fetchPluginDetails(
            pluginIds,
            callOptions.signal,
            toolContext.credentials,
          );
          cache.remember(pluginDetails.found);
          uncheckedIds = new Set(pluginDetails.unchecked);
          skippedNoScope = pluginDetails.skippedNoScope;
        }
        let { counts, ...card } = buildSuggestCard(input, cache, uncheckedIds);
        let logFields = {
          carded_count: counts.carded,
          unknown_count: counts.unknown,
          skill_count: counts.skills,
          unchecked_count: counts.unchecked,
          uncached_count: pluginIds.length,
          ...(input.trigger && {
            trigger: fromEnum(input.trigger),
          }),
        };
        if (!skippedNoScope)
          if (counts.unchecked > 0 && counts.carded === 0)
            logFeatureSad("plugin_suggest", "catalog_unchecked", logFields);
          else logFeatureOk("plugin_suggest", logFields);
        return {
          data: card,
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(result),
    };
  },
  renderToolUseMessage: renderContextLabel,
});
var TENGU_SADDLE_LANTERN = "tengu_saddle_lantern";
//@ chunk-zw5xhxkf.js:17840-17891 placement
/**
 * 惰性加载特性开关模块（require("./chunk-6df1d6re.js")）。
 */
function featureFlagsModule() {
  return require("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
}
//@ chunk-zw5xhxkf.js:17891-17969 placement
/**
 * 读取建议功能灰度开关值（tengu_saddle_lantern）。
 */
function suggestRolloutFlag() {
  return featureFlagsModule().getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_SADDLE_LANTERN, false);
}
//@ chunk-zw5xhxkf.js:17969-18023 placement
var TENGU_GENTLE_FROST = "tengu_gentle_frost";
var TENGU_SORTED_TRUFFLE = "tengu_sorted_truffle";
//@ chunk-zw5xhxkf.js:18023-18086 placement
/**
 * 读取 tengu_sorted_truffle：建议结果是否按相关性排序。
 */
function isSortedSuggestionEnabled() {
  return featureFlagsModule().getFeatureValue_SESSION_PINNED(TENGU_SORTED_TRUFFLE, true);
}
//@ chunk-zw5xhxkf.js:18086-18119 placement
var TENGU_SEQUENTIAL_SUMMIT = "tengu_sequential_summit";
//@ chunk-zw5xhxkf.js:18119-18203 placement
/**
 * 当前会话是否启用建议搜索：会话类型满足，或 CCS 远端协作且开关打开，且不在聊天/Teams 场景。
 */
function isSuggestionSearchEnabled() {
  return (
    (envSessionKind() ||
      (isCcsRemoteCowork() &&
        featureFlagsModule().getFeatureValue_SESSION_PINNED(TENGU_SEQUENTIAL_SUMMIT, false))) &&
    !isChatOrTeams()
  );
}
//@ chunk-zw5xhxkf.js:18203-18271 placement
/**
 * 建议工具是否预加载（ue() 且 tengu_gentle_frost 打开）。
 */
function isSuggestionToolLoadedUpFront() {
  return (
    isSuggestionSearchEnabled() &&
    featureFlagsModule().getFeatureValue_SESSION_PINNED(TENGU_GENTLE_FROST, false)
  );
}
//@ chunk-zw5xhxkf.js:18271-18303 placement
/**
 * 建议灰度是否打开（ue() 且设置值）。
 */
function isSuggestionRolloutEnabled() {
  return isSuggestionSearchEnabled() && readSuggestRolloutSetting();
}
//@ chunk-zw5xhxkf.js:18303-18396 placement
/**
 * 读取并缓存建议灰度设置。
 */
function readSuggestRolloutSetting() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.suggestRolloutEnabled ??= suggestRolloutFlag().value;
  return sessionFeatureValues.suggestRolloutEnabled;
}
//@ chunk-zw5xhxkf.js:18396-18569 placement
function isSuggestRolloutEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.suggestRolloutEnabled === undefined) {
    let { value: flagValue, source } = suggestRolloutFlag();
    if (source === "fallback") return flagValue;
    sessionFeatureValues.suggestRolloutEnabled = flagValue;
  }
  return sessionFeatureValues.suggestRolloutEnabled;
}
//@ chunk-zw5xhxkf.js:18569-18577 placement
_registerSuggestRolloutPinReader(isSuggestRolloutEnabled);
//@ chunk-zw5xhxkf.js:18577-20975 placement
/**
 * SuggestSkills 的结果 schema（列表结果加 trigger）。
 */
var SUGGEST_SKILLS_TOOL = DoctorLazy(() =>
  zodStrictObject({
    keywords: array(stringSchema().min(1).max(64))
      .min(1)
      .max(8)
      .describe("Topic keywords from the user's request."),
    contextLabel: stringSchema().max(128).optional(),
    trigger: suggestTriggerSchema(),
  }),
);
var suggestSkillsResultSchema = DoctorLazy(() =>
  listResultSchema().extend({
    trigger: SUGGEST_PLUGINS_TOOL().optional(),
  }),
);
var SuggestSkillsTool = buildTool({
  name: SUGGESTSKILLS,
  searchHint: "render addable claude.ai skills by keyword",
  backgrounding: "never",
  maxResultSizeChars: 50000,
  get shouldDefer() {
    return !isSuggestionRolloutEnabled();
  },
  get inputSchema() {
    return SUGGEST_SKILLS_TOOL();
  },
  get outputSchema() {
    return suggestSkillsResultSchema();
  },
  isEnabled: isPluginSkillToolEnabled,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  description: async () => "Render a card of standalone skills the user can add (not yet enabled).",
  prompt: async () => {
    let basePrompt = isSuggestionRolloutEnabled()
      ? `Render a card of standalone skills the user can add \u2014 org, shared, or Anthropic skills not yet enabled.

Call this when the task is one a skill could make repeatable \u2014 drafting in a house style, reviews against a playbook, a recurring workflow \u2014 and nothing enabled covers it; the user does not need to ask about skills. Also when they ask for recommendations, or when ListSkills returned zero matches. Use ListSkills for skills they already have.

Do NOT call this for one-off questions you can answer directly, when you are unsure a skill would help, or if you already rendered a suggestion this conversation and the user didn't engage.

Pass keywords drawn from the task itself, and set trigger ('proactive' when you initiated this from task context, 'user_asked' when they asked). If the result is empty and the trigger was proactive, continue the task without mentioning that you searched; if the user asked, tell them you found nothing new to add.`
      : `Render a card of standalone skills the user can add \u2014 org, shared, or Anthropic skills not yet enabled. Use when the user asks you to recommend skills, asks for skills for a domain they have nothing enabled for, or when ListSkills returned zero matches. Use ListSkills instead for skills they already have.

Always pass keywords from the user's request (you may set trigger: 'user_asked'). The result may be empty.`;
    return isCcsTenantOnly()
      ? `${basePrompt}

${HOST_MAY_NOT_DRAW_CARD_NOTE}`
      : basePrompt;
  },
  create(toolContext) {
    return {
      async call(input, callOptions) {
        try {
          return {
            data: {
              results: (
                await searchSkillsCatalog(input.keywords, callOptions.signal, toolContext.credentials)
              ).filter((skill) => skill.enabled !== true),
              trigger: input.trigger,
            },
          };
        } catch (error) {
          if (isAbortError(error) || callOptions.signal.aborted) throw error;
          if (error instanceof PluginSkillSearchUnavailableError) throw error;
          logSearchFetchFailed("skill", error);
          throw new PluginSkillSearchUnavailableError(
            "Skill search is unavailable right now; please try again.",
          );
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam: jsonResultBlock,
  renderToolUseMessage: renderKeywords,
});
//@ chunk-zw5xhxkf.js:20975-21009 placement
/**
 * SuggestSkills 的输入 schema。
 */
var suggestSkillsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    keywords: keywordsSchema(),
  }),
);
//@ chunk-zw5xhxkf.js:21009-22074 placement
function makeCatalogSearchTool(spec) {
  return buildTool({
    name: spec.name,
    searchHint: `discover claude.ai ${spec.noun}s by keyword`,
    backgrounding: "never",
    maxResultSizeChars: 50000,
    get shouldDefer() {
      return !(spec.loadedUpFront?.() ?? false);
    },
    get inputSchema() {
      return suggestSkillsInputSchema();
    },
    get outputSchema() {
      return listResultSchema();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => true,
    isReadOnly: () => true,
    description: async () => spec.description,
    prompt: async ({ tools }) => {
      let upFrontPrompt = spec.upFrontPrompt;
      return upFrontPrompt !== undefined &&
        spec.loadedUpFront?.() &&
        tools.some((tool) => toolMatchesName(tool, upFrontPrompt.requiresTool))
        ? upFrontPrompt.text
        : spec.prompt;
    },
    create(toolContext) {
      return {
        async call(input, callOptions) {
          try {
            let [results, manifest] = await Promise.all([
              spec.run(input.keywords, callOptions.signal, toolContext.credentials),
              spec.noun === "plugin"
                ? readPluginManifest(toolContext.session, callOptions.signal, "plugin_search")
                : null,
            ]);
            if (spec.noun === "plugin") toolContext.toolState.get(RecentItemsCache).remember(results);
            if (manifest === null)
              return {
                data: {
                  results,
                },
              };
            let enabledIds = new Set(manifest.map((plugin) => plugin.id));
            return {
              data: {
                results: results.map((result) => ({
                  ...result,
                  enabled: enabledIds.has(result.id),
                })),
              },
            };
          } catch (error) {
            if (isAbortError(error) || callOptions.signal.aborted) throw error;
            if (error instanceof PluginSkillSearchUnavailableError) throw error;
            logSearchFetchFailed(spec.noun, error);
            throw new PluginSkillSearchUnavailableError(
              `${spec.noun} search is unavailable right now; please try again.`,
            );
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam: jsonResultBlock,
    renderToolUseMessage: renderKeywords,
  });
}
//@ chunk-zw5xhxkf.js:22074-24501 placement
/**
 * 搜索提示词里的示例（“use the deploy plugin” → keywords）。
 */
var CATALOG_SEARCH_PROMPTS =
  "Search the user's claude.ai plugin catalog by keyword. Call this when a plugin (slash command, skill bundle, hook, or agent) from the user's org catalog might help complete the task.";
var SEARCH_PROMPT_EXAMPLES = `Examples:
- "use the deploy plugin" \u2192 keywords ["deploy"]
- "is there something for linting?" \u2192 keywords ["lint", "format", "code quality"]`;
var SEARCH_PROMPT_NOTES =
  "Returns a ranked list with id, name, description, and whether the plugin is already enabled for this session (in a channel session, whether the channel has it). When results fit and SuggestPluginInstall is among your tools, call it to render the install card; otherwise relay the relevant results in text instead. If nothing relevant, proceed without mentioning that you searched.";
var CATALOG_SEARCH_PROMPT = `${CATALOG_SEARCH_PROMPTS}

${SEARCH_PROMPT_EXAMPLES}

${SEARCH_PROMPT_NOTES}`;
var CATALOG_SEARCH_UPFRONT_PROMPT = `${CATALOG_SEARCH_PROMPTS} The user does not need to name a plugin: search when the task depends on their team's own process, systems or data and nothing you already have, the project's own scripts included, covers it.

${SEARCH_PROMPT_EXAMPLES}
- "ship this to staging" \u2192 keywords ["deploy", "release", "staging"]
- "review this contract against our playbook" \u2192 keywords ["legal", "contract", "playbook"]
- "which deals close this week?" \u2192 keywords ["sales", "pipeline", "crm"]

Do not search unasked for one-off questions or tasks you can handle directly ("explain this regex", "fix this typo"), or after the user ignored a suggestion in this conversation.

${SEARCH_PROMPT_NOTES}`;
var SearchPluginsTool = makeCatalogSearchTool({
  name: SEARCHPLUGINS,
  noun: "plugin",
  run: searchPluginsCatalog,
  loadedUpFront: isSuggestionToolLoadedUpFront,
  description:
    "Search the user's claude.ai plugin catalog by keyword to find plugins that might help complete the task.",
  prompt: CATALOG_SEARCH_PROMPT,
  upFrontPrompt: {
    text: CATALOG_SEARCH_UPFRONT_PROMPT,
    requiresTool: SUGGESTPLUGININSTALL,
  },
});
var SearchSkillsTool = makeCatalogSearchTool({
  name: SEARCHSKILLS,
  noun: "skill",
  run: searchSkillsCatalog,
  description:
    "Search the user's claude.ai skills by keyword to find skills that might help complete the task.",
  prompt: `Search the user's claude.ai skills by keyword. Call this when a skill (a reference document or instruction set the user has uploaded or enabled) might help complete the task.

Examples:
- "follow the team's PR guidelines" \u2192 keywords ["pr", "review", "guidelines"]
- "export this as a slide deck" \u2192 keywords ["pptx", "slides", "presentation"]

Returns a ranked list with id, name, description, and whether the skill is enabled. When results fit and SuggestSkills is among your tools, call it to render the add card; otherwise relay the relevant results in text instead. If nothing relevant, proceed without mentioning that you searched.`,
});
//@ chunk-zw5xhxkf.js:24501-24569 placement
/**
 * 插件/技能发现相关工具的安全工具名列表与工具对象列表。
 */
var PLUGIN_SKILL_SAFE_TOOL_NAMES = [
  SearchPluginsTool.name,
  SearchSkillsTool.name,
  renderPluginSuggestCard.name,
  SuggestSkillsTool.name,
  ListPluginsTool.name,
  SuggestPluginInstallTool.name,
];
var PLUGIN_SKILL_TOOLS = [
  SearchPluginsTool,
  SearchSkillsTool,
  renderPluginSuggestCard,
  SuggestSkillsTool,
  ListPluginsTool,
  SuggestPluginInstallTool,
];
export { PLUGIN_SKILL_SAFE_TOOL_NAMES, PLUGIN_SKILL_TOOLS };
