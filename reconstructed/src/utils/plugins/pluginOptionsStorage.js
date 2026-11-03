/**
 * utils/plugins/pluginOptionsStorage.ts
 *
 * 并入已有模块：读取插件选项值（缓存）；按仓库或来源查找市场等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginOptionsStorage.ts
 * pieces: chunk-e6aww6q8.js (2), chunk-vr8smdd9.js (25)
 * attribution: placement 5, fingerprint 5, layout 16, sole-consumer 1
 */
import { lstat, rmdir } from "fs/promises";
import { dirname, dirname as dirname_2, basename } from "path";
import { getManagedPlugins } from "./managedPlugins.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { trustedPluginSetting, pluginSettingWriteTarget, pluginIdAliases } from "./pluginConfigSources.js";
import { getSecureStorage } from "../secureStorage/index.js";
import { legacyPluginIds } from "./pluginIdentifier.js";
import { filterEntriesToNullProto } from "../hooks/functionHookMatchers.js";
import { logForDebugging } from "../debug.js";
import {
  getSettingsForSourceForUpkeep,
  updateSettingsForSource,
  getSettingsFilePathForSource,
  updateSettingsForSourceWithTransform,
  getSettingsForSource,
} from "../settings/settings.js";
import { errorMessage, isENOENT, getErrnoCode } from "../errors.js";
import { or } from "../settings/commandSyncNames.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { READ_FAILED } from "../secureStorage/storageWriteLock.js";
import { pluginDataDirPath, ensurePluginDataDir } from "./pluginDirectories.js";
import { isSameFilesystem } from "./safeCopy.js";
import { removeDirectoryTreeNoFollow, removePathEntry } from "../fsRemove.js";
import { retryFsOp } from "../atomicPublishWrite.js";
import { getOwn } from "../objectSafety.js";
import { validateUserConfig } from "./mcpbHandler.js";
import { getProjectDirForTools } from "../../bootstrap/state.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { RI } from "../sanitization.js";
import { uniq } from "../collections.js";
import { jsonStringify } from "../slowOperations.js";

/**
 * 取市场来源。
 */
//@ chunk-vr8smdd9.js:20170-20201 placement
function marketplaceSource(plugin) {
  return plugin.source;
}
/**
 * 按仓库或来源查找市场。
 */
//@ chunk-vr8smdd9.js:20201-20270 placement
function findMarketplace(e, r) {
  return e.find((n) => n.repository === r || n.source === r);
}
/**
 * 读取插件选项值（缓存）。
 */
//@ chunk-vr8smdd9.js:20270-20459 placement
function loadPluginOptions(e, r) {
  if (getManagedPlugins()) return Promise.resolve({});
  let { optionValues: optionValues } = getPluginRegistry(),
    s = optionValues.get(e);
  if (s !== void 0) return s;
  let a = readPluginOptions(e, r);
  return (
    optionValues.set(e, a),
    a.catch(() => {
      if (optionValues.get(e) === a) optionValues.delete(e);
    }),
    a
  );
}
//@ chunk-vr8smdd9.js:20459-20633 placement
async function readPluginOptions(e, r) {
  let n = trustedPluginSetting(e).options ?? {},
    s = (await getSecureStorage().readAsync(r))?.pluginSecrets,
    reduced = [...legacyPluginIds(e).toReversed(), e].reduce((f, m) => ({ ...f, ...s?.[m] }), {});
  return { ...n, ...reduced };
}
/**
 * 清空插件选项值的内存缓存。
 */
//@ chunk-vr8smdd9.js:20633-20674 layout
function clearPluginOptionsCache() {
  getPluginRegistry().optionValues.clear();
}
/**
 * 保存插件选项：sensitive 字段写安全存储（keychain/凭据文件的 pluginSecrets），其余写 userSettings 的 pluginConfigs[插件].options；同时清掉另一侧的同名旧值。
 */
//@ chunk-vr8smdd9.js:20674-22061 fingerprint = savePluginOptions (0.827)
async function savePluginOptions(pluginId, values, schema, s, a) {
  let f = {},
    m = {};
  for (let [y, S] of Object.entries(values))
    if (schema[y]?.sensitive === !0) m[y] = String(S);
    else f[y] = S;
  let sensitiveKeysInThisSave = new Set(Object.keys(m)),
    nonSensitiveKeysInThisSave = new Set(Object.keys(f)),
    mutate = await getSecureStorage().mutate((y) => {
      let S = pluginSettingWriteTarget(y.pluginSecrets, pluginId),
        b =
          S.replaced.length === 0
            ? y.pluginSecrets?.[S.written]
            : [...S.replaced.toReversed(), S.written].reduce(
                (O, F) => ({ ...O, ...y.pluginSecrets?.[F] }),
                {},
              ),
        M = b ? filterEntriesToNullProto(b, (O, F) => !nonSensitiveKeysInThisSave.has(F)) : void 0,
        T = M && b && Object.keys(M).length !== Object.keys(b).length;
      if (Object.keys(m).length === 0 && !T && S.replaced.length === 0) return y;
      return {
        ...y,
        pluginSecrets: {
          ...filterEntriesToNullProto(y.pluginSecrets ?? {}, (O, F) => !S.replaced.includes(F)),
          [S.written]: { ...M, ...m },
        },
      };
    }, a);
  if (!mutate.success) {
    let y = Error(`Failed to save sensitive plugin options for ${pluginId} to secure storage`);
    throw (logForDebugging(y.message, { level: "error" }), y);
  }
  if (mutate.warning) logForDebugging(`Plugin secrets save warning: ${mutate.warning}`, { level: "warn" });
  let x = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs,
    w = {};
  for (let y of pluginIdAliases(pluginId)) {
    let keysToScrubFromSettings = Object.keys(x?.[y]?.options ?? {}).filter((T) =>
        sensitiveKeysInThisSave.has(T),
      ),
      scrubbed = Object.fromEntries(keysToScrubFromSettings.map((T) => [T, void 0])),
      M = y === pluginId ? f : {};
    if (Object.keys(M).length > 0 || keysToScrubFromSettings.length > 0)
      w[y] = { options: { ...M, ...scrubbed } };
  }
  if (Object.keys(w).length > 0) {
    let y = await updateSettingsForSource(
      "userSettings",
      { pluginConfigs: mergeRenamedPluginSettings(x, pluginId, w) },
      void 0,
      s,
    );
    if (y.error)
      throw (
        logForDebugging(
          `Failed to save plugin options for ${pluginId} to settings.json: ${errorMessage(y.error)}`,
          { level: "error" },
        ),
        Error(`Failed to save plugin options for ${pluginId}: ${y.error.message}`)
      );
  }
  clearPluginOptionsCache();
}
/**
 * 列出 settings.pluginConfigs 与安全存储里出现过的插件选项键（用于清理）。
 */
//@ chunk-vr8smdd9.js:22061-22624 layout
async function listStoredPluginOptionKeys(e) {
  let r = [],
    n = new Set();
  or();
  let s = getSettingsForSourceForUpkeep("userSettings");
  if (s === null || s === void 0) {
    let a = getSettingsFilePathForSource("userSettings");
    if (a !== void 0 && (await pathPresence(a)) !== "gone") r.push("settings_unreadable");
  }
  for (let a of Object.keys(s?.pluginConfigs ?? {})) n.add(a);
  try {
    let a = getSecureStorage(),
      f = a.readAsyncStrict
        ? await a.readAsyncStrict(e, { inaccessibleAs: "failure" })
        : await a.readAsync(e);
    if (f === READ_FAILED) r.push("secrets_unreadable");
    else
      for (let m of Object.keys(f?.pluginSecrets ?? {})) {
        let index = m.indexOf("/");
        n.add(index === -1 ? m : m.slice(0, index));
      }
  } catch {
    r.push("secrets_unreadable");
  }
  return { ids: [...n], unreadable: r };
}
//@ chunk-vr8smdd9.js:22624-22935 layout
async function readUserSettingsForOptions(e) {
  or();
  let r = getSettingsForSourceForUpkeep("userSettings");
  if (r !== null && r !== void 0) return r;
  let n = getSettingsFilePathForSource("userSettings");
  if (n === void 0 || (await pathPresence(n)) === "gone") return;
  return (
    logForDebugging(
      `deletePluginOptions: the user settings file (${n}) is there and could not be read, so options of ${e} may remain in it`,
      { level: "warn" },
    ),
    "unreadable"
  );
}
/**
 * 删除插件的全部选项（settings.pluginConfigs 与安全存储里的 pluginSecrets），卸载时调用。
 */
//@ chunk-vr8smdd9.js:22935-24670 fingerprint = deletePluginOptions (0.431)
async function deletePluginOptions(e, r, n, s) {
  let a = !0,
    f = await readUserSettingsForOptions(e);
  if (f === "unreadable") ((a = !1), s?.push("settings_unreadable"));
  let m = f === "unreadable" ? void 0 : f,
    filtered = pluginIdAliases(e).filter((x) => m?.pluginConfigs?.[x] !== void 0);
  if (filtered.length > 0) {
    let fromEntries = Object.fromEntries(filtered.map((y) => [y, void 0])),
      { error: error } = await updateSettingsForSource(
        "userSettings",
        { pluginConfigs: fromEntries },
        void 0,
        r,
      );
    if (error)
      (logForDebugging(
        `deletePluginOptions: failed to clear settings.pluginConfigs[${e}]: ${error.message}`,
        { level: "warn" },
      ),
        (a = !1),
        s?.push("settings_write_failed"));
    else {
      let y = await readUserSettingsForOptions(e);
      if (y === "unreadable") ((a = !1), s?.push("settings_unreadable"));
      let S = y === "unreadable" ? void 0 : y?.pluginConfigs;
      if (filtered.some((b) => S?.[b] !== void 0))
        (logForDebugging(
          `deletePluginOptions: settings.pluginConfigs[${e}] still reads back after a write that reported no error`,
          { level: "warn" },
        ),
          (a = !1),
          s?.push("settings_remain"));
    }
  }
  let g = [e, ...legacyPluginIds(e)],
    h = (x) => g.some((w) => x === w || x.startsWith(`${w}/`));
  try {
    let settings = getSecureStorage();
    if (
      !(
        await settings.mutate((y) => {
          if (!y.pluginSecrets) return y;
          let survivingEntries = Object.entries(y.pluginSecrets).filter(([b]) => !h(b));
          if (survivingEntries.length === Object.keys(y.pluginSecrets).length) return y;
          return {
            ...y,
            pluginSecrets: survivingEntries.length > 0 ? Object.fromEntries(survivingEntries) : void 0,
          };
        }, n)
      ).success
    )
      (logForDebugging(`deletePluginOptions: failed to clear pluginSecrets for ${e} from keychain`, {
        level: "warn",
      }),
        (a = !1),
        s?.push("secrets_write_failed"));
    else {
      let y = settings.readAsyncStrict
        ? await settings.readAsyncStrict(n, { inaccessibleAs: "failure" })
        : await settings.readAsync(n);
      if (y === READ_FAILED || Object.keys(y?.pluginSecrets ?? {}).some(h))
        (logForDebugging(
          `deletePluginOptions: after the delete, secure storage could not be read or still holds pluginSecrets for ${e}`,
          { level: "warn" },
        ),
          (a = !1),
          s?.push(y === READ_FAILED ? "secrets_unreadable" : "secrets_remain"));
    }
  } catch (error) {
    (logForDebugging(`deletePluginOptions: storage lock unavailable for ${e}: ${errorMessage(error)}`, {
      level: "warn",
    }),
      (a = !1),
      s?.push("secrets_write_failed"));
  }
  return (clearPluginOptionsCache(), a);
}
/**
 * --replace 切换副本时把旧插件 ID 的选项与密钥复制到新 ID（目标已有值则不覆盖）。
 */
//@ chunk-vr8smdd9.js:24670-27533 layout
async function copyPluginOptions(e, r, n, s, a) {
  {
    let f = !0,
      m = !1,
      { error: error } = await updateSettingsForSourceWithTransform(
        "userSettings",
        (T) => {
          let O = T?.pluginConfigs?.[e];
          if (O === void 0) return null;
          if (T?.pluginConfigs?.[r] !== void 0) return ((m = !0), null);
          return { pluginConfigs: { [r]: O } };
        },
        void 0,
        s,
      );
    if (error)
      ((f = !1),
        logForDebugging(`copyPluginOptions: failed to copy settings.pluginConfigs[${e}]: ${error.message}`, {
          level: "warn",
        }));
    if (!f)
      return (
        logForDebugging(
          `copyPluginOptions: the settings write failed, so the secrets of ${e} were not copied`,
          { level: "warn" },
        ),
        clearPluginOptionsCache(),
        {
          optionsCarried: f,
          secretsCarried: !1,
          oldDataDirDisposable: !1,
          dataDirCopied: !1,
          targetHadOwn: m,
        }
      );
    let g = !0;
    try {
      if (
        !(
          await getSecureStorage().mutate((O) => {
            if (!O.pluginSecrets) return O;
            let F = {};
            for (let [v, P] of Object.entries(O.pluginSecrets)) {
              let K = remapSecretKey(v, e, r);
              if (K === void 0) continue;
              if (O.pluginSecrets[K] === void 0) F[K] = P;
              else m = !0;
            }
            return Object.keys(F).length === 0 ? O : { ...O, pluginSecrets: { ...O.pluginSecrets, ...F } };
          }, a)
        ).success
      )
        ((g = !1),
          logForDebugging(`copyPluginOptions: failed to copy pluginSecrets for ${e}`, { level: "warn" }));
    } catch {
      ((g = !1),
        logForDebugging(`copyPluginOptions: secure storage unavailable for ${e}`, { level: "warn" }));
    }
    if (!f || !g)
      return (
        clearPluginOptionsCache(),
        { optionsCarried: f, secretsCarried: g, oldDataDirDisposable: !1, dataDirCopied: !1, targetHadOwn: m }
      );
    let h = pluginDataDirPath(e),
      x = pluginDataDirPath(r),
      w = `${x}.switching-${process.pid}`,
      y = !1,
      S = !1,
      b,
      M;
    try {
      let T = await pathPresence(h);
      if (T === "gone") y = !0;
      else if (T === "unreadable")
        ((b = "copy-failed"),
          logForDebugging(
            `copyPluginOptions: the data directory of ${e} could not be examined; it is kept and was not copied`,
            { level: "warn" },
          ));
      else if (
        !(M = await lstat(h, { bigint: !0 })).isDirectory() ||
        !(await isSameFilesystem(dirname(h), basename(h)))
      )
        ((b = "copy-failed"),
          logForDebugging(
            `copyPluginOptions: the data directory of ${e} is not a real directory; it is kept and was not copied`,
            { level: "warn" },
          ));
      else {
        let O = await rmdir(x).then(
          () => {
            return;
          },
          (F) => (isENOENT(F) ? void 0 : getErrnoCode(F)),
        );
        if (O === void 0) {
          await removeDirectoryTreeNoFollow(w);
          let F = await isSameFilesystem(dirname(h), basename(h)),
            v = await lstat(h, { bigint: !0 });
          if (!F || !v.isDirectory() || v.dev !== M?.dev || v.ino !== M?.ino)
            throw Error("the old data directory is not the real directory first seen");
          await n(h, w, h, w, h, !0, new Set(), void 0, !1, !0);
          let P = await lstat(h, { bigint: !0 });
          if (
            !P.isDirectory() ||
            !(await isSameFilesystem(dirname(h), basename(h))) ||
            P.dev !== v.dev ||
            P.ino !== v.ino
          )
            throw Error("the old data directory changed during the copy");
          if (!(await lstat(w)).isDirectory() || !(await isSameFilesystem(dirname(w), basename(w))))
            throw Error("the staging folder is not a real directory");
          if (
            (await retryFsOp(w, x),
            !(await lstat(x)).isDirectory() || !(await isSameFilesystem(dirname(x), basename(x))))
          )
            throw (
              await removePathEntry(x).catch(() => {}),
              Error("what stands at the target after the move is not a real directory")
            );
          ((y = !0), (S = !0));
        } else b = O === "ENOTEMPTY" || O === "EEXIST" || O === "ENOTDIR" ? "target-had-own" : "copy-failed";
      }
    } catch (error) {
      ((b = "copy-failed"),
        logForDebugging(
          `copyPluginOptions: failed to copy the data directory of ${e}: ${errorMessage(error)}`,
          { level: "warn" },
        ),
        await removeDirectoryTreeNoFollow(w).catch(() => {}));
    }
    return (
      clearPluginOptionsCache(),
      {
        optionsCarried: f,
        secretsCarried: g,
        oldDataDirDisposable: y,
        dataDirCopied: S,
        dataDirKeptReason: b,
        targetHadOwn: m,
      }
    );
  }
  return {
    optionsCarried: !1,
    secretsCarried: !1,
    oldDataDirDisposable: !1,
    dataDirCopied: !1,
    targetHadOwn: !1,
  };
}
//@ chunk-vr8smdd9.js:27533-27640 layout
function remapSecretKey(e, r, n) {
  {
    let s = `${r}/`;
    return e === r ? n : e.startsWith(s) ? `${n}/${e.slice(s.length)}` : void 0;
  }
  return;
}
/**
 * --replace 切换时目标副本是否已有自己的选项（有则不复制）；安全存储读不到时为 unknown。
 */
//@ chunk-vr8smdd9.js:27640-28052 layout
async function wouldTargetKeepOwnPluginOptions(e, r) {
  {
    let n = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
    if (n?.[e] !== void 0 && n[r] !== void 0) return !0;
    try {
      let s = (await getSecureStorage().readAsync())?.pluginSecrets ?? {};
      return Object.keys(s).some((a) => {
        let f = remapSecretKey(a, e, r);
        return f !== void 0 && s[f] !== void 0;
      });
    } catch {
      return (
        logForDebugging(
          `wouldTargetKeepOwnPluginOptions: secure storage could not be read (switch from ${e}), so the answer is 'unknown'`,
          { level: "warn" },
        ),
        "unknown"
      );
    }
  }
  return !1;
}
/**
 * 返回 manifest.userConfig 中尚未配置（或非敏感值不合法）的选项，启用插件时据此弹出配置对话框。
 */
//@ chunk-vr8smdd9.js:28052-28308 fingerprint = getUnconfiguredOptions (0.829)
async function getUnconfiguredOptions(e, r) {
  let manifestSchema = e.manifest.userConfig;
  if (!manifestSchema || Object.keys(manifestSchema).length === 0) return {};
  let s = await loadPluginOptions(marketplaceSource(e), r),
    unconfigured = {};
  for (let [f, m] of Object.entries(manifestSchema)) {
    let single = getOwn(s, f);
    if (
      single === void 0 ||
      single === "" ||
      (m.sensitive !== !0 && !validateUserConfig({ [f]: single }, { [f]: m }).valid)
    )
      unconfigured[f] = m;
  }
  return unconfigured;
}
/**
 * 值是否不在字段的 options 列表内。
 */
//@ chunk-vr8smdd9.js:28308-28400 layout
function isOutsideOptions(e, r) {
  let n = e?.options;
  return n !== void 0 && !(typeof r === "string" && n.includes(r));
}
/**
 * 已保存选项与 schema 默认值合并；值不在 options 列表内的视为未设置。
 */
//@ chunk-vr8smdd9.js:28400-28736 layout
function applyUserConfigDefaults(e, r) {
  let n = {};
  for (let [a, f] of Object.entries(r)) {
    if (f.required && f.default === void 0) continue;
    n[a] = f.default ?? "";
  }
  let s = filterEntriesToNullProto(e, (a, f) => {
    let m = r[f]?.options;
    if (m === void 0 || !isOutsideOptions(r[f], a)) return !0;
    return (
      logForDebugging(
        `plugin option ${f} holds a value that is not one of ${m.join(", ")}; it reads as unset`,
        { level: "warn" },
      ),
      !1
    );
  });
  return { ...n, ...s };
}
/**
 * 替换插件路径变量：${CLAUDE_PLUGIN_ROOT} → 插件目录，${CLAUDE_PROJECT_DIR} → 项目目录，${CLAUDE_PLUGIN_DATA} → 插件数据目录（远端无数据目录时抛 PluginDataDirUnknownError）；可传转义函数。
 */
//@ chunk-vr8smdd9.js:28736-29120 layout
function substitutePluginVariables(e, r, n = (s) => s) {
  let s = (f) => n(f),
    replaced = e.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, () => s(r.path));
  if (r.projectDir !== null)
    replaced = replaced.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, () => {
      let f = getProjectDirForTools();
      if (f === null) throw new NoProjectDirectoryError();
      return s(f);
    });
  if (r.source) {
    let { source: source, dataDir: dataDir } = r;
    replaced = replaced.replace(/\$\{CLAUDE_PLUGIN_DATA\}/g, () => {
      let c = resolveDataDir({ source: source, dataDir: dataDir }, ensurePluginDataDir);
      if (c === null) throw new PluginDataDirUnknownError();
      return s(c);
    });
  }
  return replaced;
}
//@ chunk-vr8smdd9.js:29120-29321 layout
class PluginDataDirUnknownError extends Error {
  name = "PluginDataDirUnknownError";
  constructor() {
    super(
      "CLAUDE_PLUGIN_DATA cannot be filled in: the plugin is on another machine, and its data folder there did not come with it",
    );
  }
}
/**
 * 文本是否引用了本机无法确定的 ${CLAUDE_PLUGIN_DATA}。
 */
//@ chunk-vr8smdd9.js:29321-29445 layout
function needsUnknownDataDir(e, r) {
  if (r.dataDir !== null) return !1;
  try {
    return (substitutePluginVariables(e, { ...r, projectDir: null }), !1);
  } catch (error) {
    return error instanceof PluginDataDirUnknownError;
  }
}
//@ chunk-vr8smdd9.js:29445-29510 layout
function resolveDataDir(e, r) {
  return e.dataDir === void 0 ? r(e.source) : e.dataDir;
}
//@ chunk-vr8smdd9.js:29510-29529 layout
var CLAUDE_VAR_PREFIX = "${CLAUDE_";
/**
 * 估算变量替换后的最大增长长度（防止替换后超长）。
 */
//@ chunk-vr8smdd9.js:29529-29759 layout
function estimateSubstitutedGrowth(e, r, n = "") {
  let s = e.split(CLAUDE_VAR_PREFIX).length - 1;
  if (s === 0) return 0;
  let a = getProjectDirForTools();
  return r.path.includes(CLAUDE_VAR_PREFIX) || a?.includes("$") || r.dataDir?.includes("$")
    ? 1 / 0
    : s *
        3 *
        Math.max(
          r.path.length,
          a?.length ?? 0,
          RI,
          (resolveDataDir(r, pluginDataDirPath) ?? "").length,
          n.length,
        );
}
/**
 * 替换 ${user_config.KEY}：缺失时默认抛错（提示到 /plugin manage 配置），也可保留原文。
 */
//@ chunk-vr8smdd9.js:29759-30078 layout
function substituteUserConfigVariables(e, r, { missingKey: n = "throw" } = {}) {
  return e.replace(/\$\{user_config\.([^}]+)\}/g, (s, a) => {
    let f = getOwn(r, a);
    if (f === void 0) {
      if (n === "literal") return s;
      throw Error(
        `Plugin option "${a}" isn't set. Open /plugin manage to configure it, or check that the plugin's userConfig schema declares "${a}".`,
      );
    }
    return String(f);
  });
}
/**
 * 文本中是否含 ${user_config.*} 引用。
 */
//@ chunk-vr8smdd9.js:30078-30136 layout
function hasUserConfigVariables(e, r) {
  try {
    return substituteUserConfigVariables(e, r) !== e;
  } catch {
    return !0;
  }
}
/**
 * 在技能/代理正文中替换 ${user_config.KEY}：sensitive 值不替换，改为占位说明。
 */
//@ chunk-vr8smdd9.js:30136-30373 fingerprint = substituteUserConfigInContent (1)
function substituteUserConfigInContent(e, r, n, s) {
  return e.replace(/\$\{user_config\.([^}]+)\}/g, (match, key) => {
    if (n[key]?.sensitive === !0) return `[sensitive option '${key}' not available in skill content]`;
    let m = getOwn(r, key);
    if (m === void 0) return match;
    let c = String(m);
    return s ? s(c) : c;
  });
}
/**
 * 插件改名时合并旧 id 的选项与 MCP 配置到新 id。
 */
//@ chunk-vr8smdd9.js:30373-30936 sole-consumer
function mergeRenamedPluginSettings(e, r, n) {
  let s = pluginSettingWriteTarget(e, r);
  if (s.replaced.length === 0) return n;
  let a = [...s.replaced.toReversed(), s.written],
    f = filterEntriesToNullProto(n, (g, h) => !s.replaced.includes(h)),
    m = {
      ...filterEntriesToNullProto(
        a.reduce((g, h) => ({ ...g, ...e?.[h]?.options, ...(h === s.written ? void 0 : n[h]?.options) }), {}),
        (g) => g !== void 0,
      ),
      ...f[s.written]?.options,
    },
    c = uniq(a.flatMap((g) => Object.keys(e?.[g]?.mcpServers ?? {})));
  return {
    ...f,
    ...Object.fromEntries(s.replaced.map((g) => [g, void 0])),
    [s.written]: {
      options: m,
      ...(c.length === 0
        ? {}
        : {
            mcpServers: Object.fromEntries(
              c.map((g) => [g, a.reduce((h, x) => ({ ...h, ...e?.[x]?.mcpServers?.[g] }), {})]),
            ),
          }),
    },
  };
}
//@ chunk-e6aww6q8.js:762563-762603 placement = TRUSTED_SETTING_SOURCES (0.808)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings"];
/**
 * 序列化插件在各受信设置源中的 pluginConfigs options，作为插件选项的变化指纹（名字配错，见 lead 建议）。
 */
//@ chunk-e6aww6q8.js:762603-762691 fingerprint = loadPluginOptions (0.646)
var pluginOptionsFingerprint = (pluginId) =>
  jsonStringify(
    TRUSTED_SETTING_SOURCES.map((n) =>
      pluginIdAliases(pluginId).map((r) => getSettingsForSource(n)?.pluginConfigs?.[r]?.options ?? null),
    ),
  );

export {
  findMarketplace,
  savePluginOptions,
  marketplaceSource,
  getUnconfiguredOptions,
  loadPluginOptions,
  hasUserConfigVariables,
  substitutePluginVariables,
  copyPluginOptions,
  substituteUserConfigVariables,
  applyUserConfigDefaults,
  wouldTargetKeepOwnPluginOptions,
  substituteUserConfigInContent,
  isOutsideOptions,
  clearPluginOptionsCache,
  pluginOptionsFingerprint,
  TRUSTED_SETTING_SOURCES,
  estimateSubstitutedGrowth,
  needsUnknownDataDir,
  deletePluginOptions,
  listStoredPluginOptionKeys,
};
