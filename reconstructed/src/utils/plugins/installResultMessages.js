/**
 * utils/plugins/installResultMessages.ts
 *
 * 2.1.316 新增：安装结果文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import {
  findOtherMarketplaceInstalls,
  Qft,
  pluginDirectoryUnavailableReason,
  findBlockedMarketplace,
} from "./pluginDependencies.js";
import { isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import { quotedPrintable, printableLabel, printableName } from "../printableName.js";
import { uniq } from "../collections.js";
import { cie, canReplaceOfficialInstalls } from "./crossMarketplaceInstall.js";
import { claudeCommand, runCommandHint } from "../worktreeResumeHint.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { entryDeclaresComponents, GitNotAvailableError, GitHostFetchFailedError } from "./pluginLoader.js";
import {
  Eq,
  loadKnownMarketplacesSafe,
  getPluginByIdCacheOnly,
  getMarketplaceCacheOnly,
} from "./marketplaceManager.js";
import { parsePluginIdentifier, isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  marketplaceDisplayName,
} from "./officialMarketplaceNames.js";
import { isSourceAllowedByPolicy, isPluginBlockedByPolicy } from "./marketplacePolicy.js";
import { Prt } from "./commandSourceErrors.js";
import { truncateMiddle } from "../stringUtils.js";
import { qualifyDependency } from "./dependencyResolver.js";
import { isStorageV5Enabled } from "../hoverRest.js";

/**
 * 同名插件在其他项目作用域的安装。
 */
//@ chunk-e6aww6q8.js:4459079-4459325 placement
async function findOtherProjectInstalls(e, n, r, s) {
  return (
    await findOtherMarketplaceInstalls(e, n, r, (y) => !isInstallationRelevantToCurrentProject(y), s)
  ).flatMap(({ otherId: otherId, installations: installations }) =>
    installations.flatMap((w) =>
      (w.scope === "project" || w.scope === "local") && w.projectPath !== void 0
        ? [{ pluginId: otherId, scope: w.scope, projectPath: w.projectPath }]
        : [],
    ),
  );
}
/**
 * ✓ Installed … 文案，附依赖、其他项目说明与禁用提示。
 */
//@ chunk-e6aww6q8.js:4459325-4459637 placement
function formatInstalledMessage(e) {
  let r = `\u2713 Installed ${e.otherProjectsNote === "" ? e.name : `"${quotedPrintable(e.name, 120)}"`}${e.depNote}.${e.otherProjectsNote === "" ? "" : ` ${e.otherProjectsNote}.`}`;
  return e.disabled === void 0
    ? r
    : `${r} This plugin is disabled ${e.disabled === "by-default" ? "by default" : "in your settings"} \u2014 ${e.enableHint}`;
}
//@ chunk-e6aww6q8.js:4459637-4460392 placement
function describeOtherMarketplaceInstall(e, n, r) {
  {
    if (r.length === 0) return "";
    let format = new Intl.ListFormat("en", { type: "conjunction" }).format(
        uniq(r.map((G) => cie(G.pluginId, "another marketplace"))),
      ),
      joined = r
        .map((G) => {
          let q = printableLabel(printableName(G.projectPath, 200));
          return q === "" ? `${G.scope} scope` : `${q}, ${G.scope} scope`;
        })
        .join("; "),
      y = canReplaceOfficialInstalls(e, r),
      S = uniq(
        r.flatMap(
          (G) =>
            (G.scope === "local" && y
              ? claudeCommand("plugin install", e, "--replace --scope local")
              : claudeCommand("plugin uninstall", G.pluginId, `--scope ${G.scope}`)) ?? [],
        ),
      ),
      w = r.length > 1,
      L = `Note: "${quotedPrintable(n, 120)}" is also installed from ${format} in ${w ? "other projects" : "another project"} (${joined}). Both will load there`;
    return S.length === 0
      ? L
      : `${L}. ${y ? "To switch" : "To keep only this copy in"} ${w ? "one of those projects" : "that project"}${y ? " too" : ""}, run this there: ${S.join(" or ")}`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4460392-4460461 placement
function Rmn(e, n) {
  return e === CLAUDE_PLUGINS_OFFICIAL && typeof n?.source === "string" && entryDeclaresComponents(n);
}
/**
 * 已安装插件来自官方市场族时，在其他官方市场（claude-plugins-official 优先）中找来源相同、未被策略阻止的同名插件，返回 {pluginId, marketplace, sha}。
 */
//@ chunk-e6aww6q8.js:4460461-4461104 placement
async function findOfficialMarketplaceAlternative(e, n) {
  if (Eq()) {
    let { marketplace: marketplace } = parsePluginIdentifier(e);
    if (!marketplace) return;
    let s = await loadKnownMarketplacesSafe(n),
      h = await getPluginByIdCacheOnly(e, n),
      y = h ? samePluginSource(h.entry.source, sourceUrlAndRef(s[marketplace]?.source)) : void 0;
    if (y === void 0) return;
    if (Rmn(marketplace, h?.entry)) return;
    let S =
      marketplace === OFFICIAL_MARKETPLACE_NAME
        ? Object.keys(s)
            .filter(isOfficialMarketplaceName_3)
            .sort((w, L) => Number(L === CLAUDE_PLUGINS_OFFICIAL) - Number(w === CLAUDE_PLUGINS_OFFICIAL))
        : isOfficialMarketplaceName_3(marketplace) && Object.hasOwn(s, OFFICIAL_MARKETPLACE_NAME)
          ? [OFFICIAL_MARKETPLACE_NAME]
          : [];
    for (let w of S) {
      let L = s[w]?.source;
      if (!L || !isSourceAllowedByPolicy(L)) continue;
      let q = (await getMarketplaceCacheOnly(w, n))?.plugins.find(
        (Se) =>
          samePluginSource(Se.source, sourceUrlAndRef(L)) === y &&
          (w !== OFFICIAL_MARKETPLACE_NAME || Prt(Se.name)),
      );
      if (!q || isPluginBlockedByPolicy(`${q.name}@${w}`)) continue;
      let Z = typeof q.source === "object" && "sha" in q.source ? q.source.sha : void 0;
      return { pluginId: `${q.name}@${w}`, marketplace: w, sha: Z };
    }
    return;
  }
  return;
}
/**
 * git 缺失 / 主机拉取失败。
 */
//@ chunk-e6aww6q8.js:4461104-4461208 placement
function classifyOfficialFetchError(e) {
  if (e instanceof GitNotAvailableError) return "git-missing";
  if (e instanceof GitHostFetchFailedError) return "fetch-failed";
  return;
}
/**
 * 官方市场副本下载失败、改从其他市场安装的说明。
 */
//@ chunk-e6aww6q8.js:4461208-4461433 placement
function formatOfficialFallbackNote(e, n) {
  return ` (The ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be downloaded${e === "git-missing" ? ": git was not found" : " from its host"}. Installed the same plugin from ${printableLabel(marketplaceDisplayName(n), { head: 60, tail: 20 }) || "another marketplace"} instead.)`;
}
//@ chunk-e6aww6q8.js:4461433-4462064 placement
function describeInstallFetchFailure(e, n, r, s, h) {
  let y = e === "git-missing" ? "git was not found" : "git could not fetch it from its host",
    S = quotedPrintable(n),
    w = printableLabel(
      printableName(
        truncateMiddle(h, 500, 500, () => " \u2026 "),
        1100,
      ),
      { head: 200, tail: 200 },
    ),
    L = w === "" ? ", for a reason it did not give" : `: ${w}`,
    G = runCommandHint("plugin uninstall", n, {
      extra: s === "user" ? void 0 : `--scope ${s}`,
      fallback: `run \`claude plugin uninstall\` for "${S}"${s === "user" ? "" : ` with --scope ${s}`}`,
    });
  return `Could not download the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy (${y}), so the same plugin was installed from ${printableLabel(marketplaceDisplayName(r), { head: 60, tail: 20 }) || "another marketplace"} instead, but not completely${L}.
${S} is still installed, and may not load. To remove it, ${G}.`;
}
/**
 * 汇总各依赖的版本范围要求及要求方。
 */
//@ chunk-e6aww6q8.js:4462064-4462357 placement
function collectDependencyVersionRanges(e, n) {
  let r = new Map(),
    s = new Map();
  for (let h of e) {
    if (!h.depConstraints || n.has(h.source)) continue;
    for (let [y, S] of h.depConstraints) {
      if (S.version === void 0) continue;
      let w = qualifyDependency(y, h.source);
      (s.set(w, [...(s.get(w) ?? []), h.source]), r.set(w, [...(r.get(w) ?? []), S.version]));
    }
  }
  return { ranges: r, requirers: s };
}
/**
 * 安装前检查：插件被策略阻止、插件目录不可用、市场被策略阻止时返回 refusal；通过时返回已知市场与 failClosedOnUnknownSource。
 */
//@ chunk-e6aww6q8.js:4462357-4462968 placement
async function checkInstallAllowed(e, n, r) {
  if (isPluginBlockedByPolicy(e))
    return { ok: !1, refusal: { ok: !1, reason: "blocked-by-policy", pluginName: n.name } };
  let s = await loadKnownMarketplacesSafe(r),
    h = isStorageV5Enabled() && r !== void 0 && Object.keys(s).length === 0;
  if (await Qft(e, n, s, r))
    return { ok: !1, refusal: { ok: !1, reason: "blocked-by-policy", pluginName: n.name } };
  let y = await pluginDirectoryUnavailableReason(e);
  if (y !== null)
    return {
      ok: !1,
      refusal: { ok: !1, reason: "plugin-directory-unavailable", pluginName: n.name, cause: y },
    };
  let S = findBlockedMarketplace(e, s, { failClosedOnUnknownSource: h });
  if (S)
    return {
      ok: !1,
      refusal: { ok: !1, reason: "marketplace-blocked-by-policy", pluginName: n.name, marketplaceName: S },
    };
  return { ok: !0, knownMarketplaces: s, failClosedOnUnknownSource: h };
}

export {
  checkInstallAllowed,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
  classifyOfficialFetchError,
  collectDependencyVersionRanges,
  describeInstallFetchFailure,
  formatOfficialFallbackNote,
  Rmn,
  findOfficialMarketplaceAlternative,
  formatInstalledMessage,
};
