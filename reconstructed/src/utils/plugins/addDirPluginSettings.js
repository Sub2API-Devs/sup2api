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
import { is } from "../settings/commandSyncNames.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { dropMalformedHeader } from "./headersHelper.js";

//@ chunk-pd0t5xas.js:1113-1161 affinity = SETTINGS_FILES (1)
var SETTINGS_FILES = ["settings.json", "settings.local.json"];
/**
 * 读取 --add-dir 目录下 .claude/settings(.local).json 中的 enabledPlugins（工作区不受信时为空）。
 */
//@ chunk-pd0t5xas.js:1161-1349 fingerprint = getAddDirEnabledPlugins (1)
function getAddDirEnabledPlugins() {
  let result = {};
  if (isAttachServeMode()) return result;
  for (let dir of getAdditionalDirectoriesForClaudeMd())
    for (let file of SETTINGS_FILES) {
      let { settings: settings } = parseSettingsFile(join(dir, ".claude", file));
      if (!settings?.enabledPlugins) continue;
      Object.assign(result, settings.enabledPlugins);
    }
  return result;
}
/**
 * 读取 --add-dir 目录设置里的 extraKnownMarketplaces（按目录列表与设置 epoch 缓存）。
 */
//@ chunk-pd0t5xas.js:1349-1749 fingerprint = getAddDirExtraMarketplaces (0.746)
function getAddDirExtraMarketplaces() {
  if (isAttachServeMode()) return {};
  let e = getAdditionalDirectoriesForClaudeMd(),
    n = `${is().epoch}\x00${e.join("\x00")}`,
    o = getPluginRegistry();
  if (o.addDirMarketplacesMemo?.key === n) return o.addDirMarketplacesMemo.value;
  let result = {};
  for (let i of e)
    for (let file of SETTINGS_FILES) {
      let { settings: settings } = parseSettingsFile(join(i, ".claude", file));
      if (!settings?.extraKnownMarketplaces) continue;
      for (let [u, g] of Object.entries(settings.extraKnownMarketplaces))
        result[u] = sanitizeAddDirMarketplaceDeclaration(u, g);
    }
  return ((o.addDirMarketplacesMemo = { key: n, value: result }), result);
}
/**
 * 清洗来自 --add-dir 目录的市场声明：url 源丢掉 headersHelper（--add-dir 声明不允许执行命令）并过滤非法 header； settings 源丢掉 command 源插件条目及各条目的 headersHelper。其他源原样返回。
 */
//@ chunk-pd0t5xas.js:1749-2621 sole-consumer
function sanitizeAddDirMarketplaceDeclaration(marketplaceName, declaration) {
  let source = declaration.source;
  if (source.source === "url") {
    let { headersHelper: headersHelper, headers: headers, ...rest } = source;
    if (headersHelper !== void 0)
      logForDebugging(
        `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping its headersHelper (an --add-dir declaration may not run commands)`,
        { level: "warn" },
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
            let i = typeof plugin.source === "object" && plugin.source.source === "command";
            if (i)
              logForDebugging(
                `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping command-sourced entry ${printablePluginName(plugin.name)}`,
                { level: "warn" },
              );
            return !i;
          })
          .map(({ headersHelper: headersHelper, headers: headers, ...d }) => {
            if (headersHelper !== void 0)
              logForDebugging(
                `--add-dir marketplace ${printablePluginName(marketplaceName)}: dropping entry ${printablePluginName(d.name)}'s headersHelper (an --add-dir declaration may not run commands)`,
                { level: "warn" },
              );
            return {
              ...d,
              ...(headers && {
                headers: dropMalformedHeader(
                  headers,
                  `--add-dir marketplace ${printablePluginName(marketplaceName)} entry ${printablePluginName(d.name)}`,
                ),
              }),
            };
          }),
      },
    };
  return declaration;
}

export { getAddDirEnabledPlugins, getAddDirExtraMarketplaces, SETTINGS_FILES };
