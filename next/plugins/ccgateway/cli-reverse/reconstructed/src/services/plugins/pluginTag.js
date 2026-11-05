/**
 * services/plugins/pluginTag.ts
 *
 * 2.1.316 新增：插件发布打 git 标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s4mtq5zk.js (26)
 * attribution: placement 26
 */
import { relative, resolve, dirname, join } from "path";
import { stat, readFile } from "fs/promises";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { isMarketplaceSourceDeclaredByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import {
  marketplaceOf,
  hasMarketplaceAlias,
  marketplaceSuffix,
  isOfficialMarketplace,
  pluginNamesEqual,
  splitPluginId,
} from "../../utils/plugins/pluginIdentifier.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import {
  validateHooksJsonForDisplay,
  checkPluginRootClaudeMd,
  readJsonFile,
  matchesDirEntry,
} from "../../utils/plugins/validatePlugin.js";
import { isOfficialMarketplaceName } from "../../utils/plugins/schemas.js";
import { getCwd } from "../../utils/cwd.js";
import { versionFlagSpec } from "../../utils/plugins/pluginVersioning.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { findGitRoot, getChangedFiles, gitExe } from "../../utils/git.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { readGitConfigScoped } from "../../utils/git/gitConfigFilters.js";
import { resolveGitDirsOrPlaceholder } from "../../utils/git/gitDirResolution.js";
import { logForDebugging } from "../../utils/debug.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s4mtq5zk.js:9097-9107 placement
var MAX_SHOWN_MARKETPLACES = 4;
//@ chunk-s4mtq5zk.js:9107-9225 placement
function pickShownMarketplaces(marketplaces, currentMarketplace) {
  let sliced = marketplaces.slice(0, MAX_SHOWN_MARKETPLACES);
  let found = marketplaces.find((marketplace) => marketplace.marketplace === currentMarketplace);
  if (found && !sliced.includes(found)) sliced[sliced.length - 1] = found;
  return sliced;
}
//@ chunk-s4mtq5zk.js:9225-9394 placement
function isListedInKnownMarketplace(plugin, knownNames, knownMarketplacesWithDeclared) {
  return [plugin.marketplaceName, ...(plugin.alsoListedIn ?? [])].some((marketplaceName) => {
    if (!knownNames.has(marketplaceName)) return false;
    if (marketplaceName === CLAUDE_PLUGINS_OFFICIAL) return true;
    let source = knownMarketplacesWithDeclared[marketplaceName]?.source;
    return source !== undefined && isMarketplaceSourceDeclaredByPolicy(marketplaceName, source);
  });
}
//@ chunk-s4mtq5zk.js:9394-9486 placement
function isInMarketplace(availablePlugin, marketplaceFilter) {
  return (
    marketplaceFilter === null ||
    availablePlugin.marketplaceName === marketplaceFilter ||
    (availablePlugin.alsoListedIn?.includes(marketplaceFilter) ?? false)
  );
}
//@ chunk-s4mtq5zk.js:9486-9604 placement (2.1.88 match: _temp0, 1)
function isSameSourcePlugin(plugin, source, name) {
  if (isOrphanPlugin(plugin)) return false;
  if (plugin.source === source) return true;
  return (
    "plugin" in plugin && plugin.plugin === name && marketplaceOf(plugin.source) === marketplaceOf(source)
  );
}
//@ chunk-s4mtq5zk.js:9604-9654 placement
function isOrphanPlugin(plugin) {
  return "orphan" in plugin && plugin.orphan === true;
}
//@ chunk-s4mtq5zk.js:9654-9701 placement
function sameSourceAndName(error, plugin) {
  return isSameSourcePlugin(error, plugin.source, plugin.name);
}
//@ chunk-s4mtq5zk.js:9701-9748 placement
function sameSourceAndNameAlt(warning, plugin) {
  return isSameSourcePlugin(warning, plugin.source, plugin.name);
}
//@ chunk-s4mtq5zk.js:9748-9895 placement (2.1.88 match: _temp0, 1)
function isSameSourceIgnoringAlias(plugin, source, name) {
  if (hasMarketplaceAlias(plugin.source)) return false;
  if (plugin.source === source) return true;
  let marketplace = marketplaceSuffix(plugin.source);
  return (
    "plugin" in plugin &&
    plugin.plugin === name &&
    (marketplace === undefined || marketplace === marketplaceSuffix(source))
  );
}
//@ chunk-s4mtq5zk.js:9895-9961 placement
function matchesPluginSource(plugin, source, name) {
  return isOfficialMarketplace(marketplaceSuffix(source))
    ? isSameSourcePlugin(plugin, source, name)
    : isSameSourceIgnoringAlias(plugin, source, name) && !isOrphanPlugin(plugin);
}
//@ chunk-s4mtq5zk.js:9961-10364 placement (2.1.88 match: _temp0, 0.778)
function findInstalledEntry(plugin, installed) {
  let filtered = installed.filter((installedPlugin) =>
    matchesPluginSource(plugin, installedPlugin.source, installedPlugin.name),
  );
  let match =
    filtered.length === 1
      ? filtered[0]
      : filtered.find((installedPlugin) => pluginNamesEqual(installedPlugin.source, plugin.source));
  if (match)
    return {
      name: match.name,
      marketplace: marketplaceSuffix(match.source),
    };
  let [fallback] = filtered;
  if (fallback !== undefined)
    return {
      name: fallback.name,
      marketplace: undefined,
    };
  let { name, marketplace } = splitPluginId(plugin.source);
  if (marketplace !== undefined)
    return {
      name,
      marketplace,
    };
  let fallbackMarketplace = marketplaceOf(plugin.source);
  return {
    name: fallbackMarketplace !== undefined && "plugin" in plugin && plugin.plugin ? plugin.plugin : name,
    marketplace: fallbackMarketplace,
  };
}
//@ chunk-s4mtq5zk.js:10364-10382 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s4mtq5zk.js:10364", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-s4mtq5zk.js:10502-13351 placement
/**
 * 为插件创建发布标签：校验 marketplace 与 plugin.json 版本、生成 tag 名并调用 git tag。
 */
async function tagPluginRelease(pluginDir, options = {}) {
  let warnings = [];
  let pluginRoot = await readPluginRoot(pluginDir);
  if (!pluginRoot.ok)
    return {
      ok: false,
      error: pluginRoot.error,
      warnings,
    };
  let { pluginRoot: pluginRoot_2, manifestPath, manifest } = pluginRoot;
  let marketplaceEntry =
    typeof manifest.name === "string" && manifest.name.length > 0
      ? await findMarketplaceJsonUp(pluginRoot_2, manifest.name)
      : undefined;
  let hooksCheck = await validateHooksJsonForDisplay(
    manifestPath,
    marketplaceEntry !== undefined && isOfficialMarketplaceName(marketplaceEntry.marketplaceName)
      ? {
          kind: "anthropic",
        }
      : {
          kind: "alone",
        },
  );
  let checks = [hooksCheck];
  if (hooksCheck.success) checks.push(...(await checkPluginRootClaudeMd(pluginRoot_2)));
  for (let check of checks)
    for (let warning of check.warnings)
      warnings.push(`${relative(getCwd(), check.filePath)}: ${warning.message}`);
  let found = checks.find((failed) => !failed.success);
  if (found) {
    let joined = found.errors.map((error) => `  ${error.path}: ${error.message}`).join(`
`);
    return {
      ok: false,
      error: `Plugin validation failed for ${found.filePath}:
${joined}`,
      warnings,
    };
  }
  let pluginName = manifest.name;
  if (typeof pluginName !== "string" || pluginName.length === 0)
    return {
      ok: false,
      error: `plugin.json at ${manifestPath} has no "name" field`,
      warnings,
    };
  let version =
    typeof manifest.version === "string" && manifest.version.length > 0 ? manifest.version : undefined;
  let tagVersion;
  let versionSource;
  if (version !== undefined) {
    tagVersion = version;
    versionSource = "plugin.json";
  } else if (marketplaceEntry?.entry.version) {
    tagVersion = marketplaceEntry.entry.version;
    versionSource = "marketplace entry";
  } else
    return {
      ok: false,
      error:
        `No version to tag. Set "version" in ${relative(getCwd(), manifestPath)}` +
        (marketplaceEntry
          ? ` or in the marketplace entry at ${relative(getCwd(), marketplaceEntry.path)} plugins[${marketplaceEntry.entryIndex}].`
          : ".") +
        " Tags are only used for dependency version constraints, which require an explicit semver \u2014 the git-SHA fallback does not need a tag.",
      warnings,
    };
  if (marketplaceEntry?.entry.version && version !== undefined && marketplaceEntry.entry.version !== version)
    return {
      ok: false,
      error: `Version mismatch: plugin.json says "${version}" but ${relative(getCwd(), marketplaceEntry.path)} plugins[${marketplaceEntry.entryIndex}].version says "${marketplaceEntry.entry.version}". plugin.json wins at install time, so update the marketplace entry to "${version}" (or remove it) before tagging.`,
      warnings,
    };
  if (semverModule.valid(tagVersion) === null)
    return {
      ok: false,
      error: `Version "${tagVersion}" is not valid semver. Dependency resolution (resolveVersionRange) ignores tags whose suffix doesn't parse as semver, so this tag would never be selected.`,
      warnings,
    };
  let tagName = versionFlagSpec(pluginName, tagVersion);
  if (!isSafeRefName(tagName))
    return {
      ok: false,
      error: `Computed tag name "${tagName}" is not a valid git ref. Check the plugin name for characters git rejects (spaces, ~, ^, :, ?, *, [, \\, or sequences like .., @{, //).`,
      warnings,
    };
  let gitRoot = findGitRoot(pluginRoot_2);
  if (gitRoot === null)
    return {
      ok: false,
      error: `${pluginRoot_2} is not inside a git repository. Dependency tags are resolved via git ls-remote, so the plugin must live in a git repo.`,
      warnings,
    };
  if (!options.force) {
    let changedFiles = await getChangedFiles(
      gitRoot,
      marketplaceEntry ? [pluginRoot_2, marketplaceEntry.path] : [pluginRoot_2],
    );
    if (changedFiles.length > 0) {
      let joined = changedFiles.slice(0, 5).join(`
  `);
      let moreSuffix =
        changedFiles.length > 5
          ? `
  \u2026and ${changedFiles.length - 5} more`
          : "";
      return {
        ok: false,
        error: `Uncommitted changes affecting this release \u2014 commit them first so the tag points at the version you intend to release (or use --force):
  ${joined}${moreSuffix}`,
        warnings,
      };
    }
  }
  if (!options.force) {
    if (await gitTagExists(gitRoot, tagName))
      return {
        ok: false,
        error: `Tag "${tagName}" already exists locally. Bump the version in ${versionSource}, or re-run with --force to move the tag.`,
        warnings,
      };
  }
  return {
    ok: true,
    warnings,
    plan: {
      pluginName,
      version: tagVersion,
      versionFrom: versionSource,
      tag: tagName,
      pluginRoot: pluginRoot_2,
      gitRoot,
      marketplace: marketplaceEntry
        ? {
            path: marketplaceEntry.path,
            entryIndex: marketplaceEntry.entryIndex,
            entryVersion: marketplaceEntry.entry.version,
          }
        : undefined,
      validation: checks,
    },
  };
}
//@ chunk-s4mtq5zk.js:13351-14453 placement
async function createPluginGitTag(plan, options) {
  let remoteHostSessionCount = getRemoteHostSessionCount(undefined, {
    userLocale: true,
  });
  let gitConfigScoped = await readGitConfigScoped(plan.gitRoot, GIT_SIGNING_CONFIG_PATTERN, {
    envPins: {},
    base: remoteHostSessionCount,
    repository: resolveGitDirsOrPlaceholder(plan.gitRoot),
  });
  if (gitConfigScoped === null)
    logForDebugging(
      `[plugin tag] could not read the user's git signing configuration; ${plan.tag} is created unsigned`,
      {
        level: "warn",
      },
    );
  let args = [
    "-C",
    plan.gitRoot,
    ...[...GIT_SIGNING_OVERRIDES, ...(gitConfigScoped ?? [])].flatMap(([key, value]) => [
      "-c",
      `${key}=${value}`,
    ]),
    "tag",
  ];
  if (options.force) args.push("-f");
  args.push("-a", "-m", formatTagName(plan, options.message), "--", plan.tag, "HEAD");
  let result = await execFileNoThrow(gitExe(), args, {
    env: remoteHostSessionCount,
    useCwd: true,
  });
  if (result.code !== 0)
    return {
      ok: false,
      error: `git tag failed (exit ${result.code}): ${result.stderr.trim() || result.stdout.trim()}`,
    };
  if (!options.push)
    return {
      ok: true,
      pushed: false,
    };
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(options.remote))
    return {
      ok: false,
      error: `Tag created locally but not pushed: "${options.remote}" is not a valid remote name.`,
    };
  let pushArgs = ["-C", plan.gitRoot, "push"];
  if (options.force) pushArgs.push("--force");
  pushArgs.push(options.remote, `refs/tags/${plan.tag}`);
  let pushResult = await execFileNoThrow("git", pushArgs, {
    allowRepoGitHooks: true,
    allowGitTerminalPrompt: options.allowGitTerminalPrompt,
    useCwd: true,
  });
  if (pushResult.code !== 0)
    return {
      ok: false,
      error: `Tag created locally but push failed (exit ${pushResult.code}): ${pushResult.stderr.trim() || pushResult.stdout.trim()}`,
    };
  return {
    ok: true,
    pushed: true,
  };
}
//@ chunk-s4mtq5zk.js:14453-14549 placement
function formatTagName(plan, message) {
  return message === undefined
    ? `${plan.pluginName} ${plan.version}`
    : message.replaceAll("%s", plan.version);
}
//@ chunk-s4mtq5zk.js:14549-15187 placement
async function readPluginRoot(targetPath) {
  let resolved = resolve(targetPath);
  let stats;
  try {
    stats = await stat(resolved);
  } catch (error) {
    return {
      ok: false,
      error: isENOENT(error)
        ? `Path not found: ${resolved}`
        : `Cannot stat ${resolved}: ${errorMessage(error)}`,
    };
  }
  let candidates = stats.isFile()
    ? [[dirname(dirname(resolved)), resolved]]
    : [
        [resolved, join(resolved, ".claude-plugin", "plugin.json")],
        [dirname(resolved), join(resolved, "plugin.json")],
      ];
  for (let [root, manifestPath] of candidates) {
    let manifestText;
    try {
      manifestText = await readFile(manifestPath, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      return {
        ok: false,
        error: `Cannot read ${manifestPath}: ${errorMessage(error)}`,
      };
    }
    let manifest;
    try {
      manifest = jsonParse(stripBom(manifestText));
    } catch (error) {
      return {
        ok: false,
        error: `Invalid JSON in ${manifestPath}: ${errorMessage(error)}`,
      };
    }
    return {
      ok: true,
      pluginRoot: root,
      manifestPath,
      manifest: typeof manifest === "object" && manifest !== null ? manifest : {},
    };
  }
  return {
    ok: false,
    error: `No plugin manifest found. Expected ${join(resolved, ".claude-plugin", "plugin.json")}.`,
  };
}
//@ chunk-s4mtq5zk.js:15187-15480 placement
async function findMarketplaceJsonUp(pluginRoot, name) {
  let gitRoot = findGitRoot(pluginRoot) ?? undefined;
  let dir = pluginRoot;
  for (;;) {
    let path = join(dir, ".claude-plugin", "marketplace.json");
    let jsonFile = await readJsonFile(path);
    if (jsonFile) {
      for (let [index, entry] of jsonFile.plugins.entries())
        if (
          matchesDirEntry(entry, dir, {
            root: pluginRoot,
            name,
          })
        )
          return {
            path,
            marketplaceName: jsonFile.name,
            entryIndex: index,
            entry,
          };
    }
    if (dir === gitRoot) return;
    let parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
//@ chunk-s4mtq5zk.js:15762-15893 placement
async function gitTagExists(gitRoot, tagName) {
  let result = await execFileNoThrow(gitExe(), ["-C", gitRoot, "tag", "-l", "--", tagName], {
    env: getRemoteHostSessionCount(),
    useCwd: true,
  });
  return result.code === 0 && result.stdout.trim() === tagName;
}
//@ chunk-s4mtq5zk.js:15893-16253 placement
/**
 * 发布标签时强制使用的 git 配置覆盖。
 */
var GIT_SIGNING_CONFIG_PATTERN =
  "^(tag\\.(gpgsign|forcesignannotated)|user\\.signingkey|gpg\\.(format|program)|gpg\\.(openpgp|x509|ssh)\\.program|gpg\\.ssh\\.defaultkeycommand)$";
var GIT_SIGNING_OVERRIDES = [
  ["tag.gpgSign", "false"],
  ["tag.forceSignAnnotated", "false"],
  ["gpg.format", "openpgp"],
  ["gpg.program", "gpg"],
  ["gpg.x509.program", "gpgsm"],
  ["gpg.ssh.program", "ssh-keygen"],
  ["gpg.ssh.defaultKeyCommand", ""],
];
//@ chunk-s4mtq5zk.js:16253-16276 placement
var OWNER_REPO_PLACEHOLDER = "<owner>/<repo>";
//@ chunk-s4mtq5zk.js:16276-16422 placement
var VALIDATE_MARKETPLACE_HINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s4mtq5zk.js:16276", () => {
  VALIDATE_MARKETPLACE_HINT = [
    "Validate the folder that holds its marketplace.json",
    `to have ${OWNER_REPO_PLACEHOLDER} filled in,`,
    "and the name its marketplace lists it under.",
  ].join(" ");
});
//@ chunk-s4mtq5zk.js:16451-16795 placement
function readmeMissingInstallLine({ name: pluginName, listing }) {
  let missingEntry = listing !== undefined && listing.entry === undefined;
  return [
    `This README has no line that installs "${pluginName}"`,
    "from a marketplace.",
    ...(missingEntry
      ? [join(listing.root, ".claude-plugin", "marketplace.json"), "has no entry for it. Add one."]
      : []),
    `${missingEntry ? "Then add" : "Add"} the install line,`,
    "which works in one step on Claude Code 2.1.275 or later.",
  ].join(" ");
}
//@ chunk-s4mtq5zk.js:16795-16806 placement
var MAX_PLUGIN_NAME_LENGTH = 128;
//@ chunk-s4mtq5zk.js:16806-16865 placement
function memoizeInMap(cache, root, load) {
  let value = cache.get(root) ?? load(root);
  cache.set(root, value);
  return value;
}
//@ chunk-s4mtq5zk.js:16865-16956 placement
var REPLACE_OWNER_REPO_HINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s4mtq5zk.js:16865", () => {
  REPLACE_OWNER_REPO_HINT = [
    `In it, replace ${OWNER_REPO_PLACEHOLDER}`,
    "with the repository that holds the marketplace.",
  ].join(" ");
});
//@ chunk-s4mtq5zk.js:16956-16967 placement
var README_SCAN_BYTES = 1024;
export {
  findInstalledEntry,
  tagPluginRelease,
  formatTagName,
  createPluginGitTag,
  matchesPluginSource,
  sameSourceAndName,
  sameSourceAndNameAlt,
  memoizeInMap,
  MAX_PLUGIN_NAME_LENGTH,
  VALIDATE_MARKETPLACE_HINT,
  REPLACE_OWNER_REPO_HINT,
  README_SCAN_BYTES,
  readmeMissingInstallLine,
  OWNER_REPO_PLACEHOLDER,
  isInMarketplace,
  isListedInKnownMarketplace,
  pickShownMarketplaces,
  MAX_SHOWN_MARKETPLACES,
  isOrphanPlugin,
};
