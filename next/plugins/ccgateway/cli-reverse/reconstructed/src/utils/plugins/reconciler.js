/**
 * utils/plugins/reconciler.ts
 *
 * 市场对账：比较 settings 声明的 extraKnownMarketplaces 与 known_marketplaces，安装/更新缺失或变化的市场。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/reconciler.ts
 * pieces: chunk-dcmhvw5a.js (1), chunk-rrq1mnv6.js (3)
 * attribution: fingerprint 3, sole-consumer 1
 */
import { isAbsolute, resolve } from "path";
import { ownPropertyOrUndefined } from "./marketplaceSources.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getDeclaredMarketplaces,
  loadKnownMarketplacesWithDeclared,
  lookalikeReservedMarketplaceName,
  reservedMarketplaceSpellingMessage,
  addMarketplaceSource,
  syncDeclaredAutoUpdateToJson,
} from "./marketplaceManager.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { getOriginalCwd, getProjectConfigRoot } from "../../bootstrap/state.js";
import { hasDirectoryAutoUpdate, AUTOUPDATE_SETTING_SOURCES_TEXT } from "./marketplaceAutoUpdate.js";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  reservedNameMessage,
} from "./officialMarketplaceNames.js";
import { hasClaudeAiReservedPrefix } from "./pluginDirectories.js";
import { CLAUDEAI_MARKETPLACE_PREFIX } from "./schemas.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { storageRootFor } from "../settings/settingsStorage.js";

//@ chunk-dcmhvw5a.js:125770-125834 fingerprint (2.1.88 match: normalizeSource, 1)
/**
 * 来源是否为本地（file 或 directory）。旧版名 normalizeSource 名不副实，见 lead 建议。
 */
function isLocalMarketplaceSource(source) {
  return source.source === "file" || source.source === "directory";
}
//@ chunk-rrq1mnv6.js:5312-5627 fingerprint (2.1.88 match: diffMarketplaces, 1)
/**
 * 比较 settings 声明的市场（extraKnownMarketplaces）与已落盘的 known_marketplaces：返回 缺失、来源变化、已一致 三组。
 */
function diffMarketplaces(declared, materialized, opts) {
  let missing = [];
  let sourceChanged = [];
  let upToDate = [];
  for (let [name, intent] of Object.entries(declared)) {
    let state = ownPropertyOrUndefined(materialized, name);
    let normalizedIntent = normalizeSource(intent.source, opts?.projectRoot);
    if (!state) missing.push(name);
    else if (intent.sourceIsFallback) upToDate.push(name);
    else if (!import_sortedIndex_2(normalizedIntent, state.source))
      sourceChanged.push({
        name,
        declaredSource: normalizedIntent,
        materializedSource: state.source,
      });
    else upToDate.push(name);
  }
  return {
    missing,
    sourceChanged,
    upToDate,
  };
}
//@ chunk-rrq1mnv6.js:5627-7892 fingerprint (2.1.88 match: reconcileMarketplaces, 0.726)
/**
 * 市场对账：对缺失或来源变化的声明市场执行 addMarketplaceSource（安装/更新），返回 installed/updated/failed/upToDate/skipped。启动与 headless 安装时调用。
 */
async function reconcileMarketplaces(opts) {
  let declared = getDeclaredMarketplaces();
  if (Object.keys(declared).length === 0)
    return {
      installed: [],
      updated: [],
      failed: [],
      upToDate: [],
      skipped: [],
    };
  let storageV5 = opts?.storageV5;
  let materialized;
  try {
    materialized = await loadKnownMarketplacesWithDeclared(storageV5);
  } catch (e) {
    logForDebugging(
      `reconciler: failed to load known_marketplaces.json, treating as empty: ${errorMessage(e)}`,
      {
        level: "error",
      },
    );
    materialized = {};
  }
  let diff = diffMarketplaces(declared, materialized, {
    projectRoot: getOriginalCwd(),
  });
  let work = [
    ...diff.missing.map((name) => ({
      name,
      source: normalizeSource(declared[name].source),
      action: "install",
    })),
    ...diff.sourceChanged.map(({ name, declaredSource }) => ({
      name,
      source: declaredSource,
      action: "update",
    })),
  ];
  let skipped = [];
  let work_2 = [];
  let failed = [];
  for (let item of work) {
    if (hasDirectoryAutoUpdate(item.name)) {
      logForDebugging(
        `[reconcile] '${item.name}' is the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}'s name: a settings entry under it adds no marketplace. Only an autoUpdate from ${AUTOUPDATE_SETTING_SOURCES_TEXT} counts, and only while the Directory is turned on.`,
      );
      skipped.push(item.name);
      continue;
    }
    let lookalike = lookalikeReservedMarketplaceName(item.name);
    if (isOfficialMarketplaceSpelling(item.name) || lookalike !== undefined) {
      let message = `${lookalike === undefined ? reservedNameMessage(item.name) : reservedMarketplaceSpellingMessage(item.name, lookalike)} This marketplace was not added. Remove it from extraKnownMarketplaces in settings.`;
      logForDebugging(`[reconcile] '${item.name}' ${message}`, {
        level: "warn",
      });
      failed.push({
        name: item.name,
        error: message,
      });
      opts?.onProgress?.({
        type: "failed",
        name: item.name,
        error: message,
      });
      continue;
    }
    if (opts?.skip?.(item.name, item.source)) {
      skipped.push(item.name);
      continue;
    }
    if (hasClaudeAiReservedPrefix(item.name)) {
      let message = `not materialized: names starting with "${CLAUDEAI_MARKETPLACE_PREFIX}" are reserved for marketplaces hosted on claude.ai \u2014 rename the declaration`;
      logForDebugging(`[reconcile] '${item.name}' ${message}`, {
        level: "warn",
      });
      failed.push({
        name: item.name,
        error: message,
      });
      opts?.onProgress?.({
        type: "failed",
        name: item.name,
        error: message,
      });
      continue;
    }
    if (
      item.action === "update" &&
      isLocalMarketplaceSource(item.source) &&
      !(await pathExists(item.source.path))
    ) {
      logForDebugging(`[reconcile] '${item.name}' declared path does not exist; keeping materialized entry`);
      skipped.push(item.name);
      continue;
    }
    work_2.push(item);
  }
  let installed = [];
  let updated = [];
  if (work_2.length > 0) {
    logForDebugging(
      `[reconcile] ${work_2.length} marketplace(s): ${work_2.map((item) => `${item.name}(${item.action})`).join(", ")}`,
    );
    for (let index = 0; index < work_2.length; index++) {
      let { name, source, action } = work_2[index];
      opts?.onProgress?.({
        type: "installing",
        name,
        action,
        index: index + 1,
        total: work_2.length,
      });
      try {
        let result = await addMarketplaceSource(source, undefined, storageV5, name);
        if (action === "install") installed.push(name);
        else updated.push(name);
        opts?.onProgress?.({
          type: "installed",
          name,
          alreadyMaterialized: result.alreadyMaterialized,
        });
      } catch (e) {
        let error = errorMessage(e);
        failed.push({
          name,
          error,
        });
        opts?.onProgress?.({
          type: "failed",
          name,
          error,
        });
        logForDebugging(`[reconcile] failed to ${action} marketplace '${name}': ${error}`, {
          level: "error",
        });
      }
    }
  }
  await syncDeclaredAutoUpdateToJson(storageV5);
  return {
    installed,
    updated,
    failed,
    upToDate: diff.upToDate,
    skipped,
  };
}
//@ chunk-rrq1mnv6.js:7892-8056 sole-consumer (2.1.88 match: normalizeSource, 1)
function normalizeSource(source, projectRoot) {
  if ((source.source === "directory" || source.source === "file") && !isAbsolute(source.path)) {
    let projectConfigRoot = getProjectConfigRoot();
    let base = projectConfigRoot ?? projectRoot ?? getOriginalCwd();
    let canonicalRoot = projectConfigRoot === null ? storageRootFor(base) : null;
    return {
      ...source,
      path: resolve(canonicalRoot ?? base, source.path),
    };
  }
  return source;
}
export { diffMarketplaces, reconcileMarketplaces, isLocalMarketplaceSource };
