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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessibleCode,
  isFsInaccessible,
  isENOENT,
} from "../errors.js";
import {
  PLUGIN_MANIFEST_DIR,
  PLUGIN_MANIFEST_PATH,
  MARKETPLACE_MANIFEST_PATH,
  j5r,
  yii,
} from "./commandSource.js";
import { O_NONBLOCK } from "../fsFlags.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
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
import { fje } from "../git/gitMissingMessage.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { oJt } from "../settings/types.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { areLocalPluginDirsAllowedByPolicy } from "./marketplacePolicy.js";
import { getThinkbackSkillDir, RJr } from "./pluginLinks.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { getProjectConfigRoot, getOriginalCwd } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { SYNCED_MANIFEST_FILE, f3, MJ, parseSkillsSyncManifest, y5t } from "./syncedItems.js";
import { getFileReader } from "../fileStore.js";

/**
 * 读取目录项：存在插件根标志（非插件 manifest 的 .claude-plugin 市场目录除外）时返回 {kind:"plugin", marker}； 否则返回 collection（含 plugin.json 的子目录为 children、其余 skipped，以及是否市场根）。
 */
//@ chunk-e6aww6q8.js:724536-724785 placement
async function describePluginDirShape(e) {
  let n;
  try {
    n = await readdir_11(e, { withFileTypes: !0 });
  } catch (error) {
    return { kind: "unreadable", errno: getErrnoCode(error) ?? "UNKNOWN" };
  }
  let r = await isMarketplaceOnlyManifestDir(e, n),
    s = r ? n.filter((y) => y.name !== PLUGIN_MANIFEST_DIR) : n,
    h = await findPluginRootMarker(e, s);
  return h === void 0 ? listPluginCollection(e, s, r) : { kind: "plugin", marker: h };
}
//@ chunk-e6aww6q8.js:724785-724817 placement
var x3n = (e) => !e.startsWith(".");
//@ chunk-e6aww6q8.js:724817-724938 placement
async function isMarketplaceOnlyManifestDir(e, n) {
  return (
    n.some((r) => r.name === PLUGIN_MANIFEST_DIR) &&
    (await probeFileOpen(join_25(e, PLUGIN_MANIFEST_PATH))) === "absent" &&
    (await probeFileOpen(join_25(e, MARKETPLACE_MANIFEST_PATH))) === "there"
  );
}
/**
 * 找出使目录成为插件根的标志项。
 */
//@ chunk-e6aww6q8.js:724938-725280 placement
async function findPluginRootMarker(e, n) {
  let filtered = n.map((w) => w.name).filter(j5r),
    h =
      filtered.includes(".mcp.json") &&
      (await lstat_13(join_25(e, ".mcp.json")).then(
        (w) => w.isFile() && w.size === 0,
        (w) => getErrnoCode(w) === "ENOENT",
      ))
        ? filtered.filter((w) => w !== ".mcp.json")
        : filtered,
    found = h.find((w) => !yii(w));
  if (found !== void 0) return found;
  let results = await Promise.all(h.map((w) => probeFileOpen(join_25(e, w, PLUGIN_MANIFEST_PATH))));
  return h.find((w, L) => results[L] === "absent");
}
/**
 * 列出含 plugin.json 的子目录与跳过的子目录。
 */
//@ chunk-e6aww6q8.js:725280-725581 placement
async function listPluginCollection(e, n, r) {
  let toSorted = n
      .filter((y) => y.isDirectory() || y.isSymbolicLink())
      .map((y) => y.name)
      .filter(x3n)
      .toSorted(),
    results = await Promise.all(toSorted.map((y) => probeFileOpen(join_25(e, y, PLUGIN_MANIFEST_PATH))));
  return {
    kind: "collection",
    children: toSorted.filter((y, S) => results[S] !== "absent"),
    skipped: toSorted.filter((y, S) => results[S] === "absent"),
    isMarketplaceRoot: r,
  };
}
//@ chunk-e6aww6q8.js:725581-725741 placement
async function probeFileOpen(e) {
  try {
    return (await (await open_6(e, constants_6.O_RDONLY | O_NONBLOCK)).close(), "there");
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "absent" : "unsure";
  }
}
/**
 * 校验插件清单（plugin.json）结构，报告字段错误。
 */
//@ chunk-e6aww6q8.js:725741-727515 placement
function validatePluginManifest(e, n, r) {
  let s = formatManifestErrorHeading(n, r);
  if (!isPlainObject_4(e))
    return {
      ok: !1,
      unloadableGuard: !1,
      error: `${s}

Validation errors: manifest must be an object`,
      errors: [{ path: "", message: "manifest must be an object" }],
      rawCandidate: null,
    };
  let h = { ...e };
  if (n === "marketplace-entry") (delete h.id, delete h.source, delete h.strict);
  let y = new Set(),
    S = [],
    w = [],
    L = {};
  if (isPlainObject_4(h.experimental)) {
    for (let [Ee, Ae] of Object.entries(h.experimental)) if (!y.has(Ee)) L[Ee] = Ae;
  }
  for (let [Ee, Ae] of [
    [h, "top level"],
    [{ unlifted: L }, "`experimental`"],
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
  if (h.hooks !== void 0 && typeof h.hooks === "object") h.hooks = clone(h.hooks);
  let G = isPlainObject_4(h.hooks)
      ? [[h.hooks, "hooks"]]
      : Array.isArray(h.hooks)
        ? h.hooks.flatMap((hook, Ae) => (isPlainObject_4(hook) ? [[hook, `hooks.${Ae}`]] : []))
        : [],
    q = [];
  for (let [Ee, Ae] of G) {
    let Ie = validateHooksSetting(Ee);
    (q.push(...Ie.notes.map((note) => note.replace(/^hooks/, Ae))),
      w.push(
        ...Ie.unloadableGuards.map((unloadableGuard) => ({
          path: Ae,
          message: `${unloadableGuard.replace(/^hooks/, Ae)} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        })),
      ));
  }
  let safeParse = getManifestSchemaForDocument(h).safeParse(h);
  if (safeParse.success && S.length === 0 && w.length === 0)
    return { ok: !0, manifest: safeParse.data, rawCandidate: h, hookNotes: q };
  let Se = safeParse.success
      ? []
      : safeParse.error.issues.map((issue) => {
          let Ae = issue.path.length > 0 ? String(issue.path[0]) : "",
            joined = issue.path.join(".");
          return { path: y.has(Ae) ? `experimental.${joined}` : joined, message: issue.message };
        }),
    ke = [...w, ...S, ...Se],
    joined = ke.map((Ee) => (Ee.path ? `${Ee.path}: ${Ee.message}` : Ee.message)).join(", ");
  return {
    ok: !1,
    unloadableGuard: w.length > 0,
    error: `${s}

Validation errors: ${joined}`,
    errors: ke,
    rawCandidate: h,
    manifest: safeParse.success ? safeParse.data : void 0,
  };
}
/**
 * manifest 无效时的标题（plugin.json/SKILL.md/市场条目）。
 */
//@ chunk-e6aww6q8.js:727515-727842 placement
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
async function J_o(e) {
  try {
    return !!(await whichAsync(e));
  } catch {
    return !1;
  }
}
/**
 * git 可用且未被环境禁止（结果缓存）。
 */
//@ chunk-e6aww6q8.js:727904-728017 placement
async function isGitUsable() {
  let e = getPluginRegistry();
  return ((e.gitAvailable ??= J_o("git")), (await e.gitAvailable) && !fje("git", process.env));
}
//@ chunk-e6aww6q8.js:728017-728070 placement
function wqs() {
  getPluginRegistry().gitAvailable = Promise.resolve(!1);
}
//@ chunk-e6aww6q8.js:728182-728195 placement
var oSo = 5000;
/**
 * manifest 错误分类码。
 */
//@ chunk-e6aww6q8.js:985837-986000 placement
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
  constructor(e, n, r, s, h) {
    super(e, n, r);
    this.manifestPath = s;
    this.problems = h;
  }
}
/**
 * 分页列出存储作用域下的直接条目名。
 */
//@ chunk-e6aww6q8.js:986114-986521 placement
async function listStorageScopeNames(e, n) {
  let r = [],
    s;
  do {
    let listEntries = await e.listEntries(n, {
      skipScopeStats: !0,
      skipKeyStats: !0,
      ...(s !== void 0 && { cursor: s }),
    });
    if (!listEntries.ok) return { names: r, error: listEntries.error };
    for (let item of listEntries.value.items) {
      let S = item.kind === "scope" ? item.scope : item.key;
      if (S.namespace !== n.namespace || !("relPath" in S)) continue;
      let w = S.relPath?.at(-1);
      if (w !== void 0) r.push({ name: w, kind: item.kind });
    }
    s = listEntries.value.cursor;
  } while (s !== void 0);
  return { names: r };
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
function h1t(e, n) {
  if (n) return !0;
  return !1;
}
/**
 * 在未禁用技能定制且策略允许本地插件目录时，扫描用户与项目的 skills 目录，按同步清单排除已同步的文件夹， 把其余带插件结构的文件夹当作 skills-dir 插件加载。
 */
//@ chunk-e6aww6q8.js:986710-988822 placement
async function loadSkillsAsPlugins_2(e) {
  if (
    isCustomizationDisabled("skills") ||
    oJt.some((h) => isRestrictedToPluginOnly(h)) ||
    !areLocalPluginDirsAllowedByPolicy()
  )
    return [];
  let n = getThinkbackSkillDir();
  if (n === null) return [];
  let r = [];
  if (isSettingSourceEnabled("userSettings")) r.push({ dir: n, scope: "user" });
  if (isSettingSourceEnabled("projectSettings")) {
    let h = join_48(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills"),
      y = (S) => realpath_16(S).catch(() => S);
    if (h !== n && (await y(h)) !== (await y(n))) r.push({ dir: h, scope: "project" });
  }
  let s = [];
  for (let { dir: dir, scope: scope } of r)
    try {
      if (scope === "user")
        if (isStorageV5Enabled() && e !== void 0) {
          let S = await listStorageScopeNames(e, { namespace: "userConfigDir", dir: "skills" });
          if (S.error !== void 0) {
            let error = S.error;
            if (!("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)))
              logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${formatStorageError(error)}`, {
                level: "warn",
              });
          }
          let mapped = S.names.map(({ name: G, kind: kind }) => ({ name: G, isKey: kind === "key" })),
            L = await readSyncedSkillNames(dir, e);
          if (L === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join_48(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let { name: G, isKey: isKey } of mapped) {
            if (L.has(vGe(G)) || (isKey && vGe(G) === SYNCED_MANIFEST_FILE)) continue;
            if (f3(G)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${G}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (MJ(G)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${G}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            s.push({ dir: join_48(dir, G), scope: scope });
          }
        } else {
          let listEntries = await getFileReader().listEntries(dir),
            w = await readSyncedSkillNames(dir);
          if (w === "claim-all") {
            logForDebugging(
              `[plugins] skills-dir plugin adoption skipped: ${join_48(dir, SYNCED_MANIFEST_FILE)} is unreadable or not a valid sync manifest, so no folder in ${dir} is adopted as a plugin until that file is fixed or removed`,
            );
            continue;
          }
          for (let L of listEntries) {
            if (w.has(vGe(L.name))) continue;
            if (f3(L.name)) {
              logForDebugging(
                `[plugins] skipping skills-dir entry '${L.name}': the sync-owned root name is never adopted as a plugin`,
              );
              continue;
            }
            if (MJ(L.name)) {
              logForDebugging(
                `[plugins] skipping hidden skills-dir entry '${L.name}': dot-prefixed dirs are never adopted as plugins`,
              );
              continue;
            }
            if (!L.isFile) s.push({ dir: join_48(dir, L.name), scope: scope });
          }
        }
      else {
        let S = await readdir_18(dir, { withFileTypes: !0 });
        for (let w of S)
          if (w.isDirectory() || w.isSymbolicLink()) s.push({ dir: join_48(dir, w.name), scope: scope });
      }
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[skill-as-plugin] readdir ${dir} failed: ${error}`, { level: "warn" });
    }
  return s;
}
/**
 * 读技能同步清单，读失败返回 claim-all。
 */
//@ chunk-e6aww6q8.js:988822-989195 placement
async function readSyncedSkillNames(e, n) {
  let r,
    s = isStorageV5Enabled() && n !== void 0 ? RJr(join_48(e, SYNCED_MANIFEST_FILE)) : null;
  if (n !== void 0 && s !== null) {
    let read = await n.read([s]);
    if (!read.ok) return "claim-all";
    let y = read.value.items[0];
    if (y === void 0) return "claim-all";
    if (!y.found) return new Set();
    r = Buffer.from(y.value).toString("utf-8");
  } else
    try {
      r = await getFileReader().read(join_48(e, "manifest.json"));
    } catch (error) {
      return isENOENT(error) ? new Set() : "claim-all";
    }
  return parseSkillsSyncManifest(r, e);
}
//@ chunk-e6aww6q8.js:989195-989207 placement
var vGe = y5t;

export {
  isGitUsable,
  wqs,
  listStorageScopeNames,
  ManifestLoadError,
  MANIFEST_ERROR_CLASSES,
  validatePluginManifest,
  describePluginDirShape,
  loadSkillsAsPlugins_2,
  h1t,
  oSo,
  x3n,
};
