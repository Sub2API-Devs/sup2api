/**
 * plugins/functionHooks/commandApi.ts
 *
 * 2.1.316 新增：插件 $.command.register/run 接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 */
import { randomUUID } from "crypto";
import {
  pluginCommandRegistry,
  isPluginLocalCommand_2,
  pluginCommandToCommand,
  setCommandSetHooker,
} from "./commandHooks.js";
import {
  getCommandName as getCommandName_2,
  getCommandOriginKind,
  getBuiltinCommands,
  addCommandSpellings,
  isCommandEnabled,
  findCommand,
} from "../../commands.js";
import { requireBoundSession, checkPromptSubmitArgs, submitHoldRefusal, LATER } from "./sessionApi.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { loadedModuleArgs, hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { classifyPluginOrigin } from "./panes.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { foldName as foldName_2 } from "../../utils/plugins/syncedItems.js";
import { waitForCommandSettle } from "./commandRunDispatch.js";
import { markSubmit, pruneAndMark } from "./promptSubmit.js";
import { getCommandQueue, enqueue } from "../../utils/messageQueueManager.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { defaultDescribe } from "./coreHandlers.js";
import { commandProvider } from "./providerTiers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3792129-3792322 placement
function describeCommandForPlugin(command) {
  let isPrompt = command.type === "prompt";
  let owner =
    pluginCommandRegistry.ownerOf(command.name) ??
    (isPrompt ? command.pluginInfo?.pluginManifest.name : undefined);
  return {
    name: getCommandName_2(command),
    description: command.description,
    source: getCommandOriginKind(command),
    ...(owner !== undefined && {
      plugin: owner,
    }),
  };
}
//@ chunk-5xgkngpb.js:3792322-3792402 placement
/**
 * builtin/plugin/user/MCP
 */
var COMMAND_SOURCE_LABELS = {
  builtin: "built-in",
  plugin: "plugin's",
  user: "user's",
  mcp: "MCP server's",
};
//@ chunk-5xgkngpb.js:3792402-3792463 placement
/**
 * 列出插件可见命令
 */
var listCommandsForPlugin = async (plugin) =>
  requireBoundSession(plugin, "$.command.list").commands().map(describeCommandForPlugin);
//@ chunk-5xgkngpb.js:3792463-3792501 placement
/**
 * 刷新命令列表
 */
function refreshCommands() {
  currentSurfaceBinding()?.refreshCommands();
}
//@ chunk-5xgkngpb.js:3792501-3793362 placement
/**
 * 插件 $.command.register：注册斜杠命令，名字已被占用时拒绝。
 */
async function commandRegisterForPlugin(spec, plugin) {
  let ctx = requireBoundSession(plugin, "$.command.register");
  let args = loadedModuleArgs(plugin);
  let origin = args && classifyPluginOrigin(args);
  let holder = pluginCommandRegistry.holderOf(spec.name);
  if (holder !== undefined && holder !== plugin) {
    logFeatureBad("plugin_function_hooks_register_command", "name_taken", origin);
    throw new HooksError(
      `${plugin}: $.command.register: "/${spec.name}" refused: the plugin ${holder} registered it already`,
    );
  }
  if (
    holder === plugin &&
    stableStringifySafe(pluginCommandRegistry.specOf(spec.name)) === stableStringifySafe(spec)
  ) {
    logForDebugging(`$.command.register (${plugin}): /${spec.name} unchanged; not re-registered`);
    return {
      command: spec.name,
    };
  }
  let folded = foldName_2(spec.name);
  let command = [...ctx.commands(), ...getBuiltinCommands()].find((command) => {
    let names = new Set();
    addCommandSpellings(names, command);
    return names.has(folded) && !isPluginLocalCommand_2(command) && isCommandEnabled(command);
  });
  if (holder === undefined && command !== undefined) {
    logFeatureBad("plugin_function_hooks_register_command", "name_taken", origin);
    throw new HooksError(
      `${plugin}: $.command.register: "/${spec.name}" refused: it is the ${COMMAND_SOURCE_LABELS[getCommandOriginKind(command)]} /${command.name}`,
    );
  }
  pluginCommandRegistry.register(plugin, spec);
  logForDebugging(`$.command.register (${plugin}): /${spec.name} listed`);
  logFeatureOk("plugin_function_hooks_register_command", origin);
  refreshCommands();
  return {
    command: spec.name,
  };
}
//@ chunk-5xgkngpb.js:3793400-3794066 placement
/**
 * 插件 $.command.run：在会话中执行一个已有的斜杠命令。
 */
function commandRunForPlugin(
  { command, args = "" },
  plugin,
  opts = {
    origin: [plugin],
  },
) {
  let engine = requireBoundSession(plugin, "$.command.run");
  if (!(
    pluginCommandRegistry.ownerOf(command) !== undefined ||
    findCommand(command, engine.commands()) !== undefined
  ))
    return Promise.reject(
      new HooksError(`${plugin}: $.command.run: no command named /${command} in this session`),
    );
  let result =
    checkPromptSubmitArgs(
      {
        plugin,
        ...opts,
      },
      "$.command.run",
    ) ??
    submitHoldRefusal(
      {
        plugin,
        ...opts,
      },
      "$.command.run",
    );
  if (result !== undefined) return Promise.reject(new HooksError(`${plugin}: $.command.run: ${result}`));
  let text = args === "" ? `/${command}` : `/${command} ${args}`;
  logForDebugging(`$.command.run (${plugin}): ${text.length} chars queued`);
  let context = randomUUID();
  let extra = waitForCommandSettle(context, opts.origin);
  markSubmit(context, opts.rootEvent);
  pruneAndMark(context, opts.rootEvent, getCommandQueue());
  enqueue({
    agentId: mainAgentId(),
    mode: "prompt",
    value: text,
    uuid: context,
    priority: LATER,
    origin: {
      kind: "plugin",
      name: plugin,
    },
    queuedUnder: opts.origin,
  });
  return extra;
}
//@ chunk-5xgkngpb.js:3794066-3794104 placement
/**
 * 清掉缓存的描述
 */
function forgetCachedDescribe(name) {
  if (pluginCommandRegistry.forget(name)) refreshCommands();
}
//@ chunk-5xgkngpb.js:3794104-3794259 placement
/**
 * 按参数内容缓存异步描述结果（失败时清除并回退到同步默认），可整体清空。
 */
function createDescribeCache(version) {
  let cache = new Map();
  return {
    of: (command, secondVersion) => {
      let key = cache;
      let cached = stableStringifySafe(command);
      let value =
        key.get(cached) ??
        secondVersion().catch(() => {
          key.delete(cached);
          return version(command);
        });
      key.set(cached, value);
      return value;
    },
    forget: () => {
      cache = new Map();
    },
  };
}
//@ chunk-5xgkngpb.js:3794259-3794279 placement
/**
 * 新建描述缓存
 */
var makeDescribeCache = () => createDescribeCache(defaultDescribe);
//@ chunk-5xgkngpb.js:3794279-3794293 placement
/**
 * 命令描述缓存
 */
var describeCache; // deferred: uses makeDescribeCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3794279", () => {
  describeCache = makeDescribeCache();
});
//@ chunk-5xgkngpb.js:3794293-3794446 placement
var toCommandDescribeItem = (command) => ({
  command: getCommandName_2(command),
  description: command.description,
  argumentHint: command.argumentHint,
  isHidden: command.isHidden === true,
  immediate: command.immediate === true,
  provider: commandProvider(command),
});
//@ chunk-5xgkngpb.js:3794446-3794602 placement
async function describeCommandWithHooks(command) {
  let commandMeta = toCommandDescribeItem(command);
  if (
    !hasModuleHookingSite("command.describe", {
      command: commandMeta.command,
    })
  )
    return command;
  return applyCommandDescription(
    command,
    commandMeta,
    await describeCache.of(commandMeta, () => NO_CORE_AT_CHAIN_BOTTOM("command.describe", {})(commandMeta)),
  );
}
//@ chunk-5xgkngpb.js:3794602-3794788 placement
function describeCommandLocally(command) {
  let fields = {
    description: command.description,
    argumentHint: command.argumentHint,
  };
  if (wellFormedLeaves(fields) === fields) return command;
  let commandDescribeItem = toCommandDescribeItem(command);
  return hasModuleHookingSite("command.describe", {
    command: commandDescribeItem.command,
  })
    ? applyCommandDescription(
        command,
        commandDescribeItem,
        wellFormedLeaves(defaultDescribe(commandDescribeItem)),
      )
    : command;
}
//@ chunk-5xgkngpb.js:3794788-3795045 placement
function applyCommandDescription(command, commandMeta, described) {
  return described.description === commandMeta.description &&
    described.argumentHint === commandMeta.argumentHint &&
    described.isHidden === commandMeta.isHidden
    ? command
    : {
        ...command,
        description: described.description,
        ...(described.description !== commandMeta.description && {
          menuDescription: undefined,
        }),
        argumentHint: described.argumentHint,
        isHidden: described.isHidden,
      };
}
//@ chunk-5xgkngpb.js:3795045-3795077 placement
/**
 * 插件命令列表
 */
var hookedCommands = () => pluginCommandRegistry.list().map(pluginCommandToCommand);
//@ chunk-5xgkngpb.js:3795077-3795359 placement
/**
 * 命令集钩子器：把插件注册的命令并入命令列表，并在有 command.describe 钩子时改写描述。
 */
var COMMAND_SET_HOOKER = {
  hooked: async (args) => {
    let hooked = hookedCommands();
    let missing = hooked.length === 0 ? args : [...dropSyncedNameClashes(args, hooked), ...hooked];
    if (!hasModuleHookingSite("command.describe")) return missing;
    if (!isLoneSecDefaultShortcut("command.describe"))
      return Promise.all(missing.map(describeCommandWithHooks));
    let mapped = missing.map(describeCommandLocally);
    return mapped.every((item, index) => item === missing[index]) ? missing : mapped;
  },
  isHooked: () => pluginCommandRegistry.list().length > 0 || hasModuleHookingSite("command.describe"),
};
//@ chunk-5xgkngpb.js:3795359-3795380 placement
/**
 * 安装命令集合钩子器
 */
var installCommandSetHooker = () => setCommandSetHooker(COMMAND_SET_HOOKER);
//@ chunk-5xgkngpb.js:3795380-3795386 placement
// deferred: uses installCommandSetHooker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3795380", () => {
  installCommandSetHooker();
});
//@ chunk-5xgkngpb.js:3795386-3795446 placement
/**
 * 钩子释放时清缓存
 */
function onHookReleased(turnHeld) {
  describeCache.forget();
  if (turnHeld !== "command.describe") refreshCommands();
}
//@ chunk-5xgkngpb.js:3795446-3795553 placement
/**
 * 释放所有等待指定被调插件的调用（以 undefined 结算）。
 */
var releaseWaitingCalls = (sentCalls, callee) =>
  [...sentCalls]
    .filter((call) => call.asked.callee === callee)
    .forEach((call) => {
      sentCalls.delete(call);
      call.waited.resolve(undefined);
    });
export {
  releaseWaitingCalls,
  forgetCachedDescribe,
  listCommandsForPlugin,
  commandRegisterForPlugin,
  commandRunForPlugin,
  onHookReleased,
  createDescribeCache,
};
