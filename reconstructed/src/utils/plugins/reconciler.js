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
import { Zb } from "./marketplaceSources.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getDeclaredMarketplaces,
  loadKnownMarketplacesWithDeclared,
  ozt,
  HWo,
  addMarketplaceSource,
  syncDeclaredAutoUpdateToJson,
} from "./marketplaceManager.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { getOriginalCwd, getProjectConfigRoot } from "../../bootstrap/state.js";
import { v9s, dgn } from "./marketplaceAutoUpdate.js";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  reservedNameMessage,
} from "./officialMarketplaceNames.js";
import { hasClaudeAiReservedPrefix } from "./pluginDirectories.js";
import { CLAUDEAI_MARKETPLACE_PREFIX } from "./schemas.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { GD } from "../settings/settingsStorage.js";

/**
 * 比较 settings 声明的市场（extraKnownMarketplaces）与已落盘的 known_marketplaces：返回 缺失、来源变化、已一致 三组。
 */
//@ chunk-rrq1mnv6.js:5312-5627 fingerprint = diffMarketplaces (1)
function diffMarketplaces(declared, materialized, opts) {
  let g = [],
    o = [],
    n = [];
  for (let [u, f] of Object.entries(declared)) {
    let S = Zb(materialized, u),
      normalizedIntent = normalizeSource(f.source, opts?.projectRoot);
    if (!S) g.push(u);
    else if (f.sourceIsFallback) n.push(u);
    else if (!En(normalizedIntent, S.source))
      o.push({ name: u, declaredSource: normalizedIntent, materializedSource: S.source });
    else n.push(u);
  }
  return { missing: g, sourceChanged: o, upToDate: n };
}
/**
 * 市场对账：对缺失或来源变化的声明市场执行 addMarketplaceSource（安装/更新），返回 installed/updated/failed/upToDate/skipped。启动与 headless 安装时调用。
 */
//@ chunk-rrq1mnv6.js:5627-7892 fingerprint = reconcileMarketplaces (0.726)
async function reconcileMarketplaces(opts) {
  let declared = getDeclaredMarketplaces();
  if (Object.keys(declared).length === 0)
    return { installed: [], updated: [], failed: [], upToDate: [], skipped: [] };
  let s = opts?.storageV5,
    materialized;
  try {
    materialized = await loadKnownMarketplacesWithDeclared(s);
  } catch (error) {
    (logForDebugging(
      `reconciler: failed to load known_marketplaces.json, treating as empty: ${errorMessage(error)}`,
      { level: "error" },
    ),
      (materialized = {}));
  }
  let diff = diffMarketplaces(declared, materialized, { projectRoot: getOriginalCwd() }),
    work = [
      ...diff.missing.map((name) => ({
        name: name,
        source: normalizeSource(declared[name].source),
        action: "install",
      })),
      ...diff.sourceChanged.map(({ name: i, declaredSource: declaredSource }) => ({
        name: i,
        source: declaredSource,
        action: "update",
      })),
    ],
    u = [],
    f = [],
    S = [];
  for (let item of work) {
    if (v9s(item.name)) {
      (logForDebugging(
        `[reconcile] '${item.name}' is the built-in ${OFFICIAL_MARKETPLACE_DISPLAY}'s name: a settings entry under it adds no marketplace. Only an autoUpdate from ${dgn} counts, and only while the Directory is turned on.`,
      ),
        u.push(item.name));
      continue;
    }
    let p = ozt(item.name);
    if (isOfficialMarketplaceSpelling(item.name) || p !== void 0) {
      let y = `${p === void 0 ? reservedNameMessage(item.name) : HWo(item.name, p)} This marketplace was not added. Remove it from extraKnownMarketplaces in settings.`;
      (logForDebugging(`[reconcile] '${item.name}' ${y}`, { level: "warn" }),
        S.push({ name: item.name, error: y }),
        opts?.onProgress?.({ type: "failed", name: item.name, error: y }));
      continue;
    }
    if (opts?.skip?.(item.name, item.source)) {
      u.push(item.name);
      continue;
    }
    if (hasClaudeAiReservedPrefix(item.name)) {
      let P = `not materialized: names starting with "${CLAUDEAI_MARKETPLACE_PREFIX}" are reserved for marketplaces hosted on claude.ai \u2014 rename the declaration`;
      (logForDebugging(`[reconcile] '${item.name}' ${P}`, { level: "warn" }),
        S.push({ name: item.name, error: P }),
        opts?.onProgress?.({ type: "failed", name: item.name, error: P }));
      continue;
    }
    if (
      item.action === "update" &&
      isLocalMarketplaceSource(item.source) &&
      !(await pathExists(item.source.path))
    ) {
      (logForDebugging(`[reconcile] '${item.name}' declared path does not exist; keeping materialized entry`),
        u.push(item.name));
      continue;
    }
    f.push(item);
  }
  let m = [],
    R = [];
  if (f.length > 0) {
    logForDebugging(
      `[reconcile] ${f.length} marketplace(s): ${f.map((i) => `${i.name}(${i.action})`).join(", ")}`,
    );
    for (let i = 0; i < f.length; i++) {
      let { name: name, source: source, action: action } = f[i];
      opts?.onProgress?.({ type: "installing", name: name, action: action, index: i + 1, total: f.length });
      try {
        let I = await addMarketplaceSource(source, void 0, s, name);
        if (action === "install") m.push(name);
        else R.push(name);
        opts?.onProgress?.({ type: "installed", name: name, alreadyMaterialized: I.alreadyMaterialized });
      } catch (error) {
        let error_2 = errorMessage(error);
        (S.push({ name: name, error: error_2 }),
          opts?.onProgress?.({ type: "failed", name: name, error: error_2 }),
          logForDebugging(`[reconcile] failed to ${action} marketplace '${name}': ${error_2}`, {
            level: "error",
          }));
      }
    }
  }
  return (
    await syncDeclaredAutoUpdateToJson(s),
    { installed: m, updated: R, failed: S, upToDate: diff.upToDate, skipped: u }
  );
}
//@ chunk-rrq1mnv6.js:7892-8056 sole-consumer = normalizeSource (1)
function normalizeSource(source, projectRoot) {
  if ((source.source === "directory" || source.source === "file") && !isAbsolute(source.path)) {
    let s = getProjectConfigRoot(),
      base = s ?? projectRoot ?? getOriginalCwd(),
      o = s === null ? GD(base) : null;
    return { ...source, path: resolve(o ?? base, source.path) };
  }
  return source;
}
/**
 * 来源是否为本地（file 或 directory）。旧版名 normalizeSource 名不副实，见 lead 建议。
 */
//@ chunk-dcmhvw5a.js:125770-125834 fingerprint = normalizeSource (1)
function isLocalMarketplaceSource(e) {
  return e.source === "file" || e.source === "directory";
}

export { diffMarketplaces, reconcileMarketplaces, isLocalMarketplaceSource };
