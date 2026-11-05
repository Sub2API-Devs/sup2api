/**
 * utils/plugins/addDirPluginSettings.ts
 *
 * 读取 --add-dir 目录 .claude/settings(.local).json 中的 enabledPlugins 与 extraKnownMarketplaces。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/addDirPluginSettings.ts
 * pieces: chunk-tt36reb3.js (5)
 * attribution: placement 1, fingerprint 2, affinity 1, sole-consumer 1
 */
import { join } from "path";
import { isAttachServeMode } from "../../cli/headlessCloud/attachServe.js";
import { getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { parseSettingsFile } from "../settings/settings.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { logForDebugging } from "../debug.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { dropMalformedHeader } from "./headersHelper.js";

//@ chunk-tt36reb3.js:1153-1349 placement
var ADDED_FOLDER_PLUGINS_FOLLOW_SETTING_SOURCES = "added_folder_plugins_follow_setting_sources";
var SETTINGS_FILE_NAMES = ["settings.json", "settings.local.json"];
var SOURCES_BY_SETTINGS_FILE = {
  "settings.json": ["projectSettings"],
  "settings.local.json": ["projectSettings", "localSettings"],
};
//@ chunk-tt36reb3.js:1349-1604 fingerprint (2.1.88 match: getAddDirEnabledPlugins, 1)
/**
 * 读取 --add-dir 目录下 .claude/settings(.local).json 中的 enabledPlugins（工作区不受信时为空）。
 */
function getAddDirEnabledPlugins(enabledFiles = enabledSettingsFiles()) {
  let result = {};
  if (isAttachServeMode() || enabledFiles.length === 0) return result;
  for (let dir of getAdditionalDirectoriesForClaudeMd())
    for (let file of SETTINGS_FILE_NAMES) {
      let { settings } = parseSettingsFile(join(dir, ".claude", file));
      if (!settings?.enabledPlugins) continue;
      Object.assign(
        result,
        enabledFiles.includes(file)
          ? settings.enabledPlugins
          : pickByHelper(settings.enabledPlugins, (enabled) => enabled === false),
      );
    }
  return result;
}
//@ chunk-tt36reb3.js:1604-2027 fingerprint (2.1.88 match: getAddDirExtraMarketplaces, 0.746)
/**
 * 读取 --add-dir 目录设置里的 extraKnownMarketplaces（按目录列表与设置 epoch 缓存）。
 */
function getAddDirExtraMarketplaces() {
  if (isAttachServeMode()) return {};
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  let enabledFiles = enabledSettingsFiles();
  let memoKey = `${commandSyncNameState().epoch}\x00${enabledFiles.join(",")}\x00${additionalDirectoriesForClaudeMd.join("\x00")}`;
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.addDirMarketplacesMemo?.key === memoKey)
    return pluginRegistry.addDirMarketplacesMemo.value;
  let result = {};
  for (let dir of additionalDirectoriesForClaudeMd)
    for (let file of enabledFiles) {
      let { settings } = parseSettingsFile(join(dir, ".claude", file));
      if (!settings?.extraKnownMarketplaces) continue;
      for (let [key, value] of Object.entries(settings.extraKnownMarketplaces))
        result[key] = sanitizeAddDirMarketplaceDeclaration(key, value);
    }
  pluginRegistry.addDirMarketplacesMemo = {
    key: memoKey,
    value: result,
  };
  return result;
}
//@ chunk-tt36reb3.js:2027-2087 affinity
function enabledSettingsFiles() {
  return SETTINGS_FILE_NAMES.filter((file) =>
    SOURCES_BY_SETTINGS_FILE[file].every((source) => isSettingSourceEnabled(source)),
  );
}
//@ chunk-tt36reb3.js:2087-2959 sole-consumer
/**
 * 清洗来自 --add-dir 目录的市场声明：url 源丢掉 headersHelper（--add-dir 声明不允许执行命令）并过滤非法 header； settings 源丢掉 command 源插件条目及各条目的 headersHelper。其他源原样返回。
 */
function sanitizeAddDirMarketplaceDeclaration(marketplaceName, declaration) {
  let source = declaration.source;
  if (source.source === "url") {
    let { headersHelper, headers, ...rest } = source;
    if (headersHelper !== undefined)
      logForDebugging(
        `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping its headersHelper (an --add-dir declaration may not run commands)`,
        {
          level: "warn",
        },
      );
    return {
      ...declaration,
      source: {
        ...rest,
        ...(headers && {
          headers: dropMalformedHeader(
            headers,
            `--add-dir marketplace ${printablePluginName(marketplaceName)}`,
          ),
        }),
      },
    };
  }
  if (source.source === "settings")
    return {
      ...declaration,
      source: {
        ...source,
        plugins: source.plugins
          .filter((plugin) => {
            let isCommandSourced = typeof plugin.source === "object" && plugin.source.source === "command";
            if (isCommandSourced)
              logForDebugging(
                `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping command-sourced entry ${printablePluginName(plugin.name)}`,
                {
                  level: "warn",
                },
              );
            return !isCommandSourced;
          })
          .map(({ headersHelper, headers, ...pluginEntry }) => {
            if (headersHelper !== undefined)
              logForDebugging(
                `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping entry ${printablePluginName(pluginEntry.name)}'s headersHelper (an --add-dir declaration may not run commands)`,
                {
                  level: "warn",
                },
              );
            return {
              ...pluginEntry,
              ...(headers && {
                headers: dropMalformedHeader(
                  headers,
                  `--add-dir marketplace ${printablePluginName(marketplaceName)} entry ${printablePluginName(pluginEntry.name)}`,
                ),
              }),
            };
          }),
      },
    };
  return declaration;
}
export {
  getAddDirEnabledPlugins,
  getAddDirExtraMarketplaces,
  SETTINGS_FILE_NAMES,
  ADDED_FOLDER_PLUGINS_FOLLOW_SETTING_SOURCES,
};
