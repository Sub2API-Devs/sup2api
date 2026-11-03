/**
 * utils/plugins/pluginManifestRead.ts
 *
 * 2.1.316 新增：插件清单读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
 */
import { readdir, lstat, open, realpath } from "fs/promises";
import { join } from "path";
import { constants } from "fs";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessibleCode,
  isFsInaccessible,
  isENOENT,
} from "../errors.js";
import {
  PLUGIN_MANIFEST_DIR,
  PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2,
  MARKETPLACE_MANIFEST_PATH,
  isPluginRootMarker,
  isPluginComponentDir,
} from "./commandSource.js";
import { O_NONBLOCK } from "../fsFlags.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import {
  hasNestedHooks,
  PLUGIN_SKIPPED_KEYS,
  UNLOADABLE_GUARD_NOTE,
  hasGuardHooks_2,
  validateHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import { clone } from "../slowOperations.js";
import { getManifestSchemaForDocument } from "./schemas.js";
import { whichAsync } from "../which.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { isGitMissingMessageSupported } from "../git/gitMissingMessage.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { skillOverridesSchema } from "../settings/types.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { areLocalPluginDirsAllowedByPolicy } from "./marketplacePolicy.js";
import { getThinkbackSkillDir, thinkbackUserConfigSpace } from "./pluginLinks.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getProjectConfigRoot, getOriginalCwd } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError } from "../storage/storageErrors.js";
import {
  SYNCED_MANIFEST_FILE,
  isSyncedDirName,
  isHiddenFoldName,
  parseSkillsSyncManifest,
  foldNameForSync,
} from "./syncedItems.js";
import { getFileReader } from "../fileStore.js";

//@ chunk-e6aww6q8.js:724536-724785 placement
/**
 * 读取目录项：存在插件根标志（非插件 manifest 的 .claude-plugin 市场目录除外）时返回 {kind:"plugin", marker}； 否则返回 collection（含 plugin.json 的子目录为 children、其余 skipped，以及是否市场根）。
 */
async function describePluginDirShape(e) {
  let n;
  try {
    n = await readdir(e, {
      withFileTypes: true,
    });
  } catch (error) {
    return {
      kind: "unreadable",
      errno: getErrnoCode(error) ?? "UNKNOWN",
    };
  }
  let isMarketplaceRoot = await isMarketplaceOnlyManifestDir(e, n);
  let s = isMarketplaceRoot ? n.filter((y) => y.name !== PLUGIN_MANIFEST_DIR) : n;
  let pluginRootMarker = await findPluginRootMarker(e, s);
  return pluginRootMarker === undefined
    ? listPluginCollection(e, s, isMarketplaceRoot)
    : {
        kind: "plugin",
        marker: pluginRootMarker,
      };
}
//@ chunk-e6aww6q8.js:724785-724817 placement
/**
 * isNotDotPrefixed：不以点开头。
 */
var isNotDotPrefixed = (e) => !e.startsWith(".");
//@ chunk-e6aww6q8.js:724817-724938 placement
async function isMarketplaceOnlyManifestDir(e, n) {
  return (
    n.some((r) => r.name === PLUGIN_MANIFEST_DIR) &&
    (await probeFileOpen(join(e, PLUGIN_MANIFEST_PATH_2))) === "absent" &&
    (await probeFileOpen(join(e, MARKETPLACE_MANIFEST_PATH))) === "there"
  );
}
//@ chunk-e6aww6q8.js:724938-725280 placement
/**
 * 找出使目录成为插件根的标志项。
 */
async function findPluginRootMarker(e, n) {
  let filtered = n.map((w) => w.name).filter(isPluginRootMarker);
  let h =
    filtered.includes(".mcp.json") &&
    (await lstat(join(e, ".mcp.json")).then(
      (w) => w.isFile() && w.size === 0,
      (error) => getErrnoCode(error) === "ENOENT",
    ))
      ? filtered.filter((w) => w !== ".mcp.json")
      : filtered;
  let found = h.find((w) => !isPluginComponentDir(w));
  if (found !== undefined) return found;
  let results = await Promise.all(h.map((w) => probeFileOpen(join(e, w, PLUGIN_MANIFEST_PATH_2))));
  return h.find((w, L) => results[L] === "absent");
}
//@ chunk-e6aww6q8.js:725280-725581 placement
/**
 * 列出含 plugin.json 的子目录与跳过的子目录。
 */
async function listPluginCollection(e, n, isMarketplaceRoot) {
  let s = n
    .filter((y) => y.isDirectory() || y.isSymbolicLink())
    .map((y) => y.name)
    .filter(isNotDotPrefixed)
    .toSorted();
  let results = await Promise.all(s.map((y) => probeFileOpen(join(e, y, PLUGIN_MANIFEST_PATH_2))));
  return {
    kind: "collection",
    children: s.filter((y, S) => results[S] !== "absent"),
    skipped: s.filter((y, S) => results[S] === "absent"),
    isMarketplaceRoot,
  };
}
//@ chunk-e6aww6q8.js:725581-725741 placement
async function probeFileOpen(e) {
  try {
    await (await open(e, constants.O_RDONLY | O_NONBLOCK)).close();
    return "there";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unsure";
  }
}
//@ chunk-e6aww6q8.js:725741-727515 placement
/**
 * 校验插件清单（plugin.json）结构，报告字段错误。
 */
function validatePluginManifest(e, n, r) {
  let s = formatManifestErrorHeading(n, r);
  if (!isPlainObject_5(e))
    return {
      ok: false,
      unloadableGuard: false,
      error: `${s}

Validation errors: manifest must be an object`,
      errors: [
        {
          path: "",
          message: "manifest must be an object",
        },
      ],
      rawCandidate: null,
    };
  let h = {
    ...e,
  };
  if (n === "marketplace-entry") {
    delete h.id;
    delete h.source;
    delete h.strict;
  }
  let y = new Set();
  let S = [];
  let w = [];
  let L = {};
  if (isPlainObject_5(h.experimental)) {
    for (let [key, value] of Object.entries(h.experimental)) if (!y.has(key)) L[key] = value;
  }
  for (let [Ee, Ae] of [
    [h, "top level"],
    [
      {
        unlifted: L,
      },
      "`experimental`",
    ],
  ])
    if (hasNestedHooks(Ee, PLUGIN_SKIPPED_KEYS))
      w.push({
        path: "hooks",
        message: `PreToolUse/PermissionRequest hooks are declared at the ${Ae} outside "hooks" (or under an unrecognized key) \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      });
  if (Array.isArray(h.hooks) && h.hooks.some((hook) => Array.isArray(hook) && hasGuardHooks_2(hook)))
    w.push({
      path: "hooks",
      message: `a nested array holds PreToolUse/PermissionRequest hooks this build cannot load \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    });
  if (h.hooks !== undefined && typeof h.hooks === "object") h.hooks = clone(h.hooks);
  let G = isPlainObject_5(h.hooks)
    ? [[h.hooks, "hooks"]]
    : Array.isArray(h.hooks)
      ? h.hooks.flatMap((hook, Ae) => (isPlainObject_5(hook) ? [[hook, `hooks.${Ae}`]] : []))
      : [];
  let q = [];
  for (let [Ee, Ae] of G) {
    let Ie = validateHooksSetting(Ee);
    q.push(...Ie.notes.map((note) => note.replace(/^hooks/, Ae)));
    w.push(
      ...Ie.unloadableGuards.map((unloadableGuard) => ({
        path: Ae,
        message: `${unloadableGuard.replace(/^hooks/, Ae)} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      })),
    );
  }
  let Z = getManifestSchemaForDocument(h).safeParse(h);
  if (Z.success && S.length === 0 && w.length === 0)
    return {
      ok: true,
      manifest: Z.data,
      rawCandidate: h,
      hookNotes: q,
    };
  let Se = Z.success
    ? []
    : Z.error.issues.map((issue) => {
        let Ae = issue.path.length > 0 ? String(issue.path[0]) : "";
        let joined = issue.path.join(".");
        return {
          path: y.has(Ae) ? `experimental.${joined}` : joined,
          message: issue.message,
        };
      });
  let ke = [...w, ...S, ...Se];
  let joined = ke.map((Ee) => (Ee.path ? `${Ee.path}: ${Ee.message}` : Ee.message)).join(", ");
  return {
    ok: false,
    unloadableGuard: w.length > 0,
    error: `${s}

Validation errors: ${joined}`,
    errors: ke,
    rawCandidate: h,
    manifest: Z.success ? Z.data : undefined,
  };
}
//@ chunk-e6aww6q8.js:727515-727842 placement
/**
 * manifest 无效时的标题（plugin.json/SKILL.md/市场条目）。
 */
function formatManifestErrorHeading(e, n) {
  switch (e) {
    case "plugin-json":
      return `Plugin ${n.pluginName} has an invalid manifest file at ${n.manifestPath}.`;
    case "skill-md":
      return `Skill ${n.pluginName} has invalid plugin-manifest frontmatter at ${n.manifestPath}.`;
    case "marketplace-entry":
      return `Marketplace entry ${n.pluginName} has an invalid manifest.`;
  }
}
//@ chunk-e6aww6q8.js:727842-727904 placement
async function hasGitOnPath(e) {
  try {
    return !!(await whichAsync(e));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:727904-728017 placement
/**
 * git 可用且未被环境禁止（结果缓存）。
 */
async function isGitUsable() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.gitAvailable ??= hasGitOnPath("git");
  return (await pluginRegistry.gitAvailable) && !isGitMissingMessageSupported("git", process.env);
}
//@ chunk-e6aww6q8.js:728017-728070 placement
/**
 * markGitUnavailable：标记 git 不可用。
 */
function markGitUnavailable() {
  getPluginRegistry().gitAvailable = Promise.resolve(false);
}
//@ chunk-e6aww6q8.js:728182-728195 placement
/**
 * GIT_PROBE_TIMEOUT_MS：git 探测超时。
 */
var GIT_PROBE_TIMEOUT_MS = 5000;
//@ chunk-e6aww6q8.js:985837-986000 placement
/**
 * manifest 错误分类码。
 */
var MANIFEST_ERROR_CLASSES = {
  readFailed: "manifest_read_failed",
  jsonInvalid: "manifest_json_invalid",
  schemaInvalid: "manifest_schema_invalid",
  containment: "manifest_containment_refused",
};
//@ chunk-e6aww6q8.js:986000-986114 placement
class ManifestLoadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  manifestPath;
  problems;
  constructor(e, n, r, manifestPath, problems) {
    super(e, n, r);
    this.manifestPath = manifestPath;
    this.problems = problems;
  }
}
//@ chunk-e6aww6q8.js:986114-986521 placement
/**
 * 分页列出存储作用域下的直接条目名。
 */
async function listStorageScopeNames(e, n) {
  let r = [];
  let s;
  do {
    let h = await e.listEntries(n, {
      skipScopeStats: true,
      skipKeyStats: true,
      ...(s !== undefined && {
        cursor: s,
      }),
    });
    if (!h.ok)
      return {
        names: r,
        error: h.error,
      };
    for (let item of h.value.items) {
      let S = item.kind === "scope" ? item.scope : item.key;
      if (S.namespace !== n.namespace || !("relPath" in S)) continue;
      let last = S.relPath?.at(-1);
      if (last !== undefined)
        r.push({
          name: last,
          kind: item.kind,
        });
    }
    s = h.value.cursor;
  } while (s !== undefined);
  return {
    names: r,
  };
}
//@ chunk-e6aww6q8.js:986521-986669 placement
var MANIFEST_EXTRA_COMPONENT_KEYS = [
  "mcpServers",
  "lspServers",
  "agents",
  "outputStyles",
  "themes",
  "workflows",
  "channels",
  "monitors",
  "settings",
  "userConfig",
  "experimental",
  ...[],
];
//@ chunk-e6aww6q8.js:986669-986710 placement
/**
 * isSkillCustomizationBookingAllowed：技能定制允许时返回真（占位）。
 */
function isSkillCustomizationBookingAllowed(plugin, hasManifest) {
  if (hasManifest) return true;
  return false;
}
//@ chunk-e6aww6q8.js:986710-988822 placement
/**
 * 在未禁用技能定制且策略允许本地插件目录时，扫描用户与项目的 skills 目录，按同步清单排除已同步的文件夹， 把其余带插件结构的文件夹当作 skills-dir 插件加载。
 */
async function loadSkillsAsPlugins_2(e) {
  if (
    isCustomizationDisabled("skills") ||
    skillOverridesSchema.some((h) => isRestrictedToPluginOnly(h)) ||
    !areLocalPluginDirsAllowedByPolicy()
  )
    return [];
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null) return [];
  let r = [];
  if (isSettingSourceEnabled("userSettings"))
    r.push({
      dir: thinkbackSkillDir,
      scope: "user",
    });
  if (isSettingSourceEnabled("projectSettings")) {
    let h = join(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills");
    let y = (S) => realpath(S).catch(() => S);
    if (h !== thinkbackSkillDir && (await y(h)) !== (await y(thinkbackSkillDir)))
      r.push({
        dir: h,
        scope: "project",
      });
  }
  let s = [];
  for (let { dir, scope } of r)
    try {
      if (scope === "user") {
        if (isStorageV5Enabled() && e !== undefined) {
          let S = await listStorageScopeNames(e, {
            namespace: "userConfigDir",
            dir: "skills",
          });
          if (S.error !== undefined) {
            let error = S.error;
            if (!("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)))
              logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${formatStorageError(error)}`, {
                level: "warn",
              });
          }
          let mapped = S.names.map(({ name: G, kind }) => ({
            name: G,
            isKey: kind === "key",
          }));
          let syncedSkillNames = await readSyncedSkillNames(dir, e);
          if (syncedSkillNames === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let { name: G, isKey } of mapped) {
            if (
              syncedSkillNames.has(foldNameForSkill(G)) ||
              (isKey && foldNameForSkill(G) === SYNCED_MANIFEST_FILE)
            )
              continue;
            if (isSyncedDirName(G)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${G}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (isHiddenFoldName(G)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${G}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            s.push({
              dir: join(dir, G),
              scope,
            });
          }
        } else {
          let S = await getFileReader().listEntries(dir);
          let syncedSkillNames = await readSyncedSkillNames(dir);
          if (syncedSkillNames === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let L of S) {
            if (syncedSkillNames.has(foldNameForSkill(L.name))) continue;
            if (isSyncedDirName(L.name)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${L.name}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (isHiddenFoldName(L.name)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${L.name}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            if (!L.isFile)
              s.push({
                dir: join(dir, L.name),
                scope,
              });
          }
        }
      } else {
        let S = await readdir(dir, {
          withFileTypes: true,
        });
        for (let w of S)
          if (w.isDirectory() || w.isSymbolicLink())
            s.push({
              dir: join(dir, w.name),
              scope,
            });
      }
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${error}`, {
          level: "warn",
        });
    }
  return s;
}
//@ chunk-e6aww6q8.js:988822-989195 placement
/**
 * 读技能同步清单，读失败返回 claim-all。
 */
async function readSyncedSkillNames(dir, n) {
  let r;
  let s =
    isStorageV5Enabled() && n !== undefined
      ? thinkbackUserConfigSpace(join(dir, SYNCED_MANIFEST_FILE))
      : null;
  if (n !== undefined && s !== null) {
    let h = await n.read([s]);
    if (!h.ok) return "claim-all";
    let y = h.value.items[0];
    if (y === undefined) return "claim-all";
    if (!y.found) return new Set();
    r = Buffer.from(y.value).toString("utf-8");
  } else
    try {
      r = await getFileReader().read(join(dir, "manifest.json"));
    } catch (error) {
      return isENOENT(error) ? new Set() : "claim-all";
    }
  return parseSkillsSyncManifest(r, dir);
}
//@ chunk-e6aww6q8.js:989195-989207 placement
var foldNameForSkill = foldNameForSync;
export {
  isGitUsable,
  markGitUnavailable,
  listStorageScopeNames,
  ManifestLoadError,
  MANIFEST_ERROR_CLASSES,
  validatePluginManifest,
  describePluginDirShape,
  loadSkillsAsPlugins_2,
  isSkillCustomizationBookingAllowed,
  GIT_PROBE_TIMEOUT_MS,
  isNotDotPrefixed,
};
