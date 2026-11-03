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
import { kt, o, M, u, A, zodStrictObject, U } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { wrr, Sie, eot } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { uniq } from "../../utils/collections.js";
import { isTaggedMarketplaceId } from "../../utils/plugins/syncedItems.js";
import { isAbortError, errorMessage, AbortError } from "../../utils/errors.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { zqe } from "../../services/plugins/accountSync/sessionSkillManifest.js";
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
import { Aln } from "../../services/skillsSync/orgSkillsApi.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isCcsRemoteCowork, isChatOrTeams } from "../../utils/entrypointKinds.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { envSessionKind } from "../../utils/sessionShape.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { toolMatchesName } from "../../Tool.js";

//@ chunk-zw5xhxkf.js:5270-5474 placement
var pluginSearchRowSchema = DoctorLazy(() =>
    kt({
      id: o(),
      name: o(),
      display_name: o().nullish(),
      description: o().nullish(),
      enabled: M().nullish(),
      presents_as: o().nullish(),
      installation_preference: o().nullish(),
    }),
  ),
  pluginSearchResponseSchema = DoctorLazy(() => u({ results: A(pluginSearchRowSchema()) }));
//@ chunk-zw5xhxkf.js:5474-5567 placement
class PluginSkillSearchUnavailableError extends Error {
  constructor(e) {
    super(e);
    this.name = "PluginSkillSearchUnavailableError";
  }
}
//@ chunk-zw5xhxkf.js:5567-5732 placement
var PLUGIN_SEARCH_TIMEOUT_MS = 15000,
  PLUGIN_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/plugins/search",
  SKILL_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/skills/search",
  PLUGINS_API_PATH = "/api/oauth/organizations/:orgUUID/plugins/";
/**
 * 插件/技能搜索前的检查：组织策略 allow_plugin_skill_search 不允许时按原因记埋点并抛 PluginSkillSearchUnavailableError；需要 user:plugins scope 而会话没有时降级为空（返回 skip）。
 */
//@ chunk-zw5xhxkf.js:5732-6334 placement
async function checkPluginSearchAllowed(feature, needsPluginsScope, session, client) {
  if (!isPolicyAllowed("allow_plugin_skill_search")) {
    let denyKind = policyDenyKind("allow_plugin_skill_search");
    throw (
      logFeatureBad(
        feature,
        denyKind === "org_denied" || denyKind === "latched"
          ? "policy_denied"
          : denyKind === "unregistered"
            ? "policy_mirror_unregistered"
            : denyKind === "route_missing"
              ? "policy_route_missing"
              : "policy_cache_miss",
      ),
      new PluginSkillSearchUnavailableError(
        policyDeniedReason("allow_plugin_skill_search", "Plugin and skill search", "is") ??
          "Plugin and skill search is unavailable right now; please try again.",
      )
    );
  }
  if (needsPluginsScope && (await pluginsScopeGate(session, client)) === "skip_no_scope")
    return (
      logForDebugging("[plugin-skill-search] degraded to empty: no user:plugins scope in this session", {
        level: "error",
      }),
      logFeatureSad(feature, "no_plugins_scope"),
      "skip"
    );
  return "send";
}
//@ chunk-zw5xhxkf.js:6334-7335 placement
async function searchPluginsOrSkills(e, n, s, l) {
  let r = e === SKILL_SEARCH_PATH ? "skill_search" : "plugin_search";
  if ((await checkPluginSearchAllowed(r, e === PLUGIN_SEARCH_PATH, s, l)) === "skip") return [];
  let h = e === PLUGIN_SEARCH_PATH && env.CLAUDE_CODE_CCR_SURFACE === "tag",
    post = await apiClient.post(
      e,
      h ? { keywords: n, included_default_marketplaces: ["claude-tag-plugins"] } : { keywords: n },
      { auth: "teleport-org", timeout: PLUGIN_SEARCH_TIMEOUT_MS, signal: s, credentials: l },
    );
  if (!post.ok)
    throw Error(
      post.reason === "no-auth"
        ? "Not authenticated with a claude.ai account."
        : `search route unavailable: ${post.reason}`,
    );
  if (post.status >= 400) {
    let safeParse = wrr().safeParse(post.data),
      T = safeParse.success
        ? `search route ${post.status} ${safeParse.data.error.type ?? "error_envelope_no_type"}${safeParse.data.error.message ? `: ${safeParse.data.error.message}` : ""}`
        : `search route ${post.status}`;
    if (
      safeParse.success &&
      (post.status === 403 || (post.status === 404 && safeParse.data.error.type === "not_found_error"))
    )
      return (
        logForDebugging(`[plugin-skill-search] degraded to empty: ${T}`, { level: "error" }),
        logFeatureSad(r, "not_entitled"),
        []
      );
    throw Error(T);
  }
  let safeParse = pluginSearchResponseSchema().safeParse(post.data);
  if (!safeParse.success) throw Error("malformed search response");
  return (logFeatureOk(e === SKILL_SEARCH_PATH ? "skill_search" : "plugin_search"), safeParse.data.results);
}
//@ chunk-zw5xhxkf.js:7335-8335 placement
async function fetchPluginDetails(e, n, s) {
  let filtered = uniq(e).filter(isTaggedMarketplaceId);
  if (filtered.length === 0) return { found: [], unchecked: [], skippedNoScope: !1 };
  if ((await checkPluginSearchAllowed("plugin_suggest", !0, n, s)) === "skip")
    return { found: [], unchecked: filtered, skippedNoScope: !0 };
  let r = [],
    h = [];
  return (
    await Promise.all(
      filtered.map(async (a) => {
        try {
          let S = await apiClient.get(`${PLUGINS_API_PATH}${encodeURIComponent(a)}`, {
            auth: "teleport-org",
            timeout: PLUGIN_SEARCH_TIMEOUT_MS,
            signal: n,
            credentials: s,
          });
          if (!S.ok) {
            (logForDebugging(`[plugin-skill-search] plugin detail not sent: ${S.reason}`), h.push(a));
            return;
          }
          if (S.status >= 400) {
            if (!(wrr().safeParse(S.data).success && S.status === 404))
              (logForDebugging(`[plugin-skill-search] plugin detail for ${a} returned HTTP ${S.status}`, {
                level: "error",
              }),
                h.push(a));
            return;
          }
          let safeParse = pluginSearchRowSchema().safeParse(S.data);
          if (!safeParse.success || safeParse.data.id !== a) {
            (logForDebugging(`[plugin-skill-search] plugin detail for ${a} did not parse as that plugin`, {
              level: "error",
            }),
              h.push(a));
            return;
          }
          r.push(safeParse.data);
        } catch (error) {
          if (isAbortError(error) || n?.aborted) throw error;
          (logForDebugging(`[plugin-skill-search] plugin detail for ${a} failed: ${errorMessage(error)}`, {
            level: "error",
          }),
            h.push(a));
        }
      }),
    ),
    { found: r, unchecked: h, skippedNoScope: !1 }
  );
}
//@ chunk-zw5xhxkf.js:8335-8377 placement
async function Z(e, n, s) {
  return searchPluginsOrSkills(PLUGIN_SEARCH_PATH, e, n, s);
}
//@ chunk-zw5xhxkf.js:8377-8419 placement
async function L(e, n, s) {
  return searchPluginsOrSkills(SKILL_SEARCH_PATH, e, n, s);
}
//@ chunk-zw5xhxkf.js:8419-8561 placement
function logSearchFetchFailed(e, n) {
  (logForDebugging(`[plugin-skill-search] ${e} failed: ${errorMessage(n)}`, { level: "error" }),
    logFeatureBad(e === "plugin" ? "plugin_search" : "skill_search", "fetch_failed"));
}
//@ chunk-zw5xhxkf.js:8561-8789 placement
async function readPluginManifest(e, n, s) {
  if (!isSessionRefsSyncEnabled(e)) return null;
  if (Sie()) return [];
  let l = await raceWithAbortSignal(
    zqe.of(e).fetch(),
    n,
    () => new AbortError("plugin manifest read aborted"),
  );
  if (!l.ok)
    throw (
      logFeatureBad(s, "manifest_failed"),
      new PluginSkillSearchUnavailableError(`manifest ${l.reason}`)
    );
  return l.plugins;
}
//@ chunk-zw5xhxkf.js:8789-8926 placement
var keywordsSchema = DoctorLazy(() =>
    A(o().min(1).max(64)).min(1).max(8).describe("Keyword phrases describing the user's intent."),
  ),
  listResultSchema = DoctorLazy(() => u({ results: A(pluginSearchRowSchema()) }));
//@ chunk-zw5xhxkf.js:8926-8996 placement
function P(e, n) {
  return { tool_use_id: n, type: "tool_result", content: jsonStringify(e) };
}
//@ chunk-zw5xhxkf.js:8996-9044 placement
function R(e) {
  return (e.keywords ?? []).join(", ");
}
//@ chunk-zw5xhxkf.js:9044-9085 placement
function te(e) {
  return e.contextLabel ?? "";
}
//@ chunk-zw5xhxkf.js:9085-9208 placement
var listInputSchema = DoctorLazy(() =>
  zodStrictObject({
    keywords: A(o().min(1).max(64)).max(8).optional().describe("Optional filter; omit to list everything."),
  }),
);
//@ chunk-zw5xhxkf.js:9208-9295 placement
function se(e, n) {
  let lower = e.toLowerCase();
  return n.some((l) => lower.includes(l.toLowerCase()));
}
//@ chunk-zw5xhxkf.js:9295-9410 placement
function filterByKeywords(e, n) {
  if (!n?.length) return e;
  return e.filter((s) => se(s.name, n) || (s.description ? se(s.description, n) : !1));
}
/**
 * 构造"列出插件/技能"只读工具（可按关键词过滤，延迟加载）：调用 fetch 获取目录，按需记录目录行，返回 {results}。
 */
//@ chunk-zw5xhxkf.js:9410-10045 placement
function buildCatalogListTool(e) {
  return buildTool({
    name: e.name,
    searchHint: `list ${e.subject}`,
    backgrounding: "never",
    maxResultSizeChars: 50000,
    shouldDefer: !0,
    get inputSchema() {
      return listInputSchema();
    },
    get outputSchema() {
      return listResultSchema();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => !0,
    isReadOnly: () => !0,
    description: async () => `List ${e.subject}, optionally filtered by keyword.`,
    prompt: async () => e.prompt,
    create(n) {
      return {
        async call(s, l) {
          let response = await e.fetch(l.signal, n.credentials, n.session);
          if (e.recordsCatalogRows) n.toolState.get(RecentItemsCache).remember(response);
          return { data: { results: filterByKeywords(response, s.keywords) } };
        },
      };
    },
    mapToolResultToToolResultBlockParam: e.mapToolResultToToolResultBlockParam,
    renderToolUseMessage: R,
  });
}
//@ chunk-zw5xhxkf.js:10045-12452 placement
var LIST_PLUGINS_TOOL =
    "the plugins enabled on the user's claude.ai account (not plugins installed locally, such as with /plugin; in a channel session, the plugins the channel has)",
  G = buildCatalogListTool({
    name: LISTPLUGINS,
    subject: LIST_PLUGINS_TOOL,
    recordsCatalogRows: !0,
    async fetch(e, n, s) {
      let l = await readPluginManifest(s, e, "plugin_list");
      if (l !== null)
        return (
          logFeatureOk("plugin_list"),
          l.map((h) => ({ id: h.id, name: h.name, description: h.description || null, enabled: !0 }))
        );
      let r = await listAccountPlugins({ signal: e, credentials: n });
      if (!r.success) {
        if (eot(r))
          return (
            logForDebugging(
              `[plugin-skill-list] degraded to empty: list-plugins ${r.status ?? r.kind} ${r.error}`,
              { level: "error" },
            ),
            logFeatureSad("plugin_list", r.kind === "no_scope" ? "no_plugins_scope" : "not_entitled"),
            []
          );
        throw (logFeatureBad("plugin_list", "fetch_failed"), new PluginSkillSearchUnavailableError(r.error));
      }
      return (
        logFeatureOk("plugin_list"),
        r.plugins.map((plugin) => ({
          id: plugin.pluginId,
          name: plugin.name,
          description: plugin.description || null,
          enabled: !0,
          ...(plugin.presentsAs && { presents_as: plugin.presentsAs }),
        }))
      );
    },
    prompt: `List ${LIST_PLUGINS_TOOL}. Call this when the user asks what plugins they have, or to confirm what was installed after a SuggestPluginInstall card. Pass keywords to filter to a topic; omit to list all. To suggest a plugin they do NOT have yet, use SearchPlugins, then SuggestPluginInstall when it is among your tools; otherwise relay the relevant results in text instead.`,
    mapToolResultToToolResultBlockParam: P,
  }),
  ke =
    "If the user asks to share a skill: you cannot share it for them, but where this list is shown as a card, their own skills may have a Share button, depending on their app, plan and organization. It shares only within that organization.",
  j = buildCatalogListTool({
    name: LISTSKILLS,
    subject: "the user's enabled claude.ai skills",
    async fetch(e, n) {
      let s = await Aln({ credentials: n });
      if (!s.success) {
        if (eot(s))
          return (
            logForDebugging(
              `[plugin-skill-list] degraded to empty: list-skills ${s.status ?? s.kind} ${s.error}`,
              { level: "error" },
            ),
            logFeatureSad("skill_list", "not_entitled"),
            []
          );
        throw (logFeatureBad("skill_list", "fetch_failed"), new PluginSkillSearchUnavailableError(s.error));
      }
      return (
        logFeatureOk("skill_list"),
        s.skills.map((skill) => ({
          id: skill.skillId,
          name: skill.name,
          description: skill.description || null,
          enabled: !0,
        }))
      );
    },
    prompt:
      "List the user's enabled claude.ai skills. Call this when the user asks what skills they have. Pass keywords to filter to a topic; omit to list all. To recommend skills they do NOT have yet, use SuggestSkills when it is among your tools; otherwise use SearchSkills and relay the relevant results in text instead.",
    mapToolResultToToolResultBlockParam(e, n) {
      return {
        tool_use_id: n,
        type: "tool_result",
        content: jsonStringify(e.results.length > 0 ? { note: ke, results: e.results } : e),
      };
    },
  });
/**
 * 推荐插件工具的定义。
 */
//@ chunk-zw5xhxkf.js:12452-15519 placement
var SUGGEST_PLUGINS_TOOL = DoctorLazy(() => U(["user_asked", "proactive"])),
  le = DoctorLazy(() =>
    SUGGEST_PLUGINS_TOOL().optional().describe("How this suggestion started: 'user_asked' or 'proactive'."),
  ),
  ye = DoctorLazy(() =>
    zodStrictObject({
      pluginId: o().min(1).max(256),
      pluginName: o().min(1).max(256),
      description: o().max(1024),
      skills: A(u({ name: o().max(256), description: o().max(1024).optional() }))
        .max(32)
        .optional(),
    }),
  ),
  _e = DoctorLazy(() =>
    zodStrictObject({
      contextLabel: o().max(128).describe("Short header tying the suggestion to the user request."),
      plugins: A(ye()).min(1).max(16).describe("Plugins sourced from SearchPlugins results."),
      trigger: le(),
    }),
  ),
  we = DoctorLazy(() =>
    u({
      contextLabel: o(),
      plugins: A(u({ pluginId: o(), pluginName: o(), description: o() })),
      note: o(),
      trigger: SUGGEST_PLUGINS_TOOL().optional(),
    }),
  ),
  Te = `Render an inline plugin install card. Call this after SearchPlugins returns relevant results \u2014 source pluginId, pluginName, description, and skills from those results. The card handles all UI; do not describe the plugins in text.

Do NOT call this if the suggestion is not relevant, you are unsure it would help, or you already rendered one this conversation and the user did not engage.`,
  be = `Render an inline card of plugins the user can add to claude.ai, taken from ${SEARCHPLUGINS} results. The card handles all install UI; do not describe the plugins in text.

Offer one when the task is the kind a plugin could take over or make repeatable (deploys, reviews against a team process, or the ticket, data and document workflows a user's org may have packaged as plugins) and nothing enabled covers it; the user does not need to ask about plugins. Also when they ask for plugin recommendations. First call ${SEARCHPLUGINS} with keywords drawn from the task, then pass the relevant results here: pluginId from each result's id, pluginName from its name, description as returned. Set trigger ('proactive' when you initiated this from task context, 'user_asked' when they asked). Use ${LISTPLUGINS} for plugins they already have.

After the card, continue the task. Example: "ship this to staging" and a deploy plugin that is not enabled \u2192 contextLabel "For your deploys".

Do NOT call this for one-off questions you can answer directly, when you are unsure a plugin would help, when ${SEARCHPLUGINS} returned nothing relevant (then continue the task without mentioning the search), or if you already rendered a plugin or skill suggestion this conversation and the user didn't engage.`,
  Pe =
    "Plugin card rendered. The user enables the plugin out of band \u2014 call ListPlugins on follow-up to discover what was actually installed.",
  Re =
    "No card was rendered: none of the suggested pluginIds could be verified as plugins in the user's claude.ai catalog. Pass pluginId values exactly as SearchPlugins returns them and never guess ids; if you have no SearchPlugins result to draw from, call SearchPlugins first or continue without a card. Do not mention this to the user.",
  F = `The user's app may not draw this card. So when the call returns something to suggest, also name it in one short sentence, such as "I've suggested the Acme plugin.", and say nothing more about it. This overrides any line above about not describing it in text.`;
//@ chunk-zw5xhxkf.js:15519-15551 placement
function B() {
  return isCcsTenant() && !isCcsRemoteCowork();
}
/**
 * 插件推荐卡片后的附注：卡片是否渲染、被丢弃的未知 id、属于技能的 id（改用 SuggestSkills）、暂时无法检查而未列出的 id。
 */
//@ chunk-zw5xhxkf.js:15551-16173 placement
function suggestCardNote(counts) {
  if (counts.unknown && !counts.carded && !counts.skills && !counts.unchecked) return Re;
  let notes = [counts.carded ? Pe : "The card did not render."];
  if (counts.carded && B()) notes.push(F);
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
var Ee = 256,
  Le = 1024;
/**
 * 把模型建议的插件 id 转成推荐卡片：查目录得到显示名与描述（截断），丢弃未知/技能/不可安装/未核验的 id 并计数，返回卡片数据与给模型的说明。
 */
//@ chunk-zw5xhxkf.js:16192-16711 placement
function buildSuggestCard(e, n, s = new Set()) {
  let l = [],
    r = { carded: 0, unknown: 0, skills: 0, unchecked: 0 };
  for (let plugin of e.plugins) {
    let a = n.get(plugin.pluginId),
      S = a?.display_name || a?.name;
    if (!a || !S) {
      r[s.has(plugin.pluginId) ? "unchecked" : "unknown"]++;
      continue;
    }
    if (a.presents_as === "skill") {
      r.skills++;
      continue;
    }
    if (a.installation_preference === "not_available") {
      r.unknown++;
      continue;
    }
    (r.carded++,
      l.push({
        pluginId: plugin.pluginId,
        pluginName: truncateToLength(S, Ee),
        description: truncateToLength(a.description ?? "", Le),
      }));
  }
  return {
    contextLabel: e.contextLabel,
    plugins: l,
    note: suggestCardNote(r),
    trigger: e.trigger,
    counts: r,
  };
}
//@ chunk-zw5xhxkf.js:16711-17840 placement
var renderPluginSuggestCard = buildTool({
    name: SUGGESTPLUGININSTALL,
    searchHint: "render a plugin install card",
    backgrounding: "never",
    maxResultSizeChars: 50000,
    get shouldDefer() {
      return !v();
    },
    get inputSchema() {
      return _e();
    },
    get outputSchema() {
      return we();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => !0,
    isReadOnly: () => !0,
    description: async () => "Render an inline plugin install card from SearchPlugins results.",
    prompt: async () => {
      let e = v() ? be : Te;
      return B()
        ? `${e}

${F}`
        : e;
    },
    create(e) {
      return {
        async call(n, s) {
          let l = e.toolState.get(RecentItemsCache),
            filtered = n.plugins.map((plugin) => plugin.pluginId).filter((w) => l.get(w) === void 0),
            h = new Set(),
            a = !1;
          if (filtered.length > 0 && Ce()) {
            let w = await fetchPluginDetails(filtered, s.signal, e.credentials);
            (l.remember(w.found), (h = new Set(w.unchecked)), (a = w.skippedNoScope));
          }
          let { counts: counts, ...y } = buildSuggestCard(n, l, h),
            T = {
              carded_count: counts.carded,
              unknown_count: counts.unknown,
              skill_count: counts.skills,
              unchecked_count: counts.unchecked,
              uncached_count: filtered.length,
              ...(n.trigger && { trigger: fromEnum(n.trigger) }),
            };
          if (!a)
            if (counts.unchecked > 0 && counts.carded === 0)
              logFeatureSad("plugin_suggest", "catalog_unchecked", T);
            else logFeatureOk("plugin_suggest", T);
          return { data: y };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, n) {
      return { tool_use_id: n, type: "tool_result", content: jsonStringify(e) };
    },
    renderToolUseMessage: te,
  }),
  TENGU_SADDLE_LANTERN = "tengu_saddle_lantern";
//@ chunk-zw5xhxkf.js:17840-17891 placement
function C() {
  return require("./chunk-6df1d6re.js");
}
//@ chunk-zw5xhxkf.js:17891-17969 placement
function ae() {
  return C().getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_SADDLE_LANTERN, !1);
}
//@ chunk-zw5xhxkf.js:17969-18023 placement
var TENGU_GENTLE_FROST = "tengu_gentle_frost",
  TENGU_SORTED_TRUFFLE = "tengu_sorted_truffle";
//@ chunk-zw5xhxkf.js:18023-18086 placement
function Ce() {
  return C().getFeatureValue_SESSION_PINNED(TENGU_SORTED_TRUFFLE, !0);
}
//@ chunk-zw5xhxkf.js:18086-18119 placement
var TENGU_SEQUENTIAL_SUMMIT = "tengu_sequential_summit";
//@ chunk-zw5xhxkf.js:18119-18203 placement
function ue() {
  return (
    (envSessionKind() ||
      (isCcsRemoteCowork() && C().getFeatureValue_SESSION_PINNED(TENGU_SEQUENTIAL_SUMMIT, !1))) &&
    !isChatOrTeams()
  );
}
//@ chunk-zw5xhxkf.js:18203-18271 placement
function v() {
  return ue() && C().getFeatureValue_SESSION_PINNED(TENGU_GENTLE_FROST, !1);
}
//@ chunk-zw5xhxkf.js:18271-18303 placement
function ie() {
  return ue() && Ue();
}
//@ chunk-zw5xhxkf.js:18303-18396 placement
function Ue() {
  let e = Ao();
  return ((e.suggestRolloutEnabled ??= ae().value), e.suggestRolloutEnabled);
}
//@ chunk-zw5xhxkf.js:18396-18569 placement
function isSuggestRolloutEnabled() {
  let e = Ao();
  if (e.suggestRolloutEnabled === void 0) {
    let { value: n, source: source } = ae();
    if (source === "fallback") return n;
    e.suggestRolloutEnabled = n;
  }
  return e.suggestRolloutEnabled;
}
//@ chunk-zw5xhxkf.js:18569-18577 placement
_registerSuggestRolloutPinReader(isSuggestRolloutEnabled);
//@ chunk-zw5xhxkf.js:18577-20975 placement
var SUGGEST_SKILLS_TOOL = DoctorLazy(() =>
    zodStrictObject({
      keywords: A(o().min(1).max(64)).min(1).max(8).describe("Topic keywords from the user's request."),
      contextLabel: o().max(128).optional(),
      trigger: le(),
    }),
  ),
  Me = DoctorLazy(() => listResultSchema().extend({ trigger: SUGGEST_PLUGINS_TOOL().optional() })),
  q = buildTool({
    name: SUGGESTSKILLS,
    searchHint: "render addable claude.ai skills by keyword",
    backgrounding: "never",
    maxResultSizeChars: 50000,
    get shouldDefer() {
      return !ie();
    },
    get inputSchema() {
      return SUGGEST_SKILLS_TOOL();
    },
    get outputSchema() {
      return Me();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => !0,
    isReadOnly: () => !0,
    description: async () => "Render a card of standalone skills the user can add (not yet enabled).",
    prompt: async () => {
      let e = ie()
        ? `Render a card of standalone skills the user can add \u2014 org, shared, or Anthropic skills not yet enabled.

Call this when the task is one a skill could make repeatable \u2014 drafting in a house style, reviews against a playbook, a recurring workflow \u2014 and nothing enabled covers it; the user does not need to ask about skills. Also when they ask for recommendations, or when ListSkills returned zero matches. Use ListSkills for skills they already have.

Do NOT call this for one-off questions you can answer directly, when you are unsure a skill would help, or if you already rendered a suggestion this conversation and the user didn't engage.

Pass keywords drawn from the task itself, and set trigger ('proactive' when you initiated this from task context, 'user_asked' when they asked). If the result is empty and the trigger was proactive, continue the task without mentioning that you searched; if the user asked, tell them you found nothing new to add.`
        : `Render a card of standalone skills the user can add \u2014 org, shared, or Anthropic skills not yet enabled. Use when the user asks you to recommend skills, asks for skills for a domain they have nothing enabled for, or when ListSkills returned zero matches. Use ListSkills instead for skills they already have.

Always pass keywords from the user's request (you may set trigger: 'user_asked'). The result may be empty.`;
      return B()
        ? `${e}

${F}`
        : e;
    },
    create(e) {
      return {
        async call(n, s) {
          try {
            return {
              data: {
                results: (await L(n.keywords, s.signal, e.credentials)).filter((h) => h.enabled !== !0),
                trigger: n.trigger,
              },
            };
          } catch (error) {
            if (isAbortError(error) || s.signal.aborted) throw error;
            if (error instanceof PluginSkillSearchUnavailableError) throw error;
            throw (
              logSearchFetchFailed("skill", error),
              new PluginSkillSearchUnavailableError(
                "Skill search is unavailable right now; please try again.",
              )
            );
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam: P,
    renderToolUseMessage: R,
  });
//@ chunk-zw5xhxkf.js:20975-21009 placement
var je = DoctorLazy(() => zodStrictObject({ keywords: keywordsSchema() }));
//@ chunk-zw5xhxkf.js:21009-22074 placement
function makeCatalogSearchTool(e) {
  return buildTool({
    name: e.name,
    searchHint: `discover claude.ai ${e.noun}s by keyword`,
    backgrounding: "never",
    maxResultSizeChars: 50000,
    get shouldDefer() {
      return !(e.loadedUpFront?.() ?? !1);
    },
    get inputSchema() {
      return je();
    },
    get outputSchema() {
      return listResultSchema();
    },
    isEnabled: isPluginSkillToolEnabled,
    isConcurrencySafe: () => !0,
    isReadOnly: () => !0,
    description: async () => e.description,
    prompt: async ({ tools: tools }) => {
      let upFrontPrompt = e.upFrontPrompt;
      return upFrontPrompt !== void 0 &&
        e.loadedUpFront?.() &&
        tools.some((l) => toolMatchesName(l, upFrontPrompt.requiresTool))
        ? upFrontPrompt.text
        : e.prompt;
    },
    create(n) {
      return {
        async call(s, l) {
          try {
            let [r, h] = await Promise.all([
              e.run(s.keywords, l.signal, n.credentials),
              e.noun === "plugin" ? readPluginManifest(n.session, l.signal, "plugin_search") : null,
            ]);
            if (e.noun === "plugin") n.toolState.get(RecentItemsCache).remember(r);
            if (h === null) return { data: { results: r } };
            let a = new Set(h.map((S) => S.id));
            return { data: { results: r.map((S) => ({ ...S, enabled: a.has(S.id) })) } };
          } catch (error) {
            if (isAbortError(error) || l.signal.aborted) throw error;
            if (error instanceof PluginSkillSearchUnavailableError) throw error;
            throw (
              logSearchFetchFailed(e.noun, error),
              new PluginSkillSearchUnavailableError(
                `${e.noun} search is unavailable right now; please try again.`,
              )
            );
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam: P,
    renderToolUseMessage: R,
  });
}
//@ chunk-zw5xhxkf.js:22074-24501 placement
var CATALOG_SEARCH_PROMPTS =
    "Search the user's claude.ai plugin catalog by keyword. Call this when a plugin (slash command, skill bundle, hook, or agent) from the user's org catalog might help complete the task.",
  ge = `Examples:
- "use the deploy plugin" \u2192 keywords ["deploy"]
- "is there something for linting?" \u2192 keywords ["lint", "format", "code quality"]`,
  pe =
    "Returns a ranked list with id, name, description, and whether the plugin is already enabled for this session (in a channel session, whether the channel has it). When results fit and SuggestPluginInstall is among your tools, call it to render the install card; otherwise relay the relevant results in text instead. If nothing relevant, proceed without mentioning that you searched.",
  De = `${CATALOG_SEARCH_PROMPTS}

${ge}

${pe}`,
  Fe = `${CATALOG_SEARCH_PROMPTS} The user does not need to name a plugin: search when the task depends on their team's own process, systems or data and nothing you already have, the project's own scripts included, covers it.

${ge}
- "ship this to staging" \u2192 keywords ["deploy", "release", "staging"]
- "review this contract against our playbook" \u2192 keywords ["legal", "contract", "playbook"]
- "which deals close this week?" \u2192 keywords ["sales", "pipeline", "crm"]

Do not search unasked for one-off questions or tasks you can handle directly ("explain this regex", "fix this typo"), or after the user ignored a suggestion in this conversation.

${pe}`,
  V = makeCatalogSearchTool({
    name: SEARCHPLUGINS,
    noun: "plugin",
    run: Z,
    loadedUpFront: v,
    description:
      "Search the user's claude.ai plugin catalog by keyword to find plugins that might help complete the task.",
    prompt: De,
    upFrontPrompt: { text: Fe, requiresTool: SUGGESTPLUGININSTALL },
  }),
  W = makeCatalogSearchTool({
    name: SEARCHSKILLS,
    noun: "skill",
    run: L,
    description:
      "Search the user's claude.ai skills by keyword to find skills that might help complete the task.",
    prompt: `Search the user's claude.ai skills by keyword. Call this when a skill (a reference document or instruction set the user has uploaded or enabled) might help complete the task.

Examples:
- "follow the team's PR guidelines" \u2192 keywords ["pr", "review", "guidelines"]
- "export this as a slide deck" \u2192 keywords ["pptx", "slides", "presentation"]

Returns a ranked list with id, name, description, and whether the skill is enabled. When results fit and SuggestSkills is among your tools, call it to render the add card; otherwise relay the relevant results in text instead. If nothing relevant, proceed without mentioning that you searched.`,
  });
//@ chunk-zw5xhxkf.js:24501-24569 placement
var dn = [V.name, W.name, renderPluginSuggestCard.name, q.name, G.name, j.name],
  gn = [V, W, renderPluginSuggestCard, q, G, j];
