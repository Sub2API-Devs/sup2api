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
import { isDirectoryOrFalse, readSmallFileText } from "./safeFileRead.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ca06bv0t.js:1586-1638 placement
var PRINTABLE_NAME_RE = /^[\x21-\x7e]+$/;
var PLUGIN_NAME_FIELD_RE = /^[A-Za-z0-9._-]{1,64}$/;
//@ chunk-ca06bv0t.js:1638-1684 placement
function displayMarketplaceName(name) {
  return OFFICIAL_MARKETPLACE_DISPLAY === "" || isValidPluginDisplayName(name, PRINTABLE_NAME_RE)
    ? name
    : printableDisplayName(name);
}
//@ chunk-ca06bv0t.js:1684-1753 placement
function escapedDisplayText(text) {
  if (isValidPluginDisplayName(text, PLUGIN_NAME_FIELD_RE)) return text;
  return escapeXml(
    OFFICIAL_MARKETPLACE_DISPLAY === "" ? printableName(text, 64) : printableDisplayName(text),
  );
}
//@ chunk-ca06bv0t.js:1753-1791 placement
function displayTextOrRaw(text) {
  return isValidPluginDisplayName(text, PLUGIN_NAME_FIELD_RE) ? text : printableDisplayName(text);
}
//@ chunk-ca06bv0t.js:1791-1848 placement
function isValidPluginDisplayName(name, pattern) {
  return (
    pattern.test(name) &&
    !isAsciiImpersonatingOfficialName(name) &&
    !isSameFoldedName(OFFICIAL_MARKETPLACE_DISPLAY, cleanDisplayNameText(name))
  );
}
//@ chunk-ca06bv0t.js:1848-1902 placement
function printableDisplayName(name) {
  return printableLabel(printableName(cleanDisplayNameText(name), 64)) || "\u201C\u201D";
}
//@ chunk-ca06bv0t.js:1902-1956 placement
function cleanDisplayNameText(text) {
  return stripInvisibleKeepEmoji(text).replace(LEADING_INVISIBLE_TEXT_RE, "").trimEnd();
}
//@ chunk-ca06bv0t.js:1985-2172 placement
async function pluginInstallPath(marketplaceName, plugins, marketplaces, storageV5) {
  let installLocation = Object.hasOwn(marketplaces, marketplaceName)
    ? marketplaces[marketplaceName]?.installLocation
    : undefined;
  if (installLocation === undefined) return plugins;
  let marketplaces_2;
  try {
    marketplaces_2 = tryUnwrapTextPayload();
  } catch {
    return plugins;
  }
  return pMap(
    plugins,
    (plugin) =>
      enrichPluginEntry(plugin, marketplaceName, installLocation, marketplaces, marketplaces_2, storageV5),
    {
      concurrency: 8,
    },
  );
}
//@ chunk-ca06bv0t.js:2172-3145 placement
/**
 * 为插件条目补充展示元数据（从安装位置读 manifest、版本等）。
 */
async function enrichPluginEntry(plugin, marketplaceName, installLocation, marketplaces, extras, storageV5) {
  let source = plugin.source;
  if (!isRelativeSourcePath(source)) return plugin;
  try {
    let pluginEntryPath = await resolvePluginEntryPath(
      formatPluginId(plugin.name, marketplaceName),
      installLocation,
      source,
      marketplaces,
      extras,
      storageV5,
      seedDirFor(installLocation) !== undefined ? "system" : "workspace",
    );
    if (pluginEntryPath.kind !== "ok") return plugin;
    let metaDir = join(pluginEntryPath.entryPath, ".claude-plugin");
    if (!(await isDirectoryOrFalse(metaDir))) return plugin;
    let manifestPath = join(metaDir, "plugin.json");
    let text = await readSmallFileText(manifestPath);
    if (text === undefined) return plugin;
    let result = validatePluginManifest(jsonParse(stripBom(text)), "plugin-json", {
      pluginName: plugin.name,
      manifestPath,
    });
    if (!result.ok) return plugin;
    let manifest = result.manifest;
    let enriched = {
      ...plugin,
    };
    if (hasNoOptionalText(enriched.displayName) && manifest.displayName !== undefined)
      enriched.displayName = manifest.displayName;
    if (hasNoOptionalText(enriched.description) && manifest.description !== undefined)
      enriched.description = manifest.description;
    if (enriched.author === undefined && manifest.author !== undefined) enriched.author = manifest.author;
    if (hasNoOptionalText(enriched.homepage) && manifest.homepage !== undefined)
      enriched.homepage = manifest.homepage;
    if (hasNoOptionalText(enriched.repository) && manifest.repository !== undefined)
      enriched.repository = manifest.repository;
    if (hasNoOptionalText(enriched.license) && manifest.license !== undefined)
      enriched.license = manifest.license;
    if (!enriched.keywords?.length && manifest.keywords !== undefined) enriched.keywords = manifest.keywords;
    return enriched;
  } catch (error) {
    logForDebugging(
      `Display metadata for ${formatPluginId(plugin.name, marketplaceName)} not read from its plugin.json: ${errorMessage(error)}`,
    );
    return plugin;
  }
}
//@ chunk-ca06bv0t.js:3145-3182 placement
function hasNoOptionalText(text) {
  return cleanOptionalText_2(text) === undefined;
}
//@ chunk-ca06bv0t.js:3182-3186 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ca06bv0t.js:3182", () => {
  init_react_production();
});
//@ chunk-ca06bv0t.js:4870-5179 placement
function pluginUserConfigValues(schema, saved) {
  let values = {};
  for (let key of Object.keys(schema)) {
    let field = schema[key];
    let savedValue = field?.sensitive === true ? undefined : getOwn(saved ?? {}, key);
    let options = userConfigFieldParser(field);
    if (field?.type === "boolean") {
      values[key] = String(isTrueOrTrueString(getOwn(saved ?? {}, key) ?? field.default));
      continue;
    }
    values[key] =
      options === undefined
        ? savedValue === undefined
          ? ""
          : String(savedValue)
        : ([savedValue, field?.default].find(
            (candidate) => typeof candidate === "string" && options.includes(candidate),
          ) ??
          options[0] ??
          "");
  }
  return values;
}
//@ chunk-ca06bv0t.js:5179-5288 placement
function userConfigFieldParser(field) {
  if (field?.type === "boolean") return semanticBoolean;
  return field?.type === "string" && field.multiple !== true ? field.options : undefined;
}
//@ chunk-ca06bv0t.js:5312-5372 placement
function firstLine(prev) {
  return (prev.split(/\r\n|\r|\n/, 1)[0] ?? "").trim();
}
//@ chunk-ca06bv0t.js:5372-5494 placement
function markFromPluginDirectory(entries, knownMarketplacesWithDeclared) {
  return entries.map((entry) => {
    let source = knownMarketplacesWithDeclared[entry.marketplaceName]?.source;
    return source && isPluginDirectorySource(source)
      ? {
          ...entry,
          fromPluginDirectory: true,
        }
      : entry;
  });
}
//@ chunk-ca06bv0t.js:5494-5532 placement
var isFromPluginDirectory = (entry) => entry.fromPluginDirectory === true;
//@ chunk-ca06bv0t.js:5532-5782 placement
function mergedDisplayFields(entry, others) {
  let fieldOf = (field) =>
    entry[field] ?? others.find((other) => other.entry[field] !== undefined)?.entry[field];
  let fields = [
    "displayName",
    "description",
    "author",
    "homepage",
    "category",
    "tags",
    "keywords",
    "relevance",
  ];
  let result = {};
  for (let field of fields) {
    let value = fieldOf(field);
    if (value !== undefined)
      Object.assign(result, {
        [field]: value,
      });
  }
  return result;
}
//@ chunk-ca06bv0t.js:5782-6517 placement
/**
 * 合并多个市场中重复列出的同一插件，记录 alsoListedIn。
 */
function dedupeListedPlugins(plugins, knownMarketplacesWithDeclared) {
  let sourceKeyOf = (plugin) =>
    samePluginSource(
      plugin.entry.source,
      sourceUrlAndRef(knownMarketplacesWithDeclared[plugin.marketplaceName]?.source),
    );
  let isDirectoryMarked = (plugin) =>
    isFromPluginDirectory(plugin) && isReviewerMarkedEntry(plugin.entry.name);
  let directoryKeys = new Set();
  for (let plugin of plugins)
    if (isDirectoryMarked(plugin)) {
      let key = sourceKeyOf(plugin);
      if (key !== undefined) directoryKeys.add(key);
    }
  if (directoryKeys.size === 0) return plugins;
  let shadows = new Map();
  for (let plugin of plugins) {
    if (isFromPluginDirectory(plugin) || !isOfficialMarketplaceName_3(plugin.marketplaceName)) continue;
    if (isOfficialFamilySameSource(plugin.marketplaceName, plugin.entry)) continue;
    let key = sourceKeyOf(plugin);
    if (key !== undefined && directoryKeys.has(key)) shadows.set(key, [...(shadows.get(key) ?? []), plugin]);
  }
  let result = [];
  for (let plugin of plugins) {
    let key = sourceKeyOf(plugin);
    let shadowing = key === undefined ? undefined : shadows.get(key);
    if (!isFromPluginDirectory(plugin)) {
      if (!shadowing?.includes(plugin)) result.push(plugin);
      continue;
    }
    if (shadowing === undefined || !isDirectoryMarked(plugin)) {
      result.push(plugin);
      continue;
    }
    result.push({
      ...plugin,
      entry: {
        ...plugin.entry,
        ...mergedDisplayFields(plugin.entry, shadowing),
      },
      isInstalled: plugin.isInstalled || shadowing.some((plugin) => plugin.isInstalled),
      alsoListedIn: uniq(shadowing.map((plugin) => plugin.marketplaceName)),
      installCountIds: shadowing.map((plugin) => plugin.pluginId),
    });
  }
  return result;
}
//@ chunk-ca06bv0t.js:6517-6738 placement
async function allowlistedInstalledPlugins(knownMarketplacesWithDeclared, storageV5) {
  let keys = new Set();
  let plugins = getInstalledPlugins().plugins;
  for (let [key, value] of Object.entries(plugins)) {
    if (
      parsePluginIdentifier(key).marketplace !== OFFICIAL_MARKETPLACE_NAME ||
      !value.some(isInstallationRelevantToCurrentProject)
    )
      continue;
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(key, storageV5);
    let sourceKey =
      pluginByIdCacheOnly &&
      samePluginSource(
        pluginByIdCacheOnly.entry.source,
        sourceUrlAndRef(knownMarketplacesWithDeclared[OFFICIAL_MARKETPLACE_NAME]?.source),
      );
    if (sourceKey) keys.add(sourceKey);
  }
  return keys;
}
//@ chunk-ca06bv0t.js:6738-7193 placement
function groupBySource(plugins, knownMarketplacesWithDeclared, extraKeys = new Set()) {
  let sourceKeyOf = (plugin) =>
    samePluginSource(
      plugin.entry.source,
      sourceUrlAndRef(knownMarketplacesWithDeclared[plugin.marketplaceName]?.source),
    );
  let directoryKeys = new Set(extraKeys);
  let directoryInstalled = new Set();
  let officialKeys = new Set();
  for (let plugin of plugins) {
    let key = plugin.isInstalled ? sourceKeyOf(plugin) : undefined;
    if (key === undefined) continue;
    if (isFromPluginDirectory(plugin)) {
      directoryKeys.add(key);
      directoryInstalled.add(key);
    } else if (isOfficialMarketplaceName_3(plugin.marketplaceName)) officialKeys.add(key);
  }
  if (directoryKeys.size === 0 && officialKeys.size === 0) return plugins;
  return plugins.filter((plugin) => {
    if (plugin.isInstalled) return true;
    let key = sourceKeyOf(plugin);
    if (key === undefined) return true;
    if (isFromPluginDirectory(plugin)) return !officialKeys.has(key) && !directoryInstalled.has(key);
    return !isOfficialMarketplaceName_3(plugin.marketplaceName) || !directoryKeys.has(key);
  });
}
//@ chunk-ca06bv0t.js:7193-7345 placement
/**
 * 取插件安装数（含别名 id 的最大值）
 */
function getPluginInstallCount(plugin, counts) {
  if (!counts) return;
  let count = counts.get(plugin.pluginId);
  for (let id of plugin.installCountIds ?? []) {
    let other = counts.get(id);
    if (other !== undefined && (count === undefined || other > count)) count = other;
  }
  return count;
}
//@ chunk-ca06bv0t.js:7345-7586 placement (2.1.88 match: _temp, 0.705)
/**
 * 按安装量降序排序插件，同量时插件目录内的优先并保持原顺序，其余按名称排序。（误归 HelpV2/Commands）
 */
function sortPluginsByPopularity(a, b) {
  let orderMap = new Map(a.map((plugin, index) => [plugin, index]));
  a.sort((left, right) => {
    let leftCount = getPluginInstallCount(left, b) ?? 0;
    let rightCount = getPluginInstallCount(right, b) ?? 0;
    if (leftCount !== rightCount) return rightCount - leftCount;
    let leftIsDirectory = isFromPluginDirectory(left);
    let rightIsDirectory = isFromPluginDirectory(right);
    if (leftIsDirectory !== rightIsDirectory) return leftIsDirectory ? -1 : 1;
    return leftIsDirectory
      ? (orderMap.get(left) ?? 0) - (orderMap.get(right) ?? 0)
      : left.entry.name.localeCompare(right.entry.name);
  });
}
//@ chunk-ca06bv0t.js:7586-7640 placement
function marketplaceLabel(plugin) {
  return isFromPluginDirectory(plugin)
    ? OFFICIAL_MARKETPLACE_DISPLAY
    : displayTextOrRaw(plugin.marketplaceName);
}
//@ chunk-ca06bv0t.js:7640-7860 placement
function installCountsByMarketplace(plugin) {
  let alsoListedIn = plugin.alsoListedIn ?? [];
  if (alsoListedIn.length === 0) return;
  let byMarketplace = new Map(installCountEntries(plugin).map((entry) => [entry.marketplace, entry.name]));
  return `Also listed in ${alsoListedIn
    .map((marketplace) => {
      let name = byMarketplace.get(marketplace);
      return name === undefined ? marketplace : `${marketplace} as ${name}`;
    })
    .join(", ")}`;
}
//@ chunk-ca06bv0t.js:7860-8035 placement
function installCountEntries(plugin) {
  {
    let entries = [];
    for (let id of plugin.installCountIds ?? []) {
      let { name, marketplace } = parsePluginIdentifier(id);
      if (marketplace !== undefined && name !== plugin.entry.name)
        entries.push({
          marketplace,
          name,
        });
    }
    return entries;
  }
  return [];
}
//@ chunk-ca06bv0t.js:8035-8159 placement
function marketplaceNamesOf(plugin) {
  let normalize = (name) => (name === CLAUDE_PLUGINS_OFFICIAL ? "official" : name);
  return [
    isFromPluginDirectory(plugin) ? OFFICIAL_MARKETPLACE_DISPLAY : plugin.marketplaceName,
    ...(plugin.alsoListedIn ?? []).map(normalize),
  ].join(" + ");
}
//@ chunk-ca06bv0t.js:8159-8234 placement
function safeNameOrPrintable(name) {
  return /^[A-Za-z0-9._/@:~-]{1,120}$/.test(name) ? name : printableLabel(printableName(name, 120));
}
//@ chunk-ca06bv0t.js:8234-8675 placement
function pluginSourceLink(plugin) {
  let source = plugin.entry.source;
  if (typeof source !== "object" || source === null) return;
  let ref;
  if (source.source === "github") ref = source.repo;
  else if (source.source === "url" || source.source === "git-subdir") ref = source.url;
  if (ref === undefined) return;
  let link = ref;
  try {
    let parsed = new URL(ref);
    link = isGithubDotCom(parsed.hostname)
      ? parsed.pathname.replace(/^\/+/, "")
      : `${parsed.host}${parsed.pathname}`;
  } catch {}
  link = safeNameOrPrintable(link.replace(/\.git$/, "").replace(/\/+$/, ""));
  if (link === "") return;
  let path = source.source === "git-subdir" ? safeNameOrPrintable(source.path) : "";
  return path === "" ? link : `${link} (${path})`;
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
