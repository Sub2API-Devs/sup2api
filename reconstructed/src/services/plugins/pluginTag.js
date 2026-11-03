/**
 * services/plugins/pluginTag.ts
 *
 * 2.1.316 新增：插件发布打 git 标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ca06bv0t.js (26)
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
import { Re } from "../../../runtime/bun-runtime.js";
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

//@ chunk-ca06bv0t.js:9094-9104 placement
var MAX_SHOWN_MARKETPLACES = 4;
//@ chunk-ca06bv0t.js:9104-9222 placement
function pickShownMarketplaces(r, n) {
  let sliced = r.slice(0, MAX_SHOWN_MARKETPLACES);
  let found = r.find((s) => s.marketplace === n);
  if (found && !sliced.includes(found)) sliced[sliced.length - 1] = found;
  return sliced;
}
//@ chunk-ca06bv0t.js:9222-9391 placement
function isListedInKnownMarketplace(r, n, knownMarketplacesWithDeclared) {
  return [r.marketplaceName, ...(r.alsoListedIn ?? [])].some((a) => {
    if (!n.has(a)) return false;
    if (a === CLAUDE_PLUGINS_OFFICIAL) return true;
    let source = knownMarketplacesWithDeclared[a]?.source;
    return source !== undefined && isMarketplaceSourceDeclaredByPolicy(a, source);
  });
}
//@ chunk-ca06bv0t.js:9391-9483 placement
function isInMarketplace(availablePlugin, marketplaceFilter) {
  return (
    marketplaceFilter === null ||
    availablePlugin.marketplaceName === marketplaceFilter ||
    (availablePlugin.alsoListedIn?.includes(marketplaceFilter) ?? false)
  );
}
//@ chunk-ca06bv0t.js:9483-9601 placement = _temp0 (1)
function isSameSourcePlugin(r, source, name) {
  if (isOrphanPlugin(r)) return false;
  if (r.source === source) return true;
  return "plugin" in r && r.plugin === name && marketplaceOf(r.source) === marketplaceOf(source);
}
//@ chunk-ca06bv0t.js:9601-9651 placement
function isOrphanPlugin(r) {
  return "orphan" in r && r.orphan === true;
}
//@ chunk-ca06bv0t.js:9651-9698 placement
function sameSourceAndName(error, plugin) {
  return isSameSourcePlugin(error, plugin.source, plugin.name);
}
//@ chunk-ca06bv0t.js:9698-9745 placement
function sameSourceAndNameAlt(warning, plugin) {
  return isSameSourcePlugin(warning, plugin.source, plugin.name);
}
//@ chunk-ca06bv0t.js:9745-9891 placement = _temp0 (1)
function isSameSourceIgnoringAlias(r, n, i) {
  if (hasMarketplaceAlias(r.source)) return false;
  if (r.source === n) return true;
  let a = marketplaceSuffix(r.source);
  return "plugin" in r && r.plugin === i && (a === undefined || a === marketplaceSuffix(n));
}
//@ chunk-ca06bv0t.js:9891-9957 placement
function matchesPluginSource(r, n, name) {
  return isOfficialMarketplace(marketplaceSuffix(n))
    ? isSameSourcePlugin(r, n, name)
    : isSameSourceIgnoringAlias(r, n, name) && !isOrphanPlugin(r);
}
//@ chunk-ca06bv0t.js:9957-10360 placement = _temp0 (0.778)
function findInstalledEntry(r, n) {
  let filtered = n.filter((m) => matchesPluginSource(r, m.source, m.name));
  let a = filtered.length === 1 ? filtered[0] : filtered.find((m) => pluginNamesEqual(m.source, r.source));
  if (a)
    return {
      name: a.name,
      marketplace: marketplaceSuffix(a.source),
    };
  let [s] = filtered;
  if (s !== undefined)
    return {
      name: s.name,
      marketplace: undefined,
    };
  let { name: f, marketplace } = splitPluginId(r.source);
  if (marketplace !== undefined)
    return {
      name: f,
      marketplace,
    };
  let c = marketplaceOf(r.source);
  return {
    name: c !== undefined && "plugin" in r && r.plugin ? r.plugin : f,
    marketplace: c,
  };
}
//@ chunk-ca06bv0t.js:10360-10378 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule = Re(require_semver_3(), 1);
//@ chunk-ca06bv0t.js:10498-13347 placement
/**
 * 为插件创建发布标签：校验 marketplace 与 plugin.json 版本、生成 tag 名并调用 git tag。
 */
async function tagPluginRelease(r, n = {}) {
  let i = [];
  let pluginRoot = await readPluginRoot(r);
  if (!pluginRoot.ok)
    return {
      ok: false,
      error: pluginRoot.error,
      warnings: i,
    };
  let { pluginRoot: pluginRoot_2, manifestPath, manifest } = pluginRoot;
  let c =
    typeof manifest.name === "string" && manifest.name.length > 0
      ? await findMarketplaceJsonUp(pluginRoot_2, manifest.name)
      : undefined;
  let m = await validateHooksJsonForDisplay(
    manifestPath,
    c !== undefined && isOfficialMarketplaceName(c.marketplaceName)
      ? {
          kind: "anthropic",
        }
      : {
          kind: "alone",
        },
  );
  let h = [m];
  if (m.success) h.push(...(await checkPluginRootClaudeMd(pluginRoot_2)));
  for (let v of h)
    for (let warning of v.warnings) i.push(`${relative(getCwd(), v.filePath)}: ${warning.message}`);
  let found = h.find((v) => !v.success);
  if (found) {
    let joined = found.errors.map((error) => `  ${error.path}: ${error.message}`).join(`
`);
    return {
      ok: false,
      error: `Plugin validation failed for ${found.filePath}:
${joined}`,
      warnings: i,
    };
  }
  let b = manifest.name;
  if (typeof b !== "string" || b.length === 0)
    return {
      ok: false,
      error: `plugin.json at ${manifestPath} has no "name" field`,
      warnings: i,
    };
  let version =
    typeof manifest.version === "string" && manifest.version.length > 0 ? manifest.version : undefined;
  let g;
  let k;
  if (version !== undefined) {
    g = version;
    k = "plugin.json";
  } else if (c?.entry.version) {
    g = c.entry.version;
    k = "marketplace entry";
  } else
    return {
      ok: false,
      error:
        `No version to tag. Set "version" in ${relative(getCwd(), manifestPath)}` +
        (c
          ? ` or in the marketplace entry at ${relative(getCwd(), c.path)} plugins[${c.entryIndex}].`
          : ".") +
        " Tags are only used for dependency version constraints, which require an explicit semver \u2014 the git-SHA fallback does not need a tag.",
      warnings: i,
    };
  if (c?.entry.version && version !== undefined && c.entry.version !== version)
    return {
      ok: false,
      error: `Version mismatch: plugin.json says "${version}" but ${relative(getCwd(), c.path)} plugins[${c.entryIndex}].version says "${c.entry.version}". plugin.json wins at install time, so update the marketplace entry to "${version}" (or remove it) before tagging.`,
      warnings: i,
    };
  if (semverModule.valid(g) === null)
    return {
      ok: false,
      error: `Version "${g}" is not valid semver. Dependency resolution (resolveVersionRange) ignores tags whose suffix doesn't parse as semver, so this tag would never be selected.`,
      warnings: i,
    };
  let S = versionFlagSpec(b, g);
  if (!isSafeRefName(S))
    return {
      ok: false,
      error: `Computed tag name "${S}" is not a valid git ref. Check the plugin name for characters git rejects (spaces, ~, ^, :, ?, *, [, \\, or sequences like .., @{, //).`,
      warnings: i,
    };
  let gitRoot = findGitRoot(pluginRoot_2);
  if (gitRoot === null)
    return {
      ok: false,
      error: `${pluginRoot_2} is not inside a git repository. Dependency tags are resolved via git ls-remote, so the plugin must live in a git repo.`,
      warnings: i,
    };
  if (!n.force) {
    let changedFiles = await getChangedFiles(gitRoot, c ? [pluginRoot_2, c.path] : [pluginRoot_2]);
    if (changedFiles.length > 0) {
      let joined = changedFiles.slice(0, 5).join(`
  `);
      let F =
        changedFiles.length > 5
          ? `
  \u2026and ${changedFiles.length - 5} more`
          : "";
      return {
        ok: false,
        error: `Uncommitted changes affecting this release \u2014 commit them first so the tag points at the version you intend to release (or use --force):
  ${joined}${F}`,
        warnings: i,
      };
    }
  }
  if (!n.force) {
    if (await gitTagExists(gitRoot, S))
      return {
        ok: false,
        error: `Tag "${S}" already exists locally. Bump the version in ${k}, or re-run with --force to move the tag.`,
        warnings: i,
      };
  }
  return {
    ok: true,
    warnings: i,
    plan: {
      pluginName: b,
      version: g,
      versionFrom: k,
      tag: S,
      pluginRoot: pluginRoot_2,
      gitRoot,
      marketplace: c
        ? {
            path: c.path,
            entryIndex: c.entryIndex,
            entryVersion: c.entry.version,
          }
        : undefined,
      validation: h,
    },
  };
}
//@ chunk-ca06bv0t.js:13347-14449 placement
async function createPluginGitTag(plan, n) {
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
  let s = [
    "-C",
    plan.gitRoot,
    ...[...GIT_SIGNING_OVERRIDES, ...(gitConfigScoped ?? [])].flatMap(([m, h]) => ["-c", `${m}=${h}`]),
    "tag",
  ];
  if (n.force) s.push("-f");
  s.push("-a", "-m", formatTagName(plan, n.message), "--", plan.tag, "HEAD");
  let f = await execFileNoThrow(gitExe(), s, {
    env: remoteHostSessionCount,
    useCwd: true,
  });
  if (f.code !== 0)
    return {
      ok: false,
      error: `git tag failed (exit ${f.code}): ${f.stderr.trim() || f.stdout.trim()}`,
    };
  if (!n.push)
    return {
      ok: true,
      pushed: false,
    };
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(n.remote))
    return {
      ok: false,
      error: `Tag created locally but not pushed: "${n.remote}" is not a valid remote name.`,
    };
  let p = ["-C", plan.gitRoot, "push"];
  if (n.force) p.push("--force");
  p.push(n.remote, `refs/tags/${plan.tag}`);
  let c = await execFileNoThrow("git", p, {
    allowRepoGitHooks: true,
    allowGitTerminalPrompt: n.allowGitTerminalPrompt,
    useCwd: true,
  });
  if (c.code !== 0)
    return {
      ok: false,
      error: `Tag created locally but push failed (exit ${c.code}): ${c.stderr.trim() || c.stdout.trim()}`,
    };
  return {
    ok: true,
    pushed: true,
  };
}
//@ chunk-ca06bv0t.js:14449-14545 placement
function formatTagName(plan, message) {
  return message === undefined
    ? `${plan.pluginName} ${plan.version}`
    : message.replaceAll("%s", plan.version);
}
//@ chunk-ca06bv0t.js:14545-15183 placement
async function readPluginRoot(r) {
  let n = resolve(r);
  let i;
  try {
    i = await stat(n);
  } catch (error) {
    return {
      ok: false,
      error: isENOENT(error) ? `Path not found: ${n}` : `Cannot stat ${n}: ${errorMessage(error)}`,
    };
  }
  let a = i.isFile()
    ? [[dirname(dirname(n)), n]]
    : [
        [n, join(n, ".claude-plugin", "plugin.json")],
        [dirname(n), join(n, "plugin.json")],
      ];
  for (let [s, f] of a) {
    let p;
    try {
      p = await readFile(f, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      return {
        ok: false,
        error: `Cannot read ${f}: ${errorMessage(error)}`,
      };
    }
    let c;
    try {
      c = jsonParse(stripBom(p));
    } catch (error) {
      return {
        ok: false,
        error: `Invalid JSON in ${f}: ${errorMessage(error)}`,
      };
    }
    return {
      ok: true,
      pluginRoot: s,
      manifestPath: f,
      manifest: typeof c === "object" && c !== null ? c : {},
    };
  }
  return {
    ok: false,
    error: `No plugin manifest found. Expected ${join(n, ".claude-plugin", "plugin.json")}.`,
  };
}
//@ chunk-ca06bv0t.js:15183-15476 placement
async function findMarketplaceJsonUp(pluginRoot, name) {
  let i = findGitRoot(pluginRoot) ?? undefined;
  let a = pluginRoot;
  for (;;) {
    let path = join(a, ".claude-plugin", "marketplace.json");
    let jsonFile = await readJsonFile(path);
    if (jsonFile) {
      for (let [c, m] of jsonFile.plugins.entries())
        if (
          matchesDirEntry(m, a, {
            root: pluginRoot,
            name,
          })
        )
          return {
            path,
            marketplaceName: jsonFile.name,
            entryIndex: c,
            entry: m,
          };
    }
    if (a === i) return;
    let p = dirname(a);
    if (p === a) return;
    a = p;
  }
}
//@ chunk-ca06bv0t.js:15758-15889 placement
async function gitTagExists(gitRoot, n) {
  let i = await execFileNoThrow(gitExe(), ["-C", gitRoot, "tag", "-l", "--", n], {
    env: getRemoteHostSessionCount(),
    useCwd: true,
  });
  return i.code === 0 && i.stdout.trim() === n;
}
//@ chunk-ca06bv0t.js:15889-16249 placement
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
//@ chunk-ca06bv0t.js:16249-16272 placement
var OWNER_REPO_PLACEHOLDER = "<owner>/<repo>";
//@ chunk-ca06bv0t.js:16272-16418 placement
var VALIDATE_MARKETPLACE_HINT = [
  "Validate the folder that holds its marketplace.json",
  `to have ${OWNER_REPO_PLACEHOLDER} filled in,`,
  "and the name its marketplace lists it under.",
].join(" ");
//@ chunk-ca06bv0t.js:16447-16791 placement
function readmeMissingInstallLine({ name: r, listing }) {
  let i = listing !== undefined && listing.entry === undefined;
  return [
    `This README has no line that installs "${r}"`,
    "from a marketplace.",
    ...(i ? [join(listing.root, ".claude-plugin", "marketplace.json"), "has no entry for it. Add one."] : []),
    `${i ? "Then add" : "Add"} the install line,`,
    "which works in one step on Claude Code 2.1.275 or later.",
  ].join(" ");
}
//@ chunk-ca06bv0t.js:16791-16802 placement
var MAX_PLUGIN_NAME_LENGTH = 128;
//@ chunk-ca06bv0t.js:16802-16861 placement
function memoizeInMap(r, root, i) {
  let a = r.get(root) ?? i(root);
  r.set(root, a);
  return a;
}
//@ chunk-ca06bv0t.js:16861-16952 placement
var REPLACE_OWNER_REPO_HINT = [
  `In it, replace ${OWNER_REPO_PLACEHOLDER}`,
  "with the repository that holds the marketplace.",
].join(" ");
//@ chunk-ca06bv0t.js:16952-16963 placement
var README_SCAN_BYTES = 1024;
export {
  matchesPluginSource,
  isOrphanPlugin,
  findInstalledEntry,
  memoizeInMap,
  MAX_PLUGIN_NAME_LENGTH,
  VALIDATE_MARKETPLACE_HINT,
  REPLACE_OWNER_REPO_HINT,
  README_SCAN_BYTES,
  readmeMissingInstallLine,
  OWNER_REPO_PLACEHOLDER,
  tagPluginRelease,
  formatTagName,
  createPluginGitTag,
  sameSourceAndName,
  sameSourceAndNameAlt,
  isInMarketplace,
  isListedInKnownMarketplace,
  pickShownMarketplaces,
  MAX_SHOWN_MARKETPLACES,
};
