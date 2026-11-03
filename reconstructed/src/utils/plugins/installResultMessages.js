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
  isListingUsableForMarketplace,
  pluginDirectoryUnavailableReason,
  findBlockedMarketplace,
} from "./pluginDependencies.js";
import { isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import { quotedPrintable, printableLabel, printableName } from "../printableName.js";
import { uniq } from "../collections.js";
import { qualifiedMarketplaceLabel, canReplaceOfficialInstalls } from "./crossMarketplaceInstall.js";
import { claudeCommand, runCommandHint } from "../worktreeResumeHint.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { entryDeclaresComponents, GitNotAvailableError, GitHostFetchFailedError } from "./pluginLoader.js";
import {
  isPluginDirectoryAvailable,
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
import { isReviewerMarkedEntry } from "./commandSourceErrors.js";
import { truncateMiddle } from "../stringUtils.js";
import { qualifyDependency } from "./dependencyResolver.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-e6aww6q8.js:4459079-4459325 placement
/**
 * 同名插件在其他项目作用域的安装。
 */
async function findOtherProjectInstalls(pluginId, entry, knownMarketplaces, storageV5) {
  return (
    await findOtherMarketplaceInstalls(
      pluginId,
      entry,
      knownMarketplaces,
      (y) => !isInstallationRelevantToCurrentProject(y),
      storageV5,
    )
  ).flatMap(({ otherId, installations }) =>
    installations.flatMap((installation) =>
      (installation.scope === "project" || installation.scope === "local") &&
      installation.projectPath !== undefined
        ? [
            {
              pluginId: otherId,
              scope: installation.scope,
              projectPath: installation.projectPath,
            },
          ]
        : [],
    ),
  );
}
//@ chunk-e6aww6q8.js:4459325-4459637 placement
/**
 * ✓ Installed … 文案，附依赖、其他项目说明与禁用提示。
 */
function formatInstalledMessage(e) {
  let r = `\u2713 Installed ${e.otherProjectsNote === "" ? e.name : `"${quotedPrintable(e.name, 120)}"`}${e.depNote}.${e.otherProjectsNote === "" ? "" : ` ${e.otherProjectsNote}.`}`;
  return e.disabled === undefined
    ? r
    : `${r} This plugin is disabled ${e.disabled === "by-default" ? "by default" : "in your settings"} \u2014 ${e.enableHint}`;
}
//@ chunk-e6aww6q8.js:4459637-4460392 placement
function describeOtherMarketplaceInstall(pluginId, name, r) {
  {
    if (r.length === 0) return "";
    let s = new Intl.ListFormat("en", {
      type: "conjunction",
    }).format(uniq(r.map((G) => qualifiedMarketplaceLabel(G.pluginId, "another marketplace"))));
    let joined = r
      .map((G) => {
        let q = printableLabel(printableName(G.projectPath, 200));
        return q === "" ? `${G.scope} scope` : `${q}, ${G.scope} scope`;
      })
      .join("; ");
    let y = canReplaceOfficialInstalls(pluginId, r);
    let S = uniq(
      r.flatMap(
        (G) =>
          (G.scope === "local" && y
            ? claudeCommand("plugin install", pluginId, "--replace --scope local")
            : claudeCommand("plugin uninstall", G.pluginId, `--scope ${G.scope}`)) ?? [],
      ),
    );
    let w = r.length > 1;
    let L = `Note: "${quotedPrintable(name, 120)}" is also installed from ${s} in ${w ? "other projects" : "another project"} (${joined}). Both will load there`;
    return S.length === 0
      ? L
      : `${L}. ${y ? "To switch" : "To keep only this copy in"} ${w ? "one of those projects" : "that project"}${y ? " too" : ""}, run this there: ${S.join(" or ")}`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4460392-4460461 placement
/**
 * isOfficialFamilySameSource：官方市场族内同源插件。
 */
function isOfficialFamilySameSource(e, entry) {
  return e === CLAUDE_PLUGINS_OFFICIAL && typeof entry?.source === "string" && entryDeclaresComponents(entry);
}
//@ chunk-e6aww6q8.js:4460461-4461104 placement
/**
 * 已安装插件来自官方市场族时，在其他官方市场（claude-plugins-official 优先）中找来源相同、未被策略阻止的同名插件，返回 {pluginId, marketplace, sha}。
 */
async function findOfficialMarketplaceAlternative(e, storageV5) {
  if (isPluginDirectoryAvailable()) {
    let { marketplace } = parsePluginIdentifier(e);
    if (!marketplace) return;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(e, storageV5);
    let y = pluginByIdCacheOnly
      ? samePluginSource(
          pluginByIdCacheOnly.entry.source,
          sourceUrlAndRef(knownMarketplaces[marketplace]?.source),
        )
      : undefined;
    if (y === undefined) return;
    if (isOfficialFamilySameSource(marketplace, pluginByIdCacheOnly?.entry)) return;
    let S =
      marketplace === OFFICIAL_MARKETPLACE_NAME
        ? Object.keys(knownMarketplaces)
            .filter(isOfficialMarketplaceName_3)
            .sort((w, L) => Number(L === CLAUDE_PLUGINS_OFFICIAL) - Number(w === CLAUDE_PLUGINS_OFFICIAL))
        : isOfficialMarketplaceName_3(marketplace) &&
            Object.hasOwn(knownMarketplaces, OFFICIAL_MARKETPLACE_NAME)
          ? [OFFICIAL_MARKETPLACE_NAME]
          : [];
    for (let w of S) {
      let source = knownMarketplaces[w]?.source;
      if (!source || !isSourceAllowedByPolicy(source)) continue;
      let found = (await getMarketplaceCacheOnly(w, storageV5))?.plugins.find(
        (plugin) =>
          samePluginSource(plugin.source, sourceUrlAndRef(source)) === y &&
          (w !== OFFICIAL_MARKETPLACE_NAME || isReviewerMarkedEntry(plugin.name)),
      );
      if (!found || isPluginBlockedByPolicy(`${found.name}@${w}`)) continue;
      let sha = typeof found.source === "object" && "sha" in found.source ? found.source.sha : undefined;
      return {
        pluginId: `${found.name}@${w}`,
        marketplace: w,
        sha,
      };
    }
    return;
  }
  return;
}
//@ chunk-e6aww6q8.js:4461104-4461208 placement
/**
 * git 缺失 / 主机拉取失败。
 */
function classifyOfficialFetchError(error) {
  if (error instanceof GitNotAvailableError) return "git-missing";
  if (error instanceof GitHostFetchFailedError) return "fetch-failed";
  return;
}
//@ chunk-e6aww6q8.js:4461208-4461433 placement
/**
 * 官方市场副本下载失败、改从其他市场安装的说明。
 */
function formatOfficialFallbackNote(e, marketplace) {
  return ` (The ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be downloaded${e === "git-missing" ? ": git was not found" : " from its host"}. Installed the same plugin from ${
    printableLabel(marketplaceDisplayName(marketplace), {
      head: 60,
      tail: 20,
    }) || "another marketplace"
  } instead.)`;
}
//@ chunk-e6aww6q8.js:4461433-4462064 placement
function describeInstallFetchFailure(e, n, marketplace, scope, h) {
  let y = e === "git-missing" ? "git was not found" : "git could not fetch it from its host";
  let S = quotedPrintable(n);
  let w = printableLabel(
    printableName(
      truncateMiddle(h, 500, 500, () => " \u2026 "),
      1100,
    ),
    {
      head: 200,
      tail: 200,
    },
  );
  let L = w === "" ? ", for a reason it did not give" : `: ${w}`;
  let G = runCommandHint("plugin uninstall", n, {
    extra: scope === "user" ? undefined : `--scope ${scope}`,
    fallback: `run \`claude plugin uninstall\` for "${S}"${scope === "user" ? "" : ` with --scope ${scope}`}`,
  });
  return `Could not download the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy (${y}), so the same plugin was installed from ${
    printableLabel(marketplaceDisplayName(marketplace), {
      head: 60,
      tail: 20,
    }) || "another marketplace"
  } instead, but not completely${L}.
${S} is still installed, and may not load. To remove it, ${G}.`;
}
//@ chunk-e6aww6q8.js:4462064-4462357 placement
/**
 * 汇总各依赖的版本范围要求及要求方。
 */
function collectDependencyVersionRanges(e, n) {
  let r = new Map();
  let s = new Map();
  for (let h of e) {
    if (!h.depConstraints || n.has(h.source)) continue;
    for (let [y, S] of h.depConstraints) {
      if (S.version === undefined) continue;
      let w = qualifyDependency(y, h.source);
      s.set(w, [...(s.get(w) ?? []), h.source]);
      r.set(w, [...(r.get(w) ?? []), S.version]);
    }
  }
  return {
    ranges: r,
    requirers: s,
  };
}
//@ chunk-e6aww6q8.js:4462357-4462968 placement
/**
 * 安装前检查：插件被策略阻止、插件目录不可用、市场被策略阻止时返回 refusal；通过时返回已知市场与 failClosedOnUnknownSource。
 */
async function checkInstallAllowed(e, n, storageV5) {
  if (isPluginBlockedByPolicy(e))
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "blocked-by-policy",
        pluginName: n.name,
      },
    };
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let failClosedOnUnknownSource =
    isStorageV5Enabled() && storageV5 !== undefined && Object.keys(knownMarketplaces).length === 0;
  if (await isListingUsableForMarketplace(e, n, knownMarketplaces, storageV5))
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "blocked-by-policy",
        pluginName: n.name,
      },
    };
  let y = await pluginDirectoryUnavailableReason(e);
  if (y !== null)
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "plugin-directory-unavailable",
        pluginName: n.name,
        cause: y,
      },
    };
  let blockedMarketplace = findBlockedMarketplace(e, knownMarketplaces, {
    failClosedOnUnknownSource,
  });
  if (blockedMarketplace)
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "marketplace-blocked-by-policy",
        pluginName: n.name,
        marketplaceName: blockedMarketplace,
      },
    };
  return {
    ok: true,
    knownMarketplaces,
    failClosedOnUnknownSource,
  };
}
export {
  checkInstallAllowed,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
  classifyOfficialFetchError,
  collectDependencyVersionRanges,
  describeInstallFetchFailure,
  formatOfficialFallbackNote,
  isOfficialFamilySameSource,
  findOfficialMarketplaceAlternative,
  formatInstalledMessage,
};
