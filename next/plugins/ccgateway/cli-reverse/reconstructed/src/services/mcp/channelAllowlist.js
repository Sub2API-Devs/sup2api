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
import { array, objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isPolicyAllowed, policyDenyKind } from "../policyLimits/policyEvidence.js";
import { parsePluginIdentifier_2, marketplaceOf } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { findChannelEntry, isPluginNamedByChannelEntry } from "./channelNotification.js";
import { getAllowedChannels } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-124m26t7.js:375-423 callgraph-fingerprint (2.1.88 match: ChannelAllowlistSchema, 0.366)
/**
 * ChannelAllowlistSchema：GrowthBook tengu_harbor_ledger 的形状 [{marketplace, plugin}]。
 */
var ChannelAllowlistSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-124m26t7.js:375", () => {
  ChannelAllowlistSchema = DoctorLazy(() =>
    array(
      objectSchema({
        marketplace: stringSchema(),
        plugin: stringSchema(),
      }),
    ),
  );
});
//@ chunk-124m26t7.js:423-518 facade-exports (2.1.88 match: getChannelAllowlist, 1)
/**
 * getChannelAllowlist：读 GrowthBook tengu_harbor_ledger 并校验，失败返回空数组。
 */
function getChannelAllowlist() {
  let raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_ledger", []);
  let parsed = ChannelAllowlistSchema().safeParse(raw);
  return parsed.success ? parsed.data : [];
}
//@ chunk-124m26t7.js:518-582 facade-exports (2.1.88 match: isChannelsEnabled, 0.673)
/**
 * isChannelsEnabled：dn("allow_channels") 且 GrowthBook tengu_harbor 为真。
 */
function isChannelsEnabled() {
  return isPolicyAllowed("allow_channels") && getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor", false);
}
//@ chunk-124m26t7.js:582-713 facade-exports
/**
 * 判断本会话 channel 功能是否关闭：GrowthBook `tengu_harbor` 未开则关闭；否则看组织下发的 `allow_channels`，有明确值（非 cache_miss/route_missing）即视为关闭。
 */
function isChannelsOffForSession() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor", false)) return true;
  let denyKind = policyDenyKind("allow_channels");
  return denyKind !== null && denyKind !== "cache_miss" && denyKind !== "route_missing";
}
//@ chunk-124m26t7.js:713-847 facade-exports (2.1.88 match: getVersionedCachePathIn, 0.472)
/**
 * 在指定插件根目录下拼版本化缓存路径（cache/<marketplace>/<plugin>/<version>，名字经转义）。
 */
function isChannelAllowlisted(pluginSource) {
  if (!pluginSource) return false;
  let { name: pluginName, marketplace } = parsePluginIdentifier_2(pluginSource);
  if (!marketplace) return false;
  return getChannelAllowlist().some(
    (entry) => entry.plugin === pluginName && entry.marketplace === marketplace,
  );
}
//@ chunk-4q6mp9e8.js:987-1153 placement
function isChannelPluginAllowed(serverName, config) {
  if (config.pluginSource !== undefined && marketplaceOf(config.pluginSource) === INLINE_PLUGIN_MARKETPLACE)
    return true;
  let entry = findChannelEntry(serverName, getAllowedChannels());
  if (entry === undefined) return false;
  return entry.kind === "server" || isPluginNamedByChannelEntry(config.pluginSource, entry);
}
export {
  getChannelAllowlist,
  isChannelsOffForSession,
  isChannelsEnabled,
  isChannelAllowlisted,
  isChannelPluginAllowed,
};
