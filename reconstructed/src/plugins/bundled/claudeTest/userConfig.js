/**
 * plugins/bundled/claudeTest/userConfig.ts
 *
 * 2.1.316 新增：插件是否声明了用户配置项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zjdsh43n.js (5)
 * attribution: placement 5
 */
import { CC_PLUGIN_CLAUDE_TEST, HELPER_SERVER_NAME } from "./constants.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-zjdsh43n.js:266-376 placement
/**
 * 声明了用户配置的插件服务器（Claude Test）。
 */
var PLUGIN_USER_CONFIG_SERVERS; // deferred: uses INLINE_PLUGIN_MARKETPLACE (../../../utils/telemetry/pluginTelemetry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zjdsh43n.js:266", () => {
  PLUGIN_USER_CONFIG_SERVERS = [
    {
      pluginSource: `${CC_PLUGIN_CLAUDE_TEST}@${BUILTIN}`,
      serverName: HELPER_SERVER_NAME,
      title: "Claude Test (built into Claude Code)",
      personOnly: true,
    },
  ];
});
//@ chunk-zjdsh43n.js:376-458 placement
/**
 * 插件用户配置项的标题
 */
function pluginUserConfigTitle(serverName, pluginSource) {
  return PLUGIN_USER_CONFIG_SERVERS.find(
    (entry) => entry.pluginSource === pluginSource && entry.serverName === serverName,
  )?.title;
}
//@ chunk-zjdsh43n.js:458-501 placement
/**
 * 插件是否声明了用户配置项。
 */
function hasPluginUserConfig(serverName, pluginSource) {
  return pluginUserConfigTitle(serverName, pluginSource) !== undefined;
}
//@ chunk-zjdsh43n.js:501-596 placement
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
//@ chunk-zjdsh43n.js:596-738 placement
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
export { hasPluginUserConfig, pluginUserConfigTitle, isPluginPasswordField, isPersonOnlyPluginServer };
