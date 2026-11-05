/**
 * services/mcp/mcpConnectionRefusals.ts
 *
 * 2.1.316 新增：解释 MCP 服务器为何未连接（安全模式、--bare、--strict-mcp-config、远程客户端、托管独占、重复抑制、项目服务器被拒）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (12)
 * attribution: placement 12
 */
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isBareMode } from "../../utils/envUtils.js";
import { getStrictMcpConfig, getIsRemoteMode } from "../../bootstrap/state.js";
import {
  doesEnterpriseMcpConfigExist,
  isMcpServerDisabled,
  filterDynamicMcpServersByPolicy,
  getClaudeCodeMcpConfigs,
} from "./config.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { pluginDisplayKey, isProjectLocalPlugin } from "../../utils/plugins/pluginIdentifier.js";
import { getEffectiveProjectMcpServerStatus } from "./utils.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { getPluginMcpServers } from "../../utils/plugins/mcpPluginIntegration.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { pluginErrorText } from "../../types/plugin.js";

//@ chunk-nh1pvp1m.js:131062-131591 placement
/**
 * 本会话不连接插件 MCP 服务器的原因列表（安全模式、--bare、strict 等）。
 */
var SESSION_MCP_SUPPRESSIONS = [
  {
    isOn: () => isCustomizationDisabled("mcpAutoDiscovered"),
    message: "This session runs in safe mode, which connects no plugin servers.",
  },
  {
    isOn: () => isBareMode(),
    message: "This session runs with --bare, which connects no plugin servers.",
  },
  {
    isOn: () => getStrictMcpConfig(),
    message: "This session runs with --strict-mcp-config, which connects no plugin servers.",
  },
  {
    isOn: () => getIsRemoteMode(),
    message: "This session is a remote client, which connects no plugin servers.",
  },
  {
    isOn: () => doesEnterpriseMcpConfigExist(),
    message: "Your organization's managed MCP config has exclusive control over MCP servers in this session.",
  },
];
//@ chunk-nh1pvp1m.js:131591-131747 placement
/**
 * 说明某个插件 MCP 服务器当前的状态（插件不存在时返回通用说明）。
 */
async function explainPluginServer(context) {
  let { enabled } = await loadAllPluginsCacheOnly(context.storageV5, context.credentials);
  let plugin = enabled.find((plugin) => plugin.source === context.pluginId);
  if (plugin === undefined) return unlistedPluginServer(context.key);
  return explainPluginMcpServerState(plugin, context);
}
//@ chunk-nh1pvp1m.js:131747-132378 placement
async function explainPluginMcpServerState(plugin, context) {
  let serverKey = `plugin:${pluginDisplayKey(plugin.name, plugin.source)}:${context.key}`;
  let errors = [];
  let config = (await pluginMcpServersFor(plugin, context, errors))?.[serverKey];
  if (config === undefined) return pluginErrorState(context.key, serverKey, errors);
  if (config.configError !== undefined)
    return refusal("failed", `The MCP server "${serverKey}" cannot be resolved: ${config.configError}`);
  let projectStatus = isProjectLocalPlugin(plugin)
    ? getEffectiveProjectMcpServerStatus(serverKey)
    : "approved";
  if (projectStatus !== "approved")
    return refusal("unapproved", formatRejectedProjectServer(serverKey, projectStatus));
  if (isMcpServerDisabled(serverKey))
    return refusal("disabled", `The MCP server "${serverKey}" is turned off; turn it on in /mcp.`);
  let message = sessionSuppressionMessage();
  if (message !== undefined) return refusal("policy", message);
  await awaitPolicyColdStartWaiter();
  if (
    filterDynamicMcpServersByPolicy({
      [serverKey]: config,
    }).blocked.length > 0
  )
    return refusal("policy", `Your organization's MCP policy does not allow "${serverKey}".`);
  let name = await suppressedDuplicateOf(serverKey, context);
  return name === undefined ? listedServer(serverKey, config) : listedTwinServer(name);
}
//@ chunk-nh1pvp1m.js:132378-132556 placement
async function pluginMcpServersFor(plugin, context, errors) {
  let mcpServers = plugin.isBuiltin ? getBuiltinPlugin(plugin.name)?.mcpServers : undefined;
  return plugin.isBuiltin && mcpServers === undefined
    ? undefined
    : getPluginMcpServers(
        plugin.isBuiltin
          ? {
              ...plugin,
              mcpServers,
            }
          : plugin,
        errors,
        context.storageV5,
        context.credentials,
      );
}
//@ chunk-nh1pvp1m.js:132556-132791 placement
async function suppressedDuplicateOf(serverName, context) {
  let { warnings } = await getClaudeCodeMcpConfigs(
    import_reject(context.dynamicServers, (key, value) => value === serverName),
    {
      storageV5: context.storageV5,
      credentials: context.credentials,
    },
  );
  return warnings.flatMap((warning) =>
    warning.type === "mcp-server-suppressed-duplicate" && warning.source === serverName
      ? [warning.duplicateOf]
      : [],
  )[0];
}
//@ chunk-nh1pvp1m.js:132791-132844 placement
/**
 * 当前会话被抑制时给用户的说明。
 */
function sessionSuppressionMessage() {
  return SESSION_MCP_SUPPRESSIONS.find((suppression) => suppression.isOn())?.message;
}
//@ chunk-nh1pvp1m.js:132844-133011 placement
function pluginErrorState(serverKey, displayName, errors) {
  let found = errors.find((error) => "source" in error && error.source === serverKey);
  if (found === undefined) return unlistedPluginServer(serverKey);
  return refusal("failed", `The MCP server "${displayName}" cannot be resolved: ${pluginErrorText(found)}`);
}
//@ chunk-nh1pvp1m.js:133011-133259 placement
function formatRejectedProjectServer(serverName, status) {
  return status === "rejected"
    ? `The MCP server "${serverName}" comes with this repository and you rejected it; \`claude mcp reset-project-choices\` asks again.`
    : `The MCP server "${serverName}" comes with this repository and waits for your approval in /mcp.`;
}
//@ chunk-nh1pvp1m.js:133259-133355 placement
/**
 * 插件清单里没有该服务器时的拒绝结果。
 */
function unlistedPluginServer(serverKey) {
  return refusal("unlisted", `This plugin's manifest lists no MCP server named "${serverKey}".`);
}
//@ chunk-nh1pvp1m.js:133355-133412 placement
/**
 * 构造“未列出/被拒”的结果对象。
 */
function refusal(refused, message) {
  return {
    isListed: false,
    refused,
    message,
  };
}
//@ chunk-nh1pvp1m.js:133412-133475 placement
/**
 * 构造“已列出”的结果对象。
 */
function listedServer(name, config) {
  return {
    isListed: true,
    isTwin: false,
    name,
    config,
  };
}
//@ chunk-nh1pvp1m.js:133475-133527 placement
/**
 * 构造“已列出但有孪生项”的结果对象。
 */
function listedTwinServer(name) {
  return {
    isListed: true,
    isTwin: true,
    name,
  };
}
export { explainPluginServer };
