/**
 * utils/plugins/installResultMessages.ts
 *
 * 2.1.316 新增：安装结果文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
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

//@ chunk-5xgkngpb.js:4565763-4566009 placement
/**
 * 同名插件在其他项目作用域的安装。
 */
async function findOtherProjectInstalls(pluginId, entry, knownMarketplaces, storageV5) {
  return (
    await findOtherMarketplaceInstalls(
      pluginId,
      entry,
      knownMarketplaces,
      (installation) => !isInstallationRelevantToCurrentProject(installation),
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
//@ chunk-5xgkngpb.js:4566009-4566321 placement
/**
 * ✓ Installed … 文案，附依赖、其他项目说明与禁用提示。
 */
function formatInstalledMessage(options) {
  let installedText = `\u2713 Installed ${options.otherProjectsNote === "" ? options.name : `"${quotedPrintable(options.name, 120)}"`}${options.depNote}.${options.otherProjectsNote === "" ? "" : ` ${options.otherProjectsNote}.`}`;
  return options.disabled === undefined
    ? installedText
    : `${installedText} This plugin is disabled ${options.disabled === "by-default" ? "by default" : "in your settings"} \u2014 ${options.enableHint}`;
}
//@ chunk-5xgkngpb.js:4566321-4567076 placement
function describeOtherMarketplaceInstall(pluginId, name, installs) {
  {
    if (installs.length === 0) return "";
    let marketplaceNames = new Intl.ListFormat("en", {
      type: "conjunction",
    }).format(
      normalizeCaseForComparison_2(
        installs.map((install) => qualifiedMarketplaceLabel(install.pluginId, "another marketplace")),
      ),
    );
    let joined = installs
      .map((install) => {
        let projectLabel = printableLabel(printableName(install.projectPath, 200));
        return projectLabel === "" ? `${install.scope} scope` : `${projectLabel}, ${install.scope} scope`;
      })
      .join("; ");
    let canSwitch = canReplaceOfficialInstalls(pluginId, installs);
    let commands = normalizeCaseForComparison_2(
      installs.flatMap(
        (install) =>
          (install.scope === "local" && canSwitch
            ? claudeCommand("plugin install", pluginId, "--replace --scope local")
            : claudeCommand("plugin uninstall", install.pluginId, `--scope ${install.scope}`)) ?? [],
      ),
    );
    let isPlural = installs.length > 1;
    let note = `Note: "${quotedPrintable(name, 120)}" is also installed from ${marketplaceNames} in ${isPlural ? "other projects" : "another project"} (${joined}). Both will load there`;
    return commands.length === 0
      ? note
      : `${note}. ${canSwitch ? "To switch" : "To keep only this copy in"} ${isPlural ? "one of those projects" : "that project"}${canSwitch ? " too" : ""}, run this there: ${commands.join(" or ")}`;
  }
  return "";
}
//@ chunk-5xgkngpb.js:4567076-4567145 placement
/**
 * isOfficialFamilySameSource：官方市场族内同源插件。
 */
function isOfficialFamilySameSource(marketplace, entry) {
  return (
    marketplace === CLAUDE_PLUGINS_OFFICIAL &&
    typeof entry?.source === "string" &&
    entryDeclaresComponents(entry)
  );
}
//@ chunk-5xgkngpb.js:4567145-4567790 placement
/**
 * 已安装插件来自官方市场族时，在其他官方市场（claude-plugins-official 优先）中找来源相同、未被策略阻止的同名插件，返回 {pluginId, marketplace, sha}。
 */
async function findOfficialMarketplaceAlternative(pluginId, storageV5) {
  if (isPluginDirectoryAvailable()) {
    let { marketplace } = parsePluginIdentifier(pluginId);
    if (!marketplace) return;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(pluginId, storageV5);
    let sourceKey = pluginByIdCacheOnly
      ? samePluginSource(
          pluginByIdCacheOnly.entry.source,
          sourceUrlAndRef(knownMarketplaces[marketplace]?.source),
        )
      : undefined;
    if (sourceKey === undefined) return;
    if (isOfficialFamilySameSource(marketplace, pluginByIdCacheOnly?.entry)) return;
    let candidates =
      marketplace === OFFICIAL_MARKETPLACE_NAME
        ? Object.keys(knownMarketplaces)
            .filter(isOfficialMarketplaceName_3)
            .sort(
              (leftName, rightName) =>
                Number(rightName === CLAUDE_PLUGINS_OFFICIAL) - Number(leftName === CLAUDE_PLUGINS_OFFICIAL),
            )
        : isOfficialMarketplaceName_3(marketplace) &&
            Object.hasOwn(knownMarketplaces, OFFICIAL_MARKETPLACE_NAME)
          ? [OFFICIAL_MARKETPLACE_NAME]
          : [];
    for (let marketplaceName of candidates) {
      let source = knownMarketplaces[marketplaceName]?.source;
      if (!source || !isSourceAllowedByPolicy(source)) continue;
      let found = (await getMarketplaceCacheOnly(marketplaceName, storageV5))?.plugins.find(
        (plugin) =>
          samePluginSource(plugin.source, sourceUrlAndRef(source)) === sourceKey &&
          (marketplaceName !== OFFICIAL_MARKETPLACE_NAME || isReviewerMarkedEntry(plugin.name)),
      );
      if (!found || isPluginBlockedByPolicy(`${found.name}@${marketplaceName}`)) continue;
      let sha = typeof found.source === "object" && "sha" in found.source ? found.source.sha : undefined;
      return {
        pluginId: `${found.name}@${marketplaceName}`,
        marketplace: marketplaceName,
        sha,
      };
    }
    return;
  }
  return;
}
//@ chunk-5xgkngpb.js:4567790-4567894 placement
/**
 * git 缺失 / 主机拉取失败。
 */
function classifyOfficialFetchError(error) {
  if (error instanceof GitNotAvailableError) return "git-missing";
  if (error instanceof GitHostFetchFailedError) return "fetch-failed";
  return;
}
//@ chunk-5xgkngpb.js:4567894-4568119 placement
/**
 * 官方市场副本下载失败、改从其他市场安装的说明。
 */
function formatOfficialFallbackNote(cause, marketplace) {
  return ` (The ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy could not be downloaded${cause === "git-missing" ? ": git was not found" : " from its host"}. Installed the same plugin from ${
    printableLabel(marketplaceDisplayName(marketplace), {
      head: 60,
      tail: 20,
    }) || "another marketplace"
  } instead.)`;
}
//@ chunk-5xgkngpb.js:4568119-4568749 placement
function describeInstallFetchFailure(cause, pluginId, marketplace, scope, errorText) {
  let causeText = cause === "git-missing" ? "git was not found" : "git could not fetch it from its host";
  let pluginLabel = quotedPrintable(pluginId);
  let detail = printableLabel(
    printableName(
      truncateMiddle(errorText, 500, 500, () => " \u2026 "),
      1100,
    ),
    {
      head: 200,
      tail: 200,
    },
  );
  let detailSuffix = detail === "" ? ", for a reason it did not give" : `: ${detail}`;
  let uninstallHint = runCommandHint("plugin uninstall", pluginId, {
    extra: scope === "user" ? undefined : `--scope ${scope}`,
    fallback: `run \`claude plugin uninstall\` for "${pluginLabel}"${scope === "user" ? "" : ` with --scope ${scope}`}`,
  });
  return `Could not download the ${OFFICIAL_MARKETPLACE_DISPLAY}'s copy (${causeText}), so the same plugin was installed from ${
    printableLabel(marketplaceDisplayName(marketplace), {
      head: 60,
      tail: 20,
    }) || "another marketplace"
  } instead, but not completely${detailSuffix}.
${pluginLabel} is still installed, and may not load. To remove it, ${uninstallHint}.`;
}
//@ chunk-5xgkngpb.js:4568749-4569042 placement
/**
 * 汇总各依赖的版本范围要求及要求方。
 */
function collectDependencyVersionRanges(plugins, exclude) {
  let ranges = new Map();
  let requirers = new Map();
  for (let plugin of plugins) {
    if (!plugin.depConstraints || exclude.has(plugin.source)) continue;
    for (let [rawDependency, constraint] of plugin.depConstraints) {
      if (constraint.version === undefined) continue;
      let dependencyId = qualifyDependency(rawDependency, plugin.source);
      requirers.set(dependencyId, [...(requirers.get(dependencyId) ?? []), plugin.source]);
      ranges.set(dependencyId, [...(ranges.get(dependencyId) ?? []), constraint.version]);
    }
  }
  return {
    ranges,
    requirers,
  };
}
//@ chunk-5xgkngpb.js:4569042-4569653 placement
/**
 * 安装前检查：插件被策略阻止、插件目录不可用、市场被策略阻止时返回 refusal；通过时返回已知市场与 failClosedOnUnknownSource。
 */
async function checkInstallAllowed(pluginId, entry, storageV5) {
  if (isPluginBlockedByPolicy(pluginId))
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "blocked-by-policy",
        pluginName: entry.name,
      },
    };
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let failClosedOnUnknownSource =
    isStorageV5Enabled() && storageV5 !== undefined && Object.keys(knownMarketplaces).length === 0;
  if (await isListingUsableForMarketplace(pluginId, entry, knownMarketplaces, storageV5))
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "blocked-by-policy",
        pluginName: entry.name,
      },
    };
  let unavailableCause = await pluginDirectoryUnavailableReason(pluginId);
  if (unavailableCause !== null)
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "plugin-directory-unavailable",
        pluginName: entry.name,
        cause: unavailableCause,
      },
    };
  let blockedMarketplace = findBlockedMarketplace(pluginId, knownMarketplaces, {
    failClosedOnUnknownSource,
  });
  if (blockedMarketplace)
    return {
      ok: false,
      refusal: {
        ok: false,
        reason: "marketplace-blocked-by-policy",
        pluginName: entry.name,
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
  collectDependencyVersionRanges,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
  formatInstalledMessage,
  classifyOfficialFetchError,
  describeInstallFetchFailure,
  formatOfficialFallbackNote,
  isOfficialFamilySameSource,
  findOfficialMarketplaceAlternative,
};
