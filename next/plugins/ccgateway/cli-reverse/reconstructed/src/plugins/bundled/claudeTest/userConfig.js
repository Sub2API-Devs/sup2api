/**
 * plugins/bundled/claudeTest/userConfig.ts
 *
 * 2.1.316 新增：插件是否声明了用户配置项。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ptygfaca.js (5)
 * attribution: placement 5
 */
import { CC_PLUGIN_CLAUDE_TEST, HELPER_SERVER_NAME } from "./constants.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ptygfaca.js:267-378 placement
/**
 * 声明了用户配置的插件服务器（Claude Test）。
 */
var PLUGIN_USER_CONFIG_SERVERS; // deferred: uses INLINE_PLUGIN_MARKETPLACE (../../../utils/telemetry/pluginTelemetry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ptygfaca.js:267", () => {
  PLUGIN_USER_CONFIG_SERVERS = [
    {
      pluginSource: `${CC_PLUGIN_CLAUDE_TEST}@${BUILTIN}`,
      serverName: HELPER_SERVER_NAME,
      title: "Claude Test (built into Claude Code)",
      personOnly: true,
    },
  ];
});
//@ chunk-ptygfaca.js:378-460 placement
/**
 * 插件用户配置项的标题
 */
function pluginUserConfigTitle(serverName, pluginSource) {
  return PLUGIN_USER_CONFIG_SERVERS.find(
    (entry) => entry.pluginSource === pluginSource && entry.serverName === serverName,
  )?.title;
}
//@ chunk-ptygfaca.js:460-503 placement
/**
 * 插件是否声明了用户配置项。
 */
function hasPluginUserConfig(serverName, pluginSource) {
  return pluginUserConfigTitle(serverName, pluginSource) !== undefined;
}
//@ chunk-ptygfaca.js:503-598 placement
/**
 * 只允许本人填写的插件服务器
 */
function isPersonOnlyPluginServer(serverName, pluginSource) {
  return PLUGIN_USER_CONFIG_SERVERS.some(
    (entry) =>
      entry.personOnly &&
      entry.serverName === serverName &&
      (!pluginSource || entry.pluginSource === pluginSource),
  );
}
//@ chunk-ptygfaca.js:598-740 placement
/**
 * elicitation 的 password 字段属于声明了用户配置的插件服务器时为 true。
 */
function isPluginPasswordField(serverName, pluginSource, format, schema) {
  return (
    format === "password" &&
    schema.type === "string" &&
    !("format" in schema && schema.format !== undefined) &&
    !("enum" in schema) &&
    !("oneOf" in schema) &&
    hasPluginUserConfig(serverName, pluginSource)
  );
}
export { isPersonOnlyPluginServer, isPluginPasswordField, hasPluginUserConfig, pluginUserConfigTitle };
