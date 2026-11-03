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
import { dirname, basename } from "path";
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
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
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
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "../sanitization.js";
import { uniq } from "../collections.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-vr8smdd9.js:20170-20201 placement
/**
 * 取市场来源。
 */
function marketplaceSource(plugin) {
  return plugin.source;
}
//@ chunk-vr8smdd9.js:20201-20270 placement
/**
 * 按仓库或来源查找市场。
 */
function findMarketplace(e, r) {
  return e.find((n) => n.repository === r || n.source === r);
}
//@ chunk-vr8smdd9.js:20270-20459 placement
/**
 * 读取插件选项值（缓存）。
 */
function loadPluginOptions(e, credentials) {
  if (getManagedPlugins()) return Promise.resolve({});
  let { optionValues } = getPluginRegistry();
  let s = optionValues.get(e);
  if (s !== undefined) return s;
  let pluginOptions = readPluginOptions(e, credentials);
  optionValues.set(e, pluginOptions);
  pluginOptions.catch(() => {
    if (optionValues.get(e) === pluginOptions) optionValues.delete(e);
  });
  return pluginOptions;
}
//@ chunk-vr8smdd9.js:20459-20633 placement
async function readPluginOptions(e, r) {
  let options = trustedPluginSetting(e).options ?? {};
  let pluginSecrets = (await getSecureStorage().readAsync(r))?.pluginSecrets;
  let reduced = [...legacyPluginIds(e).toReversed(), e].reduce(
    (acc, m) => ({
      ...acc,
      ...pluginSecrets?.[m],
    }),
    {},
  );
  return {
    ...options,
    ...reduced,
  };
}
//@ chunk-vr8smdd9.js:20633-20674 layout
/**
 * 清空插件选项值的内存缓存。
 */
function clearPluginOptionsCache() {
  getPluginRegistry().optionValues.clear();
}
//@ chunk-vr8smdd9.js:20674-22061 fingerprint = savePluginOptions (0.827)
/**
 * 保存插件选项：sensitive 字段写安全存储（keychain/凭据文件的 pluginSecrets），其余写 userSettings 的 pluginConfigs[插件].options；同时清掉另一侧的同名旧值。
 */
async function savePluginOptions(pluginId, values, schema, s, credentials) {
  let f = {};
  let sensitive = {};
  for (let [key, value] of Object.entries(values))
    if (schema[key]?.sensitive === true) sensitive[key] = String(value);
    else f[key] = value;
  let sensitiveKeysInThisSave = new Set(Object.keys(sensitive));
  let nonSensitiveKeysInThisSave = new Set(Object.keys(f));
  let h = await getSecureStorage().mutate((y) => {
    let S = pluginSettingWriteTarget(y.pluginSecrets, pluginId);
    let b =
      S.replaced.length === 0
        ? y.pluginSecrets?.[S.written]
        : [...S.replaced.toReversed(), S.written].reduce(
            (acc, F) => ({
              ...acc,
              ...y.pluginSecrets?.[F],
            }),
            {},
          );
    let secureScrubbed = b
      ? filterEntriesToNullProto(b, (O, k) => !nonSensitiveKeysInThisSave.has(k))
      : undefined;
    let needSecureScrub = secureScrubbed && b && Object.keys(secureScrubbed).length !== Object.keys(b).length;
    if (Object.keys(sensitive).length === 0 && !needSecureScrub && S.replaced.length === 0) return y;
    return {
      ...y,
      pluginSecrets: {
        ...filterEntriesToNullProto(y.pluginSecrets ?? {}, (O, F) => !S.replaced.includes(F)),
        [S.written]: {
          ...secureScrubbed,
          ...sensitive,
        },
      },
    };
  }, credentials);
  if (!h.success) {
    let err = Error(`Failed to save sensitive plugin options for ${pluginId} to secure storage`);
    logForDebugging(err.message, {
      level: "error",
    });
    throw err;
  }
  if (h.warning)
    logForDebugging(`Plugin secrets save warning: ${h.warning}`, {
      level: "warn",
    });
  let pluginConfigs = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
  let w = {};
  for (let y of pluginIdAliases(pluginId)) {
    let keysToScrubFromSettings = Object.keys(pluginConfigs?.[y]?.options ?? {}).filter((k) =>
      sensitiveKeysInThisSave.has(k),
    );
    let scrubbed = Object.fromEntries(
      keysToScrubFromSettings.map((keysToScrubFromSetting) => [keysToScrubFromSetting, undefined]),
    );
    let M = y === pluginId ? f : {};
    if (Object.keys(M).length > 0 || keysToScrubFromSettings.length > 0)
      w[y] = {
        options: {
          ...M,
          ...scrubbed,
        },
      };
  }
  if (Object.keys(w).length > 0) {
    let result = await updateSettingsForSource(
      "userSettings",
      {
        pluginConfigs: mergeRenamedPluginSettings(pluginConfigs, pluginId, w),
      },
      undefined,
      s,
    );
    if (result.error) {
      logForDebugging(
        `Failed to save plugin options for ${pluginId} to settings.json: ${errorMessage(result.error)}`,
        {
          level: "error",
        },
      );
      throw Error(`Failed to save plugin options for ${pluginId}: ${result.error.message}`);
    }
  }
  clearPluginOptionsCache();
}
//@ chunk-vr8smdd9.js:22061-22624 layout
/**
 * 列出 settings.pluginConfigs 与安全存储里出现过的插件选项键（用于清理）。
 */
async function listStoredPluginOptionKeys(credentials) {
  let r = [];
  let n = new Set();
  invalidateCommandNames();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (settingsForSourceForUpkeep === null || settingsForSourceForUpkeep === undefined) {
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    if (settingsFilePathForSource !== undefined && (await pathPresence(settingsFilePathForSource)) !== "gone")
      r.push("settings_unreadable");
  }
  for (let key of Object.keys(settingsForSourceForUpkeep?.pluginConfigs ?? {})) n.add(key);
  try {
    let secureStorage = getSecureStorage();
    let f = secureStorage.readAsyncStrict
      ? await secureStorage.readAsyncStrict(credentials, {
          inaccessibleAs: "failure",
        })
      : await secureStorage.readAsync(credentials);
    if (f === READ_FAILED) r.push("secrets_unreadable");
    else
      for (let key of Object.keys(f?.pluginSecrets ?? {})) {
        let index = key.indexOf("/");
        n.add(index === -1 ? key : key.slice(0, index));
      }
  } catch {
    r.push("secrets_unreadable");
  }
  return {
    ids: [...n],
    unreadable: r,
  };
}
//@ chunk-vr8smdd9.js:22624-22935 layout
async function readUserSettingsForOptions(e) {
  invalidateCommandNames();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (settingsForSourceForUpkeep !== null && settingsForSourceForUpkeep !== undefined)
    return settingsForSourceForUpkeep;
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (settingsFilePathForSource === undefined || (await pathPresence(settingsFilePathForSource)) === "gone")
    return;
  logForDebugging(
    `deletePluginOptions: the user settings file (${settingsFilePathForSource}) is there and could not be read, so options of ${e} may remain in it`,
    {
      level: "warn",
    },
  );
  return "unreadable";
}
//@ chunk-vr8smdd9.js:22935-24670 fingerprint = deletePluginOptions (0.431)
/**
 * 删除插件的全部选项（settings.pluginConfigs 与安全存储里的 pluginSecrets），卸载时调用。
 */
async function deletePluginOptions(e, storageV5, credentials, s) {
  let a = true;
  let userSettingsForOptions = await readUserSettingsForOptions(e);
  if (userSettingsForOptions === "unreadable") {
    a = false;
    s?.push("settings_unreadable");
  }
  let m = userSettingsForOptions === "unreadable" ? undefined : userSettingsForOptions;
  let filtered = pluginIdAliases(e).filter((x) => m?.pluginConfigs?.[x] !== undefined);
  if (filtered.length > 0) {
    let pluginConfigs = Object.fromEntries(filtered.map((y) => [y, undefined]));
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        pluginConfigs,
      },
      undefined,
      storageV5,
    );
    if (error) {
      logForDebugging(`deletePluginOptions: failed to clear settings.pluginConfigs[${e}]: ${error.message}`, {
        level: "warn",
      });
      a = false;
      s?.push("settings_write_failed");
    } else {
      let userSettingsForOptions = await readUserSettingsForOptions(e);
      if (userSettingsForOptions === "unreadable") {
        a = false;
        s?.push("settings_unreadable");
      }
      let pluginConfigs =
        userSettingsForOptions === "unreadable" ? undefined : userSettingsForOptions?.pluginConfigs;
      if (filtered.some((b) => pluginConfigs?.[b] !== undefined)) {
        logForDebugging(
          `deletePluginOptions: settings.pluginConfigs[${e}] still reads back after a write that reported no error`,
          {
            level: "warn",
          },
        );
        a = false;
        s?.push("settings_remain");
      }
    }
  }
  let g = [e, ...legacyPluginIds(e)];
  let h = (x) => g.some((w) => x === w || x.startsWith(`${w}/`));
  try {
    let settings = getSecureStorage();
    if (
      !(
        await settings.mutate((y) => {
          if (!y.pluginSecrets) return y;
          let survivingEntries = Object.entries(y.pluginSecrets).filter(([key]) => !h(key));
          if (survivingEntries.length === Object.keys(y.pluginSecrets).length) return y;
          return {
            ...y,
            pluginSecrets: survivingEntries.length > 0 ? Object.fromEntries(survivingEntries) : undefined,
          };
        }, credentials)
      ).success
    ) {
      logForDebugging(`deletePluginOptions: failed to clear pluginSecrets for ${e} from keychain`, {
        level: "warn",
      });
      a = false;
      s?.push("secrets_write_failed");
    } else {
      let y = settings.readAsyncStrict
        ? await settings.readAsyncStrict(credentials, {
            inaccessibleAs: "failure",
          })
        : await settings.readAsync(credentials);
      if (y === READ_FAILED || Object.keys(y?.pluginSecrets ?? {}).some(h)) {
        logForDebugging(
          `deletePluginOptions: after the delete, secure storage could not be read or still holds pluginSecrets for ${e}`,
          {
            level: "warn",
          },
        );
        a = false;
        s?.push(y === READ_FAILED ? "secrets_unreadable" : "secrets_remain");
      }
    }
  } catch (error) {
    logForDebugging(`deletePluginOptions: storage lock unavailable for ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
    a = false;
    s?.push("secrets_write_failed");
  }
  clearPluginOptionsCache();
  return a;
}
//@ chunk-vr8smdd9.js:24670-27533 layout
/**
 * --replace 切换副本时把旧插件 ID 的选项与密钥复制到新 ID（目标已有值则不覆盖）。
 */
async function copyPluginOptions(e, r, copyDir, s, a) {
  {
    let f = true;
    let m = false;
    let { error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (T) => {
        let O = T?.pluginConfigs?.[e];
        if (O === undefined) return null;
        if (T?.pluginConfigs?.[r] !== undefined) {
          m = true;
          return null;
        }
        return {
          pluginConfigs: {
            [r]: O,
          },
        };
      },
      undefined,
      s,
    );
    if (error) {
      f = false;
      logForDebugging(`copyPluginOptions: failed to copy settings.pluginConfigs[${e}]: ${error.message}`, {
        level: "warn",
      });
    }
    if (!f) {
      logForDebugging(
        `copyPluginOptions: the settings write failed, so the secrets of ${e} were not copied`,
        {
          level: "warn",
        },
      );
      clearPluginOptionsCache();
      return {
        optionsCarried: f,
        secretsCarried: false,
        oldDataDirDisposable: false,
        dataDirCopied: false,
        targetHadOwn: m,
      };
    }
    let g = true;
    try {
      if (
        !(
          await getSecureStorage().mutate((O) => {
            if (!O.pluginSecrets) return O;
            let F = {};
            for (let [key, value] of Object.entries(O.pluginSecrets)) {
              let K = remapSecretKey(key, e, r);
              if (K === undefined) continue;
              if (O.pluginSecrets[K] === undefined) F[K] = value;
              else m = true;
            }
            return Object.keys(F).length === 0
              ? O
              : {
                  ...O,
                  pluginSecrets: {
                    ...O.pluginSecrets,
                    ...F,
                  },
                };
          }, a)
        ).success
      ) {
        g = false;
        logForDebugging(`copyPluginOptions: failed to copy pluginSecrets for ${e}`, {
          level: "warn",
        });
      }
    } catch {
      g = false;
      logForDebugging(`copyPluginOptions: secure storage unavailable for ${e}`, {
        level: "warn",
      });
    }
    if (!f || !g) {
      clearPluginOptionsCache();
      return {
        optionsCarried: f,
        secretsCarried: g,
        oldDataDirDisposable: false,
        dataDirCopied: false,
        targetHadOwn: m,
      };
    }
    let h = pluginDataDirPath(e);
    let x = pluginDataDirPath(r);
    let w = `${x}.switching-${process.pid}`;
    let y = false;
    let dataDirCopied = false;
    let b;
    let M;
    try {
      let T = await pathPresence(h);
      if (T === "gone") y = true;
      else if (T === "unreadable") {
        b = "copy-failed";
        logForDebugging(
          `copyPluginOptions: the data directory of ${e} could not be examined; it is kept and was not copied`,
          {
            level: "warn",
          },
        );
      } else if (
        !(M = await lstat(h, {
          bigint: true,
        })).isDirectory() ||
        !(await isSameFilesystem(dirname(h), basename(h)))
      ) {
        b = "copy-failed";
        logForDebugging(
          `copyPluginOptions: the data directory of ${e} is not a real directory; it is kept and was not copied`,
          {
            level: "warn",
          },
        );
      } else {
        let O = await rmdir(x).then(
          () => {
            return;
          },
          (error) => (isENOENT(error) ? undefined : getErrnoCode(error)),
        );
        if (O === undefined) {
          await removeDirectoryTreeNoFollow(w);
          let F = await isSameFilesystem(dirname(h), basename(h));
          let v = await lstat(h, {
            bigint: true,
          });
          if (!F || !v.isDirectory() || v.dev !== M?.dev || v.ino !== M?.ino)
            throw Error("the old data directory is not the real directory first seen");
          await copyDir(h, w, h, w, h, true, new Set(), undefined, false, true);
          let P = await lstat(h, {
            bigint: true,
          });
          if (
            !P.isDirectory() ||
            !(await isSameFilesystem(dirname(h), basename(h))) ||
            P.dev !== v.dev ||
            P.ino !== v.ino
          )
            throw Error("the old data directory changed during the copy");
          if (!(await lstat(w)).isDirectory() || !(await isSameFilesystem(dirname(w), basename(w))))
            throw Error("the staging folder is not a real directory");
          await retryFsOp(w, x);
          if (!(await lstat(x)).isDirectory() || !(await isSameFilesystem(dirname(x), basename(x)))) {
            await removePathEntry(x).catch(() => {});
            throw Error("what stands at the target after the move is not a real directory");
          }
          y = true;
          dataDirCopied = true;
        } else b = O === "ENOTEMPTY" || O === "EEXIST" || O === "ENOTDIR" ? "target-had-own" : "copy-failed";
      }
    } catch (error) {
      b = "copy-failed";
      logForDebugging(
        `copyPluginOptions: failed to copy the data directory of ${e}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      await removeDirectoryTreeNoFollow(w).catch(() => {});
    }
    clearPluginOptionsCache();
    return {
      optionsCarried: f,
      secretsCarried: g,
      oldDataDirDisposable: y,
      dataDirCopied,
      dataDirKeptReason: b,
      targetHadOwn: m,
    };
  }
  return {
    optionsCarried: false,
    secretsCarried: false,
    oldDataDirDisposable: false,
    dataDirCopied: false,
    targetHadOwn: false,
  };
}
//@ chunk-vr8smdd9.js:27533-27640 layout
function remapSecretKey(e, r, n) {
  {
    let s = `${r}/`;
    return e === r ? n : e.startsWith(s) ? `${n}/${e.slice(s.length)}` : undefined;
  }
  return;
}
//@ chunk-vr8smdd9.js:27640-28052 layout
/**
 * --replace 切换时目标副本是否已有自己的选项（有则不复制）；安全存储读不到时为 unknown。
 */
async function wouldTargetKeepOwnPluginOptions(e, pluginId) {
  {
    let pluginConfigs = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
    if (pluginConfigs?.[e] !== undefined && pluginConfigs[pluginId] !== undefined) return true;
    try {
      let pluginSecrets = (await getSecureStorage().readAsync())?.pluginSecrets ?? {};
      return Object.keys(pluginSecrets).some((key) => {
        let f = remapSecretKey(key, e, pluginId);
        return f !== undefined && pluginSecrets[f] !== undefined;
      });
    } catch {
      logForDebugging(
        `wouldTargetKeepOwnPluginOptions: secure storage could not be read (switch from ${e}), so the answer is 'unknown'`,
        {
          level: "warn",
        },
      );
      return "unknown";
    }
  }
  return false;
}
//@ chunk-vr8smdd9.js:28052-28308 fingerprint = getUnconfiguredOptions (0.829)
/**
 * 返回 manifest.userConfig 中尚未配置（或非敏感值不合法）的选项，启用插件时据此弹出配置对话框。
 */
async function getUnconfiguredOptions(plugin, r) {
  let manifestSchema = plugin.manifest.userConfig;
  if (!manifestSchema || Object.keys(manifestSchema).length === 0) return {};
  let pluginOptions = await loadPluginOptions(marketplaceSource(plugin), r);
  let unconfigured = {};
  for (let [key, fieldSchema] of Object.entries(manifestSchema)) {
    let single = getOwn(pluginOptions, key);
    if (
      single === undefined ||
      single === "" ||
      (fieldSchema.sensitive !== true &&
        !validateUserConfig(
          {
            [key]: single,
          },
          {
            [key]: fieldSchema,
          },
        ).valid)
    )
      unconfigured[key] = fieldSchema;
  }
  return unconfigured;
}
//@ chunk-vr8smdd9.js:28308-28400 layout
/**
 * 值是否不在字段的 options 列表内。
 */
function isOutsideOptions(e, r) {
  let options = e?.options;
  return options !== undefined && !(typeof r === "string" && options.includes(r));
}
//@ chunk-vr8smdd9.js:28400-28736 layout
/**
 * 已保存选项与 schema 默认值合并；值不在 options 列表内的视为未设置。
 */
function applyUserConfigDefaults(e, userConfig) {
  let n = {};
  for (let [key, value] of Object.entries(userConfig)) {
    if (value.required && value.default === undefined) continue;
    n[key] = value.default ?? "";
  }
  let s = filterEntriesToNullProto(e, (a, f) => {
    let options = userConfig[f]?.options;
    if (options === undefined || !isOutsideOptions(userConfig[f], a)) return true;
    logForDebugging(
      `plugin option ${f} holds a value that is not one of ${options.join(", ")}; it reads as unset`,
      {
        level: "warn",
      },
    );
    return false;
  });
  return {
    ...n,
    ...s,
  };
}
//@ chunk-vr8smdd9.js:28736-29120 layout
/**
 * 替换插件路径变量：${CLAUDE_PLUGIN_ROOT} → 插件目录，${CLAUDE_PROJECT_DIR} → 项目目录，${CLAUDE_PLUGIN_DATA} → 插件数据目录（远端无数据目录时抛 PluginDataDirUnknownError）；可传转义函数。
 */
function substitutePluginVariables(value, r, n = (s) => s) {
  let s = (f) => n(f);
  let out = value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, () => s(r.path));
  if (r.projectDir !== null)
    out = out.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, () => {
      let projectDirForTools = getProjectDirForTools();
      if (projectDirForTools === null) throw new NoProjectDirectoryError();
      return s(projectDirForTools);
    });
  if (r.source) {
    let { source, dataDir } = r;
    out = out.replace(/\$\{CLAUDE_PLUGIN_DATA\}/g, () => {
      let dataDir_2 = resolveDataDir(
        {
          source,
          dataDir,
        },
        ensurePluginDataDir,
      );
      if (dataDir_2 === null) throw new PluginDataDirUnknownError();
      return s(dataDir_2);
    });
  }
  return out;
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
//@ chunk-vr8smdd9.js:29321-29445 layout
/**
 * 文本是否引用了本机无法确定的 ${CLAUDE_PLUGIN_DATA}。
 */
function needsUnknownDataDir(e, r) {
  if (r.dataDir !== null) return false;
  try {
    substitutePluginVariables(e, {
      ...r,
      projectDir: null,
    });
    return false;
  } catch (error) {
    return error instanceof PluginDataDirUnknownError;
  }
}
//@ chunk-vr8smdd9.js:29445-29510 layout
function resolveDataDir(e, r) {
  return e.dataDir === undefined ? r(e.source) : e.dataDir;
}
//@ chunk-vr8smdd9.js:29510-29529 layout
var CLAUDE_VAR_PREFIX = "${CLAUDE_";
//@ chunk-vr8smdd9.js:29529-29759 layout
/**
 * 估算变量替换后的最大增长长度（防止替换后超长）。
 */
function estimateSubstitutedGrowth(e, r, filePath = "") {
  let s = e.split(CLAUDE_VAR_PREFIX).length - 1;
  if (s === 0) return 0;
  let projectDirForTools = getProjectDirForTools();
  return r.path.includes(CLAUDE_VAR_PREFIX) || projectDirForTools?.includes("$") || r.dataDir?.includes("$")
    ? 1 / 0
    : s *
        3 *
        Math.max(
          r.path.length,
          projectDirForTools?.length ?? 0,
          MAX_CLEAN_IDENTIFIER_LENGTH,
          (resolveDataDir(r, pluginDataDirPath) ?? "").length,
          filePath.length,
        );
}
//@ chunk-vr8smdd9.js:29759-30078 layout
/**
 * 替换 ${user_config.KEY}：缺失时默认抛错（提示到 /plugin manage 配置），也可保留原文。
 */
function substituteUserConfigVariables(e, userConfig, { missingKey: n = "throw" } = {}) {
  return e.replace(/\$\{user_config\.([^}]+)\}/g, (s, key) => {
    let configValue = getOwn(userConfig, key);
    if (configValue === undefined) {
      if (n === "literal") return s;
      throw Error(
        `Plugin option "${key}" isn't set. Open /plugin manage to configure it, or check that the plugin's userConfig schema declares "${key}".`,
      );
    }
    return String(configValue);
  });
}
//@ chunk-vr8smdd9.js:30078-30136 layout
/**
 * 文本中是否含 ${user_config.*} 引用。
 */
function hasUserConfigVariables(e, userConfig) {
  try {
    return substituteUserConfigVariables(e, userConfig) !== e;
  } catch {
    return true;
  }
}
//@ chunk-vr8smdd9.js:30136-30373 fingerprint = substituteUserConfigInContent (1)
/**
 * 在技能/代理正文中替换 ${user_config.KEY}：sensitive 值不替换，改为占位说明。
 */
function substituteUserConfigInContent(content, options, schema, s) {
  return content.replace(/\$\{user_config\.([^}]+)\}/g, (match, key) => {
    if (schema[key]?.sensitive === true) return `[sensitive option '${key}' not available in skill content]`;
    let value = getOwn(options, key);
    if (value === undefined) return match;
    let c = String(value);
    return s ? s(c) : c;
  });
}
//@ chunk-vr8smdd9.js:30373-30936 sole-consumer
/**
 * 插件改名时合并旧 id 的选项与 MCP 配置到新 id。
 */
function mergeRenamedPluginSettings(pluginConfigs, pluginId, n) {
  let s = pluginSettingWriteTarget(pluginConfigs, pluginId);
  if (s.replaced.length === 0) return n;
  let a = [...s.replaced.toReversed(), s.written];
  let f = filterEntriesToNullProto(n, (g, h) => !s.replaced.includes(h));
  let options = {
    ...filterEntriesToNullProto(
      a.reduce(
        (acc, h) => ({
          ...acc,
          ...pluginConfigs?.[h]?.options,
          ...(h === s.written ? undefined : n[h]?.options),
        }),
        {},
      ),
      (g) => g !== undefined,
    ),
    ...f[s.written]?.options,
  };
  let c = uniq(a.flatMap((g) => Object.keys(pluginConfigs?.[g]?.mcpServers ?? {})));
  return {
    ...f,
    ...Object.fromEntries(s.replaced.map((g) => [g, undefined])),
    [s.written]: {
      options,
      ...(c.length === 0
        ? {}
        : {
            mcpServers: Object.fromEntries(
              c.map((g) => [
                g,
                a.reduce(
                  (acc, x) => ({
                    ...acc,
                    ...pluginConfigs?.[x]?.mcpServers?.[g],
                  }),
                  {},
                ),
              ]),
            ),
          }),
    },
  };
}
//@ chunk-e6aww6q8.js:762563-762603 placement = TRUSTED_SETTING_SOURCES (0.808)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings"];
//@ chunk-e6aww6q8.js:762603-762691 fingerprint = loadPluginOptions (0.646)
/**
 * 序列化插件在各受信设置源中的 pluginConfigs options，作为插件选项的变化指纹（名字配错，见 lead 建议）。
 */
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
