/**
 * services/mcp/mcpConnectionRefusals.ts
 *
 * 2.1.316 新增：解释 MCP 服务器为何未连接（安全模式、--bare、--strict-mcp-config、远程客户端、托管独占、重复抑制、项目服务器被拒）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (12)
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
import { kA } from "../policyLimits/coldStartWaiter.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { getPluginMcpServers } from "../../utils/plugins/mcpPluginIntegration.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { pluginErrorText } from "../../types/plugin.js";

/**
 * 本会话不连接插件 MCP 服务器的原因列表（安全模式、--bare、strict 等）。
 */
//@ chunk-0sfjpx19.js:137280-137809 placement
var SESSION_MCP_SUPPRESSIONS = [
  {
    isOn: () => isCustomizationDisabled("mcpAutoDiscovered"),
    message: "This session runs in safe mode, which connects no plugin servers.",
  },
  { isOn: () => isBareMode(), message: "This session runs with --bare, which connects no plugin servers." },
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
/**
 * 说明某个插件 MCP 服务器当前的状态（插件不存在时返回通用说明）。
 */
//@ chunk-0sfjpx19.js:137809-137965 placement
async function explainPluginServer(e) {
  let { enabled: enabled } = await loadAllPluginsCacheOnly(e.storageV5, e.credentials),
    found = enabled.find((s) => s.source === e.pluginId);
  if (found === void 0) return Gr(e.key);
  return explainPluginMcpServerState(found, e);
}
//@ chunk-0sfjpx19.js:137965-138596 placement
async function explainPluginMcpServerState(e, n) {
  let s = `plugin:${pluginDisplayKey(e.name, e.source)}:${n.key}`,
    h = [],
    y = (await pluginMcpServersFor(e, n, h))?.[s];
  if (y === void 0) return pluginErrorState(n.key, s, h);
  if (y.configError !== void 0)
    return Le("failed", `The MCP server "${s}" cannot be resolved: ${y.configError}`);
  let _ = isProjectLocalPlugin(e) ? getEffectiveProjectMcpServerStatus(s) : "approved";
  if (_ !== "approved") return Le("unapproved", formatRejectedProjectServer(s, _));
  if (isMcpServerDisabled(s))
    return Le("disabled", `The MCP server "${s}" is turned off; turn it on in /mcp.`);
  let b = Vl();
  if (b !== void 0) return Le("policy", b);
  if ((await kA(), filterDynamicMcpServersByPolicy({ [s]: y }).blocked.length > 0))
    return Le("policy", `Your organization's MCP policy does not allow "${s}".`);
  let w = await suppressedDuplicateOf(s, n);
  return w === void 0 ? Ql(s, y) : Xl(w);
}
//@ chunk-0sfjpx19.js:138596-138774 placement
async function pluginMcpServersFor(e, n, r) {
  let s = e.isBuiltin ? getBuiltinPlugin(e.name)?.mcpServers : void 0;
  return e.isBuiltin && s === void 0
    ? void 0
    : getPluginMcpServers(e.isBuiltin ? { ...e, mcpServers: s } : e, r, n.storageV5, n.credentials);
}
//@ chunk-0sfjpx19.js:138774-139009 placement
async function suppressedDuplicateOf(e, n) {
  let { warnings: warnings } = await getClaudeCodeMcpConfigs(
    wi(n.dynamicServers, (s, h) => h === e),
    { storageV5: n.storageV5, credentials: n.credentials },
  );
  return warnings.flatMap((s) =>
    s.type === "mcp-server-suppressed-duplicate" && s.source === e ? [s.duplicateOf] : [],
  )[0];
}
//@ chunk-0sfjpx19.js:139009-139062 placement
function Vl() {
  return SESSION_MCP_SUPPRESSIONS.find((e) => e.isOn())?.message;
}
//@ chunk-0sfjpx19.js:139062-139229 placement
function pluginErrorState(e, n, r) {
  let found = r.find((h) => "source" in h && h.source === e);
  if (found === void 0) return Gr(e);
  return Le("failed", `The MCP server "${n}" cannot be resolved: ${pluginErrorText(found)}`);
}
//@ chunk-0sfjpx19.js:139229-139477 placement
function formatRejectedProjectServer(e, n) {
  return n === "rejected"
    ? `The MCP server "${e}" comes with this repository and you rejected it; \`claude mcp reset-project-choices\` asks again.`
    : `The MCP server "${e}" comes with this repository and waits for your approval in /mcp.`;
}
//@ chunk-0sfjpx19.js:139477-139573 placement
function Gr(e) {
  return Le("unlisted", `This plugin's manifest lists no MCP server named "${e}".`);
}
//@ chunk-0sfjpx19.js:139573-139630 placement
function Le(e, n) {
  return { isListed: !1, refused: e, message: n };
}
//@ chunk-0sfjpx19.js:139630-139693 placement
function Ql(e, n) {
  return { isListed: !0, isTwin: !1, name: e, config: n };
}
//@ chunk-0sfjpx19.js:139693-139745 placement
function Xl(e) {
  return { isListed: !0, isTwin: !0, name: e };
}

export { explainPluginServer };
