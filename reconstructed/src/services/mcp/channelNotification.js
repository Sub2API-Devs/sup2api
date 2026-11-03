/**
 * services/mcp/channelNotification.ts
 *
 * 并入频道能力判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/channelNotification.ts
 * pieces: chunk-0zzdrwpn.js (9), chunk-tdepd6yp.js (1)
 * attribution: facade-exports 8, layout 1, placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, pe, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { Uv } from "../compact/keptTools.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { escapeXmlAttr } from "../../utils/xml.js";
import { jdt } from "../../utils/confusables.js";
import { CHANNEL } from "../../constants/xml.js";
import { aIt } from "../../utils/sessionPeers.js";
import { getChannelAllowlist, isChannelsOffForSession } from "./channelAllowlist.js";
import { isClaudeAISubscriber, getSubscriptionType } from "../../utils/auth.js";
import {
  pluginDisplayKey,
  parsePluginIdentifier_2,
  canonicalPluginId,
  pluginNamesEqual,
} from "../../utils/plugins/pluginIdentifier.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { getAllowedChannels } from "../../bootstrap/state.js";
import { printableName } from "../../utils/printableName.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { ibr } from "../../skills/syncedSkills.js";

/**
 * channel 通知 schema 与方法名常量：notifications/claude/channel（content+meta）、.../permission（request_id+behavior）、.../permission_request，以及 meta 键名正则。
 */
//@ chunk-0zzdrwpn.js:803-1131 facade-exports = ChannelMessageNotificationSchema (0.5)
var ChannelMessageNotificationSchema = DoctorLazy(() =>
    u({
      method: T("notifications/claude/channel"),
      params: u({ content: o(), meta: pe(o(), o()).optional() }),
    }),
  ),
  CHANNEL_PERMISSION_METHOD = "notifications/claude/channel/permission",
  ChannelPermissionNotificationSchema = DoctorLazy(() =>
    u({
      method: T(CHANNEL_PERMISSION_METHOD),
      params: u({ request_id: o(), behavior: U(["allow", "deny"]) }),
    }),
  ),
  CHANNEL_PERMISSION_REQUEST_METHOD = "notifications/claude/channel/permission_request",
  CHANNEL_META_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
/**
 * wrapChannelMessage：把 channel 推送包装成 <channel source="server" k="v"…>内容</channel> 文本；非标识符的 meta 键丢弃并告警，值做 XML 转义。
 */
//@ chunk-0zzdrwpn.js:1131-1488 facade-exports = wrapChannelMessage (0.335)
function wrapChannelMessage(serverName, content, meta) {
  Uv(buildMcpToolName(serverName, "channel"));
  let entries = Object.entries(meta ?? {}),
    [keptMeta, droppedMeta] = partitionBy(entries, ([d]) => CHANNEL_META_KEY_PATTERN.test(d));
  if (droppedMeta.length > 0)
    logForDebugging(
      `[channel] ${serverName}: dropped ${droppedMeta.length} meta key(s) that don't match ${CHANNEL_META_KEY_PATTERN.source}: ${droppedMeta.map(([d]) => d).join(", ")}`,
      { level: "warn" },
    );
  let attrs = keptMeta.map(([d, l]) => ` ${d}="${escapeXmlAttr(l)}"`).join(""),
    escapedContent = jdt(CHANNEL, aIt(content));
  return `<${CHANNEL} source="${escapeXmlAttr(serverName)}"${attrs}>
${escapedContent}
</${CHANNEL}>`;
}
//@ chunk-0zzdrwpn.js:1488-1564 layout
function partitionBy(e, i) {
  let n = [],
    r = [];
  for (let c of e) (i(c) ? n : r).push(c);
  return [n, r];
}
/**
 * getEffectiveChannelAllowlist：组织策略 allowedChannelPlugins 优先，否则用 GrowthBook ledger 列表，返回 {entries, source}。
 */
//@ chunk-0zzdrwpn.js:1564-1654 facade-exports = getEffectiveChannelAllowlist (0.729)
function getEffectiveChannelAllowlist(e) {
  if (e) return { entries: e, source: "org" };
  return { entries: getChannelAllowlist(), source: "ledger" };
}
/**
 * 判断 channel 门控结果是否属于"硬撤销"类（provider/disabled/capability/era），这类原因会立刻停用已注册的 channel 而非等待。
 */
//@ chunk-0zzdrwpn.js:1654-1737 facade-exports
function isChannelGateHardRevocation(e) {
  return e === "provider" || e === "disabled" || e === "capability" || e === "era";
}
/**
 * 判断组织策略是否禁止 channel：一方订阅时 team/enterprise 账号必须显式 channelsEnabled=true；其他情况策略对象存在且未开启即禁止。旧版名 isBigQueryMetricsEnabled 配错。
 */
//@ chunk-0zzdrwpn.js:1737-1875 facade-exports = isBigQueryMetricsEnabled (0.824)
function isChannelsPolicyBlocked(e) {
  if (isClaudeAISubscriber()) {
    let subscriptionType = getSubscriptionType();
    return (subscriptionType === "team" || subscriptionType === "enterprise") && e?.channelsEnabled !== !0;
  }
  return e !== null && e.channelsEnabled !== !0;
}
/**
 * findChannelEntry：在本会话 --channels 列表中查找服务器条目（server 条目按名字；plugin 条目按 plugin:<name>:… 前缀）。
 */
//@ chunk-0zzdrwpn.js:1875-2042 facade-exports = findChannelEntry (0.886)
function findChannelEntry(serverName, channels) {
  let parts = serverName.split(":");
  return channels.find((r) =>
    r.kind === "server"
      ? serverName === r.name
      : parts[0] === "plugin" &&
        (parts[1] === r.name || parts[1] === pluginDisplayKey(r.name, `${r.name}@${r.marketplace}`)),
  );
}
/**
 * 判断 channel 白名单条目是否指向给定插件：条目解析出的 marketplace 必须相同，插件名在 dev 模式下精确比较、否则大小写不敏感比较。
 */
//@ chunk-0zzdrwpn.js:2042-2220 facade-exports = _temp2 (0.669)
function isPluginNamedByChannelEntry(e, i) {
  let n = e ? parsePluginIdentifier_2(e) : void 0,
    r = parsePluginIdentifier_2(canonicalPluginId(`${i.name}@${i.marketplace}`)).name;
  return (
    n?.marketplace !== void 0 &&
    n.marketplace === i.marketplace &&
    (i.dev ? n.name === r : pluginNamesEqual(n.name, r))
  );
}
/**
 * gateChannelServer：决定是否为服务器注册 channel 通知。依次检查 claude/channel 能力、modern 协议（无主动通知路径）、一方 API、功能开关、组织策略 channelsEnabled、--channels 列表、插件市场与 allowlist（allowedChannelPlugins 或 GrowthBook tengu_harbor_ledger），返回 {action:'register'} 或 {action:'skip',kind,reason}。
 */
//@ chunk-0zzdrwpn.js:2220-4002 facade-exports = gateChannelServer (0.734)
function gateChannelServer(serverName, capabilities, pluginSource, protocolEra) {
  if (!hasChannelCapability(capabilities))
    return { action: "skip", kind: "capability", reason: "server did not declare claude/channel capability" };
  if (protocolEra === "modern")
    return {
      action: "skip",
      kind: "era",
      reason: "connection negotiated a modern protocol revision with no unsolicited notification path",
    };
  if (getAPIProvider() !== "firstParty")
    return {
      action: "skip",
      kind: "provider",
      reason: "channels are not available on third-party providers",
    };
  if (isChannelsOffForSession())
    return { action: "skip", kind: "disabled", reason: "channels feature is not currently available" };
  let policySettings = getSettingsForSource("policySettings");
  if (isChannelsPolicyBlocked(policySettings))
    return {
      action: "skip",
      kind: "policy",
      reason: "channels not enabled by org policy (set channelsEnabled: true in managed settings)",
    };
  let entry = findChannelEntry(serverName, getAllowedChannels());
  if (!entry)
    return {
      action: "skip",
      kind: "session",
      reason: `server ${serverName} not in --channels list for this session`,
    };
  if (entry.kind === "plugin") {
    let installedPlugin = pluginSource ? parsePluginIdentifier_2(pluginSource) : void 0;
    if (installedPlugin?.marketplace === void 0 || !isPluginNamedByChannelEntry(pluginSource, entry))
      return {
        action: "skip",
        kind: "marketplace",
        reason: `you asked for plugin:${entry.name}@${entry.marketplace} but the installed plugin is ${installedPlugin?.marketplace !== void 0 ? printableName(`${installedPlugin.name}@${installedPlugin.marketplace}`) : "from an unknown source"}`,
      };
    if (!entry.dev) {
      let { entries: entries, source: source } = getEffectiveChannelAllowlist(
        policySettings?.allowedChannelPlugins,
      );
      if (
        !entries.some(
          (l) =>
            l.marketplace === installedPlugin.marketplace &&
            (l.plugin === installedPlugin.name ||
              (l.marketplace === BUILTIN && ibr(l.plugin) === installedPlugin.name)),
        )
      ) {
        let l = printableName(`${installedPlugin.name}@${installedPlugin.marketplace}`);
        return {
          action: "skip",
          kind: "allowlist",
          reason:
            source === "org"
              ? `plugin ${l} is not on your org's approved channels list (set allowedChannelPlugins in managed settings)`
              : `plugin ${l} is not on the approved channels allowlist (use --dangerously-load-development-channels for local dev)`,
        };
      }
    }
  } else if (!entry.dev)
    return {
      action: "skip",
      kind: "allowlist",
      reason: `server ${entry.name} is not on the approved channels allowlist (use --dangerously-load-development-channels for local dev)`,
    };
  return { action: "register" };
}
//@ chunk-tdepd6yp.js:191-251 placement
function hasChannelCapability(e) {
  return !!e?.experimental?.["claude/channel"];
}

export {
  findChannelEntry,
  isPluginNamedByChannelEntry,
  hasChannelCapability,
  gateChannelServer,
  ChannelMessageNotificationSchema,
  wrapChannelMessage,
  ChannelPermissionNotificationSchema,
  isChannelGateHardRevocation,
  CHANNEL_PERMISSION_METHOD,
  isChannelsPolicyBlocked,
  getEffectiveChannelAllowlist,
  CHANNEL_PERMISSION_REQUEST_METHOD,
};
