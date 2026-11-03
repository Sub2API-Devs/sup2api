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
import { identityId2 } from "../../types/ids.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  parsePluginIdentifier,
  isOfficialMarketplaceName_3,
  isKnownOfficialPluginName,
} from "../../utils/plugins/pluginIdentifier.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";

//@ chunk-1dth5azr.js:1004-1093 placement
/**
 * 判断客户端是否存在但没有 transport。
 */
function isClientWithoutTransport(e) {
  let n = identityId2(e.client);
  return n != null && "transport" in n && n.transport === undefined;
}
//@ chunk-1dth5azr.js:1093-1397 placement
/**
 * 官方插件提示词覆盖的 schema：服务器说明（含按服务器）、工具描述、搜索提示、参数描述、提示词与技能。
 */
var promptOverridesSchema = DoctorLazy(() =>
  u({
    server_instructions: string().optional(),
    server_instructions_by_server: record(string(), string()).optional(),
    tools: record(string(), string()).optional(),
    search_hints: record(string(), string()).optional(),
    param_descriptions: record(string(), record(string(), string())).optional(),
    prompts: record(string(), string()).optional(),
    skills: record(string(), string()).optional(),
  }),
);
var promptOverrideMapSchema = DoctorLazy(() => record(string(), unknown()));
//@ chunk-1dth5azr.js:1397-2190 placement
function officialPluginPromptOverrides(e) {
  if (!e.pluginSource) return;
  let { name: n, marketplace } = parsePluginIdentifier(e.pluginSource);
  if (!isOfficialMarketplaceName_3(marketplace) && !isKnownOfficialPluginName(n, marketplace)) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_official_plugin_prompt_overrides",
    {},
  );
  let s = promptOverrideMapSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!s.success) {
    logForDebugging("tengu_official_plugin_prompt_overrides: GB payload is not an object; ignoring", {
      level: "error",
    });
    return;
  }
  let c = s.data[n];
  if (c === undefined) return;
  let d = promptOverridesSchema().safeParse(c);
  if (!d.success) {
    logForDebugging(
      `tengu_official_plugin_prompt_overrides: entry for '${n}' failed schema (${d.error.issues[0]?.message}); using baked-in text`,
      {
        level: "error",
      },
    );
    return;
  }
  let l = d.data;
  if (Object.keys(l).length === 0) return;
  return {
    ...l,
    server_instructions_by_server: nullProtoCopy(l.server_instructions_by_server),
    tools: nullProtoCopy(l.tools),
    search_hints: nullProtoCopy(l.search_hints),
    param_descriptions: nullProtoCopy(l.param_descriptions),
    prompts: nullProtoCopy(l.prompts),
    skills: nullProtoCopy(l.skills),
  };
}
//@ chunk-1dth5azr.js:2190-2277 placement
/**
 * 把对象复制成无原型对象（未提供时 undefined）。
 */
function nullProtoCopy(e) {
  if (e === undefined) return;
  let n = Object.create(null);
  return Object.assign(n, e);
}
//@ chunk-1dth5azr.js:2277-2438 placement
/**
 * 取服务器说明的覆盖文本（按服务器名优先，否则用通用覆盖）。
 */
function serverInstructionsOverride(e, name) {
  if (!e) return;
  let serverInstructionsByServer = e.server_instructions_by_server;
  if (serverInstructionsByServer) {
    let pluginServerName = parsePluginServerName(name);
    let s = pluginServerName && serverInstructionsByServer[pluginServerName.serverName];
    if (s !== undefined) return s;
  }
  return e.server_instructions;
}
//@ chunk-1dth5azr.js:2438-2665 placement
/**
 * 用覆盖文本替换输入 schema 中对应参数的描述。
 */
function applyParamDescriptionOverrides(inputSchema, n) {
  if (!n || !inputSchema.properties) return inputSchema;
  let f = {
    ...inputSchema.properties,
  };
  let r = false;
  for (let [key, value] of Object.entries(n)) {
    let d = f[key];
    if (d !== null && typeof d === "object") {
      f[key] = {
        ...d,
        description: value,
      };
      r = true;
    }
  }
  if (!r) return inputSchema;
  return {
    ...inputSchema,
    properties: f,
  };
}
export {
  officialPluginPromptOverrides,
  serverInstructionsOverride,
  isClientWithoutTransport,
  applyParamDescriptionOverrides,
};
