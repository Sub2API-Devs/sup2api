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
function findMarketplace(plugins, id) {
  return plugins.find((plugin) => plugin.repository === id || plugin.source === id);
}
//@ chunk-vr8smdd9.js:20270-20459 placement
/**
 * 读取插件选项值（缓存）。
 */
function loadPluginOptions(pluginId, credentials) {
  if (getManagedPlugins()) return Promise.resolve({});
  let { optionValues } = getPluginRegistry();
  let cached = optionValues.get(pluginId);
  if (cached !== undefined) return cached;
  let pluginOptions = readPluginOptions(pluginId, credentials);
  optionValues.set(pluginId, pluginOptions);
  pluginOptions.catch(() => {
    if (optionValues.get(pluginId) === pluginOptions) optionValues.delete(pluginId);
  });
  return pluginOptions;
}
//@ chunk-vr8smdd9.js:20459-20633 placement
async function readPluginOptions(pluginId, credentials) {
  let options = trustedPluginSetting(pluginId).options ?? {};
  let pluginSecrets = (await getSecureStorage().readAsync(credentials))?.pluginSecrets;
  let reduced = [...legacyPluginIds(pluginId).toReversed(), pluginId].reduce(
    (acc, id) => ({
      ...acc,
      ...pluginSecrets?.[id],
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
//@ chunk-vr8smdd9.js:20674-22061 fingerprint (2.1.88 match: savePluginOptions, 0.827)
/**
 * 保存插件选项：sensitive 字段写安全存储（keychain/凭据文件的 pluginSecrets），其余写 userSettings 的 pluginConfigs[插件].options；同时清掉另一侧的同名旧值。
 */
async function savePluginOptions(pluginId, values, schema, storageV5, credentials) {
  let nonSensitive = {};
  let sensitive = {};
  for (let [key, value] of Object.entries(values))
    if (schema[key]?.sensitive === true) sensitive[key] = String(value);
    else nonSensitive[key] = value;
  let sensitiveKeysInThisSave = new Set(Object.keys(sensitive));
  let nonSensitiveKeysInThisSave = new Set(Object.keys(nonSensitive));
  let mutationResult = await getSecureStorage().mutate((storage) => {
    let writeTarget = pluginSettingWriteTarget(storage.pluginSecrets, pluginId);
    let existingSecrets =
      writeTarget.replaced.length === 0
        ? storage.pluginSecrets?.[writeTarget.written]
        : [...writeTarget.replaced.toReversed(), writeTarget.written].reduce(
            (acc, id) => ({
              ...acc,
              ...storage.pluginSecrets?.[id],
            }),
            {},
          );
    let secureScrubbed = existingSecrets
      ? filterEntriesToNullProto(existingSecrets, (key, k) => !nonSensitiveKeysInThisSave.has(k))
      : undefined;
    let needSecureScrub =
      secureScrubbed &&
      existingSecrets &&
      Object.keys(secureScrubbed).length !== Object.keys(existingSecrets).length;
    if (Object.keys(sensitive).length === 0 && !needSecureScrub && writeTarget.replaced.length === 0)
      return storage;
    return {
      ...storage,
      pluginSecrets: {
        ...filterEntriesToNullProto(
          storage.pluginSecrets ?? {},
          (key, key_2) => !writeTarget.replaced.includes(key_2),
        ),
        [writeTarget.written]: {
          ...secureScrubbed,
          ...sensitive,
        },
      },
    };
  }, credentials);
  if (!mutationResult.success) {
    let err = Error(`Failed to save sensitive plugin options for ${pluginId} to secure storage`);
    logForDebugging(err.message, {
      level: "error",
    });
    throw err;
  }
  if (mutationResult.warning)
    logForDebugging(`Plugin secrets save warning: ${mutationResult.warning}`, {
      level: "warn",
    });
  let pluginConfigs = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
  let updates = {};
  for (let alias of pluginIdAliases(pluginId)) {
    let keysToScrubFromSettings = Object.keys(pluginConfigs?.[alias]?.options ?? {}).filter((k) =>
      sensitiveKeysInThisSave.has(k),
    );
    let scrubbed = Object.fromEntries(
      keysToScrubFromSettings.map((keysToScrubFromSetting) => [keysToScrubFromSetting, undefined]),
    );
    let values = alias === pluginId ? nonSensitive : {};
    if (Object.keys(values).length > 0 || keysToScrubFromSettings.length > 0)
      updates[alias] = {
        options: {
          ...values,
          ...scrubbed,
        },
      };
  }
  if (Object.keys(updates).length > 0) {
    let result = await updateSettingsForSource(
      "userSettings",
      {
        pluginConfigs: mergeRenamedPluginSettings(pluginConfigs, pluginId, updates),
      },
      undefined,
      storageV5,
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
  let unreadable = [];
  let ids = new Set();
  invalidateCommandNames();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (settingsForSourceForUpkeep === null || settingsForSourceForUpkeep === undefined) {
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    if (settingsFilePathForSource !== undefined && (await pathPresence(settingsFilePathForSource)) !== "gone")
      unreadable.push("settings_unreadable");
  }
  for (let key of Object.keys(settingsForSourceForUpkeep?.pluginConfigs ?? {})) ids.add(key);
  try {
    let secureStorage = getSecureStorage();
    let read = secureStorage.readAsyncStrict
      ? await secureStorage.readAsyncStrict(credentials, {
          inaccessibleAs: "failure",
        })
      : await secureStorage.readAsync(credentials);
    if (read === READ_FAILED) unreadable.push("secrets_unreadable");
    else
      for (let key of Object.keys(read?.pluginSecrets ?? {})) {
        let index = key.indexOf("/");
        ids.add(index === -1 ? key : key.slice(0, index));
      }
  } catch {
    unreadable.push("secrets_unreadable");
  }
  return {
    ids: [...ids],
    unreadable,
  };
}
//@ chunk-vr8smdd9.js:22624-22935 layout
async function readUserSettingsForOptions(pluginId) {
  invalidateCommandNames();
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (settingsForSourceForUpkeep !== null && settingsForSourceForUpkeep !== undefined)
    return settingsForSourceForUpkeep;
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (settingsFilePathForSource === undefined || (await pathPresence(settingsFilePathForSource)) === "gone")
    return;
  logForDebugging(
    `deletePluginOptions: the user settings file (${settingsFilePathForSource}) is there and could not be read, so options of ${pluginId} may remain in it`,
    {
      level: "warn",
    },
  );
  return "unreadable";
}
//@ chunk-vr8smdd9.js:22935-24670 fingerprint (2.1.88 match: deletePluginOptions, 0.431)
/**
 * 删除插件的全部选项（settings.pluginConfigs 与安全存储里的 pluginSecrets），卸载时调用。
 */
async function deletePluginOptions(pluginId, storageV5, credentials, unreadable) {
  let clean = true;
  let userSettingsForOptions = await readUserSettingsForOptions(pluginId);
  if (userSettingsForOptions === "unreadable") {
    clean = false;
    unreadable?.push("settings_unreadable");
  }
  let settings = userSettingsForOptions === "unreadable" ? undefined : userSettingsForOptions;
  let filtered = pluginIdAliases(pluginId).filter((id) => settings?.pluginConfigs?.[id] !== undefined);
  if (filtered.length > 0) {
    let pluginConfigs = Object.fromEntries(filtered.map((id) => [id, undefined]));
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        pluginConfigs,
      },
      undefined,
      storageV5,
    );
    if (error) {
      logForDebugging(
        `deletePluginOptions: failed to clear settings.pluginConfigs[${pluginId}]: ${error.message}`,
        {
          level: "warn",
        },
      );
      clean = false;
      unreadable?.push("settings_write_failed");
    } else {
      let userSettingsForOptions = await readUserSettingsForOptions(pluginId);
      if (userSettingsForOptions === "unreadable") {
        clean = false;
        unreadable?.push("settings_unreadable");
      }
      let pluginConfigs =
        userSettingsForOptions === "unreadable" ? undefined : userSettingsForOptions?.pluginConfigs;
      if (filtered.some((pluginId) => pluginConfigs?.[pluginId] !== undefined)) {
        logForDebugging(
          `deletePluginOptions: settings.pluginConfigs[${pluginId}] still reads back after a write that reported no error`,
          {
            level: "warn",
          },
        );
        clean = false;
        unreadable?.push("settings_remain");
      }
    }
  }
  let pluginIds = [pluginId, ...legacyPluginIds(pluginId)];
  let isOwnKey = (key) =>
    pluginIds.some((candidateId) => key === candidateId || key.startsWith(`${candidateId}/`));
  try {
    let settings = getSecureStorage();
    if (
      !(
        await settings.mutate((storage) => {
          if (!storage.pluginSecrets) return storage;
          let survivingEntries = Object.entries(storage.pluginSecrets).filter(([key]) => !isOwnKey(key));
          if (survivingEntries.length === Object.keys(storage.pluginSecrets).length) return storage;
          return {
            ...storage,
            pluginSecrets: survivingEntries.length > 0 ? Object.fromEntries(survivingEntries) : undefined,
          };
        }, credentials)
      ).success
    ) {
      logForDebugging(`deletePluginOptions: failed to clear pluginSecrets for ${pluginId} from keychain`, {
        level: "warn",
      });
      clean = false;
      unreadable?.push("secrets_write_failed");
    } else {
      let stored = settings.readAsyncStrict
        ? await settings.readAsyncStrict(credentials, {
            inaccessibleAs: "failure",
          })
        : await settings.readAsync(credentials);
      if (stored === READ_FAILED || Object.keys(stored?.pluginSecrets ?? {}).some(isOwnKey)) {
        logForDebugging(
          `deletePluginOptions: after the delete, secure storage could not be read or still holds pluginSecrets for ${pluginId}`,
          {
            level: "warn",
          },
        );
        clean = false;
        unreadable?.push(stored === READ_FAILED ? "secrets_unreadable" : "secrets_remain");
      }
    }
  } catch (error) {
    logForDebugging(`deletePluginOptions: storage lock unavailable for ${pluginId}: ${errorMessage(error)}`, {
      level: "warn",
    });
    clean = false;
    unreadable?.push("secrets_write_failed");
  }
  clearPluginOptionsCache();
  return clean;
}
//@ chunk-vr8smdd9.js:24670-27533 layout
/**
 * --replace 切换副本时把旧插件 ID 的选项与密钥复制到新 ID（目标已有值则不覆盖）。
 */
async function copyPluginOptions(fromId, toId, copyDir, storageV5, credentials) {
  {
    let optionsOk = true;
    let targetHadOwn = false;
    let { error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (settings) => {
        let config = settings?.pluginConfigs?.[fromId];
        if (config === undefined) return null;
        if (settings?.pluginConfigs?.[toId] !== undefined) {
          targetHadOwn = true;
          return null;
        }
        return {
          pluginConfigs: {
            [toId]: config,
          },
        };
      },
      undefined,
      storageV5,
    );
    if (error) {
      optionsOk = false;
      logForDebugging(
        `copyPluginOptions: failed to copy settings.pluginConfigs[${fromId}]: ${error.message}`,
        {
          level: "warn",
        },
      );
    }
    if (!optionsOk) {
      logForDebugging(
        `copyPluginOptions: the settings write failed, so the secrets of ${fromId} were not copied`,
        {
          level: "warn",
        },
      );
      clearPluginOptionsCache();
      return {
        optionsCarried: optionsOk,
        secretsCarried: false,
        oldDataDirDisposable: false,
        dataDirCopied: false,
        targetHadOwn,
      };
    }
    let secretsOk = true;
    try {
      if (
        !(
          await getSecureStorage().mutate((store) => {
            if (!store.pluginSecrets) return store;
            let newSecrets = {};
            for (let [key, value] of Object.entries(store.pluginSecrets)) {
              let key_2 = remapSecretKey(key, fromId, toId);
              if (key_2 === undefined) continue;
              if (store.pluginSecrets[key_2] === undefined) newSecrets[key_2] = value;
              else targetHadOwn = true;
            }
            return Object.keys(newSecrets).length === 0
              ? store
              : {
                  ...store,
                  pluginSecrets: {
                    ...store.pluginSecrets,
                    ...newSecrets,
                  },
                };
          }, credentials)
        ).success
      ) {
        secretsOk = false;
        logForDebugging(`copyPluginOptions: failed to copy pluginSecrets for ${fromId}`, {
          level: "warn",
        });
      }
    } catch {
      secretsOk = false;
      logForDebugging(`copyPluginOptions: secure storage unavailable for ${fromId}`, {
        level: "warn",
      });
    }
    if (!optionsOk || !secretsOk) {
      clearPluginOptionsCache();
      return {
        optionsCarried: optionsOk,
        secretsCarried: secretsOk,
        oldDataDirDisposable: false,
        dataDirCopied: false,
        targetHadOwn,
      };
    }
    let oldDataDir = pluginDataDirPath(fromId);
    let newDataDir = pluginDataDirPath(toId);
    let stagingDir = `${newDataDir}.switching-${process.pid}`;
    let oldDisposable = false;
    let dataDirCopied = false;
    let keptReason;
    let oldStat;
    try {
      let presence = await pathPresence(oldDataDir);
      if (presence === "gone") oldDisposable = true;
      else if (presence === "unreadable") {
        keptReason = "copy-failed";
        logForDebugging(
          `copyPluginOptions: the data directory of ${fromId} could not be examined; it is kept and was not copied`,
          {
            level: "warn",
          },
        );
      } else if (
        !(oldStat = await lstat(oldDataDir, {
          bigint: true,
        })).isDirectory() ||
        !(await isSameFilesystem(dirname(oldDataDir), basename(oldDataDir)))
      ) {
        keptReason = "copy-failed";
        logForDebugging(
          `copyPluginOptions: the data directory of ${fromId} is not a real directory; it is kept and was not copied`,
          {
            level: "warn",
          },
        );
      } else {
        let rmdirFailure = await rmdir(newDataDir).then(
          () => {
            return;
          },
          (error) => (isENOENT(error) ? undefined : getErrnoCode(error)),
        );
        if (rmdirFailure === undefined) {
          await removeDirectoryTreeNoFollow(stagingDir);
          let sameFs = await isSameFilesystem(dirname(oldDataDir), basename(oldDataDir));
          let currentStat = await lstat(oldDataDir, {
            bigint: true,
          });
          if (
            !sameFs ||
            !currentStat.isDirectory() ||
            currentStat.dev !== oldStat?.dev ||
            currentStat.ino !== oldStat?.ino
          )
            throw Error("the old data directory is not the real directory first seen");
          await copyDir(
            oldDataDir,
            stagingDir,
            oldDataDir,
            stagingDir,
            oldDataDir,
            true,
            new Set(),
            undefined,
            false,
            true,
          );
          let afterStat = await lstat(oldDataDir, {
            bigint: true,
          });
          if (
            !afterStat.isDirectory() ||
            !(await isSameFilesystem(dirname(oldDataDir), basename(oldDataDir))) ||
            afterStat.dev !== currentStat.dev ||
            afterStat.ino !== currentStat.ino
          )
            throw Error("the old data directory changed during the copy");
          if (
            !(await lstat(stagingDir)).isDirectory() ||
            !(await isSameFilesystem(dirname(stagingDir), basename(stagingDir)))
          )
            throw Error("the staging folder is not a real directory");
          await retryFsOp(stagingDir, newDataDir);
          if (
            !(await lstat(newDataDir)).isDirectory() ||
            !(await isSameFilesystem(dirname(newDataDir), basename(newDataDir)))
          ) {
            await removePathEntry(newDataDir).catch(() => {});
            throw Error("what stands at the target after the move is not a real directory");
          }
          oldDisposable = true;
          dataDirCopied = true;
        } else
          keptReason =
            rmdirFailure === "ENOTEMPTY" || rmdirFailure === "EEXIST" || rmdirFailure === "ENOTDIR"
              ? "target-had-own"
              : "copy-failed";
      }
    } catch (error) {
      keptReason = "copy-failed";
      logForDebugging(
        `copyPluginOptions: failed to copy the data directory of ${fromId}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      await removeDirectoryTreeNoFollow(stagingDir).catch(() => {});
    }
    clearPluginOptionsCache();
    return {
      optionsCarried: optionsOk,
      secretsCarried: secretsOk,
      oldDataDirDisposable: oldDisposable,
      dataDirCopied,
      dataDirKeptReason: keptReason,
      targetHadOwn,
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
function remapSecretKey(key, fromId, toId) {
  {
    let prefix = `${fromId}/`;
    return key === fromId ? toId : key.startsWith(prefix) ? `${toId}/${key.slice(prefix.length)}` : undefined;
  }
  return;
}
//@ chunk-vr8smdd9.js:27640-28052 layout
/**
 * --replace 切换时目标副本是否已有自己的选项（有则不复制）；安全存储读不到时为 unknown。
 */
async function wouldTargetKeepOwnPluginOptions(fromId, toId) {
  {
    let pluginConfigs = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
    if (pluginConfigs?.[fromId] !== undefined && pluginConfigs[toId] !== undefined) return true;
    try {
      let pluginSecrets = (await getSecureStorage().readAsync())?.pluginSecrets ?? {};
      return Object.keys(pluginSecrets).some((key) => {
        let key_2 = remapSecretKey(key, fromId, toId);
        return key_2 !== undefined && pluginSecrets[key_2] !== undefined;
      });
    } catch {
      logForDebugging(
        `wouldTargetKeepOwnPluginOptions: secure storage could not be read (switch from ${fromId}), so the answer is 'unknown'`,
        {
          level: "warn",
        },
      );
      return "unknown";
    }
  }
  return false;
}
//@ chunk-vr8smdd9.js:28052-28308 fingerprint (2.1.88 match: getUnconfiguredOptions, 0.829)
/**
 * 返回 manifest.userConfig 中尚未配置（或非敏感值不合法）的选项，启用插件时据此弹出配置对话框。
 */
async function getUnconfiguredOptions(plugin, credentials) {
  let manifestSchema = plugin.manifest.userConfig;
  if (!manifestSchema || Object.keys(manifestSchema).length === 0) return {};
  let pluginOptions = await loadPluginOptions(marketplaceSource(plugin), credentials);
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
function isOutsideOptions(fieldSchema, value) {
  let options = fieldSchema?.options;
  return options !== undefined && !(typeof value === "string" && options.includes(value));
}
//@ chunk-vr8smdd9.js:28400-28736 layout
/**
 * 已保存选项与 schema 默认值合并；值不在 options 列表内的视为未设置。
 */
function applyUserConfigDefaults(values, userConfig) {
  let defaults = {};
  for (let [key, value] of Object.entries(userConfig)) {
    if (value.required && value.default === undefined) continue;
    defaults[key] = value.default ?? "";
  }
  let kept = filterEntriesToNullProto(values, (value, key) => {
    let options = userConfig[key]?.options;
    if (options === undefined || !isOutsideOptions(userConfig[key], value)) return true;
    logForDebugging(
      `plugin option ${key} holds a value that is not one of ${options.join(", ")}; it reads as unset`,
      {
        level: "warn",
      },
    );
    return false;
  });
  return {
    ...defaults,
    ...kept,
  };
}
//@ chunk-vr8smdd9.js:28736-29120 layout
/**
 * 替换插件路径变量：${CLAUDE_PLUGIN_ROOT} → 插件目录，${CLAUDE_PROJECT_DIR} → 项目目录，${CLAUDE_PLUGIN_DATA} → 插件数据目录（远端无数据目录时抛 PluginDataDirUnknownError）；可传转义函数。
 */
function substitutePluginVariables(value, plugin, transform = (value) => value) {
  let escaped = (value) => transform(value);
  let out = value.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, () => escaped(plugin.path));
  if (plugin.projectDir !== null)
    out = out.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, () => {
      let projectDirForTools = getProjectDirForTools();
      if (projectDirForTools === null) throw new NoProjectDirectoryError();
      return escaped(projectDirForTools);
    });
  if (plugin.source) {
    let { source, dataDir } = plugin;
    out = out.replace(/\$\{CLAUDE_PLUGIN_DATA\}/g, () => {
      let dataDir_2 = resolveDataDir(
        {
          source,
          dataDir,
        },
        ensurePluginDataDir,
      );
      if (dataDir_2 === null) throw new PluginDataDirUnknownError();
      return escaped(dataDir_2);
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
function needsUnknownDataDir(value, pluginInfo) {
  if (pluginInfo.dataDir !== null) return false;
  try {
    substitutePluginVariables(value, {
      ...pluginInfo,
      projectDir: null,
    });
    return false;
  } catch (error) {
    return error instanceof PluginDataDirUnknownError;
  }
}
//@ chunk-vr8smdd9.js:29445-29510 layout
function resolveDataDir(pluginInfo, ensureDir) {
  return pluginInfo.dataDir === undefined ? ensureDir(pluginInfo.source) : pluginInfo.dataDir;
}
//@ chunk-vr8smdd9.js:29510-29529 layout
var CLAUDE_VAR_PREFIX = "${CLAUDE_";
//@ chunk-vr8smdd9.js:29529-29759 layout
/**
 * 估算变量替换后的最大增长长度（防止替换后超长）。
 */
function estimateSubstitutedGrowth(value, substitutionInfo, filePath = "") {
  let occurrences = value.split(CLAUDE_VAR_PREFIX).length - 1;
  if (occurrences === 0) return 0;
  let projectDirForTools = getProjectDirForTools();
  return substitutionInfo.path.includes(CLAUDE_VAR_PREFIX) ||
    projectDirForTools?.includes("$") ||
    substitutionInfo.dataDir?.includes("$")
    ? 1 / 0
    : occurrences *
        3 *
        Math.max(
          substitutionInfo.path.length,
          projectDirForTools?.length ?? 0,
          MAX_CLEAN_IDENTIFIER_LENGTH,
          (resolveDataDir(substitutionInfo, pluginDataDirPath) ?? "").length,
          filePath.length,
        );
}
//@ chunk-vr8smdd9.js:29759-30078 layout
/**
 * 替换 ${user_config.KEY}：缺失时默认抛错（提示到 /plugin manage 配置），也可保留原文。
 */
function substituteUserConfigVariables(value, userConfig, { missingKey = "throw" } = {}) {
  return value.replace(/\$\{user_config\.([^}]+)\}/g, (wholeMatch, key) => {
    let configValue = getOwn(userConfig, key);
    if (configValue === undefined) {
      if (missingKey === "literal") return wholeMatch;
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
function hasUserConfigVariables(value, userConfig) {
  try {
    return substituteUserConfigVariables(value, userConfig) !== value;
  } catch {
    return true;
  }
}
//@ chunk-vr8smdd9.js:30136-30373 fingerprint (2.1.88 match: substituteUserConfigInContent, 1)
/**
 * 在技能/代理正文中替换 ${user_config.KEY}：sensitive 值不替换，改为占位说明。
 */
function substituteUserConfigInContent(content, options, schema, transform) {
  return content.replace(/\$\{user_config\.([^}]+)\}/g, (match, key) => {
    if (schema[key]?.sensitive === true) return `[sensitive option '${key}' not available in skill content]`;
    let value = getOwn(options, key);
    if (value === undefined) return match;
    let valueText = String(value);
    return transform ? transform(valueText) : valueText;
  });
}
//@ chunk-vr8smdd9.js:30373-30936 sole-consumer
/**
 * 插件改名时合并旧 id 的选项与 MCP 配置到新 id。
 */
function mergeRenamedPluginSettings(pluginConfigs, pluginId, updates) {
  let target = pluginSettingWriteTarget(pluginConfigs, pluginId);
  if (target.replaced.length === 0) return updates;
  let sources = [...target.replaced.toReversed(), target.written];
  let rest = filterEntriesToNullProto(updates, (value, key) => !target.replaced.includes(key));
  let options = {
    ...filterEntriesToNullProto(
      sources.reduce(
        (acc, id) => ({
          ...acc,
          ...pluginConfigs?.[id]?.options,
          ...(id === target.written ? undefined : updates[id]?.options),
        }),
        {},
      ),
      (value) => value !== undefined,
    ),
    ...rest[target.written]?.options,
  };
  let serverNames = uniq(sources.flatMap((id) => Object.keys(pluginConfigs?.[id]?.mcpServers ?? {})));
  return {
    ...rest,
    ...Object.fromEntries(target.replaced.map((id) => [id, undefined])),
    [target.written]: {
      options,
      ...(serverNames.length === 0
        ? {}
        : {
            mcpServers: Object.fromEntries(
              serverNames.map((serverName) => [
                serverName,
                sources.reduce(
                  (acc, id) => ({
                    ...acc,
                    ...pluginConfigs?.[id]?.mcpServers?.[serverName],
                  }),
                  {},
                ),
              ]),
            ),
          }),
    },
  };
}
//@ chunk-e6aww6q8.js:762563-762603 placement (2.1.88 match: TRUSTED_SETTING_SOURCES, 0.808)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings"];
//@ chunk-e6aww6q8.js:762603-762691 fingerprint (2.1.88 match: loadPluginOptions, 0.646)
/**
 * 序列化插件在各受信设置源中的 pluginConfigs options，作为插件选项的变化指纹（名字配错，见 lead 建议）。
 */
var pluginOptionsFingerprint = (pluginId) =>
  jsonStringify(
    TRUSTED_SETTING_SOURCES.map((source) =>
      pluginIdAliases(pluginId).map(
        (alias) => getSettingsForSource(source)?.pluginConfigs?.[alias]?.options ?? null,
      ),
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
