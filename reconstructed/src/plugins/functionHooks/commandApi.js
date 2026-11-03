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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { rbe, I1r, pluginCommandToCommand, setCommandSetHooker } from "./commandHooks.js";
import {
  getCommandName as getCommandName_2,
  getCommandOriginKind,
  getBuiltinCommands,
  addCommandSpellings,
  isCommandEnabled,
  findCommand,
} from "../../commands.js";
import { requireBoundSession, submitHoldRefusal, LATER } from "./sessionApi.js";
import { lp } from "./surfaceBinding.js";
import { IT, hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { classifyPluginOrigin } from "./panes.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { foldName as foldName_2 } from "../../utils/plugins/syncedItems.js";
import { VDr } from "./commandRunDispatch.js";
import { Gme, zme } from "./promptSubmit.js";
import { oO, enqueueCommand } from "../../utils/messageQueueManager.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { defaultDescribe } from "./coreHandlers.js";
import { commandProvider } from "./providerTiers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";

//@ chunk-e6aww6q8.js:3696484-3696676 placement
function describeCommandForPlugin(e) {
  let n = e.type === "prompt",
    r = rbe.ownerOf(e.name) ?? (n ? e.pluginInfo?.pluginManifest.name : void 0);
  return {
    name: getCommandName_2(e),
    description: e.description,
    source: getCommandOriginKind(e),
    ...(r !== void 0 && { plugin: r }),
  };
}
//@ chunk-e6aww6q8.js:3696676-3696756 placement
var WDr = { builtin: "built-in", plugin: "plugin's", user: "user's", mcp: "MCP server's" };
//@ chunk-e6aww6q8.js:3696756-3696817 placement
var zDr = async (e) => requireBoundSession(e, "$.command.list").commands().map(describeCommandForPlugin);
//@ chunk-e6aww6q8.js:3696817-3696855 placement
function JV() {
  lp()?.refreshCommands();
}
/**
 * 插件 $.command.register：注册斜杠命令，名字已被占用时拒绝。
 */
//@ chunk-e6aww6q8.js:3696855-3697712 placement
async function commandRegisterForPlugin(e, n) {
  let r = requireBoundSession(n, "$.command.register"),
    s = IT(n),
    h = s && classifyPluginOrigin(s),
    holderOf = rbe.holderOf(e.name);
  if (holderOf !== void 0 && holderOf !== n)
    throw (
      logFeatureBad("plugin_function_hooks_register_command", "name_taken", h),
      new HooksError(
        `${n}: $.command.register: "/${e.name}" refused: the plugin ${holderOf} registered it already`,
      )
    );
  if (holderOf === n && Rs(rbe.specOf(e.name)) === Rs(e))
    return (
      logForDebugging(`$.command.register (${n}): /${e.name} unchanged; not re-registered`),
      { command: e.name }
    );
  let L = foldName_2(e.name),
    found = [...r.commands(), ...getBuiltinCommands()].find((q) => {
      let Z = new Set();
      return (addCommandSpellings(Z, q), Z.has(L) && !I1r(q) && isCommandEnabled(q));
    });
  if (holderOf === void 0 && found !== void 0)
    throw (
      logFeatureBad("plugin_function_hooks_register_command", "name_taken", h),
      new HooksError(
        `${n}: $.command.register: "/${e.name}" refused: it is the ${WDr[getCommandOriginKind(found)]} /${found.name}`,
      )
    );
  return (
    rbe.register(n, e),
    logForDebugging(`$.command.register (${n}): /${e.name} listed`),
    logFeatureOk("plugin_function_hooks_register_command", h),
    JV(),
    { command: e.name }
  );
}
/**
 * 插件 $.command.run：在会话中执行一个已有的斜杠命令。
 */
//@ chunk-e6aww6q8.js:3697750-3698378 placement
function commandRunForPlugin({ command: command, args: args = "" }, r, s = { origin: [r] }) {
  let h = requireBoundSession(r, "$.command.run");
  if (!(rbe.ownerOf(command) !== void 0 || findCommand(command, h.commands()) !== void 0))
    return Promise.reject(
      new HooksError(`${r}: $.command.run: no command named /${command} in this session`),
    );
  let S = submitHoldRefusal({ plugin: r, ...s }, "$.command.run");
  if (S !== void 0) return Promise.reject(new HooksError(`${r}: $.command.run: ${S}`));
  let w = args === "" ? `/${command}` : `/${command} ${args}`;
  logForDebugging(`$.command.run (${r}): ${w.length} chars queued`);
  let L = randomUUID_42(),
    G = VDr(L, s.origin);
  return (
    Gme(L, s.rootEvent),
    zme(L, s.rootEvent, oO()),
    enqueueCommand({
      agentId: mainAgentId(),
      mode: "prompt",
      value: w,
      uuid: L,
      priority: LATER,
      origin: { kind: "plugin", name: r },
      queuedUnder: s.origin,
    }),
    G
  );
}
//@ chunk-e6aww6q8.js:3698378-3698416 placement
function GAe(e) {
  if (rbe.forget(e)) JV();
}
/**
 * 按参数内容缓存异步描述结果（失败时清除并回退到同步默认），可整体清空。
 */
//@ chunk-e6aww6q8.js:3698416-3698571 placement
function createDescribeCache(e) {
  let n = new Map();
  return {
    of: (r, s) => {
      let h = n,
        y = Rs(r),
        S = h.get(y) ?? s().catch(() => (h.delete(y), e(r)));
      return (h.set(y, S), S);
    },
    forget: () => {
      n = new Map();
    },
  };
}
//@ chunk-e6aww6q8.js:3698571-3698591 placement
var cOn = () => createDescribeCache(defaultDescribe);
//@ chunk-e6aww6q8.js:3698591-3698605 placement
var fOn = cOn();
//@ chunk-e6aww6q8.js:3698605-3698758 placement
var toCommandDescribeItem = (e) => ({
  command: getCommandName_2(e),
  description: e.description,
  argumentHint: e.argumentHint,
  isHidden: e.isHidden === !0,
  immediate: e.immediate === !0,
  provider: commandProvider(e),
});
//@ chunk-e6aww6q8.js:3698758-3698914 placement
async function describeCommandWithHooks(e) {
  let n = toCommandDescribeItem(e);
  if (!hasModuleHookingSite("command.describe", { command: n.command })) return e;
  return applyCommandDescription(
    e,
    n,
    await fOn.of(n, () => NO_CORE_AT_CHAIN_BOTTOM("command.describe", {})(n)),
  );
}
//@ chunk-e6aww6q8.js:3698914-3699100 placement
function describeCommandLocally(e) {
  let n = { description: e.description, argumentHint: e.argumentHint };
  if (wellFormedLeaves(n) === n) return e;
  let r = toCommandDescribeItem(e);
  return hasModuleHookingSite("command.describe", { command: r.command })
    ? applyCommandDescription(e, r, wellFormedLeaves(defaultDescribe(r)))
    : e;
}
//@ chunk-e6aww6q8.js:3699100-3699357 placement
function applyCommandDescription(e, n, r) {
  return r.description === n.description && r.argumentHint === n.argumentHint && r.isHidden === n.isHidden
    ? e
    : {
        ...e,
        description: r.description,
        ...(r.description !== n.description && { menuDescription: void 0 }),
        argumentHint: r.argumentHint,
        isHidden: r.isHidden,
      };
}
//@ chunk-e6aww6q8.js:3699357-3699389 placement
var SOn = () => rbe.list().map(pluginCommandToCommand);
/**
 * 命令集钩子器：把插件注册的命令并入命令列表，并在有 command.describe 钩子时改写描述。
 */
//@ chunk-e6aww6q8.js:3699389-3699671 placement
var COMMAND_SET_HOOKER = {
  hooked: async (e) => {
    let n = SOn(),
      r = n.length === 0 ? e : [...dropSyncedNameClashes(e, n), ...n];
    if (!hasModuleHookingSite("command.describe")) return r;
    if (!isLoneSecDefaultShortcut("command.describe")) return Promise.all(r.map(describeCommandWithHooks));
    let mapped = r.map(describeCommandLocally);
    return mapped.every((h, y) => h === r[y]) ? r : mapped;
  },
  isHooked: () => rbe.list().length > 0 || hasModuleHookingSite("command.describe"),
};
//@ chunk-e6aww6q8.js:3699671-3699692 placement
var sLr = () => setCommandSetHooker(COMMAND_SET_HOOKER);
//@ chunk-e6aww6q8.js:3699692-3699698 placement
sLr();
//@ chunk-e6aww6q8.js:3699698-3699758 placement
function bOn(e) {
  if ((fOn.forget(), e !== "command.describe")) JV();
}
/**
 * 释放所有等待指定被调插件的调用（以 undefined 结算）。
 */
//@ chunk-e6aww6q8.js:3699758-3699865 placement
var releaseWaitingCalls = (e, n) =>
  [...e]
    .filter((r) => r.asked.callee === n)
    .forEach((r) => {
      (e.delete(r), r.waited.resolve(void 0));
    });

export {
  releaseWaitingCalls,
  GAe,
  createDescribeCache,
  zDr,
  commandRegisterForPlugin,
  commandRunForPlugin,
  bOn,
};
