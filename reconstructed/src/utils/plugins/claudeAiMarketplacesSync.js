/**
 * utils/plugins/claudeAiMarketplacesSync.ts
 *
 * 2.1.316 新增：claude.ai 账号插件市场同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (4)
 * attribution: placement 4
 */
import { getAccountPluginsSyncEnabled } from "../../bootstrap/state.js";
import { wie, Hkt } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import {
  readClaudeAiMarketplaceRegistry,
  ensureClaudeAiMarketplace,
  F$o,
  readAccountMarketplacesCache,
  fetchClaudeAiMarketplaceRows,
  syncAccountMarketplaceScopes,
  yqs,
  B$o,
} from "./claudeAiMarketplaces.js";
import { getInstalledPluginsAsync } from "./installedPluginsManager.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { getSyncBucket, Tit, m5t } from "./syncedItems.js";
import { Bue, ufn } from "../claudeAiSync/pluginsSync.js";
import { getStrictKnownMarketplaces } from "./marketplacePolicy.js";
import { shouldAllowManagedPermissionRulesOnly } from "../permissions/permissionsLoader.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-3wek6r2k.js:74928-75063 placement
class MarketplacesSyncFailed extends Error {
  code;
  constructor(e) {
    super("claude.ai marketplaces sync failed");
    this.code = e;
    this.name = "MarketplacesSyncFailed";
  }
}
/**
 * 把 claude.ai 账号插件市场同步到本地（开关与条件满足时），带遥测。
 */
//@ chunk-3wek6r2k.js:75063-75306 placement
async function syncClaudeAiMarketplaces(e, o, n) {
  try {
    if (!getAccountPluginsSyncEnabled() || !wie() || Hkt()) return !1;
    let r = syncAccountMarketplaces(o, n);
    try {
      return await withFeatureTelemetry(
        "claudeai_marketplaces_sync",
        () => resolveAccountMarketplaceBucket(e, o),
        (u) => (u instanceof MarketplacesSyncFailed ? u.code : "unexpected"),
      );
    } finally {
      await r;
    }
  } catch (error) {
    if (!(error instanceof MarketplacesSyncFailed)) logError(error);
    return !1;
  }
}
//@ chunk-3wek6r2k.js:75306-75714 placement
async function syncAccountMarketplaces(e, o) {
  try {
    let entries = Object.entries(await readClaudeAiMarketplaceRegistry());
    if (entries.length === 0) return;
    let r = await getInstalledPluginsAsync(o),
      u = new Set(
        Object.entries(r.plugins).flatMap(([h, S]) => (S.length > 0 ? [marketplaceSuffix(h)] : [])),
      ),
      filtered = entries.filter(([h]) => u.has(h));
    if (filtered.length === 0) return;
    (logForDiagnosticsNoPII("info", "claudeai_catalog_background_refresh", { count: filtered.length }),
      await Promise.all(
        filtered.map(([h, S]) =>
          ensureClaudeAiMarketplace(h, S.source, { mode: "refresh", credentials: e, isBackground: !0 }),
        ),
      ));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-3wek6r2k.js:75714-76896 placement
async function resolveAccountMarketplaceBucket(e, o) {
  let n = await getSyncBucket(o);
  if (n === null) throw new MarketplacesSyncFailed("bucket_unresolved");
  let r = Bue(n),
    u = Tit(n) ?? "";
  try {
    await ufn(e, n);
  } catch {
    throw new MarketplacesSyncFailed("root_refused");
  }
  logForDiagnosticsNoPII("info", "marketplaces_sync_starting");
  let of = F$o.of(e.host),
    h = await readAccountMarketplacesCache(r),
    S =
      (getStrictKnownMarketplaces() !== null || shouldAllowManagedPermissionRulesOnly()) &&
      Object.keys(await readClaudeAiMarketplaceRegistry()).length > 0,
    y = await fetchClaudeAiMarketplaceRows({ etag: S ? void 0 : h?.etag, credentials: o });
  switch (y.status) {
    case "ok": {
      if (y.dropped > 0)
        logForDiagnosticsNoPII("warn", "marketplaces_sync_rows_dropped", { count: y.dropped });
      let M = !0;
      try {
        await syncAccountMarketplaceScopes(y.rows, u);
      } catch (error) {
        ((M = !1),
          logForDiagnosticsNoPII("warn", "marketplaces_sync_scope_sync_failed"),
          logForDebugging(
            `claude.ai marketplaces: could not re-derive added marketplaces' scopes: ${errorMessage(error)}`,
            { level: "warn" },
          ));
      }
      let E = M ? y.etag : void 0,
        w = h === null || h.etag !== E || E === void 0;
      if (w) (await yqs(r, { etag: E, rows: y.rows }), of.invalidate());
      return (
        logForDiagnosticsNoPII("info", "marketplaces_sync_complete", { count: y.rows.length, changed: w }),
        w
      );
    }
    case "not_modified":
      if ((logForDiagnosticsNoPII("info", "marketplaces_sync_not_modified"), h === null))
        throw new MarketplacesSyncFailed("not_modified_without_cache");
      return !1;
    case "denied":
      throw (
        logForDiagnosticsNoPII("warn", "marketplaces_sync_failed", { code: y.code }),
        await B$o(n, m5t),
        of.invalidate(),
        new MarketplacesSyncFailed(y.code)
      );
    case "skipped":
    case "failed":
      throw (
        logForDiagnosticsNoPII("warn", "marketplaces_sync_failed", { code: y.code }),
        new MarketplacesSyncFailed(y.code)
      );
  }
}

export { syncClaudeAiMarketplaces };
