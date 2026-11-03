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
import { env } from "../utils/env.js";
import { isRemoteEntrypoint } from "../utils/entrypointKinds.js";
import { getSessionEntrypoint } from "../utils/sessionShape.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, array, string } from "../../vendor/zod/v4/classic/schemas.js";
import { isValidSkillDirName } from "../skills/syncedSkills.js";

//@ chunk-bfnfj4kx.js:75190-75243 placement
/**
 * 生成内置插件的 hooks 模块引用（打包模式下指向内嵌模块）。
 */
var builtinHooksModuleRef = (dir, o, t) =>
  isStandaloneExecutable()
    ? bundledModuleInfo(o, t(), dir)
    : {
        module: o,
        folder: dir,
      };
//@ chunk-bfnfj4kx.js:75272-75378 placement
function builtinPluginLocation(name, hooksModule) {
  return "folder" in hooksModule
    ? {
        path: hooksModule.folder,
        modulePath: join(hooksModule.folder, HOOKS_REGISTER_TS),
      }
    : {
        path: BUILTIN,
        modulePath: builtinHookKey(name),
      };
}
//@ chunk-bfnfj4kx.js:75407-75434 placement
/**
 * mods 目录下某路径。
 */
var getModsFolderPath = (e) => join(repoRoot(), MODS, e);
//@ chunk-bfnfj4kx.js:75434-75576 placement
function describeModuleShape(e) {
  return e === null || e === undefined
    ? String(e)
    : typeof e === "object"
      ? `an object with keys [${Object.keys(e).join(", ")}]`
      : `a ${typeof e}`;
}
//@ chunk-bfnfj4kx.js:75576-75818 placement
function assertBuiltinModuleShape(e) {
  if (typeof e === "object" && e !== null && "registerPlugin" in e && typeof e.registerPlugin === "function")
    return e;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `a built-in module has no registerPlugin function: ${describeModuleShape(e)}`,
    "a built-in module has no registerPlugin function",
  );
}
//@ chunk-bfnfj4kx.js:75818-76018 placement
/**
 * 加载并注册一个内置插件模块：require 失败、缺 registerPlugin、注册抛错时分别按阶段记录失败（注册失败还会移除）。
 */
function loadBuiltinPlugin(e, o) {
  let t;
  try {
    t = o();
  } catch (error) {
    recordBuiltinPluginFailure(e, "require", error);
    return;
  }
  let r;
  try {
    r = assertBuiltinModuleShape(t);
  } catch (error) {
    recordBuiltinPluginFailure(e, "shape", error);
    return;
  }
  try {
    r.registerPlugin();
  } catch (error) {
    getHostState().builtinPlugins.delete(e);
    recordBuiltinPluginFailure(e, "register", error);
  }
}
//@ chunk-bfnfj4kx.js:76018-76167 placement
function recordBuiltinPluginFailure(e, o, error) {
  let builtinPluginFailures = getHostState().builtinPluginFailures;
  if (builtinPluginFailures.has(e)) return;
  builtinPluginFailures.set(e, {
    name: e,
    phase: o,
    message: errorMessage(error),
  });
  logError(toError(error));
  logFeatureBad("plugin_bundled_register", o);
}
//@ chunk-bfnfj4kx.js:76167-76380 placement
/**
 * 内置插件是否可用（注册过、未失败、isAvailable 为真）。
 */
function isBuiltinPluginAvailable(e) {
  let hostState = getHostState();
  let t = hostState.builtinPlugins.get(e);
  if (t === undefined || hostState.builtinPluginFailures.has(e)) return false;
  if (t.isAvailable === undefined) return true;
  try {
    return t.isAvailable();
  } catch (error) {
    recordBuiltinPluginFailure(e, "is_available", error);
    return false;
  }
}
//@ chunk-bfnfj4kx.js:76380-76576 placement
/**
 * 注册内置插件，并登记其 hooks 模块（扫描或预构建）。
 */
function registerBuiltinPlugin(e) {
  getHostState().builtinPlugins.set(e.name, e);
  let hooksModule = e.hooksModule;
  if (hooksModule === undefined) return;
  let t = builtinHookKey(e.name);
  if ("scan" in hooksModule) builtinSourceRegistry.registerScan(t, hooksModule.scan);
  else if ("shipped" in hooksModule) builtinSourceRegistry.register(t, hooksModule.shipped);
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
function getBuiltinPlugin(e) {
  return getHostState().builtinPlugins.get(e);
}
//@ chunk-bfnfj4kx.js:76712-77383 fingerprint = getBuiltinPlugins (0.708)
/**
 * 列出内置插件（随 CLI 发布、名字为 <name>@builtin）：按可用性开关过滤，根据 settings.enabledPlugins 与默认启用状态分成 enabled/disabled。
 */
function getBuiltinPlugins() {
  let settings = getSettings_DEPRECATED();
  let enabled = [];
  let disabled = [];
  for (let [name, n] of getHostState().builtinPlugins) {
    if (!isBuiltinPluginAvailable(name)) continue;
    let pluginId = `${name}@${BUILTIN}`;
    let p = legacyPluginIds(pluginId).length > 0;
    let userSetting = n.enabledFromPolicyOnly
      ? getManagedPluginNames_2(pluginId)
      : n.enabledFromTrustedSettingsOnly
        ? trustedEnabledPlugins(pluginId)
        : !p
          ? settings?.enabledPlugins?.[pluginId]
          : findEnabledSettingForPlugin(pluginId);
    let isEnabled = userSetting !== undefined ? userSetting === true : (n.defaultEnabled ?? true);
    let plugin = {
      name,
      manifest: {
        name,
        description: n.description,
        version: n.version,
        ...(n.defaultEnabled === undefined
          ? {}
          : {
              defaultEnabled: n.defaultEnabled,
            }),
        ...(n.userConfig === undefined
          ? {}
          : {
              userConfig: n.userConfig,
            }),
      },
      path: BUILTIN,
      source: pluginId,
      repository: pluginId,
      enabled: isEnabled,
      isBuiltin: true,
      hooksConfig: n.hooks,
      mcpServers: n.mcpServers,
      ...(n.hooksModule === undefined ? {} : builtinPluginLocation(name, n.hooksModule)),
    };
    if (isEnabled) enabled.push(plugin);
    else disabled.push(plugin);
  }
  return {
    enabled,
    disabled,
  };
}
//@ chunk-7pze86xc.js:339-1469 placement
/**
 * 首次调用时加载所有内置插件：sec-default、agents-md、telemetry 总是加载；非 local-agent 入口再加 plugin-authoring、mods-guide（非远程还有 tips、mermaid）；responsive-mode、diff、you-should-know、easel、claude-platform、claude-test 按入口类型加载。
 */
function initBuiltinPlugins() {
  let hostState = getHostState();
  if (hostState.builtinPluginsInitialized) return;
  hostState.builtinPluginsInitialized = true;
  loadBuiltinPlugin("cc-plugin-sec-default", () => require("./chunk-ykab7xp3.js"));
  loadBuiltinPlugin("cc-plugin-agents-md", () => require("./chunk-8jbcmznm.js"));
  loadBuiltinPlugin("cc-plugin-telemetry", () => require("./chunk-4m46mxx9.js"));
  if (env.CLAUDE_CODE_ENTRYPOINT !== "local-agent") {
    loadBuiltinPlugin("cc-plugin-plugin-authoring", () => require("./chunk-jy3v56kg.js"));
    loadBuiltinPlugin("cc-plugin-mods-guide", () => require("./chunk-sc72x544.js"));
    if (!isRemoteEntrypoint()) {
      loadBuiltinPlugin("cc-plugin-tips", () => require("./chunk-0j11jfmy.js"));
      loadBuiltinPlugin("cc-plugin-mermaid", () => require("./chunk-yb0ajcmt.js"));
    }
  }
  let e = env.CLAUDE_CODE_ENTRYPOINT !== "local-agent" && !isRemoteEntrypoint();
  if (e || getSessionEntrypoint() === "remote")
    loadBuiltinPlugin("cc-plugin-responsive-mode", () => require("./chunk-jr1te1aj.js"));
  if (e) loadBuiltinPlugin("cc-plugin-diff", () => require("./chunk-wyqg6m3h.js"));
  if (env.CLAUDE_CODE_ENTRYPOINT !== "local-agent")
    loadBuiltinPlugin("cc-plugin-you-should-know", () => require("./chunk-bss4k1z9.js"));
  if (e || getSessionEntrypoint() === "remote_cowork")
    loadBuiltinPlugin("cc-plugin-easel", () => require("./chunk-shznzb37.js"));
  if (e) {
    loadBuiltinPlugin("cc-plugin-claude-platform", () => require("./chunk-ad0qz7kc.js"));
    loadBuiltinPlugin("cc-plugin-claude-test", () => require("./chunk-ae5g0zb5.js"));
  }
}
//@ chunk-e6aww6q8.js:956875-956944 fingerprint = getBuiltinPluginSkillCommands (0.669)
/**
 * 内置插件清单里 skills 数组的运行期校验边界：至少 1 项、最多 64 项（MAX_SKILLS_PER_PLUGIN）。
 */
var MAX_SKILLS_PER_PLUGIN = 64;
var builtinSkillsSchema = DoctorLazy(() =>
  u({
    skills: array(string().refine(isValidSkillDirName)).min(1).max(MAX_SKILLS_PER_PLUGIN),
  }),
);
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
