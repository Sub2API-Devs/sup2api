/**
 * plugins/functionHooks/commandApi.ts
 *
 * 2.1.316 新增：插件 $.command.register/run 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
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
import { requireBoundSession, submitHoldRefusal, LATER } from "./sessionApi.js";
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
import { getCommandQueue, enqueueCommand } from "../../utils/messageQueueManager.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { defaultDescribe } from "./coreHandlers.js";
import { commandProvider } from "./providerTiers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";

//@ chunk-e6aww6q8.js:3696484-3696676 placement
function describeCommandForPlugin(e) {
  let n = e.type === "prompt";
  let r = pluginCommandRegistry.ownerOf(e.name) ?? (n ? e.pluginInfo?.pluginManifest.name : undefined);
  return {
    name: getCommandName_2(e),
    description: e.description,
    source: getCommandOriginKind(e),
    ...(r !== undefined && {
      plugin: r,
    }),
  };
}
//@ chunk-e6aww6q8.js:3696676-3696756 placement
/**
 * builtin/plugin/user/MCP
 */
var COMMAND_SOURCE_LABELS = {
  builtin: "built-in",
  plugin: "plugin's",
  user: "user's",
  mcp: "MCP server's",
};
//@ chunk-e6aww6q8.js:3696756-3696817 placement
/**
 * 列出插件可见命令
 */
var listCommandsForPlugin = async (plugin) =>
  requireBoundSession(plugin, "$.command.list").commands().map(describeCommandForPlugin);
//@ chunk-e6aww6q8.js:3696817-3696855 placement
/**
 * 刷新命令列表
 */
function refreshCommands() {
  currentSurfaceBinding()?.refreshCommands();
}
//@ chunk-e6aww6q8.js:3696855-3697712 placement
/**
 * 插件 $.command.register：注册斜杠命令，名字已被占用时拒绝。
 */
async function commandRegisterForPlugin(e, plugin) {
  let r = requireBoundSession(plugin, "$.command.register");
  let s = loadedModuleArgs(plugin);
  let h = s && classifyPluginOrigin(s);
  let y = pluginCommandRegistry.holderOf(e.name);
  if (y !== undefined && y !== plugin) {
    logFeatureBad("plugin_function_hooks_register_command", "name_taken", h);
    throw new HooksError(
      `${plugin}: $.command.register: "/${e.name}" refused: the plugin ${y} registered it already`,
    );
  }
  if (y === plugin && stableStringifySafe(pluginCommandRegistry.specOf(e.name)) === stableStringifySafe(e)) {
    logForDebugging(`$.command.register (${plugin}): /${e.name} unchanged; not re-registered`);
    return {
      command: e.name,
    };
  }
  let L = foldName_2(e.name);
  let found = [...r.commands(), ...getBuiltinCommands()].find((q) => {
    let Z = new Set();
    addCommandSpellings(Z, q);
    return Z.has(L) && !isPluginLocalCommand_2(q) && isCommandEnabled(q);
  });
  if (y === undefined && found !== undefined) {
    logFeatureBad("plugin_function_hooks_register_command", "name_taken", h);
    throw new HooksError(
      `${plugin}: $.command.register: "/${e.name}" refused: it is the ${COMMAND_SOURCE_LABELS[getCommandOriginKind(found)]} /${found.name}`,
    );
  }
  pluginCommandRegistry.register(plugin, e);
  logForDebugging(`$.command.register (${plugin}): /${e.name} listed`);
  logFeatureOk("plugin_function_hooks_register_command", h);
  refreshCommands();
  return {
    command: e.name,
  };
}
//@ chunk-e6aww6q8.js:3697750-3698378 placement
/**
 * 插件 $.command.run：在会话中执行一个已有的斜杠命令。
 */
function commandRunForPlugin(
  { command, args = "" },
  plugin,
  s = {
    origin: [plugin],
  },
) {
  let h = requireBoundSession(plugin, "$.command.run");
  if (!(
    pluginCommandRegistry.ownerOf(command) !== undefined || findCommand(command, h.commands()) !== undefined
  ))
    return Promise.reject(
      new HooksError(`${plugin}: $.command.run: no command named /${command} in this session`),
    );
  let S = submitHoldRefusal(
    {
      plugin,
      ...s,
    },
    "$.command.run",
  );
  if (S !== undefined) return Promise.reject(new HooksError(`${plugin}: $.command.run: ${S}`));
  let w = args === "" ? `/${command}` : `/${command} ${args}`;
  logForDebugging(`$.command.run (${plugin}): ${w.length} chars queued`);
  let L = randomUUID();
  let G = waitForCommandSettle(L, s.origin);
  markSubmit(L, s.rootEvent);
  pruneAndMark(L, s.rootEvent, getCommandQueue());
  enqueueCommand({
    agentId: mainAgentId(),
    mode: "prompt",
    value: w,
    uuid: L,
    priority: LATER,
    origin: {
      kind: "plugin",
      name: plugin,
    },
    queuedUnder: s.origin,
  });
  return G;
}
//@ chunk-e6aww6q8.js:3698378-3698416 placement
/**
 * 清掉缓存的描述
 */
function forgetCachedDescribe(e) {
  if (pluginCommandRegistry.forget(e)) refreshCommands();
}
//@ chunk-e6aww6q8.js:3698416-3698571 placement
/**
 * 按参数内容缓存异步描述结果（失败时清除并回退到同步默认），可整体清空。
 */
function createDescribeCache(e) {
  let n = new Map();
  return {
    of: (r, s) => {
      let h = n;
      let y = stableStringifySafe(r);
      let S =
        h.get(y) ??
        s().catch(() => {
          h.delete(y);
          return e(r);
        });
      h.set(y, S);
      return S;
    },
    forget: () => {
      n = new Map();
    },
  };
}
//@ chunk-e6aww6q8.js:3698571-3698591 placement
/**
 * 新建描述缓存
 */
var makeDescribeCache = () => createDescribeCache(defaultDescribe);
//@ chunk-e6aww6q8.js:3698591-3698605 placement
/**
 * 命令描述缓存
 */
var describeCache = makeDescribeCache();
//@ chunk-e6aww6q8.js:3698605-3698758 placement
var toCommandDescribeItem = (e) => ({
  command: getCommandName_2(e),
  description: e.description,
  argumentHint: e.argumentHint,
  isHidden: e.isHidden === true,
  immediate: e.immediate === true,
  provider: commandProvider(e),
});
//@ chunk-e6aww6q8.js:3698758-3698914 placement
async function describeCommandWithHooks(e) {
  let commandDescribeItem = toCommandDescribeItem(e);
  if (
    !hasModuleHookingSite("command.describe", {
      command: commandDescribeItem.command,
    })
  )
    return e;
  return applyCommandDescription(
    e,
    commandDescribeItem,
    await describeCache.of(commandDescribeItem, () =>
      NO_CORE_AT_CHAIN_BOTTOM("command.describe", {})(commandDescribeItem),
    ),
  );
}
//@ chunk-e6aww6q8.js:3698914-3699100 placement
function describeCommandLocally(e) {
  let n = {
    description: e.description,
    argumentHint: e.argumentHint,
  };
  if (wellFormedLeaves(n) === n) return e;
  let commandDescribeItem = toCommandDescribeItem(e);
  return hasModuleHookingSite("command.describe", {
    command: commandDescribeItem.command,
  })
    ? applyCommandDescription(e, commandDescribeItem, wellFormedLeaves(defaultDescribe(commandDescribeItem)))
    : e;
}
//@ chunk-e6aww6q8.js:3699100-3699357 placement
function applyCommandDescription(e, commandDescribeItem, r) {
  return r.description === commandDescribeItem.description &&
    r.argumentHint === commandDescribeItem.argumentHint &&
    r.isHidden === commandDescribeItem.isHidden
    ? e
    : {
        ...e,
        description: r.description,
        ...(r.description !== commandDescribeItem.description && {
          menuDescription: undefined,
        }),
        argumentHint: r.argumentHint,
        isHidden: r.isHidden,
      };
}
//@ chunk-e6aww6q8.js:3699357-3699389 placement
/**
 * 插件命令列表
 */
var hookedCommands = () => pluginCommandRegistry.list().map(pluginCommandToCommand);
//@ chunk-e6aww6q8.js:3699389-3699671 placement
/**
 * 命令集钩子器：把插件注册的命令并入命令列表，并在有 command.describe 钩子时改写描述。
 */
var COMMAND_SET_HOOKER = {
  hooked: async (e) => {
    let n = hookedCommands();
    let r = n.length === 0 ? e : [...dropSyncedNameClashes(e, n), ...n];
    if (!hasModuleHookingSite("command.describe")) return r;
    if (!isLoneSecDefaultShortcut("command.describe")) return Promise.all(r.map(describeCommandWithHooks));
    let mapped = r.map(describeCommandLocally);
    return mapped.every((h, y) => h === r[y]) ? r : mapped;
  },
  isHooked: () => pluginCommandRegistry.list().length > 0 || hasModuleHookingSite("command.describe"),
};
//@ chunk-e6aww6q8.js:3699671-3699692 placement
/**
 * 安装命令集合钩子器
 */
var installCommandSetHooker = () => setCommandSetHooker(COMMAND_SET_HOOKER);
//@ chunk-e6aww6q8.js:3699692-3699698 placement
installCommandSetHooker();
//@ chunk-e6aww6q8.js:3699698-3699758 placement
/**
 * 钩子释放时清缓存
 */
function onHookReleased(turnHeld) {
  describeCache.forget();
  if (turnHeld !== "command.describe") refreshCommands();
}
//@ chunk-e6aww6q8.js:3699758-3699865 placement
/**
 * 释放所有等待指定被调插件的调用（以 undefined 结算）。
 */
var releaseWaitingCalls = (sentCalls, n) =>
  [...sentCalls]
    .filter((r) => r.asked.callee === n)
    .forEach((r) => {
      sentCalls.delete(r);
      r.waited.resolve(undefined);
    });
export {
  releaseWaitingCalls,
  forgetCachedDescribe,
  createDescribeCache,
  listCommandsForPlugin,
  commandRegisterForPlugin,
  commandRunForPlugin,
  onHookReleased,
};
