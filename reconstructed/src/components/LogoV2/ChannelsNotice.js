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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getMcpConfigsByScope } from "../../services/mcp/config.js";
import { getInstalledPlugins } from "../../utils/plugins/installedPluginsManager.js";
import { findPluginName, parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";

//@ chunk-ag5x7vhf.js:70603-71065 fingerprint = _temp (0.498)
/**
 * 汇总启动横幅 Channels 提示所需的状态：允许的频道列表、本会话是否关闭、策略判定是否待定、是否第三方提供商、是否被策略屏蔽、显示文本以及不在允许列表里的条目。
 */
function getChannelsNoticeState() {
  let ch = getAllowedChannels();
  if (ch.length === 0) {
    return {
      channels: ch,
      disabled: false,
      verdictPending: null,
      is3P: false,
      policyBlocked: false,
      list: "",
      unmatched: [],
    };
  }
  let list = ch.map(formatChannelEntry).join(", ");
  let sub = getSettingsForSource("policySettings");
  let allowlist = getEffectiveChannelAllowlist(sub?.allowedChannelPlugins);
  let sub_2 = isChannelsOffForSession();
  let verdict = sub_2 || isChannelsEnabled() ? null : policyDenyKind("allow_channels");
  return {
    channels: ch,
    disabled: sub_2,
    verdictPending: verdict === "cache_miss" || verdict === "route_missing" ? verdict : null,
    is3P: getAPIProvider() !== "firstParty",
    policyBlocked: isChannelsPolicyBlocked(sub),
    list,
    unmatched: findUnmatched(ch, allowlist),
  };
}
//@ chunk-ag5x7vhf.js:71065-71095 layout
function hasNonDevChannel(channel) {
  return !channel.dev;
}
//@ chunk-ag5x7vhf.js:71095-71209 callgraph-fingerprint = _temp3 (0.662)
function renderChannelWarningRow(u) {
  return jsxProd_default_2(
    Text,
    {
      color: "warning",
      children: [formatChannelEntry(u.entry), " \xB7 ", u.why],
    },
    `${formatChannelEntry(u.entry)}:${u.why}`,
  );
}
//@ chunk-ag5x7vhf.js:71209-71323 layout
function renderChannelWarningRowAlt(entry) {
  return jsxProd_default_2(
    Text,
    {
      color: "warning",
      children: [formatChannelEntry(entry.entry), " \xB7 ", entry.why],
    },
    `${formatChannelEntry(entry.entry)}:${entry.why}`,
  );
}
//@ chunk-ag5x7vhf.js:71323-73721 fingerprint = ChannelsNotice (0.375)
function ChannelsNotice() {
  let $ = useMemoCache(38);
  let [t0] = useState(getChannelsNoticeState);
  let { channels, disabled, verdictPending, is3P, policyBlocked, list, unmatched } = t0;
  if (channels.length === 0) {
    return null;
  }
  let hasNonDev = channels.some(hasNonDevChannel);
  let flag =
    getHasDevChannels() && hasNonDev
      ? "Channels"
      : getHasDevChannels()
        ? "--dangerously-load-development-channels"
        : "--channels";
  if (is3P) {
    let t1;
    if ($[0] !== flag || $[1] !== list) {
      t1 = jsxProd_default_2(Text, {
        color: "warning",
        children: [flag, " ignored (", list, ")"],
      });
      $[0] = flag;
      $[1] = list;
      $[2] = t1;
    } else t1 = $[2];
    let t2;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Text, {
        dimColor: true,
        children: "Channels are not available on third-party providers",
      });
      $[3] = t2;
    } else t2 = $[3];
    let t3;
    if ($[4] !== t1) {
      t3 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t1, t2],
      });
      $[4] = t1;
      $[5] = t3;
    } else t3 = $[5];
    return t3;
  }
  if (disabled) {
    let t1;
    if ($[6] !== flag || $[7] !== list) {
      t1 = jsxProd_default_2(Text, {
        color: "warning",
        children: [flag, " ignored (", list, ")"],
      });
      $[6] = flag;
      $[7] = list;
      $[8] = t1;
    } else t1 = $[8];
    let t2;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Text, {
        dimColor: true,
        children: "Channels are not currently available",
      });
      $[9] = t2;
    } else t2 = $[9];
    let t3;
    if ($[10] !== t1) {
      t3 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t1, t2],
      });
      $[10] = t1;
      $[11] = t3;
    } else t3 = $[11];
    return t3;
  }
  if (policyBlocked) {
    let t1;
    if ($[12] !== flag || $[13] !== list) {
      t1 = jsxProd_default_2(Text, {
        color: "warning",
        children: [flag, " blocked by org policy (", list, ")"],
      });
      $[12] = flag;
      $[13] = list;
      $[14] = t1;
    } else t1 = $[14];
    let t2;
    let t3;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Text, {
        dimColor: true,
        children: "Inbound messages will be silently dropped",
      });
      t3 = jsxProd_default(Text, {
        dimColor: true,
        children: "Have an administrator set channelsEnabled: true in managed settings to enable",
      });
      $[15] = t2;
      $[16] = t3;
    } else {
      t2 = $[15];
      t3 = $[16];
    }
    let t4;
    if ($[17] !== unmatched) {
      t4 = unmatched.map(renderChannelWarningRow);
      $[17] = unmatched;
      $[18] = t4;
    } else t4 = $[18];
    let t5;
    if ($[19] !== t1 || $[20] !== t4) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t1, t2, t3, t4],
      });
      $[19] = t1;
      $[20] = t4;
      $[21] = t5;
    } else t5 = $[21];
    return t5;
  }
  if (verdictPending) {
    let title;
    if ($[22] !== flag || $[23] !== list) {
      title = jsxProd_default_2(Text, {
        color: "warning",
        children: [flag, " waiting for your organization's policy (", list, ")"],
      });
      $[22] = flag;
      $[23] = list;
      $[24] = title;
    } else title = $[24];
    const children =
      verdictPending === "route_missing"
        ? "This network does not serve it, so messages are dropped this session"
        : "Messages are dropped until it loads";
    let note;
    if ($[25] !== children) {
      note = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[25] = children;
      $[26] = note;
    } else note = $[26];
    let pendingBox;
    if ($[27] !== title || $[28] !== note) {
      pendingBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [title, note],
      });
      $[27] = title;
      $[28] = note;
      $[29] = pendingBox;
    } else pendingBox = $[29];
    return pendingBox;
  }
  let activeText;
  if ($[30] !== flag || $[31] !== list) {
    activeText = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Channels (experimental) messages from ",
        list,
        " inject directly in this session \xB7 restart without ",
        flag,
        " to stop",
      ],
    });
    $[30] = flag;
    $[31] = list;
    $[32] = activeText;
  } else activeText = $[32];
  let warnings;
  if ($[33] !== unmatched) {
    warnings = unmatched.map(renderChannelWarningRowAlt);
    $[33] = unmatched;
    $[34] = warnings;
  } else warnings = $[34];
  let activeBox;
  if ($[35] !== activeText || $[36] !== warnings) {
    activeBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [activeText, warnings],
    });
    $[35] = activeText;
    $[36] = warnings;
    $[37] = activeBox;
  } else activeBox = $[37];
  return activeBox;
}
//@ chunk-ag5x7vhf.js:73721-73816 placement = _temp2 (1)
function formatChannelEntry(c) {
  return c.kind === "plugin" ? `plugin:${c.name}@${c.marketplace}` : `server:${c.name}`;
}
//@ chunk-ag5x7vhf.js:73816-74592 fingerprint = findUnmatched (0.97)
function findUnmatched(entries, allowlist) {
  let scopes = ["enterprise", "managed", "user", "project", "local"];
  let configured = new Set();
  for (let scope of scopes)
    for (let name of Object.keys(getMcpConfigsByScope(scope).servers)) configured.add(name);
  let keys = Object.keys(getInstalledPlugins().plugins);
  let { entries: allowed, source } = allowlist;
  let out = [];
  for (let entry of entries) {
    if (entry.kind === "server") {
      if (!configured.has(entry.name))
        out.push({
          entry,
          why: "no MCP server configured with that name",
        });
      if (!entry.dev)
        out.push({
          entry,
          why: "server: entries need --dangerously-load-development-channels",
        });
      continue;
    }
    let pluginName = findPluginName(keys, `${entry.name}@${entry.marketplace}`);
    if (!pluginName)
      out.push({
        entry,
        why: "plugin not installed",
      });
    let parsed = pluginName
      ? parsePluginIdentifier_2(pluginName)
      : {
          name: entry.name,
          marketplace: entry.marketplace,
        };
    if (!entry.dev && !allowed.some((e) => e.plugin === parsed.name && e.marketplace === parsed.marketplace))
      out.push({
        entry,
        why:
          source === "org"
            ? "not on your org's approved channels list"
            : "not on the approved channels allowlist",
      });
  }
  return out;
}
export { ChannelsNotice };
