/**
 * components/LogoV2/ChannelsNotice.tsx
 *
 * 启动横幅里的 Channels 提示：列出 --channels/开发频道插件、策略未放行或第三方提供商不可用的告警。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/ChannelsNotice.tsx
 * pieces: chunk-ag5x7vhf.js (7)
 * attribution: fingerprint 3, layout 2, callgraph-fingerprint 1, placement 1
 */
import { getAllowedChannels, getHasDevChannels } from "../../bootstrap/state.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import {
  getEffectiveChannelAllowlist,
  isChannelsPolicyBlocked,
} from "../../services/mcp/channelNotification.js";
import { isChannelsOffForSession, isChannelsEnabled } from "../../services/mcp/channelAllowlist.js";
import { policyDenyKind } from "../../services/policyLimits/policyEvidence.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getMcpConfigsByScope } from "../../services/mcp/config.js";
import { getInstalledPlugins } from "../../utils/plugins/installedPluginsManager.js";
import { findPluginName, parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";

/**
 * 汇总启动横幅 Channels 提示所需的状态：允许的频道列表、本会话是否关闭、策略判定是否待定、是否第三方提供商、是否被策略屏蔽、显示文本以及不在允许列表里的条目。
 */
//@ chunk-ag5x7vhf.js:70603-71065 fingerprint = _temp (0.498)
function getChannelsNoticeState() {
  let ch = getAllowedChannels();
  if (ch.length === 0) {
    return {
      channels: ch,
      disabled: !1,
      verdictPending: null,
      is3P: !1,
      policyBlocked: !1,
      list: "",
      unmatched: [],
    };
  }
  let joined = ch.map(formatChannelEntry).join(", ");
  let ge = getSettingsForSource("policySettings");
  let Re = getEffectiveChannelAllowlist(ge?.allowedChannelPlugins);
  let sub = isChannelsOffForSession();
  let fe = sub || isChannelsEnabled() ? null : policyDenyKind("allow_channels");
  return {
    channels: ch,
    disabled: sub,
    verdictPending: fe === "cache_miss" || fe === "route_missing" ? fe : null,
    is3P: getAPIProvider() !== "firstParty",
    policyBlocked: isChannelsPolicyBlocked(ge),
    list: joined,
    unmatched: findUnmatched(ch, Re),
  };
}
//@ chunk-ag5x7vhf.js:71065-71095 layout
function k_(Fe) {
  return !Fe.dev;
}
//@ chunk-ag5x7vhf.js:71095-71209 callgraph-fingerprint = _temp3 (0.662)
function renderChannelWarningRow(u) {
  return r(
    Text,
    { color: "warning", children: [formatChannelEntry(u.entry), " \xB7 ", u.why] },
    `${formatChannelEntry(u.entry)}:${u.why}`,
  );
}
//@ chunk-ag5x7vhf.js:71209-71323 layout
function renderChannelWarningRowAlt(me) {
  return r(
    Text,
    { color: "warning", children: [formatChannelEntry(me.entry), " \xB7 ", me.why] },
    `${formatChannelEntry(me.entry)}:${me.why}`,
  );
}
//@ chunk-ag5x7vhf.js:71323-73721 fingerprint = ChannelsNotice (0.375)
function ChannelsNotice() {
  let $ = w(38),
    [m] = y(getChannelsNoticeState),
    {
      channels: channels,
      disabled: disabled,
      verdictPending: verdictPending,
      is3P: is3P,
      policyBlocked: policyBlocked,
      list: list,
      unmatched: unmatched,
    } = m;
  if (channels.length === 0) {
    return null;
  }
  let hasNonDev = channels.some(k_),
    L =
      getHasDevChannels() && hasNonDev
        ? "Channels"
        : getHasDevChannels()
          ? "--dangerously-load-development-channels"
          : "--channels";
  if (is3P) {
    let W;
    if ($[0] !== L || $[1] !== list)
      ((W = r(Text, { color: "warning", children: [L, " ignored (", list, ")"] })),
        ($[0] = L),
        ($[1] = list),
        ($[2] = W));
    else W = $[2];
    let z;
    if ($[3] === MEMO_CACHE_SENTINEL)
      ((z = e(Text, { dimColor: !0, children: "Channels are not available on third-party providers" })),
        ($[3] = z));
    else z = $[3];
    let K;
    if ($[4] !== W) ((K = r(Box, { flexDirection: "column", children: [W, z] })), ($[4] = W), ($[5] = K));
    else K = $[5];
    return K;
  }
  if (disabled) {
    let W;
    if ($[6] !== L || $[7] !== list)
      ((W = r(Text, { color: "warning", children: [L, " ignored (", list, ")"] })),
        ($[6] = L),
        ($[7] = list),
        ($[8] = W));
    else W = $[8];
    let z;
    if ($[9] === MEMO_CACHE_SENTINEL)
      ((z = e(Text, { dimColor: !0, children: "Channels are not currently available" })), ($[9] = z));
    else z = $[9];
    let K;
    if ($[10] !== W) ((K = r(Box, { flexDirection: "column", children: [W, z] })), ($[10] = W), ($[11] = K));
    else K = $[11];
    return K;
  }
  if (policyBlocked) {
    let W;
    if ($[12] !== L || $[13] !== list)
      ((W = r(Text, { color: "warning", children: [L, " blocked by org policy (", list, ")"] })),
        ($[12] = L),
        ($[13] = list),
        ($[14] = W));
    else W = $[14];
    let z, K;
    if ($[15] === MEMO_CACHE_SENTINEL)
      ((z = e(Text, { dimColor: !0, children: "Inbound messages will be silently dropped" })),
        (K = e(Text, {
          dimColor: !0,
          children: "Have an administrator set channelsEnabled: true in managed settings to enable",
        })),
        ($[15] = z),
        ($[16] = K));
    else ((z = $[15]), (K = $[16]));
    let q;
    if ($[17] !== unmatched) ((q = unmatched.map(renderChannelWarningRow)), ($[17] = unmatched), ($[18] = q));
    else q = $[18];
    let Y;
    if ($[19] !== W || $[20] !== q)
      ((Y = r(Box, { flexDirection: "column", children: [W, z, K, q] })),
        ($[19] = W),
        ($[20] = q),
        ($[21] = Y));
    else Y = $[21];
    return Y;
  }
  if (verdictPending) {
    let W;
    if ($[22] !== L || $[23] !== list)
      ((W = r(Text, {
        color: "warning",
        children: [L, " waiting for your organization's policy (", list, ")"],
      })),
        ($[22] = L),
        ($[23] = list),
        ($[24] = W));
    else W = $[24];
    const z =
      verdictPending === "route_missing"
        ? "This network does not serve it, so messages are dropped this session"
        : "Messages are dropped until it loads";
    let K;
    if ($[25] !== z) ((K = e(Text, { dimColor: !0, children: z })), ($[25] = z), ($[26] = K));
    else K = $[26];
    let q;
    if ($[27] !== W || $[28] !== K)
      ((q = r(Box, { flexDirection: "column", children: [W, K] })), ($[27] = W), ($[28] = K), ($[29] = q));
    else q = $[29];
    return q;
  }
  let W;
  if ($[30] !== L || $[31] !== list)
    ((W = r(Text, {
      dimColor: !0,
      children: [
        "Channels (experimental) messages from ",
        list,
        " inject directly in this session \xB7 restart without ",
        L,
        " to stop",
      ],
    })),
      ($[30] = L),
      ($[31] = list),
      ($[32] = W));
  else W = $[32];
  let z;
  if ($[33] !== unmatched)
    ((z = unmatched.map(renderChannelWarningRowAlt)), ($[33] = unmatched), ($[34] = z));
  else z = $[34];
  let K;
  if ($[35] !== W || $[36] !== z)
    ((K = r(Box, { flexDirection: "column", children: [W, z] })), ($[35] = W), ($[36] = z), ($[37] = K));
  else K = $[37];
  return K;
}
//@ chunk-ag5x7vhf.js:73721-73816 placement = _temp2 (1)
function formatChannelEntry(c) {
  return c.kind === "plugin" ? `plugin:${c.name}@${c.marketplace}` : `server:${c.name}`;
}
//@ chunk-ag5x7vhf.js:73816-74592 fingerprint = findUnmatched (0.97)
function findUnmatched(entries, allowlist) {
  let x = ["enterprise", "managed", "user", "project", "local"],
    configured = new Set();
  for (let scope of x)
    for (let name of Object.keys(getMcpConfigsByScope(scope).servers)) configured.add(name);
  let keys = Object.keys(getInstalledPlugins().plugins),
    { entries: allowed, source: source } = allowlist,
    out = [];
  for (let entry of entries) {
    if (entry.kind === "server") {
      if (!configured.has(entry.name))
        out.push({ entry: entry, why: "no MCP server configured with that name" });
      if (!entry.dev)
        out.push({ entry: entry, why: "server: entries need --dangerously-load-development-channels" });
      continue;
    }
    let L = findPluginName(keys, `${entry.name}@${entry.marketplace}`);
    if (!L) out.push({ entry: entry, why: "plugin not installed" });
    let V = L ? parsePluginIdentifier_2(L) : { name: entry.name, marketplace: entry.marketplace };
    if (!entry.dev && !allowed.some((W) => W.plugin === V.name && W.marketplace === V.marketplace))
      out.push({
        entry: entry,
        why:
          source === "org"
            ? "not on your org's approved channels list"
            : "not on the approved channels allowlist",
      });
  }
  return out;
}

export { ChannelsNotice };
