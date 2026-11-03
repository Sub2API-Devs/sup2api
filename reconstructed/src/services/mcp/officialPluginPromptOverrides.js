/**
 * services/mcp/officialPluginPromptOverrides.ts
 *
 * 2.1.316 新增。官方插件提示词覆盖。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1dth5azr.js (6)
 * attribution: placement 6
 */
import { oa } from "../../types/ids.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  parsePluginIdentifier,
  isOfficialMarketplaceName_3,
  isKnownOfficialPluginName,
} from "../../utils/plugins/pluginIdentifier.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";

//@ chunk-1dth5azr.js:1004-1093 placement
function $Ae(e) {
  let n = oa(e.client);
  return n != null && "transport" in n && n.transport === void 0;
}
/**
 * 官方插件提示词覆盖的 schema：服务器说明（含按服务器）、工具描述、搜索提示、参数描述、提示词与技能。
 */
//@ chunk-1dth5azr.js:1093-1397 placement
var promptOverridesSchema = DoctorLazy(() =>
    u({
      server_instructions: o().optional(),
      server_instructions_by_server: pe(o(), o()).optional(),
      tools: pe(o(), o()).optional(),
      search_hints: pe(o(), o()).optional(),
      param_descriptions: pe(o(), pe(o(), o())).optional(),
      prompts: pe(o(), o()).optional(),
      skills: pe(o(), o()).optional(),
    }),
  ),
  promptOverrideMapSchema = DoctorLazy(() => pe(o(), oe()));
//@ chunk-1dth5azr.js:1397-2190 placement
function officialPluginPromptOverrides(e) {
  if (!e.pluginSource) return;
  let { name: n, marketplace: marketplace } = parsePluginIdentifier(e.pluginSource);
  if (!isOfficialMarketplaceName_3(marketplace) && !isKnownOfficialPluginName(n, marketplace)) return;
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_official_plugin_prompt_overrides", {}),
    safeParse = promptOverrideMapSchema().safeParse(r);
  if (!safeParse.success) {
    logForDebugging("tengu_official_plugin_prompt_overrides: GB payload is not an object; ignoring", {
      level: "error",
    });
    return;
  }
  let c = safeParse.data[n];
  if (c === void 0) return;
  let safeParse_2 = promptOverridesSchema().safeParse(c);
  if (!safeParse_2.success) {
    logForDebugging(
      `tengu_official_plugin_prompt_overrides: entry for '${n}' failed schema (${safeParse_2.error.issues[0]?.message}); using baked-in text`,
      { level: "error" },
    );
    return;
  }
  let l = safeParse_2.data;
  if (Object.keys(l).length === 0) return;
  return {
    ...l,
    server_instructions_by_server: m(l.server_instructions_by_server),
    tools: m(l.tools),
    search_hints: m(l.search_hints),
    param_descriptions: m(l.param_descriptions),
    prompts: m(l.prompts),
    skills: m(l.skills),
  };
}
//@ chunk-1dth5azr.js:2190-2277 placement
function m(e) {
  if (e === void 0) return;
  let create = Object.create(null);
  return Object.assign(create, e);
}
/**
 * 取服务器说明的覆盖文本（按服务器名优先，否则用通用覆盖）。
 */
//@ chunk-1dth5azr.js:2277-2438 placement
function serverInstructionsOverride(e, n) {
  if (!e) return;
  let server_instructions_by_server = e.server_instructions_by_server;
  if (server_instructions_by_server) {
    let r = parsePluginServerName(n),
      s = r && server_instructions_by_server[r.serverName];
    if (s !== void 0) return s;
  }
  return e.server_instructions;
}
/**
 * 用覆盖文本替换输入 schema 中对应参数的描述。
 */
//@ chunk-1dth5azr.js:2438-2665 placement
function applyParamDescriptionOverrides(e, n) {
  if (!n || !e.properties) return e;
  let f = { ...e.properties },
    r = !1;
  for (let [s, c] of Object.entries(n)) {
    let d = f[s];
    if (d !== null && typeof d === "object") ((f[s] = { ...d, description: c }), (r = !0));
  }
  if (!r) return e;
  return { ...e, properties: f };
}

export { officialPluginPromptOverrides, serverInstructionsOverride, $Ae, applyParamDescriptionOverrides };
