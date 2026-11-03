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
import { join, join as join_2, join as join_3 } from "path";
import { isStandaloneExecutable } from "../utils/slowOperations.js";
import { En } from "./functionHooks/stateScan.js";
import { HOOKS_REGISTER_TS, lt, Ee, MODS } from "./functionHooks/builtinHooksModule.js";
import { BUILTIN } from "../utils/telemetry/pluginTelemetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  toError,
} from "../utils/errors.js";
import { getHostState } from "../utils/hostEnvironment.js";
import { logError } from "../utils/log.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { Neo } from "./functionHooks/moduleLoader.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { legacyPluginIds } from "../utils/plugins/pluginIdentifier.js";
import { getManagedPluginNames_2, findEnabledSettingForPlugin } from "../utils/plugins/managedPlugins.js";
import { trustedEnabledPlugins } from "../utils/plugins/pluginConfigSources.js";
import { env } from "../utils/env.js";
import { isRemoteEntrypoint } from "../utils/entrypointKinds.js";
import { getSessionEntrypoint } from "../utils/sessionShape.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o } from "../../vendor/zod/v4/classic/schemas.js";
import { isValidSkillDirName } from "../skills/syncedSkills.js";

/**
 * 生成内置插件的 hooks 模块引用（打包模式下指向内嵌模块）。
 */
//@ chunk-bfnfj4kx.js:75190-75243 placement
var builtinHooksModuleRef = (e, o, t) =>
  isStandaloneExecutable() ? En(o, t(), e) : { module: o, folder: e };
//@ chunk-bfnfj4kx.js:75272-75378 placement
function builtinPluginLocation(e, o) {
  return "folder" in o
    ? { path: o.folder, modulePath: join_2(o.folder, HOOKS_REGISTER_TS) }
    : { path: BUILTIN, modulePath: lt(e) };
}
/**
 * mods 目录下某路径。
 */
//@ chunk-bfnfj4kx.js:75407-75434 placement
var getModsFolderPath = (e) => join_3(Ee(), MODS, e);
//@ chunk-bfnfj4kx.js:75434-75576 placement
function describeModuleShape(e) {
  return e === null || e === void 0
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
/**
 * 加载并注册一个内置插件模块：require 失败、缺 registerPlugin、注册抛错时分别按阶段记录失败（注册失败还会移除）。
 */
//@ chunk-bfnfj4kx.js:75818-76018 placement
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
    (getHostState().builtinPlugins.delete(e), recordBuiltinPluginFailure(e, "register", error));
  }
}
//@ chunk-bfnfj4kx.js:76018-76167 placement
function recordBuiltinPluginFailure(e, o, t) {
  let builtinPluginFailures = getHostState().builtinPluginFailures;
  if (builtinPluginFailures.has(e)) return;
  (builtinPluginFailures.set(e, { name: e, phase: o, message: errorMessage(t) }),
    logError(toError(t)),
    logFeatureBad("plugin_bundled_register", o));
}
/**
 * 内置插件是否可用（注册过、未失败、isAvailable 为真）。
 */
//@ chunk-bfnfj4kx.js:76167-76380 placement
function isBuiltinPluginAvailable(e) {
  let o = getHostState(),
    t = o.builtinPlugins.get(e);
  if (t === void 0 || o.builtinPluginFailures.has(e)) return !1;
  if (t.isAvailable === void 0) return !0;
  try {
    return t.isAvailable();
  } catch (error) {
    return (recordBuiltinPluginFailure(e, "is_available", error), !1);
  }
}
/**
 * 注册内置插件，并登记其 hooks 模块（扫描或预构建）。
 */
//@ chunk-bfnfj4kx.js:76380-76576 placement
function registerBuiltinPlugin(e) {
  getHostState().builtinPlugins.set(e.name, e);
  let hooksModule = e.hooksModule;
  if (hooksModule === void 0) return;
  let t = lt(e.name);
  if ("scan" in hooksModule) Neo.registerScan(t, hooksModule.scan);
  else if ("shipped" in hooksModule) Neo.register(t, hooksModule.shipped);
}
/**
 * 插件 id 是否以 @builtin 结尾。
 */
//@ chunk-bfnfj4kx.js:76576-76619 placement
function isBuiltinPluginId(pluginId) {
  return pluginId.endsWith(`@${BUILTIN}`);
}
//@ chunk-bfnfj4kx.js:76619-76663 placement
var RSi = () => [...getHostState().builtinPlugins.keys()];
/**
 * 按名字取内置插件定义。
 */
//@ chunk-bfnfj4kx.js:76663-76712 placement
function getBuiltinPlugin(e) {
  return getHostState().builtinPlugins.get(e);
}
/**
 * 列出内置插件（随 CLI 发布、名字为 <name>@builtin）：按可用性开关过滤，根据 settings.enabledPlugins 与默认启用状态分成 enabled/disabled。
 */
//@ chunk-bfnfj4kx.js:76712-77383 fingerprint = getBuiltinPlugins (0.708)
function getBuiltinPlugins() {
  let settings = getSettings_DEPRECATED(),
    o = [],
    t = [];
  for (let [r, n] of getHostState().builtinPlugins) {
    if (!isBuiltinPluginAvailable(r)) continue;
    let pluginId = `${r}@${BUILTIN}`,
      p = legacyPluginIds(pluginId).length > 0,
      i = n.enabledFromPolicyOnly
        ? getManagedPluginNames_2(pluginId)
        : n.enabledFromTrustedSettingsOnly
          ? trustedEnabledPlugins(pluginId)
          : !p
            ? settings?.enabledPlugins?.[pluginId]
            : findEnabledSettingForPlugin(pluginId),
      a = i !== void 0 ? i === !0 : (n.defaultEnabled ?? !0),
      f = {
        name: r,
        manifest: {
          name: r,
          description: n.description,
          version: n.version,
          ...(n.defaultEnabled === void 0 ? {} : { defaultEnabled: n.defaultEnabled }),
          ...(n.userConfig === void 0 ? {} : { userConfig: n.userConfig }),
        },
        path: BUILTIN,
        source: pluginId,
        repository: pluginId,
        enabled: a,
        isBuiltin: !0,
        hooksConfig: n.hooks,
        mcpServers: n.mcpServers,
        ...(n.hooksModule === void 0 ? {} : builtinPluginLocation(r, n.hooksModule)),
      };
    if (a) o.push(f);
    else t.push(f);
  }
  return { enabled: o, disabled: t };
}
/**
 * 首次调用时加载所有内置插件：sec-default、agents-md、telemetry 总是加载；非 local-agent 入口再加 plugin-authoring、mods-guide（非远程还有 tips、mermaid）；responsive-mode、diff、you-should-know、easel、claude-platform、claude-test 按入口类型加载。
 */
//@ chunk-7pze86xc.js:339-1469 placement
function initBuiltinPlugins() {
  let n = getHostState();
  if (n.builtinPluginsInitialized) return;
  if (
    ((n.builtinPluginsInitialized = !0),
    loadBuiltinPlugin("cc-plugin-sec-default", () => require("./chunk-ykab7xp3.js")),
    loadBuiltinPlugin("cc-plugin-agents-md", () => require("./chunk-8jbcmznm.js")),
    loadBuiltinPlugin("cc-plugin-telemetry", () => require("./chunk-4m46mxx9.js")),
    env.CLAUDE_CODE_ENTRYPOINT !== "local-agent")
  ) {
    if (
      (loadBuiltinPlugin("cc-plugin-plugin-authoring", () => require("./chunk-jy3v56kg.js")),
      loadBuiltinPlugin("cc-plugin-mods-guide", () => require("./chunk-sc72x544.js")),
      !isRemoteEntrypoint())
    )
      (loadBuiltinPlugin("cc-plugin-tips", () => require("./chunk-0j11jfmy.js")),
        loadBuiltinPlugin("cc-plugin-mermaid", () => require("./chunk-yb0ajcmt.js")));
  }
  let e = env.CLAUDE_CODE_ENTRYPOINT !== "local-agent" && !isRemoteEntrypoint();
  if (e || getSessionEntrypoint() === "remote")
    loadBuiltinPlugin("cc-plugin-responsive-mode", () => require("./chunk-jr1te1aj.js"));
  if (e) loadBuiltinPlugin("cc-plugin-diff", () => require("./chunk-wyqg6m3h.js"));
  if (env.CLAUDE_CODE_ENTRYPOINT !== "local-agent")
    loadBuiltinPlugin("cc-plugin-you-should-know", () => require("./chunk-bss4k1z9.js"));
  if (e || getSessionEntrypoint() === "remote_cowork")
    loadBuiltinPlugin("cc-plugin-easel", () => require("./chunk-shznzb37.js"));
  if (e)
    (loadBuiltinPlugin("cc-plugin-claude-platform", () => require("./chunk-ad0qz7kc.js")),
      loadBuiltinPlugin("cc-plugin-claude-test", () => require("./chunk-ae5g0zb5.js")));
}
//@ chunk-e6aww6q8.js:956875-956944 fingerprint = getBuiltinPluginSkillCommands (0.669)
var SFo = 64,
  Txo = DoctorLazy(() => u({ skills: A(o().refine(isValidSkillDirName)).min(1).max(SFo) }));

export {
  registerBuiltinPlugin,
  builtinHooksModuleRef,
  getBuiltinPlugin,
  getBuiltinPlugins,
  isBuiltinPluginId,
  initBuiltinPlugins,
  getModsFolderPath,
  SFo,
  isBuiltinPluginAvailable,
  RSi,
  Txo,
};
