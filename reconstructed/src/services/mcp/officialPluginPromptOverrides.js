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
import { objectSchema, stringSchema, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  parsePluginIdentifier,
  isOfficialMarketplaceName_3,
  isKnownOfficialPluginName,
} from "../../utils/plugins/pluginIdentifier.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1dth5azr.js:1004-1093 placement
/**
 * 判断客户端是否存在但没有 transport。
 */
function isClientWithoutTransport(connection) {
  let client = identityId2(connection.client);
  return client != null && "transport" in client && client.transport === undefined;
}
//@ chunk-1dth5azr.js:1093-1397 placement
/**
 * 官方插件提示词覆盖的 schema：服务器说明（含按服务器）、工具描述、搜索提示、参数描述、提示词与技能。
 */
var promptOverridesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var promptOverrideMapSchema;
deferInit("chunk-1dth5azr.js:1093", () => {
  promptOverridesSchema = DoctorLazy(() =>
    objectSchema({
      server_instructions: stringSchema().optional(),
      server_instructions_by_server: record(stringSchema(), stringSchema()).optional(),
      tools: record(stringSchema(), stringSchema()).optional(),
      search_hints: record(stringSchema(), stringSchema()).optional(),
      param_descriptions: record(stringSchema(), record(stringSchema(), stringSchema())).optional(),
      prompts: record(stringSchema(), stringSchema()).optional(),
      skills: record(stringSchema(), stringSchema()).optional(),
    }),
  );
  promptOverrideMapSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-1dth5azr.js:1397-2190 placement
function officialPluginPromptOverrides(serverConfig) {
  if (!serverConfig.pluginSource) return;
  let { name: pluginName, marketplace } = parsePluginIdentifier(serverConfig.pluginSource);
  if (!isOfficialMarketplaceName_3(marketplace) && !isKnownOfficialPluginName(pluginName, marketplace))
    return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_official_plugin_prompt_overrides",
    {},
  );
  let parseResult = promptOverrideMapSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parseResult.success) {
    logForDebugging("tengu_official_plugin_prompt_overrides: GB payload is not an object; ignoring", {
      level: "error",
    });
    return;
  }
  let pluginOverrides = parseResult.data[pluginName];
  if (pluginOverrides === undefined) return;
  let overrideParse = promptOverridesSchema().safeParse(pluginOverrides);
  if (!overrideParse.success) {
    logForDebugging(
      `tengu_official_plugin_prompt_overrides: entry for '${pluginName}' failed schema (${overrideParse.error.issues[0]?.message}); using baked-in text`,
      {
        level: "error",
      },
    );
    return;
  }
  let overrides = overrideParse.data;
  if (Object.keys(overrides).length === 0) return;
  return {
    ...overrides,
    server_instructions_by_server: nullProtoCopy(overrides.server_instructions_by_server),
    tools: nullProtoCopy(overrides.tools),
    search_hints: nullProtoCopy(overrides.search_hints),
    param_descriptions: nullProtoCopy(overrides.param_descriptions),
    prompts: nullProtoCopy(overrides.prompts),
    skills: nullProtoCopy(overrides.skills),
  };
}
//@ chunk-1dth5azr.js:2190-2277 placement
/**
 * 把对象复制成无原型对象（未提供时 undefined）。
 */
function nullProtoCopy(record) {
  if (record === undefined) return;
  let copy = Object.create(null);
  return Object.assign(copy, record);
}
//@ chunk-1dth5azr.js:2277-2438 placement
/**
 * 取服务器说明的覆盖文本（按服务器名优先，否则用通用覆盖）。
 */
function serverInstructionsOverride(overrides, name) {
  if (!overrides) return;
  let serverInstructionsByServer = overrides.server_instructions_by_server;
  if (serverInstructionsByServer) {
    let pluginServerName = parsePluginServerName(name);
    let perServerText = pluginServerName && serverInstructionsByServer[pluginServerName.serverName];
    if (perServerText !== undefined) return perServerText;
  }
  return overrides.server_instructions;
}
//@ chunk-1dth5azr.js:2438-2665 placement
/**
 * 用覆盖文本替换输入 schema 中对应参数的描述。
 */
function applyParamDescriptionOverrides(inputSchema, paramDescriptions) {
  if (!paramDescriptions || !inputSchema.properties) return inputSchema;
  let properties = {
    ...inputSchema.properties,
  };
  let changed = false;
  for (let [key, value] of Object.entries(paramDescriptions)) {
    let property = properties[key];
    if (property !== null && typeof property === "object") {
      properties[key] = {
        ...property,
        description: value,
      };
      changed = true;
    }
  }
  if (!changed) return inputSchema;
  return {
    ...inputSchema,
    properties,
  };
}
export {
  officialPluginPromptOverrides,
  serverInstructionsOverride,
  isClientWithoutTransport,
  applyParamDescriptionOverrides,
};
