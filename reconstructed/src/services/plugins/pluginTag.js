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
import {
  relative,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  dirname,
  dirname as dirname_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
} from "path";
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
import { Vy } from "../../../vendor/semver/index.js";
import {
  validateHooksJsonForDisplay,
  checkPluginRootClaudeMd,
  readJsonFile,
  $Or,
} from "../../utils/plugins/validatePlugin.js";
import { isOfficialMarketplaceName } from "../../utils/plugins/schemas.js";
import { getCwd } from "../../utils/cwd.js";
import { j3s } from "../../utils/plugins/pluginVersioning.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { findGitRoot, getChangedFiles, gitExe } from "../../utils/git.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { readGitConfigScoped } from "../../utils/git/gitConfigFilters.js";
import { resolveGitDirsOrPlaceholder } from "../../utils/git/gitDirResolution.js";
import { logForDebugging } from "../../utils/debug.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";

//@ chunk-ca06bv0t.js:9094-9104 placement
var MAX_SHOWN_MARKETPLACES = 4;
//@ chunk-ca06bv0t.js:9104-9222 placement
function pickShownMarketplaces(r, n) {
  let sliced = r.slice(0, MAX_SHOWN_MARKETPLACES),
    found = r.find((s) => s.marketplace === n);
  if (found && !sliced.includes(found)) sliced[sliced.length - 1] = found;
  return sliced;
}
//@ chunk-ca06bv0t.js:9222-9391 placement
function isListedInKnownMarketplace(r, n, i) {
  return [r.marketplaceName, ...(r.alsoListedIn ?? [])].some((a) => {
    if (!n.has(a)) return !1;
    if (a === CLAUDE_PLUGINS_OFFICIAL) return !0;
    let s = i[a]?.source;
    return s !== void 0 && isMarketplaceSourceDeclaredByPolicy(a, s);
  });
}
//@ chunk-ca06bv0t.js:9391-9483 placement
function isInMarketplace(r, n) {
  return n === null || r.marketplaceName === n || (r.alsoListedIn?.includes(n) ?? !1);
}
//@ chunk-ca06bv0t.js:9483-9601 placement = _temp0 (1)
function isSameSourcePlugin(r, n, i) {
  if (isOrphanPlugin(r)) return !1;
  if (r.source === n) return !0;
  return "plugin" in r && r.plugin === i && marketplaceOf(r.source) === marketplaceOf(n);
}
//@ chunk-ca06bv0t.js:9601-9651 placement
function isOrphanPlugin(r) {
  return "orphan" in r && r.orphan === !0;
}
//@ chunk-ca06bv0t.js:9651-9698 placement
function sameSourceAndName(r, n) {
  return isSameSourcePlugin(r, n.source, n.name);
}
//@ chunk-ca06bv0t.js:9698-9745 placement
function sameSourceAndNameAlt(r, n) {
  return isSameSourcePlugin(r, n.source, n.name);
}
//@ chunk-ca06bv0t.js:9745-9891 placement = _temp0 (1)
function isSameSourceIgnoringAlias(r, n, i) {
  if (hasMarketplaceAlias(r.source)) return !1;
  if (r.source === n) return !0;
  let a = marketplaceSuffix(r.source);
  return "plugin" in r && r.plugin === i && (a === void 0 || a === marketplaceSuffix(n));
}
//@ chunk-ca06bv0t.js:9891-9957 placement
function matchesPluginSource(r, n, i) {
  return isOfficialMarketplace(marketplaceSuffix(n))
    ? isSameSourcePlugin(r, n, i)
    : isSameSourceIgnoringAlias(r, n, i) && !isOrphanPlugin(r);
}
//@ chunk-ca06bv0t.js:9957-10360 placement = _temp0 (0.778)
function findInstalledEntry(r, n) {
  let filtered = n.filter((m) => matchesPluginSource(r, m.source, m.name)),
    a = filtered.length === 1 ? filtered[0] : filtered.find((m) => pluginNamesEqual(m.source, r.source));
  if (a) return { name: a.name, marketplace: marketplaceSuffix(a.source) };
  let [s] = filtered;
  if (s !== void 0) return { name: s.name, marketplace: void 0 };
  let { name: f, marketplace: marketplace } = splitPluginId(r.source);
  if (marketplace !== void 0) return { name: f, marketplace: marketplace };
  let c = marketplaceOf(r.source);
  return { name: c !== void 0 && "plugin" in r && r.plugin ? r.plugin : f, marketplace: c };
}
//@ chunk-ca06bv0t.js:10360-10378 placement
var he = Re(Vy(), 1);
/**
 * 为插件创建发布标签：校验 marketplace 与 plugin.json 版本、生成 tag 名并调用 git tag。
 */
//@ chunk-ca06bv0t.js:10498-13347 placement
async function tagPluginRelease(r, n = {}) {
  let i = [],
    a = await readPluginRoot(r);
  if (!a.ok) return { ok: !1, error: a.error, warnings: i };
  let { pluginRoot: pluginRoot, manifestPath: manifestPath, manifest: manifest } = a,
    c =
      typeof manifest.name === "string" && manifest.name.length > 0
        ? await findMarketplaceJsonUp(pluginRoot, manifest.name)
        : void 0,
    m = await validateHooksJsonForDisplay(
      manifestPath,
      c !== void 0 && isOfficialMarketplaceName(c.marketplaceName)
        ? { kind: "anthropic" }
        : { kind: "alone" },
    ),
    h = [m];
  if (m.success) h.push(...(await checkPluginRootClaudeMd(pluginRoot)));
  for (let v of h)
    for (let warning of v.warnings) i.push(`${relative(getCwd(), v.filePath)}: ${warning.message}`);
  let found = h.find((v) => !v.success);
  if (found) {
    let joined = found.errors.map((error) => `  ${error.path}: ${error.message}`).join(`
`);
    return {
      ok: !1,
      error: `Plugin validation failed for ${found.filePath}:
${joined}`,
      warnings: i,
    };
  }
  let b = manifest.name;
  if (typeof b !== "string" || b.length === 0)
    return { ok: !1, error: `plugin.json at ${manifestPath} has no "name" field`, warnings: i };
  let x = typeof manifest.version === "string" && manifest.version.length > 0 ? manifest.version : void 0,
    g,
    k;
  if (x !== void 0) ((g = x), (k = "plugin.json"));
  else if (c?.entry.version) ((g = c.entry.version), (k = "marketplace entry"));
  else
    return {
      ok: !1,
      error:
        `No version to tag. Set "version" in ${relative(getCwd(), manifestPath)}` +
        (c
          ? ` or in the marketplace entry at ${relative(getCwd(), c.path)} plugins[${c.entryIndex}].`
          : ".") +
        " Tags are only used for dependency version constraints, which require an explicit semver \u2014 the git-SHA fallback does not need a tag.",
      warnings: i,
    };
  if (c?.entry.version && x !== void 0 && c.entry.version !== x)
    return {
      ok: !1,
      error: `Version mismatch: plugin.json says "${x}" but ${relative(getCwd(), c.path)} plugins[${c.entryIndex}].version says "${c.entry.version}". plugin.json wins at install time, so update the marketplace entry to "${x}" (or remove it) before tagging.`,
      warnings: i,
    };
  if (he.valid(g) === null)
    return {
      ok: !1,
      error: `Version "${g}" is not valid semver. Dependency resolution (resolveVersionRange) ignores tags whose suffix doesn't parse as semver, so this tag would never be selected.`,
      warnings: i,
    };
  let S = j3s(b, g);
  if (!isSafeRefName(S))
    return {
      ok: !1,
      error: `Computed tag name "${S}" is not a valid git ref. Check the plugin name for characters git rejects (spaces, ~, ^, :, ?, *, [, \\, or sequences like .., @{, //).`,
      warnings: i,
    };
  let A = findGitRoot(pluginRoot);
  if (A === null)
    return {
      ok: !1,
      error: `${pluginRoot} is not inside a git repository. Dependency tags are resolved via git ls-remote, so the plugin must live in a git repo.`,
      warnings: i,
    };
  if (!n.force) {
    let v = await getChangedFiles(A, c ? [pluginRoot, c.path] : [pluginRoot]);
    if (v.length > 0) {
      let joined = v.slice(0, 5).join(`
  `),
        F =
          v.length > 5
            ? `
  \u2026and ${v.length - 5} more`
            : "";
      return {
        ok: !1,
        error: `Uncommitted changes affecting this release \u2014 commit them first so the tag points at the version you intend to release (or use --force):
  ${joined}${F}`,
        warnings: i,
      };
    }
  }
  if (!n.force) {
    if (await gitTagExists(A, S))
      return {
        ok: !1,
        error: `Tag "${S}" already exists locally. Bump the version in ${k}, or re-run with --force to move the tag.`,
        warnings: i,
      };
  }
  return {
    ok: !0,
    warnings: i,
    plan: {
      pluginName: b,
      version: g,
      versionFrom: k,
      tag: S,
      pluginRoot: pluginRoot,
      gitRoot: A,
      marketplace: c ? { path: c.path, entryIndex: c.entryIndex, entryVersion: c.entry.version } : void 0,
      validation: h,
    },
  };
}
//@ chunk-ca06bv0t.js:13347-14449 placement
async function createPluginGitTag(r, n) {
  let i = getRemoteHostSessionCount(void 0, { userLocale: !0 }),
    a = await readGitConfigScoped(r.gitRoot, GIT_SIGNING_CONFIG_PATTERN, {
      envPins: {},
      base: i,
      repository: resolveGitDirsOrPlaceholder(r.gitRoot),
    });
  if (a === null)
    logForDebugging(
      `[plugin tag] could not read the user's git signing configuration; ${r.tag} is created unsigned`,
      { level: "warn" },
    );
  let s = ["-C", r.gitRoot, ...[...yt, ...(a ?? [])].flatMap(([m, h]) => ["-c", `${m}=${h}`]), "tag"];
  if (n.force) s.push("-f");
  s.push("-a", "-m", formatTagName(r, n.message), "--", r.tag, "HEAD");
  let f = await execFileNoThrow(gitExe(), s, { env: i, useCwd: !0 });
  if (f.code !== 0)
    return { ok: !1, error: `git tag failed (exit ${f.code}): ${f.stderr.trim() || f.stdout.trim()}` };
  if (!n.push) return { ok: !0, pushed: !1 };
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(n.remote))
    return { ok: !1, error: `Tag created locally but not pushed: "${n.remote}" is not a valid remote name.` };
  let p = ["-C", r.gitRoot, "push"];
  if (n.force) p.push("--force");
  p.push(n.remote, `refs/tags/${r.tag}`);
  let c = await execFileNoThrow("git", p, {
    allowRepoGitHooks: !0,
    allowGitTerminalPrompt: n.allowGitTerminalPrompt,
    useCwd: !0,
  });
  if (c.code !== 0)
    return {
      ok: !1,
      error: `Tag created locally but push failed (exit ${c.code}): ${c.stderr.trim() || c.stdout.trim()}`,
    };
  return { ok: !0, pushed: !0 };
}
//@ chunk-ca06bv0t.js:14449-14545 placement
function formatTagName(r, n) {
  return n === void 0 ? `${r.pluginName} ${r.version}` : n.replaceAll("%s", r.version);
}
//@ chunk-ca06bv0t.js:14545-15183 placement
async function readPluginRoot(r) {
  let n = resolve(r),
    i;
  try {
    i = await stat(n);
  } catch (error) {
    return {
      ok: !1,
      error: isENOENT(error) ? `Path not found: ${n}` : `Cannot stat ${n}: ${errorMessage(error)}`,
    };
  }
  let a = i.isFile()
    ? [[dirname(dirname(n)), n]]
    : [
        [n, join_2(n, ".claude-plugin", "plugin.json")],
        [dirname(n), join_2(n, "plugin.json")],
      ];
  for (let [s, f] of a) {
    let p;
    try {
      p = await readFile(f, { encoding: "utf-8" });
    } catch (error) {
      if (isENOENT(error)) continue;
      return { ok: !1, error: `Cannot read ${f}: ${errorMessage(error)}` };
    }
    let c;
    try {
      c = jsonParse(Wo(p));
    } catch (error) {
      return { ok: !1, error: `Invalid JSON in ${f}: ${errorMessage(error)}` };
    }
    return { ok: !0, pluginRoot: s, manifestPath: f, manifest: typeof c === "object" && c !== null ? c : {} };
  }
  return {
    ok: !1,
    error: `No plugin manifest found. Expected ${join_2(n, ".claude-plugin", "plugin.json")}.`,
  };
}
//@ chunk-ca06bv0t.js:15183-15476 placement
async function findMarketplaceJsonUp(r, n) {
  let i = findGitRoot(r) ?? void 0,
    a = r;
  for (;;) {
    let s = join_2(a, ".claude-plugin", "marketplace.json"),
      f = await readJsonFile(s);
    if (f) {
      for (let [c, m] of f.plugins.entries())
        if ($Or(m, a, { root: r, name: n }))
          return { path: s, marketplaceName: f.name, entryIndex: c, entry: m };
    }
    if (a === i) return;
    let p = dirname(a);
    if (p === a) return;
    a = p;
  }
}
//@ chunk-ca06bv0t.js:15758-15889 placement
async function gitTagExists(r, n) {
  let i = await execFileNoThrow(gitExe(), ["-C", r, "tag", "-l", "--", n], {
    env: getRemoteHostSessionCount(),
    useCwd: !0,
  });
  return i.code === 0 && i.stdout.trim() === n;
}
//@ chunk-ca06bv0t.js:15889-16249 placement
var GIT_SIGNING_CONFIG_PATTERN =
    "^(tag\\.(gpgsign|forcesignannotated)|user\\.signingkey|gpg\\.(format|program)|gpg\\.(openpgp|x509|ssh)\\.program|gpg\\.ssh\\.defaultkeycommand)$",
  yt = [
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
function readmeMissingInstallLine({ name: r, listing: listing }) {
  let i = listing !== void 0 && listing.entry === void 0;
  return [
    `This README has no line that installs "${r}"`,
    "from a marketplace.",
    ...(i
      ? [join_3(listing.root, ".claude-plugin", "marketplace.json"), "has no entry for it. Add one."]
      : []),
    `${i ? "Then add" : "Add"} the install line,`,
    "which works in one step on Claude Code 2.1.275 or later.",
  ].join(" ");
}
//@ chunk-ca06bv0t.js:16791-16802 placement
var MAX_PLUGIN_NAME_LENGTH = 128;
//@ chunk-ca06bv0t.js:16802-16861 placement
function memoizeInMap(r, n, i) {
  let a = r.get(n) ?? i(n);
  return (r.set(n, a), a);
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
