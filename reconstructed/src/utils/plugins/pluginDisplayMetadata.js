/**
 * utils/plugins/pluginDisplayMetadata.ts
 *
 * 2.1.316 新增：插件展示元数据
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ca06bv0t.js (28)
 * attribution: placement 28
 */
import { join } from "path";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  isSameFoldedName,
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
} from "./officialMarketplaceNames.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { printableName, printableLabel } from "../printableName.js";
import { isAsciiImpersonatingOfficialName, isRelativeSourcePath } from "./schemas.js";
import {
  stripInvisibleKeepEmoji,
  LEADING_INVISIBLE_TEXT_RE,
  cleanOptionalText_2,
} from "../settings/marketplaceSettingsAliases.js";
import { tryUnwrapTextPayload, seedDirFor, getPluginByIdCacheOnly } from "./marketplaceManager.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { resolvePluginEntryPath } from "./localMarketplacePaths.js";
import { formatPluginId } from "./marketplaceHelpers.js";
import { isDirectoryOrFalse, mcpAuthCacheContent } from "./safeFileRead.js";
import { validatePluginManifest } from "./pluginManifestRead.js";
import { jsonParse } from "../slowOperations.js";
import { stripBom } from "../json.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getOwn } from "../objectSafety.js";
import { isTrueOrTrueString } from "./pluginConfigEnv.js";
import { semanticBoolean } from "../semanticBoolean.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import { isReviewerMarkedEntry } from "./commandSourceErrors.js";
import { isOfficialMarketplaceName_3, parsePluginIdentifier } from "./pluginIdentifier.js";
import { isOfficialFamilySameSource } from "./installResultMessages.js";
import { uniq } from "../collections.js";
import { getInstalledPlugins, isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { isGithubDotCom } from "../git/githubUrl.js";

//@ chunk-ca06bv0t.js:1586-1638 placement
var PRINTABLE_NAME_RE = /^[\x21-\x7e]+$/;
var PLUGIN_NAME_FIELD_RE = /^[A-Za-z0-9._-]{1,64}$/;
//@ chunk-ca06bv0t.js:1638-1684 placement
function displayMarketplaceName(r) {
  return OFFICIAL_MARKETPLACE_DISPLAY === "" || isValidPluginDisplayName(r, PRINTABLE_NAME_RE)
    ? r
    : printableDisplayName(r);
}
//@ chunk-ca06bv0t.js:1684-1753 placement
function escapedDisplayText(r) {
  if (isValidPluginDisplayName(r, PLUGIN_NAME_FIELD_RE)) return r;
  return escapeXml(OFFICIAL_MARKETPLACE_DISPLAY === "" ? printableName(r, 64) : printableDisplayName(r));
}
//@ chunk-ca06bv0t.js:1753-1791 placement
function displayTextOrRaw(r) {
  return isValidPluginDisplayName(r, PLUGIN_NAME_FIELD_RE) ? r : printableDisplayName(r);
}
//@ chunk-ca06bv0t.js:1791-1848 placement
function isValidPluginDisplayName(r, n) {
  return (
    n.test(r) &&
    !isAsciiImpersonatingOfficialName(r) &&
    !isSameFoldedName(OFFICIAL_MARKETPLACE_DISPLAY, cleanDisplayNameText(r))
  );
}
//@ chunk-ca06bv0t.js:1848-1902 placement
function printableDisplayName(r) {
  return printableLabel(printableName(cleanDisplayNameText(r), 64)) || "\u201C\u201D";
}
//@ chunk-ca06bv0t.js:1902-1956 placement
function cleanDisplayNameText(r) {
  return stripInvisibleKeepEmoji(r).replace(LEADING_INVISIBLE_TEXT_RE, "").trimEnd();
}
//@ chunk-ca06bv0t.js:1985-2172 placement
async function pluginInstallPath(r, n, knownMarketplacesWithDeclared, storageV5) {
  let installLocation = Object.hasOwn(knownMarketplacesWithDeclared, r)
    ? knownMarketplacesWithDeclared[r]?.installLocation
    : undefined;
  if (installLocation === undefined) return n;
  let f;
  try {
    f = tryUnwrapTextPayload();
  } catch {
    return n;
  }
  return pMap(
    n,
    (p) => enrichPluginEntry(p, r, installLocation, knownMarketplacesWithDeclared, f, storageV5),
    {
      concurrency: 8,
    },
  );
}
//@ chunk-ca06bv0t.js:2172-3145 placement
/**
 * 为插件条目补充展示元数据（从安装位置读 manifest、版本等）。
 */
async function enrichPluginEntry(r, n, installLocation, a, s, f) {
  let source = r.source;
  if (!isRelativeSourcePath(source)) return r;
  try {
    let pluginEntryPath = await resolvePluginEntryPath(
      formatPluginId(r.name, n),
      installLocation,
      source,
      a,
      s,
      f,
      seedDirFor(installLocation) !== undefined ? "system" : "workspace",
    );
    if (pluginEntryPath.kind !== "ok") return r;
    let m = join(pluginEntryPath.entryPath, ".claude-plugin");
    if (!(await isDirectoryOrFalse(m))) return r;
    let h = join(m, "plugin.json");
    let P = await mcpAuthCacheContent(h);
    if (P === undefined) return r;
    let b = validatePluginManifest(jsonParse(stripBom(P)), "plugin-json", {
      pluginName: r.name,
      manifestPath: h,
    });
    if (!b.ok) return r;
    let manifest = b.manifest;
    let g = {
      ...r,
    };
    if (hasNoOptionalText(g.displayName) && manifest.displayName !== undefined)
      g.displayName = manifest.displayName;
    if (hasNoOptionalText(g.description) && manifest.description !== undefined)
      g.description = manifest.description;
    if (g.author === undefined && manifest.author !== undefined) g.author = manifest.author;
    if (hasNoOptionalText(g.homepage) && manifest.homepage !== undefined) g.homepage = manifest.homepage;
    if (hasNoOptionalText(g.repository) && manifest.repository !== undefined)
      g.repository = manifest.repository;
    if (hasNoOptionalText(g.license) && manifest.license !== undefined) g.license = manifest.license;
    if (!g.keywords?.length && manifest.keywords !== undefined) g.keywords = manifest.keywords;
    return g;
  } catch (error) {
    logForDebugging(
      `Display metadata for ${formatPluginId(r.name, n)} not read from its plugin.json: ${errorMessage(error)}`,
    );
    return r;
  }
}
//@ chunk-ca06bv0t.js:3145-3182 placement
function hasNoOptionalText(r) {
  return cleanOptionalText_2(r) === undefined;
}
//@ chunk-ca06bv0t.js:3182-3186 placement
init_react_production();
//@ chunk-ca06bv0t.js:4870-5179 placement
function pluginUserConfigValues(r, n) {
  let i = {};
  for (let key of Object.keys(r)) {
    let s = r[key];
    let f = s?.sensitive === true ? undefined : getOwn(n ?? {}, key);
    let p = userConfigFieldParser(s);
    if (s?.type === "boolean") {
      i[key] = String(isTrueOrTrueString(getOwn(n ?? {}, key) ?? s.default));
      continue;
    }
    i[key] =
      p === undefined
        ? f === undefined
          ? ""
          : String(f)
        : ([f, s?.default].find((c) => typeof c === "string" && p.includes(c)) ?? p[0] ?? "");
  }
  return i;
}
//@ chunk-ca06bv0t.js:5179-5288 placement
function userConfigFieldParser(r) {
  if (r?.type === "boolean") return semanticBoolean;
  return r?.type === "string" && r.multiple !== true ? r.options : undefined;
}
//@ chunk-ca06bv0t.js:5312-5372 placement
function firstLine(prev) {
  return (prev.split(/\r\n|\r|\n/, 1)[0] ?? "").trim();
}
//@ chunk-ca06bv0t.js:5372-5494 placement
function markFromPluginDirectory(r, knownMarketplacesWithDeclared) {
  return r.map((i) => {
    let source = knownMarketplacesWithDeclared[i.marketplaceName]?.source;
    return source && isPluginDirectorySource(source)
      ? {
          ...i,
          fromPluginDirectory: true,
        }
      : i;
  });
}
//@ chunk-ca06bv0t.js:5494-5532 placement
var isFromPluginDirectory = (r) => r.fromPluginDirectory === true;
//@ chunk-ca06bv0t.js:5532-5782 placement
function mergedDisplayFields(entry, n) {
  let i = (f) => entry[f] ?? n.find((p) => p.entry[f] !== undefined)?.entry[f];
  let a = ["displayName", "description", "author", "homepage", "category", "tags", "keywords", "relevance"];
  let s = {};
  for (let f of a) {
    let p = i(f);
    if (p !== undefined)
      Object.assign(s, {
        [f]: p,
      });
  }
  return s;
}
//@ chunk-ca06bv0t.js:5782-6517 placement
/**
 * 合并多个市场中重复列出的同一插件，记录 alsoListedIn。
 */
function dedupeListedPlugins(r, knownMarketplacesWithDeclared) {
  let i = (c) =>
    samePluginSource(
      c.entry.source,
      sourceUrlAndRef(knownMarketplacesWithDeclared[c.marketplaceName]?.source),
    );
  let a = (c) => isFromPluginDirectory(c) && isReviewerMarkedEntry(c.entry.name);
  let s = new Set();
  for (let c of r)
    if (a(c)) {
      let m = i(c);
      if (m !== undefined) s.add(m);
    }
  if (s.size === 0) return r;
  let f = new Map();
  for (let c of r) {
    if (isFromPluginDirectory(c) || !isOfficialMarketplaceName_3(c.marketplaceName)) continue;
    if (isOfficialFamilySameSource(c.marketplaceName, c.entry)) continue;
    let m = i(c);
    if (m !== undefined && s.has(m)) f.set(m, [...(f.get(m) ?? []), c]);
  }
  let p = [];
  for (let c of r) {
    let m = i(c);
    let h = m === undefined ? undefined : f.get(m);
    if (!isFromPluginDirectory(c)) {
      if (!h?.includes(c)) p.push(c);
      continue;
    }
    if (h === undefined || !a(c)) {
      p.push(c);
      continue;
    }
    p.push({
      ...c,
      entry: {
        ...c.entry,
        ...mergedDisplayFields(c.entry, h),
      },
      isInstalled: c.isInstalled || h.some((P) => P.isInstalled),
      alsoListedIn: uniq(h.map((P) => P.marketplaceName)),
      installCountIds: h.map((P) => P.pluginId),
    });
  }
  return p;
}
//@ chunk-ca06bv0t.js:6517-6738 placement
async function allowlistedInstalledPlugins(knownMarketplacesWithDeclared, n) {
  let i = new Set();
  let plugins = getInstalledPlugins().plugins;
  for (let [key, value] of Object.entries(plugins)) {
    if (
      parsePluginIdentifier(key).marketplace !== OFFICIAL_MARKETPLACE_NAME ||
      !value.some(isInstallationRelevantToCurrentProject)
    )
      continue;
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(key, n);
    let c =
      pluginByIdCacheOnly &&
      samePluginSource(
        pluginByIdCacheOnly.entry.source,
        sourceUrlAndRef(knownMarketplacesWithDeclared[OFFICIAL_MARKETPLACE_NAME]?.source),
      );
    if (c) i.add(c);
  }
  return i;
}
//@ chunk-ca06bv0t.js:6738-7193 placement
function groupBySource(r, knownMarketplacesWithDeclared, i = new Set()) {
  let a = (c) =>
    samePluginSource(
      c.entry.source,
      sourceUrlAndRef(knownMarketplacesWithDeclared[c.marketplaceName]?.source),
    );
  let s = new Set(i);
  let f = new Set();
  let p = new Set();
  for (let c of r) {
    let m = c.isInstalled ? a(c) : undefined;
    if (m === undefined) continue;
    if (isFromPluginDirectory(c)) {
      s.add(m);
      f.add(m);
    } else if (isOfficialMarketplaceName_3(c.marketplaceName)) p.add(m);
  }
  if (s.size === 0 && p.size === 0) return r;
  return r.filter((c) => {
    if (c.isInstalled) return true;
    let m = a(c);
    if (m === undefined) return true;
    if (isFromPluginDirectory(c)) return !p.has(m) && !f.has(m);
    return !isOfficialMarketplaceName_3(c.marketplaceName) || !s.has(m);
  });
}
//@ chunk-ca06bv0t.js:7193-7345 placement
/**
 * 取插件安装数（含别名 id 的最大值）
 */
function getPluginInstallCount(r, n) {
  if (!n) return;
  let i = n.get(r.pluginId);
  for (let a of r.installCountIds ?? []) {
    let s = n.get(a);
    if (s !== undefined && (i === undefined || s > i)) i = s;
  }
  return i;
}
//@ chunk-ca06bv0t.js:7345-7586 placement = _temp (0.705)
/**
 * 按安装量降序排序插件，同量时插件目录内的优先并保持原顺序，其余按名称排序。（误归 HelpV2/Commands）
 */
function sortPluginsByPopularity(a, b) {
  let i = new Map(a.map((a, s) => [a, s]));
  a.sort((a, s) => {
    let f = getPluginInstallCount(a, b) ?? 0;
    let p = getPluginInstallCount(s, b) ?? 0;
    if (f !== p) return p - f;
    let c = isFromPluginDirectory(a);
    let m = isFromPluginDirectory(s);
    if (c !== m) return c ? -1 : 1;
    return c ? (i.get(a) ?? 0) - (i.get(s) ?? 0) : a.entry.name.localeCompare(s.entry.name);
  });
}
//@ chunk-ca06bv0t.js:7586-7640 placement
function marketplaceLabel(r) {
  return isFromPluginDirectory(r) ? OFFICIAL_MARKETPLACE_DISPLAY : displayTextOrRaw(r.marketplaceName);
}
//@ chunk-ca06bv0t.js:7640-7860 placement
function installCountsByMarketplace(plugin) {
  let alsoListedIn = plugin.alsoListedIn ?? [];
  if (alsoListedIn.length === 0) return;
  let i = new Map(installCountEntries(plugin).map((a) => [a.marketplace, a.name]));
  return `Also listed in ${alsoListedIn
    .map((a) => {
      let s = i.get(a);
      return s === undefined ? a : `${a} as ${s}`;
    })
    .join(", ")}`;
}
//@ chunk-ca06bv0t.js:7860-8035 placement
function installCountEntries(r) {
  {
    let n = [];
    for (let i of r.installCountIds ?? []) {
      let { name: a, marketplace } = parsePluginIdentifier(i);
      if (marketplace !== undefined && a !== r.entry.name)
        n.push({
          marketplace,
          name: a,
        });
    }
    return n;
  }
  return [];
}
//@ chunk-ca06bv0t.js:8035-8159 placement
function marketplaceNamesOf(plugin) {
  let n = (i) => (i === CLAUDE_PLUGINS_OFFICIAL ? "official" : i);
  return [
    isFromPluginDirectory(plugin) ? OFFICIAL_MARKETPLACE_DISPLAY : plugin.marketplaceName,
    ...(plugin.alsoListedIn ?? []).map(n),
  ].join(" + ");
}
//@ chunk-ca06bv0t.js:8159-8234 placement
function safeNameOrPrintable(r) {
  return /^[A-Za-z0-9._/@:~-]{1,120}$/.test(r) ? r : printableLabel(printableName(r, 120));
}
//@ chunk-ca06bv0t.js:8234-8675 placement
function pluginSourceLink(r) {
  let source = r.entry.source;
  if (typeof source !== "object" || source === null) return;
  let i;
  if (source.source === "github") i = source.repo;
  else if (source.source === "url" || source.source === "git-subdir") i = source.url;
  if (i === undefined) return;
  let a = i;
  try {
    let f = new URL(i);
    a = isGithubDotCom(f.hostname) ? f.pathname.replace(/^\/+/, "") : `${f.host}${f.pathname}`;
  } catch {}
  a = safeNameOrPrintable(a.replace(/\.git$/, "").replace(/\/+$/, ""));
  if (a === "") return;
  let s = source.source === "git-subdir" ? safeNameOrPrintable(source.path) : "";
  return s === "" ? a : `${a} (${s})`;
}
export {
  displayMarketplaceName,
  isFromPluginDirectory,
  displayTextOrRaw,
  escapedDisplayText,
  firstLine,
  pluginUserConfigValues,
  userConfigFieldParser,
  groupBySource,
  markFromPluginDirectory,
  allowlistedInstalledPlugins,
  pluginInstallPath,
  pluginSourceLink,
  marketplaceLabel,
  installCountsByMarketplace,
  installCountEntries,
  marketplaceNamesOf,
  dedupeListedPlugins,
  sortPluginsByPopularity,
  getPluginInstallCount,
};
