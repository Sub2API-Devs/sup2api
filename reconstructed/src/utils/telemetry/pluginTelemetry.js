/**
 * utils/telemetry/pluginTelemetry.ts
 *
 * 插件相关遥测字段（_PROTO_plugin_name 等）与插件事件（重命名、目录遮蔽、命令错误分类）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/pluginTelemetry.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-csq9ftr9.js (78), chunk-d4eg9at2.js (1), chunk-dcmhvw5a.js (1)
 * attribution: fingerprint 8, callgraph-fingerprint 2, placement 53, layout 19
 */
import { sep } from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
} from "crypto";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { saveGlobalConfig, saveGlobalConfigSyncForExit, getGlobalConfig } from "../config.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { registerCleanup, registerPreExitFlush } from "../cleanupRegistry.js";
import {
  legacyPluginIds,
  parsePluginIdentifier_2,
  isOfficialOrCommunityMarketplace,
  isOfficialMarketplaceName_3,
  isKnownOfficialPluginName,
  marketplaceSuffix,
  isOfficialMarketplace,
  parsePluginId,
} from "../plugins/pluginIdentifier.js";
import {
  THIRD_PARTY,
  isToolDetailsLoggingEnabled,
  Xki,
  sanitizeVersion,
} from "../../services/analytics/metadata.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit,
  joinSafe,
  fromEnum,
  fromEnumArr,
  fromEnumOpt,
} from "../../services/analytics/safeMetadata.js";
import { OFFICIAL_MARKETPLACE_NAME } from "../plugins/officialMarketplaceNames.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { j, A, Jtr, COMMAND_SOURCE_ERRORS, Z_n } from "../plugins/commandSourceErrors.js";
import { COMMUNITY_MARKETPLACE_NAMES, RESERVED_MARKETPLACE_NAMES } from "../plugins/schemas.js";
import { isOfficialMarketplaceSkill } from "../../tools/SkillTool/SkillTool.js";
import { yPi, ANTHROPIC_SKILLS } from "../../skills/syncedSkills.js";
import { isServerPluginId } from "../plugins/pluginAttribution.js";
import { x } from "./skillAttribution.js";
import { af } from "../plugins/pluginPolicy.js";
import { logEvent } from "../../services/analytics/index.js";
import { uniq } from "../collections.js";
import { logError } from "../log.js";
import { logOTelEvent } from "./events.js";
import { isSafeMode } from "../envUtils.js";
import { getTelemetryMessage, sanitizeErrnoTokenForTelemetry } from "../errors.js";

//@ chunk-csq9ftr9.js:3160-3199 placement
var Z4o = ["agent", "subagentStatusLine"];
//@ chunk-csq9ftr9.js:3199-3236 placement
function J(e) {
  return Z4o.includes(e);
}
//@ chunk-csq9ftr9.js:3236-3289 placement
function q(e, n) {
  return n ? `${e}@${n.toLowerCase()}` : e;
}
//@ chunk-csq9ftr9.js:3289-3507 placement
class CommandIdRegistry {
  #e = new Map();
  #n = 0;
  generation() {
    return this.#n;
  }
  register(e, n, r, s) {
    if (s !== void 0 && s !== this.#n) return;
    this.#e.set(q(e, n), r);
  }
  get(e, n) {
    if (n === void 0) return;
    return this.#e.get(q(e, n));
  }
  clear() {
    (this.#e.clear(), this.#n++);
  }
}
//@ chunk-csq9ftr9.js:3507-3531 placement
var Ee = new HostScoped(() => new CommandIdRegistry());
//@ chunk-csq9ftr9.js:3531-3567 placement
function k() {
  return Ee.of(getRootSession().host);
}
//@ chunk-csq9ftr9.js:3567-3606 placement
function rri() {
  return k().generation();
}
//@ chunk-csq9ftr9.js:3606-3650 placement
function ori(e, n, r, s) {
  k().register(e, n, r, s);
}
//@ chunk-csq9ftr9.js:3650-3686 placement
function T(e, n) {
  return k().get(e, n);
}
//@ chunk-csq9ftr9.js:3686-3713 placement
function sri() {
  k().clear();
}
//@ chunk-csq9ftr9.js:4620-4710 placement
class Q {
  pendingUsage = new Map();
  flushTimer = null;
  exitFlushesInFlight = [];
  flushStorageV5 = void 0;
}
//@ chunk-csq9ftr9.js:4710-4734 placement
var ee = new HostScoped(() => new Q());
//@ chunk-csq9ftr9.js:4734-4780 placement
class ne {
  flushers = null;
  exitFlushRegistered = !1;
}
//@ chunk-csq9ftr9.js:4780-4793 placement
var h = new ne();
//@ chunk-csq9ftr9.js:4793-4806 placement
var Ue = 60000;
//@ chunk-csq9ftr9.js:4806-4877 placement
function te(e) {
  h.flushers = e;
  let n = S();
  if (n.pendingUsage.size > 0) scheduleUsageFlush(n, e);
}
//@ chunk-csq9ftr9.js:4877-4913 placement
function S() {
  return ee.of(getRootSession().host);
}
/**
 * 记录插件使用次数（批量延迟写）。
 */
//@ chunk-csq9ftr9.js:4913-5086 placement
function recordPluginUsage(e) {
  let now = Date.now(),
    r = S(),
    s = r.pendingUsage.get(e);
  if (s) (s.count++, (s.lastUsedAt = now));
  else r.pendingUsage.set(e, { count: 1, lastUsedAt: now });
  if (h.flushers) scheduleUsageFlush(r, h.flushers);
}
//@ chunk-csq9ftr9.js:5086-5263 placement
function scheduleUsageFlush(e, n) {
  if (!h.exitFlushRegistered) ((h.exitFlushRegistered = !0), process.on("exit", n.flushAtExit));
  if (!e.flushTimer) ((e.flushTimer = setTimeout(n.flush, Ue)), e.flushTimer.unref?.());
}
//@ chunk-csq9ftr9.js:5263-5310 placement
function re(e) {
  S().exitFlushesInFlight.push(e);
}
//@ chunk-csq9ftr9.js:5310-5394 placement
function oe(e) {
  let exitFlushesInFlight = S().exitFlushesInFlight,
    index = exitFlushesInFlight.indexOf(e);
  if (index !== -1) exitFlushesInFlight.splice(index, 1);
}
//@ chunk-csq9ftr9.js:5394-5499 placement
function takeExitFlushes() {
  let e = S(),
    flat = e.exitFlushesInFlight.flat();
  return ((e.exitFlushesInFlight = []), flat.length > 0 ? flat : null);
}
//@ chunk-csq9ftr9.js:5499-5535 placement
function le(e) {
  S().flushStorageV5 = e;
}
//@ chunk-csq9ftr9.js:5535-5575 placement
function ae() {
  return S().flushStorageV5;
}
//@ chunk-csq9ftr9.js:5575-5766 placement
function takePendingUsage() {
  let e = S();
  if (e.flushTimer) (clearTimeout(e.flushTimer), (e.flushTimer = null));
  if (e.pendingUsage.size === 0) return null;
  let n = [...e.pendingUsage.entries()];
  return (e.pendingUsage.clear(), n);
}
//@ chunk-csq9ftr9.js:5766-5813 placement
function eYo(e) {
  return S().pendingUsage.has(e);
}
//@ chunk-csq9ftr9.js:5813-5912 placement
function ge(e) {
  let { pendingUsage: pendingUsage } = S();
  for (let r of pendingUsage.keys()) if (e.has(r.toLowerCase())) pendingUsage.delete(r);
}
//@ chunk-csq9ftr9.js:5912-5963 placement
function xe() {
  let e = takePendingUsage();
  if (!e) return;
  saveGlobalConfig(mergePluginUsage(e), ae());
}
//@ chunk-csq9ftr9.js:5963-6036 placement
async function ce(e) {
  let n = takePendingUsage();
  if (!n) return;
  (re(n), await saveGlobalConfig(mergePluginUsage(n), e), oe(n));
}
//@ chunk-csq9ftr9.js:6036-6105 placement
function iri(e) {
  if (isStorageV5Enabled() && e !== void 0)
    (le(e), registerCleanup(() => ce(e)), registerPreExitFlush(() => ce(e)));
}
//@ chunk-csq9ftr9.js:6105-6183 placement
function ve() {
  let e = [...(takeExitFlushes() ?? []), ...(takePendingUsage() ?? [])];
  if (e.length === 0) return;
  saveGlobalConfigSyncForExit(mergePluginUsage(e));
}
//@ chunk-csq9ftr9.js:6183-6213 placement
te({ flush: xe, flushAtExit: ve });
//@ chunk-csq9ftr9.js:6213-6424 placement
function mergePluginUsage(e) {
  return (n) => {
    let r = { ...n.pluginUsage };
    for (let [s, g] of e) {
      let f = r[s];
      r[s] = {
        usageCount: (f?.usageCount ?? 0) + g.count,
        lastUsedAt: g.lastUsedAt,
        lastUsedNumStartups: n.numStartups,
      };
    }
    return { ...n, pluginUsage: r };
  };
}
/**
 * 新启用插件初始化使用记录。
 */
//@ chunk-csq9ftr9.js:6424-6672 placement
function seedPluginUsage(e, n) {
  let now = Date.now();
  saveGlobalConfig((s) => {
    let filtered = e.filter((m) => !s.pluginUsage?.[m]);
    if (filtered.length === 0) return s;
    let f = { ...s.pluginUsage };
    for (let m of filtered) f[m] = { usageCount: 0, lastUsedAt: now, lastUsedNumStartups: s.numStartups };
    return { ...s, pluginUsage: f };
  }, n);
}
/**
 * 删除插件使用记录（大小写不敏感）。
 */
//@ chunk-csq9ftr9.js:6672-6929 placement
function removePluginUsage(e, n) {
  let r = new Set(e.map((s) => s.toLowerCase()));
  (ge(r),
    saveGlobalConfig((s) => {
      let filtered = Object.keys(s.pluginUsage ?? {}).filter((_) => r.has(_.toLowerCase()));
      if (filtered.length === 0) return s;
      let m = { ...s.pluginUsage };
      for (let _ of filtered) delete m[_];
      return { ...s, pluginUsage: m };
    }, n));
}
//@ chunk-csq9ftr9.js:6929-7026 placement
function Qtr(e) {
  let pluginUsage = getGlobalConfig().pluginUsage;
  return [e, ...legacyPluginIds(e)].map((r) => pluginUsage?.[r]).find((r) => r !== void 0);
}
/**
 * 刷新已有插件的最后使用时间。
 */
//@ chunk-csq9ftr9.js:7026-7292 placement
function touchPluginUsage(e, n) {
  let now = Date.now();
  saveGlobalConfig((s) => {
    let filtered = e.filter((m) => s.pluginUsage?.[m]);
    if (filtered.length === 0) return s;
    let f = { ...s.pluginUsage };
    for (let m of filtered) {
      let _ = f[m];
      if (!_) continue;
      f[m] = { ..._, lastUsedAt: now, lastUsedNumStartups: s.numStartups };
    }
    return { ...s, pluginUsage: f };
  }, n);
}
/**
 * LSP 插件一次性宽限：未用过的刷新最后使用时间。
 */
//@ chunk-csq9ftr9.js:7292-7729 placement
function applyLspUsageGrace(e, n) {
  let pluginUsageLspGraceAppliedIds = getGlobalConfig().pluginUsageLspGraceAppliedIds;
  if (e.every((g) => pluginUsageLspGraceAppliedIds?.includes(g))) return;
  let now = Date.now();
  saveGlobalConfig((g) => {
    let f = new Set(g.pluginUsageLspGraceAppliedIds),
      filtered = e.filter((y) => !f.has(y));
    if (filtered.length === 0) return g;
    let _ = { ...g.pluginUsage };
    for (let y of filtered) {
      let d = _[y];
      if (!d || d.usageCount > 0) continue;
      _[y] = { ...d, lastUsedAt: now, lastUsedNumStartups: g.numStartups };
    }
    return { ...g, pluginUsage: _, pluginUsageLspGraceAppliedIds: [...f, ...filtered] };
  }, n);
}
/**
 * 距最后使用的会话数与天数。
 */
//@ chunk-csq9ftr9.js:7729-7881 placement
function disuseStats(e, n, r) {
  return {
    sessionsSinceLastUse: Math.max(0, n - e.lastUsedNumStartups),
    daysSinceLastUse: Math.max(0, Math.floor((r - e.lastUsedAt) / 86400000)),
  };
}
//@ chunk-csq9ftr9.js:7881-7964 placement
function xYr(e, n, r) {
  return { "plugin.name": r ? e : THIRD_PARTY, ...(n && { "marketplace.name": r ? n : THIRD_PARTY }) };
}
//@ chunk-csq9ftr9.js:7964-8047 placement
function lx(e, n) {
  let r = T(e, n) ?? n,
    s = r ? `${e}@${r.toLowerCase()}` : e;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(s));
}
//@ chunk-csq9ftr9.js:8047-8141 placement
function dpe(e) {
  let { name: n, marketplace: marketplace } = parsePluginIdentifier_2(e);
  return isOfficialOrCommunityMarketplace(marketplace) || _e(n, marketplace)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8141-8195 placement
function me(e) {
  return e === OFFICIAL_MARKETPLACE_NAME && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wise_kite", !1);
}
//@ chunk-csq9ftr9.js:8195-8231 placement
function _e(e, n) {
  return me(n) && j(e);
}
//@ chunk-csq9ftr9.js:8231-8326 placement
function lri(e, n) {
  return e.length > 0 ? joinSafe(e.map((r) => (n(r) ? dpe(r) : lit("third-party"))).sort()) : void 0;
}
//@ chunk-csq9ftr9.js:8326-8420 placement
function r$e(e) {
  if (me(e) && A()) return lit(OFFICIAL_MARKETPLACE_NAME);
  return isOfficialOrCommunityMarketplace(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e.toLowerCase())
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8587-8767 fingerprint = getTelemetryPluginScope (0.882)
function getTelemetryPluginScope(name, marketplace, managedNames) {
  if (marketplace === BUILTIN) return "default-bundle";
  if (isOfficialMarketplaceName_3(marketplace)) return "official";
  if (marketplace !== void 0 && COMMUNITY_MARKETPLACE_NAMES.has(marketplace.toLowerCase()))
    return "community";
  if (managedNames?.has(name)) return "org";
  return "user-local";
}
//@ chunk-csq9ftr9.js:8767-8827 placement
function isAnthropicPluginSource(e) {
  return e === "official" || e === "default-bundle";
}
//@ chunk-csq9ftr9.js:8827-8873 placement
function isKnownPluginSource(e) {
  return isAnthropicPluginSource(e) || e === "community";
}
//@ chunk-csq9ftr9.js:8873-8909 placement
function mayLogPluginName(e) {
  return isAnthropicPluginSource(e) || isToolDetailsLoggingEnabled();
}
/**
 * 插件 skill 的遥测字段：官方市场插件上报插件名与仓库，其余记 third-party。
 */
//@ chunk-csq9ftr9.js:9976-10157 placement
function getSkillPluginTelemetryFields(e) {
  let pluginInfo = e.pluginInfo;
  if (!pluginInfo || !isOfficialMarketplaceSkill(e))
    return { plugin_name: lit(THIRD_PARTY), plugin_repository: lit(THIRD_PARTY) };
  return {
    plugin_name: fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginInfo.pluginManifest.name),
    plugin_repository: fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginInfo.repository),
  };
}
//@ chunk-csq9ftr9.js:10157-10455 fingerprint = getEnabledVia (0.748)
function getEnabledVia(plugin, managedNames, seedDirs) {
  if (plugin.isBuiltin) return "default-enable";
  if (managedNames?.has(plugin.name)) return "org-policy";
  if (plugin.installationPreference === "required" || plugin.installationPreference === "auto_install")
    return "admin-install";
  if (seedDirs.some((dir) => plugin.path.startsWith(dir.endsWith(sep) ? dir : dir + sep)))
    return "seed-mount";
  return "user-install";
}
//@ chunk-csq9ftr9.js:10455-10797 fingerprint = buildPluginTelemetryFields (0.53)
function buildPluginTelemetryFields(name, marketplace, managedNames = null) {
  let scope = getTelemetryPluginScope(name, marketplace, managedNames),
    isAnthropicControlled =
      isKnownPluginSource(scope) || isKnownOfficialPluginName(name, marketplace) || _e(name, marketplace),
    f = marketplace === BUILTIN ? yPi(name) : void 0;
  return {
    plugin_id_hash: lx(name, marketplace),
    plugin_scope: Jtr(marketplace) ? fromEnum("directory") : fromEnum(scope),
    plugin_name_redacted: isAnthropicControlled
      ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name)
      : lit(THIRD_PARTY),
    marketplace_name_redacted:
      isAnthropicControlled && marketplace
        ? fromSanitizer_SANITIZER_OUTPUT_ONLY(marketplace)
        : lit(THIRD_PARTY),
    is_official_plugin: isAnthropicPluginSource(scope),
    ...(f !== void 0 && {
      plugin_name_previous: fromSanitizer_SANITIZER_OUTPUT_ONLY(f),
      plugin_id_hash_previous: lx(f, marketplace),
    }),
  };
}
/**
 * 插件事件字段：_PROTO_plugin_name、_PROTO_marketplace_name（特权列）与可公开的插件归属字段。
 */
//@ chunk-csq9ftr9.js:10797-10914 layout
function buildPluginEventFields(e, n, r = null) {
  let s = T(e, n) ?? n;
  return {
    _PROTO_plugin_name: e,
    ...(s && { _PROTO_marketplace_name: s }),
    ...buildPluginTelemetryFields(e, n, r),
  };
}
//@ chunk-csq9ftr9.js:10914-10971 layout
function sanitizePluginIdForAnalytics(e) {
  if (e === void 0 || !isServerPluginId(e)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
//@ chunk-csq9ftr9.js:10971-11027 layout
function sanitizeSkillIdForAnalytics(e) {
  if (e === void 0 || !x(e)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
//@ chunk-csq9ftr9.js:11027-11051 layout
var GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
//@ chunk-csq9ftr9.js:11051-11151 layout
function getPluginVersionSha(e, n) {
  if (e === void 0 || !isOfficialOrCommunityMarketplace(n)) return;
  let lower = e.toLowerCase();
  return GIT_SHA_PATTERN.test(lower) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(lower) : void 0;
}
//@ chunk-csq9ftr9.js:11151-11243 layout
function buildPluginVersionShaField(e, n) {
  let r = getPluginVersionSha(n, parsePluginIdentifier_2(e).marketplace);
  return r !== void 0 ? { plugin_version_sha: r } : {};
}
//@ chunk-csq9ftr9.js:11243-11317 layout
function buildPluginSourceFields(e) {
  return e.pluginSource !== void 0 ? buildPluginEventFieldsFromId(e.pluginSource, af()) : {};
}
//@ chunk-csq9ftr9.js:11317-11399 layout
function logPluginFolderShadowed(e, n, r) {
  logEvent("tengu_plugin_folder_shadowed", { component: fromEnum(r), ...buildPluginEventFields(e, n) });
}
//@ chunk-csq9ftr9.js:11399-11578 layout
function logPluginRenamed(e, n, r) {
  logEvent("tengu_plugin_renamed", {
    outcome: fromEnum(r.kind),
    chain_depth: r.kind === "unresolved" ? void 0 : r.chainDepth,
    reason: r.kind === "unresolved" ? fromEnum(r.reason) : void 0,
    ...buildPluginEventFields(e, n),
  });
}
//@ chunk-csq9ftr9.js:11578-11923 layout
function groupPluginSourcesByName(e, n, r) {
  let s = new Map();
  for (let { name: g, source: source } of n) {
    let m = s.get(g);
    if (m === void 0) s.set(g, [source]);
    else m.push(source);
  }
  for (let [g, f] of s) {
    let m = uniq(f);
    if (m.length < 2) continue;
    logEvent("tengu_plugin_name_collision", {
      item_type: fromEnum(e),
      _PROTO_skill_name: g,
      item_name_hash: lx(g),
      source_count: m.length,
      sources: fromEnumArr(m),
      ...(r.resolves && { winner_source: fromEnumOpt(f.at(-1)) }),
    });
  }
}
//@ chunk-csq9ftr9.js:11923-11994 layout
function buildPluginEventFieldsFromId(e, n = null) {
  let { name: r, marketplace: marketplace } = parsePluginIdentifier_2(e);
  return buildPluginEventFields(r, marketplace, n);
}
//@ chunk-csq9ftr9.js:11994-12151 layout
function buildPluginInfoFields(e, n = af()) {
  let { marketplace: marketplace } = parsePluginIdentifier_2(e.repository),
    s = sanitizePluginIdForAnalytics(e.serverPluginId);
  return {
    ...buildPluginEventFields(e.pluginManifest.name, marketplace, n),
    ...(s !== void 0 && { server_plugin_id: s }),
  };
}
//@ chunk-csq9ftr9.js:12151-12351 layout
function buildServerAttributionFields(e, n) {
  let r = sanitizeSkillIdForAnalytics(e.serverAttribution?.skillId),
    s = sanitizePluginIdForAnalytics(e.serverAttribution?.pluginId);
  return {
    ...(e.pluginInfo && buildPluginInfoFields(e.pluginInfo, n)),
    ...(r !== void 0 && { skill_id: r }),
    ...(s !== void 0 && { server_plugin_id: s }),
  };
}
//@ chunk-csq9ftr9.js:12351-12476 fingerprint = buildPluginCommandTelemetryFields (0.754)
function buildPluginCommandTelemetryFields(pluginInfo, managedNames) {
  for (let r of pluginInfo)
    try {
      let { marketplace: marketplace } = parsePluginIdentifier_2(r.repository);
      if (isAnthropicPluginSource(getTelemetryPluginScope(r.name, marketplace, managedNames)))
        Xki(r.name, marketplace);
    } catch (error) {
      logError(error);
    }
}
//@ chunk-csq9ftr9.js:12476-12528 layout
function ye(e) {
  let n = marketplaceSuffix(e);
  return n === void 0 || isOfficialMarketplace(n);
}
//@ chunk-csq9ftr9.js:12528-12585 layout
function De(e) {
  return e.isBuiltin === !0 || ye(e.repository);
}
//@ chunk-csq9ftr9.js:12585-12704 layout = getCommandId (0.912)
function getCommandId(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.loadedFrom === "plugin" &&
    cmd.pluginInfo !== void 0 &&
    !ye(cmd.pluginInfo.repository)
  );
}
/**
 * 按插件仓库分组命令名。
 */
//@ chunk-csq9ftr9.js:12704-12881 layout
function groupCommandsByRepository(e) {
  let n = new Map();
  for (let r of e) {
    if (!getCommandId(r)) continue;
    let s = n.get(r.pluginInfo.repository);
    if (s) s.push(r.name);
    else n.set(r.pluginInfo.repository, [r.name]);
  }
  return n;
}
//@ chunk-csq9ftr9.js:12881-13052 layout
function buildPluginErrorFields(e, n) {
  if (e === null) return {};
  let r = e.get(n) ?? [];
  return {
    skill_name_hash_count: r.length,
    ...(r.length > 0 && {
      skill_name_hashes: fromSanitizer_SANITIZER_OUTPUT_ONLY(
        r
          .map((s) => hashPluginId(s))
          .sort()
          .join(","),
      ),
    }),
  };
}
//@ chunk-csq9ftr9.js:13052-14747 fingerprint = logPluginsEnabledForSession (0.483)
function logPluginsEnabledForSession(e, n, r, s, g) {
  let numStartups = getGlobalConfig().numStartups,
    now = Date.now(),
    _ = [],
    mapped = e.filter((d) => d.lspServers && Object.keys(d.lspServers).length > 0).map((d) => d.repository);
  if (mapped.length > 0) applyLspUsageGrace(mapped, g);
  for (let plugin of e) {
    let { marketplace: marketplace } = parsePluginIdentifier_2(plugin.repository),
      I = Qtr(plugin.repository);
    if (!I) _.push(plugin.repository);
    let { sessionsSinceLastUse: sessionsSinceLastUse, daysSinceLastUse: daysSinceLastUse } = I
        ? disuseStats(I, numStartups, now)
        : { sessionsSinceLastUse: 0, daysSinceLastUse: 0 },
      N = getTelemetryPluginScope(plugin.name, marketplace, n),
      L = getEnabledVia(plugin, n, r),
      D = (plugin.skillsPath ? 1 : 0) + (plugin.skillsPaths?.length ?? 0),
      M = (plugin.commandsPath ? 1 : 0) + (plugin.commandsPaths?.length ?? 0),
      O = (plugin.agentsPath ? 1 : 0) + (plugin.agentsPaths?.length ?? 0),
      w = sanitizePluginIdForAnalytics(plugin.serverPluginId),
      G = plugin.hooksConfig !== void 0 || plugin.modulePath !== void 0,
      V = mayLogPluginName(N);
    (logOTelEvent("plugin_loaded", {
      ...xYr(plugin.name, marketplace, V),
      ...(V && plugin.manifest.version && { "plugin.version": plugin.manifest.version }),
      "plugin.scope": N,
      enabled_via: L,
      plugin_id_hash: lx(plugin.name, marketplace),
      has_hooks: G,
      has_mcp: !plugin.skipMcpDiscovery && plugin.mcpServers !== void 0,
      host_owned_mcp: plugin.skipMcpDiscovery === !0,
      skill_path_count: D,
      command_path_count: M,
      agent_path_count: O,
      safe_mode: String(isSafeMode()),
    }),
      logEvent("tengu_plugin_enabled_for_session", {
        ...buildPluginEventFields(plugin.name, marketplace, n),
        ...(w !== void 0 && { server_plugin_id: w }),
        enabled_via: fromEnum(L),
        ...(plugin.installationPreference !== void 0 && {
          installation_preference: fromEnum(plugin.installationPreference),
        }),
        skill_path_count: D,
        command_path_count: M,
        agent_path_count: O,
        ...buildPluginErrorFields(De(plugin) ? null : s, plugin.repository),
        has_mcp: !plugin.skipMcpDiscovery && plugin.mcpServers !== void 0,
        host_owned_mcp: plugin.skipMcpDiscovery === !0,
        has_lsp: plugin.lspServers !== void 0,
        has_hooks: G,
        has_settings: plugin.settings !== void 0,
        sessions_since_last_use: sessionsSinceLastUse,
        days_since_last_use: daysSinceLastUse,
        safe_mode: isSafeMode(),
        ...(plugin.settings && { settings_keys: fromEnumArr(Object.keys(plugin.settings).filter(J)) }),
        ...(plugin.manifest.version && { version: sanitizeVersion(plugin.manifest.version) }),
        ...buildPluginVersionShaField(plugin.repository, plugin.gitCommitSha),
      }));
  }
  if (_.length > 0) seedPluginUsage(_, g);
}
//@ chunk-csq9ftr9.js:14747-14847 fingerprint = classifyPluginCommandError (0.783)
var PLUGIN_COMMAND_ERROR_KINDS = [
    "network",
    "not-found",
    "permission",
    "policy",
    "validation",
    "in-use",
    "unknown",
  ],
  we = new Set(PLUGIN_COMMAND_ERROR_KINDS);
//@ chunk-csq9ftr9.js:14847-14900 layout
function isPluginCommandErrorKind(e) {
  return typeof e === "string" && we.has(e);
}
//@ chunk-csq9ftr9.js:14900-15886 placement
function classifyPluginCommandError(e) {
  if (
    typeof e === "object" &&
    e !== null &&
    "pluginCommandErrorCategory" in e &&
    isPluginCommandErrorKind(e.pluginCommandErrorCategory)
  )
    return e.pluginCommandErrorCategory;
  let n = String(e?.message ?? e),
    r = getTelemetryMessage(e);
  if (typeof r === "string" && (COMMAND_SOURCE_ERRORS.has(r) || r.startsWith(Z_n))) return "policy";
  if (
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ECONNRESET|network|Could not resolve|Connection refused|timed out/i.test(
      n,
    )
  )
    return "network";
  if (/\b404\b|not found|does not exist|no such plugin/i.test(n)) return "not-found";
  if (/\b40[13]\b|EACCES|EPERM|permission denied|unauthorized/i.test(n)) return "permission";
  if (/blocked by your organization'?s policy|required by your organization/i.test(n)) return "policy";
  if (
    /(?:the command|it|nothing) was not run|nothing was run|command that installs it was not run|is ignored inside a Claude Code session|Command-sourced plugins are disabled|not supported on Windows yet/i.test(
      n,
    )
  )
    return "policy";
  if (/invalid|malformed|schema|validation|parse error/i.test(n)) return "validation";
  return "unknown";
}
//@ chunk-csq9ftr9.js:15886-15954 placement
function lYo(e) {
  let lower = e.toLowerCase();
  return RESERVED_MARKETPLACE_NAMES.has(lower)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(lower)
    : lit(THIRD_PARTY);
}
//@ chunk-csq9ftr9.js:15954-16545 placement
function logPluginLoadFailed(e, n, r) {
  for (let s of e) {
    let { name: g, marketplace: marketplace } = parsePluginIdentifier_2(s.source),
      m = "plugin" in s && s.plugin ? s.plugin : g;
    logEvent("tengu_plugin_load_failed", {
      error_category: fromEnum(s.type),
      cache_only: r?.cacheOnly ?? !1,
      ...("component" in s && { component: fromEnum(s.component) }),
      ...("errno" in s && { errno: sanitizeErrnoTokenForTelemetry(s.errno) }),
      ...{
        is_directory: Jtr(marketplace),
        removed_from_directory: "removedFromDirectory" in s && s.removedFromDirectory === !0,
      },
      ...buildPluginEventFields(m, marketplace, n),
      ...(s.type === "marketplace-load-failed" &&
        s.untrustedReservedName === !0 && {
          plugin_name_redacted: lit(THIRD_PARTY),
          marketplace_name_redacted: lYo(s.marketplace),
          plugin_scope: fromEnum("user-local"),
          is_official_plugin: !1,
        }),
    });
  }
}
//@ chunk-aepeg2w5.js:758887-758923 fingerprint = PLUGIN_ID_HASH_SALT (1)
var PLUGIN_ID_HASH_SALT = "claude-plugin-telemetry-v1";
//@ chunk-aepeg2w5.js:758923-758998 callgraph-fingerprint = hashPluginId (1)
function hashPluginId(e) {
  return createHash_4("sha256")
    .update(e + PLUGIN_ID_HASH_SALT)
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-d4eg9at2.js:34003-34142 fingerprint = logPluginLoadErrors (0.546)
function logPluginLoadErrors(s, o, i) {
  let { name: name, marketplace: marketplace } = parsePluginId(o);
  logEvent(s, {
    _PROTO_plugin_name: name,
    ...(marketplace && { _PROTO_marketplace_name: marketplace }),
    ...(i !== void 0 && { scope: i }),
  });
}
/**
 * 插件来源标记常量：inline、skills-dir、synced、builtin，以及 anthropic-skills@inline 组合名，用于插件/技能遥测。
 */
//@ chunk-dcmhvw5a.js:137274-137350 callgraph-fingerprint = BUILTIN_MARKETPLACE_NAME (0.364)
var INLINE_PLUGIN_MARKETPLACE = "inline",
  wOn = `${ANTHROPIC_SKILLS}@${INLINE_PLUGIN_MARKETPLACE}`,
  SKILLS_DIR = "skills-dir",
  SYNCED = "synced",
  BUILTIN = "builtin";

export {
  lx,
  BUILTIN,
  SYNCED,
  buildServerAttributionFields,
  classifyPluginCommandError,
  groupPluginSourcesByName,
  recordPluginUsage,
  buildPluginEventFields,
  INLINE_PLUGIN_MARKETPLACE,
  dpe,
  buildPluginVersionShaField,
  buildPluginEventFieldsFromId,
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  buildPluginSourceFields,
  hashPluginId,
  buildPluginCommandTelemetryFields,
  logPluginLoadFailed,
  logPluginsEnabledForSession,
  lri,
  SKILLS_DIR,
  removePluginUsage,
  seedPluginUsage,
  touchPluginUsage,
  getSkillPluginTelemetryFields,
  logPluginFolderShadowed,
  Z4o,
  logPluginRenamed,
  rri,
  ori,
  sri,
  getCommandId,
  groupCommandsByRepository,
  getEnabledVia,
  Qtr,
  eYo,
  disuseStats,
  r$e,
  buildPluginTelemetryFields,
  iri,
  wOn,
  logPluginLoadErrors,
  xYr,
  mayLogPluginName,
  lYo,
};
