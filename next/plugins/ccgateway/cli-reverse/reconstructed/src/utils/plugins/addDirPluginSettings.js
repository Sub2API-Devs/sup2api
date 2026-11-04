/**
 * utils/plugins/addDirPluginSettings.ts
 *
 * 读取 --add-dir 目录 .claude/settings(.local).json 中的 enabledPlugins 与 extraKnownMarketplaces。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/addDirPluginSettings.ts
 * pieces: chunk-pd0t5xas.js (4)
 * attribution: affinity 1, fingerprint 2, sole-consumer 1
 */
import { join } from "path";
import { isAttachServeMode } from "../../cli/headlessCloud/attachServe.js";
import { getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { parseSettingsFile } from "../settings/settings.js";
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { dropMalformedHeader } from "./headersHelper.js";

//@ chunk-pd0t5xas.js:1113-1161 affinity = SETTINGS_FILES (1)
var SETTINGS_FILES = ["settings.json", "settings.local.json"];
//@ chunk-pd0t5xas.js:1161-1349 fingerprint = getAddDirEnabledPlugins (1)
/**
 * 读取 --add-dir 目录下 .claude/settings(.local).json 中的 enabledPlugins（工作区不受信时为空）。
 */
function getAddDirEnabledPlugins() {
  let result = {};
  if (isAttachServeMode()) return result;
  for (let dir of getAdditionalDirectoriesForClaudeMd())
    for (let file of SETTINGS_FILES) {
      let { settings } = parseSettingsFile(join(dir, ".claude", file));
      if (!settings?.enabledPlugins) continue;
      Object.assign(result, settings.enabledPlugins);
    }
  return result;
}
//@ chunk-pd0t5xas.js:1349-1749 fingerprint = getAddDirExtraMarketplaces (0.746)
/**
 * 读取 --add-dir 目录设置里的 extraKnownMarketplaces（按目录列表与设置 epoch 缓存）。
 */
function getAddDirExtraMarketplaces() {
  if (isAttachServeMode()) return {};
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  let memoKey = `${commandSyncNameState().epoch}\x00${additionalDirectoriesForClaudeMd.join("\x00")}`;
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.addDirMarketplacesMemo?.key === memoKey)
    return pluginRegistry.addDirMarketplacesMemo.value;
  let result = {};
  for (let dir of additionalDirectoriesForClaudeMd)
    for (let file of SETTINGS_FILES) {
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
//@ chunk-pd0t5xas.js:1749-2621 sole-consumer
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
export { getAddDirEnabledPlugins, getAddDirExtraMarketplaces, SETTINGS_FILES };
