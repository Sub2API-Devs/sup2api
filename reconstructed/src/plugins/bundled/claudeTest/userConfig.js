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
import { CC_PLUGIN_CLAUDE_TEST, IZ } from "./constants.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";

/**
 * 声明了用户配置的插件服务器（Claude Test）。
 */
//@ chunk-zjdsh43n.js:266-376 placement
var PLUGIN_USER_CONFIG_SERVERS = [
  {
    pluginSource: `${CC_PLUGIN_CLAUDE_TEST}@${BUILTIN}`,
    serverName: IZ,
    title: "Claude Test (built into Claude Code)",
    personOnly: !0,
  },
];
//@ chunk-zjdsh43n.js:376-458 placement
function sLo(i, n) {
  return PLUGIN_USER_CONFIG_SERVERS.find((e) => e.pluginSource === n && e.serverName === i)?.title;
}
/**
 * 插件是否声明了用户配置项。
 */
//@ chunk-zjdsh43n.js:458-501 placement
function hasPluginUserConfig(i, n) {
  return sLo(i, n) !== void 0;
}
//@ chunk-zjdsh43n.js:501-596 placement
function iYn(i, n) {
  return PLUGIN_USER_CONFIG_SERVERS.some(
    (e) => e.personOnly && e.serverName === i && (!n || e.pluginSource === n),
  );
}
/**
 * elicitation 的 password 字段属于声明了用户配置的插件服务器时为 true。
 */
//@ chunk-zjdsh43n.js:596-738 placement
function isPluginPasswordField(i, n, e, t) {
  return (
    e === "password" &&
    t.type === "string" &&
    !("format" in t && t.format !== void 0) &&
    !("enum" in t) &&
    !("oneOf" in t) &&
    hasPluginUserConfig(i, n)
  );
}

export { hasPluginUserConfig, sLo, isPluginPasswordField, iYn };
