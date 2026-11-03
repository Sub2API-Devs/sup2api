/**
 * services/mcp/channelAllowlist.ts
 *
 * channel（服务器主动推送消息）功能开关与插件 allowlist（GrowthBook tengu_harbor / tengu_harbor_ledger）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/channelAllowlist.ts
 * pieces: chunk-124m26t7.js (5), chunk-4q6mp9e8.js (1)
 * attribution: callgraph-fingerprint 1, facade-exports 4, placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isPolicyAllowed, policyDenyKind } from "../policyLimits/policyEvidence.js";
import { parsePluginIdentifier_2, marketplaceOf } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { findChannelEntry, isPluginNamedByChannelEntry } from "./channelNotification.js";
import { getAllowedChannels } from "../../bootstrap/state.js";

/**
 * ChannelAllowlistSchema：GrowthBook tengu_harbor_ledger 的形状 [{marketplace, plugin}]。
 */
//@ chunk-124m26t7.js:375-423 callgraph-fingerprint = ChannelAllowlistSchema (0.366)
var ChannelAllowlistSchema = DoctorLazy(() => A(u({ marketplace: o(), plugin: o() })));
/**
 * getChannelAllowlist：读 GrowthBook tengu_harbor_ledger 并校验，失败返回空数组。
 */
//@ chunk-124m26t7.js:423-518 facade-exports = getChannelAllowlist (1)
function getChannelAllowlist() {
  let raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_ledger", []),
    parsed = ChannelAllowlistSchema().safeParse(raw);
  return parsed.success ? parsed.data : [];
}
/**
 * isChannelsEnabled：dn("allow_channels") 且 GrowthBook tengu_harbor 为真。
 */
//@ chunk-124m26t7.js:518-582 facade-exports = isChannelsEnabled (0.673)
function isChannelsEnabled() {
  return isPolicyAllowed("allow_channels") && getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor", !1);
}
/**
 * 判断本会话 channel 功能是否关闭：GrowthBook `tengu_harbor` 未开则关闭；否则看组织下发的 `allow_channels`，有明确值（非 cache_miss/route_missing）即视为关闭。
 */
//@ chunk-124m26t7.js:582-713 facade-exports
function isChannelsOffForSession() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor", !1)) return !0;
  let e = policyDenyKind("allow_channels");
  return e !== null && e !== "cache_miss" && e !== "route_missing";
}
/**
 * 在指定插件根目录下拼版本化缓存路径（cache/<marketplace>/<plugin>/<version>，名字经转义）。
 */
//@ chunk-124m26t7.js:713-847 facade-exports = getVersionedCachePathIn (0.472)
function isChannelAllowlisted(e) {
  if (!e) return !1;
  let { name: pluginName, marketplace: marketplace } = parsePluginIdentifier_2(e);
  if (!marketplace) return !1;
  return getChannelAllowlist().some((t) => t.plugin === pluginName && t.marketplace === marketplace);
}
//@ chunk-4q6mp9e8.js:987-1153 placement
function isChannelPluginAllowed(n, e) {
  if (e.pluginSource !== void 0 && marketplaceOf(e.pluginSource) === INLINE_PLUGIN_MARKETPLACE) return !0;
  let u = findChannelEntry(n, getAllowedChannels());
  if (u === void 0) return !1;
  return u.kind === "server" || isPluginNamedByChannelEntry(e.pluginSource, u);
}

export {
  getChannelAllowlist,
  isChannelsOffForSession,
  isChannelsEnabled,
  isChannelAllowlisted,
  isChannelPluginAllowed,
};
