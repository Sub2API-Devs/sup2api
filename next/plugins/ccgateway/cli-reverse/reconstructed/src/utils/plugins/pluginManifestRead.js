/**
 * utils/plugins/pluginManifestRead.ts
 *
 * 2.1.316 新增：插件清单读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
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
import { SKILL_OVERRIDE_COMPONENTS } from "../settings/types.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:735052-735301 placement
/**
 * 读取目录项：存在插件根标志（非插件 manifest 的 .claude-plugin 市场目录除外）时返回 {kind:"plugin", marker}； 否则返回 collection（含 plugin.json 的子目录为 children、其余 skipped，以及是否市场根）。
 */
async function describePluginDirShape(dir) {
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch (error) {
    return {
      kind: "unreadable",
      errno: getErrnoCode(error) ?? "UNKNOWN",
    };
  }
  let isMarketplaceRoot = await isMarketplaceOnlyManifestDir(dir, entries);
  let nonMeta = isMarketplaceRoot ? entries.filter((entry) => entry.name !== PLUGIN_MANIFEST_DIR) : entries;
  let pluginRootMarker = await findPluginRootMarker(dir, nonMeta);
  return pluginRootMarker === undefined
    ? listPluginCollection(dir, nonMeta, isMarketplaceRoot)
    : {
        kind: "plugin",
        marker: pluginRootMarker,
      };
}
//@ chunk-5xgkngpb.js:735301-735333 placement
/**
 * isNotDotPrefixed：不以点开头。
 */
var isNotDotPrefixed = (name) => !name.startsWith(".");
//@ chunk-5xgkngpb.js:735333-735454 placement
async function isMarketplaceOnlyManifestDir(dir, entries) {
  return (
    entries.some((entry) => entry.name === PLUGIN_MANIFEST_DIR) &&
    (await probeFileOpen(join(dir, PLUGIN_MANIFEST_PATH_2))) === "absent" &&
    (await probeFileOpen(join(dir, MARKETPLACE_MANIFEST_PATH))) === "there"
  );
}
//@ chunk-5xgkngpb.js:735454-735796 placement
/**
 * 找出使目录成为插件根的标志项。
 */
async function findPluginRootMarker(dir, entries) {
  let filtered = entries.map((entry) => entry.name).filter(isPluginRootMarker);
  let markers =
    filtered.includes(".mcp.json") &&
    (await lstat(join(dir, ".mcp.json")).then(
      (stat) => stat.isFile() && stat.size === 0,
      (error) => getErrnoCode(error) === "ENOENT",
    ))
      ? filtered.filter((marker) => marker !== ".mcp.json")
      : filtered;
  let found = markers.find((marker) => !isPluginComponentDir(marker));
  if (found !== undefined) return found;
  let results = await Promise.all(
    markers.map((marker) => probeFileOpen(join(dir, marker, PLUGIN_MANIFEST_PATH_2))),
  );
  return markers.find((marker, index) => results[index] === "absent");
}
//@ chunk-5xgkngpb.js:735796-736097 placement
/**
 * 列出含 plugin.json 的子目录与跳过的子目录。
 */
async function listPluginCollection(root, entries, isMarketplaceRoot) {
  let candidates = entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter(isNotDotPrefixed)
    .toSorted();
  let results = await Promise.all(
    candidates.map((name) => probeFileOpen(join(root, name, PLUGIN_MANIFEST_PATH_2))),
  );
  return {
    kind: "collection",
    children: candidates.filter((name, index) => results[index] !== "absent"),
    skipped: candidates.filter((name, index) => results[index] === "absent"),
    isMarketplaceRoot,
  };
}
//@ chunk-5xgkngpb.js:736097-736257 placement
async function probeFileOpen(path) {
  try {
    await (await open(path, constants.O_RDONLY | O_NONBLOCK)).close();
    return "there";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unsure";
  }
}
//@ chunk-5xgkngpb.js:736257-738038 placement
/**
 * 校验插件清单（plugin.json）结构，报告字段错误。
 */
function validatePluginManifest(candidate, documentKind, options) {
  let heading = formatManifestErrorHeading(documentKind, options);
  if (!isPlainObject_6(candidate))
    return {
      ok: false,
      unloadableGuard: false,
      error: `${heading}

Validation errors: manifest must be an object`,
      errors: [
        {
          path: "",
          message: "manifest must be an object",
        },
      ],
      rawCandidate: null,
    };
  let manifest = {
    ...candidate,
  };
  if (documentKind === "marketplace-entry") {
    delete manifest.id;
    delete manifest.source;
    delete manifest.strict;
  }
  let experimentalKeys = new Set();
  let errors = [];
  let unloadableGuards = [];
  let unliftedExperimental = {};
  if (isPlainObject_6(manifest.experimental)) {
    for (let [key, value] of Object.entries(manifest.experimental))
      if (!experimentalKeys.has(key)) unliftedExperimental[key] = value;
  }
  for (let [hooksHost, hostLabel] of [
    [manifest, "top level"],
    [
      {
        unlifted: unliftedExperimental,
      },
      "`experimental`",
    ],
  ])
    if (hasNestedHooks(hooksHost, PLUGIN_SKIPPED_KEYS))
      unloadableGuards.push({
        path: "hooks",
        message: `PreToolUse/PermissionRequest hooks are declared at the ${hostLabel} outside "hooks" (or under an unrecognized key) \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      });
  if (
    Array.isArray(manifest.hooks) &&
    manifest.hooks.some((hook) => Array.isArray(hook) && hasGuardHooks_2(hook))
  )
    unloadableGuards.push({
      path: "hooks",
      message: `a nested array holds PreToolUse/PermissionRequest hooks this build cannot load \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    });
  if (manifest.hooks !== undefined && typeof manifest.hooks === "object")
    manifest.hooks = clone(manifest.hooks);
  let hookEntries = isPlainObject_6(manifest.hooks)
    ? [[manifest.hooks, "hooks"]]
    : Array.isArray(manifest.hooks)
      ? manifest.hooks.flatMap((hook, hookIndex) =>
          isPlainObject_6(hook) ? [[hook, `hooks.${hookIndex}`]] : [],
        )
      : [];
  let hookNotes = [];
  for (let [hooksValue, hooksPath] of hookEntries) {
    let hookValidation = validateHooksSetting(hooksValue);
    hookNotes.push(...hookValidation.notes.map((note) => note.replace(/^hooks/, hooksPath)));
    unloadableGuards.push(
      ...hookValidation.unloadableGuards.map((unloadableGuard) => ({
        path: hooksPath,
        message: `${unloadableGuard.replace(/^hooks/, hooksPath)} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      })),
    );
  }
  let schemaResult = getManifestSchemaForDocument(manifest).safeParse(manifest);
  if (schemaResult.success && errors.length === 0 && unloadableGuards.length === 0)
    return {
      ok: true,
      manifest: schemaResult.data,
      rawCandidate: manifest,
      hookNotes,
    };
  let schemaIssues = schemaResult.success
    ? []
    : schemaResult.error.issues.map((issue) => {
        let firstPathSegment = issue.path.length > 0 ? String(issue.path[0]) : "";
        let joined = issue.path.join(".");
        return {
          path: experimentalKeys.has(firstPathSegment) ? `experimental.${joined}` : joined,
          message: issue.message,
        };
      });
  let problems = [...unloadableGuards, ...errors, ...schemaIssues];
  let joined = problems
    .map((problem) => (problem.path ? `${problem.path}: ${problem.message}` : problem.message))
    .join(", ");
  return {
    ok: false,
    unloadableGuard: unloadableGuards.length > 0,
    error: `${heading}

Validation errors: ${joined}`,
    errors: problems,
    rawCandidate: manifest,
    manifest: schemaResult.success ? schemaResult.data : undefined,
  };
}
//@ chunk-5xgkngpb.js:738038-738365 placement
/**
 * manifest 无效时的标题（plugin.json/SKILL.md/市场条目）。
 */
function formatManifestErrorHeading(documentKind, options) {
  switch (documentKind) {
    case "plugin-json":
      return `Plugin ${options.pluginName} has an invalid manifest file at ${options.manifestPath}.`;
    case "skill-md":
      return `Skill ${options.pluginName} has invalid plugin-manifest frontmatter at ${options.manifestPath}.`;
    case "marketplace-entry":
      return `Marketplace entry ${options.pluginName} has an invalid manifest.`;
  }
}
//@ chunk-5xgkngpb.js:738365-738427 placement
async function hasGitOnPath(binaryName) {
  try {
    return !!(await whichAsync(binaryName));
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:738427-738540 placement
/**
 * git 可用且未被环境禁止（结果缓存）。
 */
async function isGitUsable() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.gitAvailable ??= hasGitOnPath("git");
  return (await pluginRegistry.gitAvailable) && !isGitMissingMessageSupported("git", process.env);
}
//@ chunk-5xgkngpb.js:738540-738593 placement
/**
 * markGitUnavailable：标记 git 不可用。
 */
function markGitUnavailable() {
  getPluginRegistry().gitAvailable = Promise.resolve(false);
}
//@ chunk-5xgkngpb.js:738705-738718 placement
/**
 * GIT_PROBE_TIMEOUT_MS：git 探测超时。
 */
var GIT_PROBE_TIMEOUT_MS = 5000;
//@ chunk-5xgkngpb.js:999549-999712 placement
/**
 * manifest 错误分类码。
 */
var MANIFEST_ERROR_CLASSES = {
  readFailed: "manifest_read_failed",
  jsonInvalid: "manifest_json_invalid",
  schemaInvalid: "manifest_schema_invalid",
  containment: "manifest_containment_refused",
};
//@ chunk-5xgkngpb.js:999712-999826 placement
let ManifestLoadError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:999712", () => {
  ManifestLoadError = class ManifestLoadError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    manifestPath;
    problems;
    constructor(message, errorCode, telemetryCode, manifestPath, problems) {
      super(message, errorCode, telemetryCode);
      this.manifestPath = manifestPath;
      this.problems = problems;
    }
  };
});
//@ chunk-5xgkngpb.js:999826-1000233 placement
/**
 * 分页列出存储作用域下的直接条目名。
 */
async function listStorageScopeNames(storage, query) {
  let names = [];
  let cursor;
  do {
    let page = await storage.listEntries(query, {
      skipScopeStats: true,
      skipKeyStats: true,
      ...(cursor !== undefined && {
        cursor,
      }),
    });
    if (!page.ok)
      return {
        names,
        error: page.error,
      };
    for (let item of page.value.items) {
      let entryRef = item.kind === "scope" ? item.scope : item.key;
      if (entryRef.namespace !== query.namespace || !("relPath" in entryRef)) continue;
      let last = entryRef.relPath?.at(-1);
      if (last !== undefined)
        names.push({
          name: last,
          kind: item.kind,
        });
    }
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return {
    names,
  };
}
//@ chunk-5xgkngpb.js:1000233-1000381 placement
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
//@ chunk-5xgkngpb.js:1000381-1000422 placement
/**
 * isSkillCustomizationBookingAllowed：技能定制允许时返回真（占位）。
 */
function isSkillCustomizationBookingAllowed(plugin, hasManifest) {
  if (hasManifest) return true;
  return false;
}
//@ chunk-5xgkngpb.js:1000422-1002534 placement
/**
 * 在未禁用技能定制且策略允许本地插件目录时，扫描用户与项目的 skills 目录，按同步清单排除已同步的文件夹， 把其余带插件结构的文件夹当作 skills-dir 插件加载。
 */
async function loadSkillsAsPlugins_2(storageV5) {
  if (
    isCustomizationDisabled("skills") ||
    SKILL_OVERRIDE_COMPONENTS.some((schema) => isRestrictedToPluginOnly(schema)) ||
    !areLocalPluginDirsAllowedByPolicy()
  )
    return [];
  let path = getThinkbackSkillDir();
  if (path === null) return [];
  let rootDirs = [];
  if (isSettingSourceEnabled("userSettings"))
    rootDirs.push({
      dir: path,
      scope: "user",
    });
  if (isSettingSourceEnabled("projectSettings")) {
    let projectSkillsDir = join(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills");
    let realOrSelf = (path) => realpath(path).catch(() => path);
    if (projectSkillsDir !== path && (await realOrSelf(projectSkillsDir)) !== (await realOrSelf(path)))
      rootDirs.push({
        dir: projectSkillsDir,
        scope: "project",
      });
  }
  let found = [];
  for (let { dir, scope } of rootDirs)
    try {
      if (scope === "user") {
        if (isStorageV5Enabled() && storageV5 !== undefined) {
          let listing = await listStorageScopeNames(storageV5, {
            namespace: "userConfigDir",
            dir: "skills",
          });
          if (listing.error !== undefined) {
            let error = listing.error;
            if (!("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)))
              logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${formatStorageError(error)}`, {
                level: "warn",
              });
          }
          let mapped = listing.names.map(({ name, kind }) => ({
            name,
            isKey: kind === "key",
          }));
          let syncedSkillNames = await readSyncedSkillNames(dir, storageV5);
          if (syncedSkillNames === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let { name, isKey } of mapped) {
            if (
              syncedSkillNames.has(foldNameForSkill(name)) ||
              (isKey && foldNameForSkill(name) === SYNCED_MANIFEST_FILE)
            )
              continue;
            if (isSyncedDirName(name)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${name}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (isHiddenFoldName(name)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${name}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            found.push({
              dir: join(dir, name),
              scope,
            });
          }
        } else {
          let entries = await getFileReader().listEntries(dir);
          let syncedSkillNames = await readSyncedSkillNames(dir);
          if (syncedSkillNames === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let entry of entries) {
            if (syncedSkillNames.has(foldNameForSkill(entry.name))) continue;
            if (isSyncedDirName(entry.name)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${entry.name}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (isHiddenFoldName(entry.name)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${entry.name}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            if (!entry.isFile)
              found.push({
                dir: join(dir, entry.name),
                scope,
              });
          }
        }
      } else {
        let entries = await readdir(dir, {
          withFileTypes: true,
        });
        for (let entry of entries)
          if (entry.isDirectory() || entry.isSymbolicLink())
            found.push({
              dir: join(dir, entry.name),
              scope,
            });
      }
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${error}`, {
          level: "warn",
        });
    }
  return found;
}
//@ chunk-5xgkngpb.js:1002534-1002907 placement
/**
 * 读技能同步清单，读失败返回 claim-all。
 */
async function readSyncedSkillNames(root, storageV5) {
  let text;
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined
      ? thinkbackUserConfigSpace(join(root, SYNCED_MANIFEST_FILE))
      : null;
  if (storageV5 !== undefined && storageKey !== null) {
    let readResult = await storageV5.read([storageKey]);
    if (!readResult.ok) return "claim-all";
    let item = readResult.value.items[0];
    if (item === undefined) return "claim-all";
    if (!item.found) return new Set();
    text = Buffer.from(item.value).toString("utf-8");
  } else
    try {
      text = await getFileReader().read(join(root, "manifest.json"));
    } catch (error) {
      return isENOENT(error) ? new Set() : "claim-all";
    }
  return parseSkillsSyncManifest(text, root);
}
//@ chunk-5xgkngpb.js:1002907-1002919 placement
var foldNameForSkill = foldNameForSync;
export {
  validatePluginManifest,
  listStorageScopeNames,
  ManifestLoadError,
  MANIFEST_ERROR_CLASSES,
  isGitUsable,
  describePluginDirShape,
  loadSkillsAsPlugins_2,
  isSkillCustomizationBookingAllowed,
  GIT_PROBE_TIMEOUT_MS,
  isNotDotPrefixed,
  markGitUnavailable,
};
