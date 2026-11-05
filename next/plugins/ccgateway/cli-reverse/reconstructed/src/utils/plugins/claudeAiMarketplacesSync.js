/**
 * utils/plugins/claudeAiMarketplacesSync.ts
 *
 * 2.1.316 新增：claude.ai 账号插件市场同步
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-hjswk319.js:74328-74463 placement
class MarketplacesSyncFailed extends Error {
  code;
  constructor(code) {
    super("claude.ai marketplaces sync failed");
    this.code = code;
    this.name = "MarketplacesSyncFailed";
  }
}
//@ chunk-hjswk319.js:74463-74706 placement
/**
 * 把 claude.ai 账号插件市场同步到本地（开关与条件满足时），带遥测。
 */
async function syncClaudeAiMarketplaces(rootSession, credentials, accountCredentials) {
  try {
    if (!getAccountPluginsSyncEnabled() || !syncSettingsEnabled() || isPluginsSyncEligible()) return false;
    let syncPromise = syncAccountMarketplaces(credentials, accountCredentials);
    try {
      return await withFeatureTelemetry(
        "claudeai_marketplaces_sync",
        () => resolveAccountMarketplaceBucket(rootSession, credentials),
        (failure) => (failure instanceof MarketplacesSyncFailed ? failure.code : "unexpected"),
      );
    } finally {
      await syncPromise;
    }
  } catch (error) {
    if (!(error instanceof MarketplacesSyncFailed)) logError(error);
    return false;
  }
}
//@ chunk-hjswk319.js:74706-75114 placement
async function syncAccountMarketplaces(credentials, accountCredentials) {
  try {
    let entries = Object.entries(await readClaudeAiMarketplaceRegistry());
    if (entries.length === 0) return;
    let installedPlugins = await getInstalledPluginsAsync(accountCredentials);
    let installedSuffixes = new Set(
      Object.entries(installedPlugins.plugins).flatMap(([key, value]) =>
        value.length > 0 ? [marketplaceSuffix(key)] : [],
      ),
    );
    let filtered = entries.filter(([suffix]) => installedSuffixes.has(suffix));
    if (filtered.length === 0) return;
    logForDiagnosticsNoPII("info", "claudeai_catalog_background_refresh", {
      count: filtered.length,
    });
    await Promise.all(
      filtered.map(([name, entry]) =>
        ensureClaudeAiMarketplace(name, entry.source, {
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
//@ chunk-hjswk319.js:75114-76296 placement
async function resolveAccountMarketplaceBucket(rootSession, credentials) {
  let syncBucket = await getSyncBucket(credentials);
  if (syncBucket === null) throw new MarketplacesSyncFailed("bucket_unresolved");
  let root = syncedPluginBucketDir(syncBucket);
  let organizationUuid = bucketOrg(syncBucket) ?? "";
  try {
    await ensurePluginsBucketRoot(rootSession, syncBucket);
  } catch {
    throw new MarketplacesSyncFailed("root_refused");
  }
  logForDiagnosticsNoPII("info", "marketplaces_sync_starting");
  let promiseCache = accountMarketplacesPromiseCache.of(rootSession.host);
  let accountMarketplacesCache = await readAccountMarketplacesCache(root);
  let skipEtag =
    (getStrictKnownMarketplaces() !== null || shouldAllowManagedPermissionRulesOnly()) &&
    Object.keys(await readClaudeAiMarketplaceRegistry()).length > 0;
  let claudeAiMarketplaceRows = await fetchClaudeAiMarketplaceRows({
    etag: skipEtag ? undefined : accountMarketplacesCache?.etag,
    credentials,
  });
  switch (claudeAiMarketplaceRows.status) {
    case "ok": {
      if (claudeAiMarketplaceRows.dropped > 0)
        logForDiagnosticsNoPII("warn", "marketplaces_sync_rows_dropped", {
          count: claudeAiMarketplaceRows.dropped,
        });
      let scopesSynced = true;
      try {
        await syncAccountMarketplaceScopes(claudeAiMarketplaceRows.rows, organizationUuid);
      } catch (error) {
        scopesSynced = false;
        logForDiagnosticsNoPII("warn", "marketplaces_sync_scope_sync_failed");
        logForDebugging(
          `claude.ai marketplaces: could not re-derive added marketplaces' scopes: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
      let etag = scopesSynced ? claudeAiMarketplaceRows.etag : undefined;
      let changed =
        accountMarketplacesCache === null || accountMarketplacesCache.etag !== etag || etag === undefined;
      if (changed) {
        await writeAccountMarketplacesCache(root, {
          etag,
          rows: claudeAiMarketplaceRows.rows,
        });
        promiseCache.invalidate();
      }
      logForDiagnosticsNoPII("info", "marketplaces_sync_complete", {
        count: claudeAiMarketplaceRows.rows.length,
        changed,
      });
      return changed;
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
      promiseCache.invalidate();
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
