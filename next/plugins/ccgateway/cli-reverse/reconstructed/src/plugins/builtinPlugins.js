/**
 * plugins/builtinPlugins.ts
 *
 * 并入已有模块：内置插件注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/plugins/builtinPlugins.ts
 * pieces: chunk-7pze86xc.js (1), chunk-bfnfj4kx.js (13), chunk-e6aww6q8.js (1)
 * attribution: placement 13, fingerprint 2
 */
import { join } from "path";
import { isStandaloneExecutable } from "../utils/slowOperations.js";
import { bundledModuleInfo } from "./functionHooks/stateScan.js";
import { HOOKS_REGISTER_TS, builtinHookKey, repoRoot, MODS } from "./functionHooks/builtinHooksModule.js";
import { BUILTIN } from "../utils/telemetry/pluginTelemetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  toError,
} from "../utils/errors.js";
import { getHostState } from "../utils/hostEnvironment.js";
import { logError } from "../utils/log.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { builtinSourceRegistry } from "./functionHooks/moduleLoader.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { legacyPluginIds } from "../utils/plugins/pluginIdentifier.js";
import { getManagedPluginNames_2, findEnabledSettingForPlugin } from "../utils/plugins/managedPlugins.js";
import { trustedEnabledPlugins } from "../utils/plugins/pluginConfigSources.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { isValidSkillDirName } from "../skills/syncedSkills.js";
import { env } from "../utils/env.js";
import { isRemoteEntrypoint } from "../utils/entrypointKinds.js";
import { getSessionEntrypoint } from "../utils/sessionShape.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bfnfj4kx.js:75190-75243 placement
/**
 * 生成内置插件的 hooks 模块引用（打包模式下指向内嵌模块）。
 */
var builtinHooksModuleRef = (pluginName, mod, loader) =>
  isStandaloneExecutable()
    ? bundledModuleInfo(mod, loader(), pluginName)
    : {
        module: mod,
        folder: pluginName,
      };
//@ chunk-bfnfj4kx.js:75272-75378 placement
function builtinPluginLocation(path, hooksModule) {
  return "folder" in hooksModule
    ? {
        path: hooksModule.folder,
        modulePath: join(hooksModule.folder, HOOKS_REGISTER_TS),
      }
    : {
        path: BUILTIN,
        modulePath: builtinHookKey(path),
      };
}
//@ chunk-bfnfj4kx.js:75407-75434 placement
/**
 * mods 目录下某路径。
 */
var getModsFolderPath = (name) => join(repoRoot(), MODS, name);
//@ chunk-bfnfj4kx.js:75434-75576 placement
function describeModuleShape(value) {
  return value === null || value === undefined
    ? String(value)
    : typeof value === "object"
      ? `an object with keys [${Object.keys(value).join(", ")}]`
      : `a ${typeof value}`;
}
//@ chunk-bfnfj4kx.js:75576-75818 placement
function assertBuiltinModuleShape(builtinModule) {
  if (
    typeof builtinModule === "object" &&
    builtinModule !== null &&
    "registerPlugin" in builtinModule &&
    typeof builtinModule.registerPlugin === "function"
  )
    return builtinModule;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `a built-in module has no registerPlugin function: ${describeModuleShape(builtinModule)}`,
    "a built-in module has no registerPlugin function",
  );
}
//@ chunk-bfnfj4kx.js:75818-76018 placement
/**
 * 加载并注册一个内置插件模块：require 失败、缺 registerPlugin、注册抛错时分别按阶段记录失败（注册失败还会移除）。
 */
function loadBuiltinPlugin(name, loader) {
  let loaded;
  try {
    loaded = loader();
  } catch (error) {
    recordBuiltinPluginFailure(name, "require", error);
    return;
  }
  let moduleExports;
  try {
    moduleExports = assertBuiltinModuleShape(loaded);
  } catch (error) {
    recordBuiltinPluginFailure(name, "shape", error);
    return;
  }
  try {
    moduleExports.registerPlugin();
  } catch (error) {
    getHostState().builtinPlugins.delete(name);
    recordBuiltinPluginFailure(name, "register", error);
  }
}
//@ chunk-bfnfj4kx.js:76018-76167 placement
function recordBuiltinPluginFailure(name, phase, error) {
  let builtinPluginFailures = getHostState().builtinPluginFailures;
  if (builtinPluginFailures.has(name)) return;
  builtinPluginFailures.set(name, {
    name,
    phase,
    message: errorMessage(error),
  });
  logError(toError(error));
  logFeatureBad("plugin_bundled_register", phase);
}
//@ chunk-bfnfj4kx.js:76167-76380 placement
/**
 * 内置插件是否可用（注册过、未失败、isAvailable 为真）。
 */
function isBuiltinPluginAvailable(name) {
  let hostState = getHostState();
  let plugin = hostState.builtinPlugins.get(name);
  if (plugin === undefined || hostState.builtinPluginFailures.has(name)) return false;
  if (plugin.isAvailable === undefined) return true;
  try {
    return plugin.isAvailable();
  } catch (error) {
    recordBuiltinPluginFailure(name, "is_available", error);
    return false;
  }
}
//@ chunk-bfnfj4kx.js:76380-76576 placement
/**
 * 注册内置插件，并登记其 hooks 模块（扫描或预构建）。
 */
function registerBuiltinPlugin(plugin) {
  getHostState().builtinPlugins.set(plugin.name, plugin);
  let hooksModule = plugin.hooksModule;
  if (hooksModule === undefined) return;
  let hookKey = builtinHookKey(plugin.name);
  if ("scan" in hooksModule) builtinSourceRegistry.registerScan(hookKey, hooksModule.scan);
  else if ("shipped" in hooksModule) builtinSourceRegistry.register(hookKey, hooksModule.shipped);
}
//@ chunk-bfnfj4kx.js:76576-76619 placement
/**
 * 插件 id 是否以 @builtin 结尾。
 */
function isBuiltinPluginId(pluginId) {
  return pluginId.endsWith(`@${BUILTIN}`);
}
//@ chunk-bfnfj4kx.js:76619-76663 placement
/**
 * 列出已注册内置插件的名字。
 */
var getBuiltinPluginNames = () => [...getHostState().builtinPlugins.keys()];
//@ chunk-bfnfj4kx.js:76663-76712 placement
/**
 * 按名字取内置插件定义。
 */
function getBuiltinPlugin(name) {
  return getHostState().builtinPlugins.get(name);
}
//@ chunk-bfnfj4kx.js:76712-77383 fingerprint = getBuiltinPlugins (0.708)
/**
 * 列出内置插件（随 CLI 发布、名字为 <name>@builtin）：按可用性开关过滤，根据 settings.enabledPlugins 与默认启用状态分成 enabled/disabled。
 */
function getBuiltinPlugins() {
  let settings = getSettings_DEPRECATED();
  let enabled = [];
  let disabled = [];
  for (let [name, plugin] of getHostState().builtinPlugins) {
    if (!isBuiltinPluginAvailable(name)) continue;
    let pluginId = `${name}@${BUILTIN}`;
    let hasLegacyIds = legacyPluginIds(pluginId).length > 0;
    let userSetting = plugin.enabledFromPolicyOnly
      ? getManagedPluginNames_2(pluginId)
      : plugin.enabledFromTrustedSettingsOnly
        ? trustedEnabledPlugins(pluginId)
        : !hasLegacyIds
          ? settings?.enabledPlugins?.[pluginId]
          : findEnabledSettingForPlugin(pluginId);
    let isEnabled = userSetting !== undefined ? userSetting === true : (plugin.defaultEnabled ?? true);
    let plugin_2 = {
      name,
      manifest: {
        name,
        description: plugin.description,
        version: plugin.version,
        ...(plugin.defaultEnabled === undefined
          ? {}
          : {
              defaultEnabled: plugin.defaultEnabled,
            }),
        ...(plugin.userConfig === undefined
          ? {}
          : {
              userConfig: plugin.userConfig,
            }),
      },
      path: BUILTIN,
      source: pluginId,
      repository: pluginId,
      enabled: isEnabled,
      isBuiltin: true,
      hooksConfig: plugin.hooks,
      mcpServers: plugin.mcpServers,
      ...(plugin.hooksModule === undefined ? {} : builtinPluginLocation(name, plugin.hooksModule)),
    };
    if (isEnabled) enabled.push(plugin_2);
    else disabled.push(plugin_2);
  }
  return {
    enabled,
    disabled,
  };
}
//@ chunk-e6aww6q8.js:956875-956944 fingerprint = getBuiltinPluginSkillCommands (0.669)
/**
 * 内置插件清单里 skills 数组的运行期校验边界：至少 1 项、最多 64 项（MAX_SKILLS_PER_PLUGIN）。
 */
var MAX_SKILLS_PER_PLUGIN; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var builtinSkillsSchema;
deferInit("chunk-e6aww6q8.js:956875", () => {
  MAX_SKILLS_PER_PLUGIN = 64;
  builtinSkillsSchema = DoctorLazy(() =>
    objectSchema({
      skills: array(stringSchema().refine(isValidSkillDirName)).min(1).max(MAX_SKILLS_PER_PLUGIN),
    }),
  );
});
//@ chunk-7pze86xc.js:339-1469 placement
/**
 * 首次调用时加载所有内置插件：sec-default、agents-md、telemetry 总是加载；非 local-agent 入口再加 plugin-authoring、mods-guide（非远程还有 tips、mermaid）；responsive-mode、diff、you-should-know、easel、claude-platform、claude-test 按入口类型加载。
 */
function initBuiltinPlugins() {
  let hostState = getHostState();
  if (hostState.builtinPluginsInitialized) return;
  hostState.builtinPluginsInitialized = true;
  loadBuiltinPlugin("cc-plugin-sec-default", () => require("./functionHooks/ADMISSION_OPTIONS.lazy.js"));
  loadBuiltinPlugin("cc-plugin-agents-md", () => require("./bundled/agentsMd/PLUGIN_DESCRIPTION.lazy.js"));
  loadBuiltinPlugin("cc-plugin-telemetry", () => require("../services/analytics/MOD_FOLDER.lazy.js"));
  if (env.CLAUDE_CODE_ENTRYPOINT !== "local-agent") {
    loadBuiltinPlugin("cc-plugin-plugin-authoring", () =>
      require("../skills/bundled/pluginAuthoring/CLOUD_SURFACE.lazy.js"),
    );
    loadBuiltinPlugin("cc-plugin-mods-guide", () =>
      require("./bundled/modsGuide/PLUGIN_DESCRIPTION.lazy.js"),
    );
    if (!isRemoteEntrypoint()) {
      loadBuiltinPlugin("cc-plugin-tips", () => require("./bundled/tips/PLUGIN_DESCRIPTION.lazy.js"));
      loadBuiltinPlugin("cc-plugin-mermaid", () => require("./bundled/mermaid/PLUGIN_DESCRIPTION.lazy.js"));
    }
  }
  let isInteractive = env.CLAUDE_CODE_ENTRYPOINT !== "local-agent" && !isRemoteEntrypoint();
  if (isInteractive || getSessionEntrypoint() === "remote")
    loadBuiltinPlugin("cc-plugin-responsive-mode", () => require("../services/prompts/DRAFT_HINT.lazy.js"));
  if (isInteractive)
    loadBuiltinPlugin("cc-plugin-diff", () => require("./bundled/diffPane/MOD_FOLDER.lazy.js"));
  if (env.CLAUDE_CODE_ENTRYPOINT !== "local-agent")
    loadBuiltinPlugin("cc-plugin-you-should-know", () =>
      require("./bundled/youShouldKnow/ABOUT_CLOSED.lazy.js"),
    );
  if (isInteractive || getSessionEntrypoint() === "remote_cowork")
    loadBuiltinPlugin("cc-plugin-easel", () => require("./bundled/easel/PLUGIN_DESCRIPTION.lazy.js"));
  if (isInteractive) {
    loadBuiltinPlugin("cc-plugin-claude-platform", () => require("./bundled/MCP_SERVERS.lazy.js"));
    loadBuiltinPlugin("cc-plugin-claude-test", () => require("./bundled/claudeTest/ALWAYS_SET.lazy.js"));
  }
}
export {
  registerBuiltinPlugin,
  builtinHooksModuleRef,
  getBuiltinPlugin,
  getBuiltinPlugins,
  isBuiltinPluginId,
  initBuiltinPlugins,
  getModsFolderPath,
  MAX_SKILLS_PER_PLUGIN,
  isBuiltinPluginAvailable,
  getBuiltinPluginNames,
  builtinSkillsSchema,
};
