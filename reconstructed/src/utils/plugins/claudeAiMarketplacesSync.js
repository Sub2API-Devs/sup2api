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
import {
  syncSettingsEnabled,
  isPluginsSyncEligible,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import {
  readClaudeAiMarketplaceRegistry,
  ensureClaudeAiMarketplace,
  accountMarketplacesPromiseCache,
  readAccountMarketplacesCache,
  fetchClaudeAiMarketplaceRows,
  syncAccountMarketplaceScopes,
  writeAccountMarketplacesCache,
  removeAccountSyncedFile,
} from "./claudeAiMarketplaces.js";
import { getInstalledPluginsAsync } from "./installedPluginsManager.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { getSyncBucket, bucketOrg, MARKETPLACES_JSON_FILE } from "./syncedItems.js";
import { syncedPluginBucketDir, ensurePluginsBucketRoot } from "../claudeAiSync/pluginsSync.js";
import { getStrictKnownMarketplaces } from "./marketplacePolicy.js";
import { shouldAllowManagedPermissionRulesOnly } from "../permissions/permissionsLoader.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-3wek6r2k.js:74928-75063 placement
class MarketplacesSyncFailed extends Error {
  code;
  constructor(code) {
    super("claude.ai marketplaces sync failed");
    this.code = code;
    this.name = "MarketplacesSyncFailed";
  }
}
//@ chunk-3wek6r2k.js:75063-75306 placement
/**
 * 把 claude.ai 账号插件市场同步到本地（开关与条件满足时），带遥测。
 */
async function syncClaudeAiMarketplaces(rootSession, credentials, n) {
  try {
    if (!getAccountPluginsSyncEnabled() || !syncSettingsEnabled() || isPluginsSyncEligible()) return false;
    let r = syncAccountMarketplaces(credentials, n);
    try {
      return await withFeatureTelemetry(
        "claudeai_marketplaces_sync",
        () => resolveAccountMarketplaceBucket(rootSession, credentials),
        (u) => (u instanceof MarketplacesSyncFailed ? u.code : "unexpected"),
      );
    } finally {
      await r;
    }
  } catch (error) {
    if (!(error instanceof MarketplacesSyncFailed)) logError(error);
    return false;
  }
}
//@ chunk-3wek6r2k.js:75306-75714 placement
async function syncAccountMarketplaces(credentials, o) {
  try {
    let entries = Object.entries(await readClaudeAiMarketplaceRegistry());
    if (entries.length === 0) return;
    let installedPlugins = await getInstalledPluginsAsync(o);
    let u = new Set(
      Object.entries(installedPlugins.plugins).flatMap(([key, value]) =>
        value.length > 0 ? [marketplaceSuffix(key)] : [],
      ),
    );
    let filtered = entries.filter(([h]) => u.has(h));
    if (filtered.length === 0) return;
    logForDiagnosticsNoPII("info", "claudeai_catalog_background_refresh", {
      count: filtered.length,
    });
    await Promise.all(
      filtered.map(([h, S]) =>
        ensureClaudeAiMarketplace(h, S.source, {
          mode: "refresh",
          credentials,
          isBackground: true,
        }),
      ),
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-3wek6r2k.js:75714-76896 placement
async function resolveAccountMarketplaceBucket(e, o) {
  let syncBucket = await getSyncBucket(o);
  if (syncBucket === null) throw new MarketplacesSyncFailed("bucket_unresolved");
  let r = syncedPluginBucketDir(syncBucket);
  let u = bucketOrg(syncBucket) ?? "";
  try {
    await ensurePluginsBucketRoot(e, syncBucket);
  } catch {
    throw new MarketplacesSyncFailed("root_refused");
  }
  logForDiagnosticsNoPII("info", "marketplaces_sync_starting");
  let p = accountMarketplacesPromiseCache.of(e.host);
  let accountMarketplacesCache = await readAccountMarketplacesCache(r);
  let S =
    (getStrictKnownMarketplaces() !== null || shouldAllowManagedPermissionRulesOnly()) &&
    Object.keys(await readClaudeAiMarketplaceRegistry()).length > 0;
  let claudeAiMarketplaceRows = await fetchClaudeAiMarketplaceRows({
    etag: S ? undefined : accountMarketplacesCache?.etag,
    credentials: o,
  });
  switch (claudeAiMarketplaceRows.status) {
    case "ok": {
      if (claudeAiMarketplaceRows.dropped > 0)
        logForDiagnosticsNoPII("warn", "marketplaces_sync_rows_dropped", {
          count: claudeAiMarketplaceRows.dropped,
        });
      let M = true;
      try {
        await syncAccountMarketplaceScopes(claudeAiMarketplaceRows.rows, u);
      } catch (error) {
        M = false;
        logForDiagnosticsNoPII("warn", "marketplaces_sync_scope_sync_failed");
        logForDebugging(
          `claude.ai marketplaces: could not re-derive added marketplaces' scopes: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
      let etag = M ? claudeAiMarketplaceRows.etag : undefined;
      let w =
        accountMarketplacesCache === null || accountMarketplacesCache.etag !== etag || etag === undefined;
      if (w) {
        await writeAccountMarketplacesCache(r, {
          etag,
          rows: claudeAiMarketplaceRows.rows,
        });
        p.invalidate();
      }
      logForDiagnosticsNoPII("info", "marketplaces_sync_complete", {
        count: claudeAiMarketplaceRows.rows.length,
        changed: w,
      });
      return w;
    }
    case "not_modified":
      logForDiagnosticsNoPII("info", "marketplaces_sync_not_modified");
      if (accountMarketplacesCache === null) throw new MarketplacesSyncFailed("not_modified_without_cache");
      return false;
    case "denied":
      logForDiagnosticsNoPII("warn", "marketplaces_sync_failed", {
        code: claudeAiMarketplaceRows.code,
      });
      await removeAccountSyncedFile(syncBucket, MARKETPLACES_JSON_FILE);
      p.invalidate();
      throw new MarketplacesSyncFailed(claudeAiMarketplaceRows.code);
    case "skipped":
    case "failed":
      logForDiagnosticsNoPII("warn", "marketplaces_sync_failed", {
        code: claudeAiMarketplaceRows.code,
      });
      throw new MarketplacesSyncFailed(claudeAiMarketplaceRows.code);
  }
}
export { syncClaudeAiMarketplaces };
