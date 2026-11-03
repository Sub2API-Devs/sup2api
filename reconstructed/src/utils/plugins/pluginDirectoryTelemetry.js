/**
 * utils/plugins/pluginDirectoryTelemetry.ts
 *
 * 2.1.316 新增：插件目录遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9qwbw2qr.js (12)
 * attribution: placement 12
 */
import { parsePluginGitUrl } from "./gitUrl.js";
import { toError } from "../errors.js";
import { Jtr, kk } from "./commandSourceErrors.js";
import { parsePluginIdentifier_2 } from "./pluginIdentifier.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { buildPluginTelemetryFields, buildPluginEventFieldsFromId } from "../telemetry/pluginTelemetry.js";

//@ chunk-9qwbw2qr.js:5013-5074 placement
function krt(e) {
  try {
    return (parsePluginGitUrl(e), null);
  } catch (error) {
    return toError(error);
  }
}
//@ chunk-9qwbw2qr.js:5074-5111 placement
function ckt(e) {
  return krt(e) === null;
}
//@ chunk-9qwbw2qr.js:5111-5156 placement
function YX(e) {
  return Jtr(parsePluginIdentifier_2(e).marketplace);
}
/**
 * 插件安装事件的 surface/replaced/is_directory 字段。
 */
//@ chunk-9qwbw2qr.js:5156-5272 placement
function directoryInstallFields({ pluginId: pluginId, surface: surface, replaced: replaced }) {
  return {
    ...(surface !== void 0 && { surface: fromEnum(surface) }),
    replaced: replaced,
    is_directory: YX(pluginId),
  };
}
/**
 * 上报插件目录 catalog 加载事件（页数、条目数、各类跳过数、耗时、缓存年龄等）， 再按 outcome 记 feature 状态：fresh_cache/walked 为 ok，陈旧/退避类为 sad，不完整/重复 id 为 bad，refused 按拒绝原因区分。
 */
//@ chunk-9qwbw2qr.js:5272-6527 placement
function logDirectoryCatalogLoad(e) {
  switch (
    (logEvent("tengu_plugin_directory_catalog_load", {
      outcome: fromEnum(e.outcome),
      trigger: fromEnum(e.trigger),
      pages: e.pages,
      listing_count: e.listingCount,
      installable_count: e.tally.installable,
      skipped_unparseable: e.tally.unparseable,
      skipped_other_surface: e.tally.skipped.other_surface,
      skipped_no_pin: e.tally.skipped.no_pin,
      skipped_bad_url: e.tally.skipped.bad_url,
      skipped_bad_path: e.tally.skipped.bad_path,
      name_clashes: e.tally.nameClashes,
      ...(e.namesRepaired !== void 0 && { names_repaired: e.namesRepaired }),
      duration_ms: e.durationMs,
      ...(e.cacheAgeMin !== void 0 && { cache_age_min: e.cacheAgeMin }),
      ...(e.outcome === "stale_failed" && { incomplete_walk: e.incompleteWalk }),
      ...(e.outcome === "refused" && { refusal: fromEnum(e.refusal) }),
    }),
    e.outcome)
  ) {
    case "fresh_cache":
    case "walked":
      logFeatureOk("plugin_directory_catalog");
      return;
    case "walked_names_only":
    case "walked_not_written":
    case "stale_failed":
    case "stale_empty":
    case "stale_duplicate_id":
    case "backoff":
      logFeatureSad("plugin_directory_catalog", e.outcome);
      return;
    case "incomplete":
    case "duplicate_id":
    case "backoff_cold":
      logFeatureBad("plugin_directory_catalog", e.outcome);
      return;
    case "refused":
      switch (e.refusal) {
        case "not-served":
        case "failed":
          logFeatureBad("plugin_directory_catalog", e.refusal);
          return;
        case "policy":
          if (!e.blockedByOrganization) logFeatureSad("plugin_directory_catalog", "policy_not_loaded");
          return;
      }
  }
}
/**
 * 记 tengu_plugin_discover_shown（发现页展示统计）。
 */
//@ chunk-9qwbw2qr.js:6527-6789 placement
function logDiscoverShown({
  directoryRows: directoryRows,
  totalRows: totalRows,
  foldedRows: foldedRows,
  loadMs: loadMs,
  entry: entry,
  directoryState: directoryState,
  knownMarketplaceCount: knownMarketplaceCount,
}) {
  logEvent("tengu_plugin_discover_shown", {
    directory_rows: directoryRows,
    total_rows: totalRows,
    folded_rows: foldedRows,
    load_ms: loadMs,
    entry: fromEnum(entry),
    directory_state: fromEnum(directoryState),
    known_marketplace_count: knownMarketplaceCount,
  });
}
/**
 * 记录插件从一个市场切换到另一个：bad 直接记 feature bad；主切换按结果记 sad/ok； 再上报 tengu_plugin_marketplace_switched（作用域变化、数据目录迁移、钉住变化、替换数及前后插件的脱敏标识）。
 */
//@ chunk-9qwbw2qr.js:6789-7565 placement
function logMarketplaceSwitch({
  fromPluginId: fromPluginId,
  toPluginId: toPluginId,
  surface: surface,
  managedNames: managedNames,
  result: s,
}) {
  {
    let y = {
      surface: fromEnum(surface),
      from_is_directory: YX(fromPluginId),
      to_is_directory: YX(toPluginId),
    };
    if (s.outcome === "bad") {
      logFeatureBad("plugin_directory_switch", s.code, y);
      return;
    }
    if (s.isPrimary)
      if (s.outcome === "sad") logFeatureSad("plugin_directory_switch", s.code, y);
      else logFeatureOk("plugin_directory_switch", y);
    let l = parsePluginIdentifier_2(fromPluginId),
      h = buildPluginTelemetryFields(l.name, l.marketplace, managedNames);
    logEvent("tengu_plugin_marketplace_switched", {
      ...y,
      scope_changed: s.scopeChanged,
      stayed_disabled: s.stayedDisabled,
      data_dir_carried: s.dataDirCarried,
      pin_changed: s.pinChanged,
      replaced_count: s.replacedCount,
      is_primary: s.isPrimary,
      from_plugin_id_hash: h.plugin_id_hash,
      from_plugin_scope: h.plugin_scope,
      from_plugin_name_redacted: h.plugin_name_redacted,
      from_marketplace_name_redacted: h.marketplace_name_redacted,
      ...buildPluginEventFieldsFromId(toPluginId, managedNames),
    });
  }
}
/**
 * 记插件目录开关（成功时另记 tengu_plugin_directory_toggled）。
 */
//@ chunk-9qwbw2qr.js:7565-7768 placement
function logDirectoryToggle({ enabled: enabled, surface: surface, failure: failure }) {
  {
    let n = { enabled: enabled, surface: fromEnum(surface) };
    if (failure !== void 0) {
      logFeatureBad("plugin_directory_toggle", failure, n);
      return;
    }
    (logFeatureOk("plugin_directory_toggle", n), logEvent("tengu_plugin_directory_toggled", n));
  }
}
/**
 * 每种原因只记一次 tengu_plugin_directory_blocked。
 */
//@ chunk-9qwbw2qr.js:7768-7899 placement
function logDirectoryBlockedOnce(e) {
  {
    let i = kk();
    if (i.blockedLogged.has(e)) return;
    (i.blockedLogged.add(e), logEvent("tengu_plugin_directory_blocked", { by: fromEnum(e) }));
  }
}
/**
 * 记插件目录条目被查看。
 */
//@ chunk-9qwbw2qr.js:7899-8086 placement
function logDirectoryListingViewed({ pluginId: pluginId, surface: surface, resultIndex: resultIndex }) {
  {
    if (!YX(pluginId)) return;
    let { name: n, marketplace: marketplace } = parsePluginIdentifier_2(pluginId);
    logEvent("tengu_plugin_directory_listing_viewed", {
      ...buildPluginTelemetryFields(n, marketplace),
      surface: fromEnum(surface),
      result_index: resultIndex,
    });
  }
}
/**
 * 记插件目录链接被打开。
 */
//@ chunk-9qwbw2qr.js:8086-8244 placement
function logDirectoryLinkOpened({ pluginId: pluginId, linkKind: linkKind }) {
  {
    if (!YX(pluginId)) return;
    let { name: r, marketplace: marketplace } = parsePluginIdentifier_2(pluginId);
    logEvent("tengu_plugin_directory_link_opened", {
      ...buildPluginTelemetryFields(r, marketplace),
      link_kind: fromEnum(linkKind),
    });
  }
}
/**
 * 记 tengu_marketplace_add_failed（来源类别归并）。
 */
//@ chunk-9qwbw2qr.js:8244-8449 placement
function logMarketplaceAddFailed({ reason: reason, sourceKind: sourceKind, surface: surface }) {
  logEvent("tengu_marketplace_add_failed", {
    reason: fromEnum(reason),
    source_kind: fromEnum(
      sourceKind === "github" || sourceKind === "git" || sourceKind === "url"
        ? sourceKind
        : sourceKind === "file" || sourceKind === "directory"
          ? "local"
          : "other",
    ),
    surface: fromEnum(surface),
  });
}

export {
  YX,
  directoryInstallFields,
  logMarketplaceSwitch,
  logMarketplaceAddFailed,
  logDirectoryBlockedOnce,
  logDirectoryToggle,
  krt,
  ckt,
  logDirectoryCatalogLoad,
  logDirectoryLinkOpened,
  logDirectoryListingViewed,
  logDiscoverShown,
};
