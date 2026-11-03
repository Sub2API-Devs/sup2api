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
import { join, join as join_2, join as join_3, join as join_4, join as join_5, join as join_6 } from "path";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  SPi,
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
} from "./officialMarketplaceNames.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { printableName, printableLabel } from "../printableName.js";
import { isAsciiImpersonatingOfficialName, isRelativeSourcePath } from "./schemas.js";
import { stripInvisibleKeepEmoji, gbr, cleanOptionalText } from "../settings/marketplaceSettingsAliases.js";
import { tryUnwrapTextPayload, seedDirFor, getPluginByIdCacheOnly } from "./marketplaceManager.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { resolvePluginEntryPath } from "./localMarketplacePaths.js";
import { formatPluginId } from "./marketplaceHelpers.js";
import { FF, ZB } from "./safeFileRead.js";
import { validatePluginManifest } from "./pluginManifestRead.js";
import { jsonParse } from "../slowOperations.js";
import { Wo } from "../json.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { j } from "../../../vendor/react/cjs/react.production.js";
import { getOwn } from "../objectSafety.js";
import { CHr } from "./pluginConfigEnv.js";
import { semanticBoolean } from "../semanticBoolean.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import { Prt } from "./commandSourceErrors.js";
import { isOfficialMarketplaceName_3, parsePluginIdentifier } from "./pluginIdentifier.js";
import { Rmn } from "./installResultMessages.js";
import { uniq } from "../collections.js";
import { getInstalledPlugins, isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { isGithubDotCom } from "../git/githubUrl.js";

//@ chunk-ca06bv0t.js:1586-1638 placement
var We = /^[\x21-\x7e]+$/,
  se = /^[A-Za-z0-9._-]{1,64}$/;
//@ chunk-ca06bv0t.js:1638-1684 placement
function displayMarketplaceName(r) {
  return OFFICIAL_MARKETPLACE_DISPLAY === "" || Y(r, We) ? r : Z(r);
}
//@ chunk-ca06bv0t.js:1684-1753 placement
function escapedDisplayText(r) {
  if (Y(r, se)) return r;
  return escapeXml(OFFICIAL_MARKETPLACE_DISPLAY === "" ? printableName(r, 64) : Z(r));
}
//@ chunk-ca06bv0t.js:1753-1791 placement
function displayTextOrRaw(r) {
  return Y(r, se) ? r : Z(r);
}
//@ chunk-ca06bv0t.js:1791-1848 placement
function Y(r, n) {
  return n.test(r) && !isAsciiImpersonatingOfficialName(r) && !SPi(OFFICIAL_MARKETPLACE_DISPLAY, ae(r));
}
//@ chunk-ca06bv0t.js:1848-1902 placement
function Z(r) {
  return printableLabel(printableName(ae(r), 64)) || "\u201C\u201D";
}
//@ chunk-ca06bv0t.js:1902-1956 placement
function ae(r) {
  return stripInvisibleKeepEmoji(r).replace(gbr, "").trimEnd();
}
//@ chunk-ca06bv0t.js:1985-2172 placement
async function pluginInstallPath(r, n, i, a) {
  let s = Object.hasOwn(i, r) ? i[r]?.installLocation : void 0;
  if (s === void 0) return n;
  let f;
  try {
    f = tryUnwrapTextPayload();
  } catch {
    return n;
  }
  return pMap(n, (p) => enrichPluginEntry(p, r, s, i, f, a), { concurrency: 8 });
}
/**
 * 为插件条目补充展示元数据（从安装位置读 manifest、版本等）。
 */
//@ chunk-ca06bv0t.js:2172-3145 placement
async function enrichPluginEntry(r, n, i, a, s, f) {
  let source = r.source;
  if (!isRelativeSourcePath(source)) return r;
  try {
    let c = await resolvePluginEntryPath(
      formatPluginId(r.name, n),
      i,
      source,
      a,
      s,
      f,
      seedDirFor(i) !== void 0 ? "system" : "workspace",
    );
    if (c.kind !== "ok") return r;
    let m = join(c.entryPath, ".claude-plugin");
    if (!(await FF(m))) return r;
    let h = join(m, "plugin.json"),
      P = await ZB(h);
    if (P === void 0) return r;
    let b = validatePluginManifest(jsonParse(Wo(P)), "plugin-json", { pluginName: r.name, manifestPath: h });
    if (!b.ok) return r;
    let manifest = b.manifest,
      g = { ...r };
    if (C(g.displayName) && manifest.displayName !== void 0) g.displayName = manifest.displayName;
    if (C(g.description) && manifest.description !== void 0) g.description = manifest.description;
    if (g.author === void 0 && manifest.author !== void 0) g.author = manifest.author;
    if (C(g.homepage) && manifest.homepage !== void 0) g.homepage = manifest.homepage;
    if (C(g.repository) && manifest.repository !== void 0) g.repository = manifest.repository;
    if (C(g.license) && manifest.license !== void 0) g.license = manifest.license;
    if (!g.keywords?.length && manifest.keywords !== void 0) g.keywords = manifest.keywords;
    return g;
  } catch (error) {
    return (
      logForDebugging(
        `Display metadata for ${formatPluginId(r.name, n)} not read from its plugin.json: ${errorMessage(error)}`,
      ),
      r
    );
  }
}
//@ chunk-ca06bv0t.js:3145-3182 placement
function C(r) {
  return cleanOptionalText(r) === void 0;
}
//@ chunk-ca06bv0t.js:3182-3186 placement
j();
//@ chunk-ca06bv0t.js:4870-5179 placement
function pluginUserConfigValues(r, n) {
  let i = {};
  for (let a of Object.keys(r)) {
    let s = r[a],
      f = s?.sensitive === !0 ? void 0 : getOwn(n ?? {}, a),
      p = userConfigFieldParser(s);
    if (s?.type === "boolean") {
      i[a] = String(CHr(getOwn(n ?? {}, a) ?? s.default));
      continue;
    }
    i[a] =
      p === void 0
        ? f === void 0
          ? ""
          : String(f)
        : ([f, s?.default].find((c) => typeof c === "string" && p.includes(c)) ?? p[0] ?? "");
  }
  return i;
}
//@ chunk-ca06bv0t.js:5179-5288 placement
function userConfigFieldParser(r) {
  if (r?.type === "boolean") return semanticBoolean;
  return r?.type === "string" && r.multiple !== !0 ? r.options : void 0;
}
//@ chunk-ca06bv0t.js:5312-5372 placement
function firstLine(r) {
  return (r.split(/\r\n|\r|\n/, 1)[0] ?? "").trim();
}
//@ chunk-ca06bv0t.js:5372-5494 placement
function markFromPluginDirectory(r, n) {
  return r.map((i) => {
    let a = n[i.marketplaceName]?.source;
    return a && isPluginDirectorySource(a) ? { ...i, fromPluginDirectory: !0 } : i;
  });
}
//@ chunk-ca06bv0t.js:5494-5532 placement
var isFromPluginDirectory = (r) => r.fromPluginDirectory === !0;
//@ chunk-ca06bv0t.js:5532-5782 placement
function mergedDisplayFields(r, n) {
  let i = (f) => r[f] ?? n.find((p) => p.entry[f] !== void 0)?.entry[f],
    a = ["displayName", "description", "author", "homepage", "category", "tags", "keywords", "relevance"],
    s = {};
  for (let f of a) {
    let p = i(f);
    if (p !== void 0) Object.assign(s, { [f]: p });
  }
  return s;
}
/**
 * 合并多个市场中重复列出的同一插件，记录 alsoListedIn。
 */
//@ chunk-ca06bv0t.js:5782-6517 placement
function dedupeListedPlugins(r, n) {
  let i = (c) => samePluginSource(c.entry.source, sourceUrlAndRef(n[c.marketplaceName]?.source)),
    a = (c) => isFromPluginDirectory(c) && Prt(c.entry.name),
    s = new Set();
  for (let c of r)
    if (a(c)) {
      let m = i(c);
      if (m !== void 0) s.add(m);
    }
  if (s.size === 0) return r;
  let f = new Map();
  for (let c of r) {
    if (isFromPluginDirectory(c) || !isOfficialMarketplaceName_3(c.marketplaceName)) continue;
    if (Rmn(c.marketplaceName, c.entry)) continue;
    let m = i(c);
    if (m !== void 0 && s.has(m)) f.set(m, [...(f.get(m) ?? []), c]);
  }
  let p = [];
  for (let c of r) {
    let m = i(c),
      h = m === void 0 ? void 0 : f.get(m);
    if (!isFromPluginDirectory(c)) {
      if (!h?.includes(c)) p.push(c);
      continue;
    }
    if (h === void 0 || !a(c)) {
      p.push(c);
      continue;
    }
    p.push({
      ...c,
      entry: { ...c.entry, ...mergedDisplayFields(c.entry, h) },
      isInstalled: c.isInstalled || h.some((P) => P.isInstalled),
      alsoListedIn: uniq(h.map((P) => P.marketplaceName)),
      installCountIds: h.map((P) => P.pluginId),
    });
  }
  return p;
}
//@ chunk-ca06bv0t.js:6517-6738 placement
async function allowlistedInstalledPlugins(r, n) {
  let i = new Set(),
    plugins = getInstalledPlugins().plugins;
  for (let [s, f] of Object.entries(plugins)) {
    if (
      parsePluginIdentifier(s).marketplace !== OFFICIAL_MARKETPLACE_NAME ||
      !f.some(isInstallationRelevantToCurrentProject)
    )
      continue;
    let p = await getPluginByIdCacheOnly(s, n),
      c = p && samePluginSource(p.entry.source, sourceUrlAndRef(r[OFFICIAL_MARKETPLACE_NAME]?.source));
    if (c) i.add(c);
  }
  return i;
}
//@ chunk-ca06bv0t.js:6738-7193 placement
function groupBySource(r, n, i = new Set()) {
  let a = (c) => samePluginSource(c.entry.source, sourceUrlAndRef(n[c.marketplaceName]?.source)),
    s = new Set(i),
    f = new Set(),
    p = new Set();
  for (let c of r) {
    let m = c.isInstalled ? a(c) : void 0;
    if (m === void 0) continue;
    if (isFromPluginDirectory(c)) (s.add(m), f.add(m));
    else if (isOfficialMarketplaceName_3(c.marketplaceName)) p.add(m);
  }
  if (s.size === 0 && p.size === 0) return r;
  return r.filter((c) => {
    if (c.isInstalled) return !0;
    let m = a(c);
    if (m === void 0) return !0;
    if (isFromPluginDirectory(c)) return !p.has(m) && !f.has(m);
    return !isOfficialMarketplaceName_3(c.marketplaceName) || !s.has(m);
  });
}
/**
 * 取插件安装数（含别名 id 的最大值）
 */
//@ chunk-ca06bv0t.js:7193-7345 placement
function getPluginInstallCount(r, n) {
  if (!n) return;
  let i = n.get(r.pluginId);
  for (let a of r.installCountIds ?? []) {
    let s = n.get(a);
    if (s !== void 0 && (i === void 0 || s > i)) i = s;
  }
  return i;
}
/**
 * 按安装量降序排序插件，同量时插件目录内的优先并保持原顺序，其余按名称排序。（误归 HelpV2/Commands）
 */
//@ chunk-ca06bv0t.js:7345-7586 placement = _temp (0.705)
function sortPluginsByPopularity(a, b) {
  let i = new Map(a.map((a, s) => [a, s]));
  a.sort((a, s) => {
    let f = getPluginInstallCount(a, b) ?? 0,
      p = getPluginInstallCount(s, b) ?? 0;
    if (f !== p) return p - f;
    let c = isFromPluginDirectory(a),
      m = isFromPluginDirectory(s);
    if (c !== m) return c ? -1 : 1;
    return c ? (i.get(a) ?? 0) - (i.get(s) ?? 0) : a.entry.name.localeCompare(s.entry.name);
  });
}
//@ chunk-ca06bv0t.js:7586-7640 placement
function marketplaceLabel(r) {
  return isFromPluginDirectory(r) ? OFFICIAL_MARKETPLACE_DISPLAY : displayTextOrRaw(r.marketplaceName);
}
//@ chunk-ca06bv0t.js:7640-7860 placement
function installCountsByMarketplace(r) {
  let n = r.alsoListedIn ?? [];
  if (n.length === 0) return;
  let i = new Map(installCountEntries(r).map((a) => [a.marketplace, a.name]));
  return `Also listed in ${n
    .map((a) => {
      let s = i.get(a);
      return s === void 0 ? a : `${a} as ${s}`;
    })
    .join(", ")}`;
}
//@ chunk-ca06bv0t.js:7860-8035 placement
function installCountEntries(r) {
  {
    let n = [];
    for (let i of r.installCountIds ?? []) {
      let { name: a, marketplace: marketplace } = parsePluginIdentifier(i);
      if (marketplace !== void 0 && a !== r.entry.name) n.push({ marketplace: marketplace, name: a });
    }
    return n;
  }
  return [];
}
//@ chunk-ca06bv0t.js:8035-8159 placement
function marketplaceNamesOf(r) {
  let n = (i) => (i === CLAUDE_PLUGINS_OFFICIAL ? "official" : i);
  return [
    isFromPluginDirectory(r) ? OFFICIAL_MARKETPLACE_DISPLAY : r.marketplaceName,
    ...(r.alsoListedIn ?? []).map(n),
  ].join(" + ");
}
//@ chunk-ca06bv0t.js:8159-8234 placement
function ye(r) {
  return /^[A-Za-z0-9._/@:~-]{1,120}$/.test(r) ? r : printableLabel(printableName(r, 120));
}
//@ chunk-ca06bv0t.js:8234-8675 placement
function pluginSourceLink(r) {
  let source = r.entry.source;
  if (typeof source !== "object" || source === null) return;
  let i;
  if (source.source === "github") i = source.repo;
  else if (source.source === "url" || source.source === "git-subdir") i = source.url;
  if (i === void 0) return;
  let a = i;
  try {
    let f = new URL(i);
    a = isGithubDotCom(f.hostname) ? f.pathname.replace(/^\/+/, "") : `${f.host}${f.pathname}`;
  } catch {}
  if (((a = ye(a.replace(/\.git$/, "").replace(/\/+$/, ""))), a === "")) return;
  let s = source.source === "git-subdir" ? ye(source.path) : "";
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
