/**
 * plugins/functionHooks/toolCallHooks.ts
 *
 * 2.1.316 新增：tool.call 事件钩子接入工具执行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (41)
 * attribution: placement 41
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
import { Ar } from "../../../runtime/bun-runtime.js";
import { Y3, XLe, list, registeredMcpToolName } from "./mcpServerHooks.js";
import { EN, createModuleStore } from "../../services/mcp/mcpClientCapabilities.js";
import {
  SM,
  PATH,
  INSTRUCTION_WITHHELD_REASONS,
  y_e,
  logWithheldInstructionFiles,
  recordWithheldInstructionFiles,
  MVe,
  OVe,
  seenWithheldPaths,
  withheldMemoryPaths,
  withheldInstructionNotice,
  yfn,
  fjt,
  Yb,
} from "../../utils/instructionFileAccess.js";
import { Ueo } from "./hookApiSurface.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { originPlugin } from "./hooksWorkerClient.js";
import { wAn } from "./hostBridge.js";
import { env } from "../../utils/env.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { joinTextBlocks } from "./sites/toolSites.js";
import { HooksError } from "./hooksErrors.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:35060-35071 placement
var B2e = {};
//@ chunk-e6aww6q8.js:35071-35305 placement
Ar(B2e, {
  closeCall: () => zLe,
  default: () => B2e,
  endWithheldWatch: () => releaseWithheldWatch,
  noteWithheld: () => noteWithheldPostToolUse,
  noticeProblem: () => checkToolCallOwner,
  noticesStore: () => FBr,
  openCall: () => Pht,
  setNotice: () => setPluginNotice,
  takeWithheld: () => Mht,
  watchWithheld: () => watchWithheldResults,
  withheldResult: () => Hqs,
});
//@ chunk-e6aww6q8.js:35305-35315 placement
var rv = {};
//@ chunk-e6aww6q8.js:35315-35487 placement
Ar(rv, {
  default: () => rv,
  forgetRegisteredTools: () => Y3,
  isRegisteredBy: () => XLe,
  registered: () => EN,
  registeredToolsOf: () => list,
  registrations: () => createModuleStore,
  unchangedRegistration: () => registeredMcpToolName,
});
//@ chunk-e6aww6q8.js:35487-35498 placement
var OCe = {};
//@ chunk-e6aww6q8.js:35498-35788 placement
Ar(OCe, {
  KEPT_MOST: () => SM,
  PATH_MARK: () => PATH,
  REASONS: () => INSTRUCTION_WITHHELD_REASONS,
  SHOWN_MOST: () => y_e,
  default: () => OCe,
  noteWithheld: () => logWithheldInstructionFiles,
  oweWithheld: () => recordWithheldInstructionFiles,
  owedNoMore: () => MVe,
  owedWithheld: () => OVe,
  toldBy: () => seenWithheldPaths,
  toldIn: () => withheldMemoryPaths,
  withheldLine: () => withheldInstructionNotice,
  withheldMore: () => yfn,
  withheldShown: () => fjt,
  withheldTolds: () => Yb,
});
//@ chunk-e6aww6q8.js:35788-35835 placement
var $Br = (e) => e !== "PreToolUse" && Ueo.includes(e);
//@ chunk-e6aww6q8.js:35835-35875 placement
var Cht = (e) => $Br(e) && hasModuleHookingSite(`classic.${e}`);
//@ chunk-e6aww6q8.js:35875-35903 placement
var GLe = (e) => `classic.${e}`;
//@ chunk-e6aww6q8.js:35903-35934 placement
var F3 = (e) => hasModuleHookingSite(`classic.${e}`);
//@ chunk-e6aww6q8.js:35934-36020 placement
var FNi = (e) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) => isModuleAdmitted(loadedModule) && loadedModule.patterns.includes(`classic.${e}`),
  );
//@ chunk-e6aww6q8.js:36020-36045 placement
var FBr = () => getPluginRegistry().notices;
/**
 * 设置或清除某键的插件提示（内容未变则不更新）。
 */
//@ chunk-e6aww6q8.js:36045-36204 placement
var setPluginNotice = (e, n) => {
  FBr().setState((r) => {
    let s = r.get(e);
    if (s?.plugin === n?.plugin && s?.text === n?.text) return r;
    let h = new Map(r);
    return (n ? h.set(e, n) : h.delete(e), h);
  });
};
//@ chunk-e6aww6q8.js:36204-36288 placement
function zLe(e) {
  (getPluginRegistry().openCalls.delete(e),
    getPluginRegistry().withheldCalls.delete(e),
    setPluginNotice(e, void 0));
}
/**
 * 释放一个对被扣留结果的观察者，返回期间是否有新的扣留记录。
 */
//@ chunk-e6aww6q8.js:36288-36458 placement
function releaseWithheldWatch(e, n) {
  let { withheldWatches: withheldWatches } = getPluginRegistry(),
    s = withheldWatches.get(e);
  if (s === void 0 || s.watchers <= 1) withheldWatches.delete(e);
  else withheldWatches.set(e, { ...s, watchers: s.watchers - 1 });
  return s !== void 0 && s.notes > n;
}
/**
 * PostToolUse 被扣留时记录：增加观察计数，标记开放调用为已扣留。
 */
//@ chunk-e6aww6q8.js:36458-36727 placement
function noteWithheldPostToolUse(e) {
  let {
      openCalls: openCalls,
      withheldCalls: withheldCalls,
      withheldWatches: withheldWatches,
    } = getPluginRegistry(),
    h = Reflect.get(e, "tool_use_id"),
    S = Reflect.get(e, "hook_event_name") === "PostToolUse" && typeof h === "string",
    w = S ? withheldWatches.get(h) : void 0,
    L = S && openCalls.has(h);
  if (w !== void 0) withheldWatches.set(h, { ...w, notes: w.notes + 1 });
  if (L) withheldCalls.add(h);
}
/**
 * 校验插件可以操作的 tool_use_id：调用必须开放且由该插件的 $.tool.call 发起。
 */
//@ chunk-e6aww6q8.js:36727-36938 placement
function checkToolCallOwner(e, n) {
  let { openCalls: openCalls } = getPluginRegistry();
  if (!openCalls.has(e)) return "no call with that tool_use_id is open";
  let s = openCalls.get(e);
  return s === void 0 || s.some((y) => originPlugin(y) === n)
    ? void 0
    : "the call is another plugin's $.tool.call run";
}
//@ chunk-e6aww6q8.js:36938-36979 placement
var Pht = (e, n) => {
  getPluginRegistry().openCalls.set(e, n);
};
//@ chunk-e6aww6q8.js:36979-37021 placement
var Mht = (e) => getPluginRegistry().withheldCalls.delete(e);
/**
 * 登记一个被扣留结果的观察者，返回当前记录数。
 */
//@ chunk-e6aww6q8.js:37021-37151 placement
function watchWithheldResults(e) {
  let { withheldWatches: withheldWatches } = getPluginRegistry(),
    r = withheldWatches.get(e) ?? { watchers: 0, notes: 0 };
  return (withheldWatches.set(e, { ...r, watchers: r.watchers + 1 }), r.notes);
}
//@ chunk-e6aww6q8.js:37151-37217 placement
var Hqs = (e) => `${e} ran, and a plugin withheld its result: ${wAn}`;
//@ chunk-e6aww6q8.js:3752385-3752537 placement
function createToolDescriptionCache() {
  let weakMap = new WeakMap();
  return {
    of: (n, r) => {
      let s = weakMap,
        h = s.get(n) ?? r().catch(() => (s.delete(n), ""));
      return (s.set(n, h), h);
    },
    forget: () => {
      weakMap = new WeakMap();
    },
  };
}
//@ chunk-e6aww6q8.js:3752537-3752551 placement
var OLn = createToolDescriptionCache();
//@ chunk-e6aww6q8.js:3752551-3752563 placement
var JHr = 300;
//@ chunk-e6aww6q8.js:3752563-3752582 placement
var forget = OLn.forget;
//@ chunk-e6aww6q8.js:3752582-3752593 placement
var tUr = 20;
//@ chunk-e6aww6q8.js:3752593-3752659 placement
function QGt() {
  return env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS ?? tUr;
}
//@ chunk-e6aww6q8.js:3752659-3752677 placement
var nUr = () => QGt();
//@ chunk-e6aww6q8.js:3752677-3752743 placement
var NLn = (e, n) => (n === void 0 ? { agentId: e } : { agentId: e, resolvedModel: n });
//@ chunk-e6aww6q8.js:3752743-3752767 placement
var FLn = { type: "direct" };
//@ chunk-e6aww6q8.js:3752767-3752813 placement
var $Ln = (e, n) => ({ result: e, text: n, isError: !0 });
//@ chunk-e6aww6q8.js:3752813-3752876 placement
var TOOLU_PLUGIN = "toolu_plugin_",
  UJn = (e) => e.startsWith("toolu_plugin_");
//@ chunk-e6aww6q8.js:3752914-3753012 placement
var sUr = (e, n) => ({
  type: "tool_use",
  id: `${TOOLU_PLUGIN}${randomUUID_44().replace(/-/g, "")}`,
  name: e,
  input: n,
  caller: FLn,
});
/**
 * 取异步启动的 Agent 工具结果中的代理 id。
 */
//@ chunk-e6aww6q8.js:3753012-3753125 placement
function launchedAgentId(e, n) {
  let r = n,
    s = r?.agentId;
  return e === AGENT && r?.status === "async_launched" && typeof s === "string" ? s : void 0;
}
/**
 * 构造插件发起工具调用的上下文：带上钩子来源、调用插件与是否服务模型。
 */
//@ chunk-e6aww6q8.js:3753125-3753245 placement
var pluginToolContext = (e, n, r) => ({
  ...e.toolContext(n),
  hookOrigin: r.origin,
  hookCaller: r.plugin,
  ...(r.servesModel && { hookServesModel: !0 }),
});
/**
 * 取消息列表中最后一条有文本的助手消息文本。
 */
//@ chunk-e6aww6q8.js:3753245-3753398 placement
function lastAssistantText(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r?.type !== "assistant") continue;
    let s = joinTextBlocks(r.message?.content, "");
    if (s !== "") return s;
  }
  return "";
}
//@ chunk-e6aww6q8.js:3753398-3753484 placement = extractErrorTypeFromData (1)
function unwrapUserMessage(data) {
  if ("type" in data) return;
  let { message: message } = data;
  return message.type === "user" ? message : void 0;
}
//@ chunk-e6aww6q8.js:3753484-3753574 placement
function jLn(e, n, r) {
  if (n instanceof HooksError) throw n;
  throw new HooksError(`${e}: ${r} failed: ${errorMessage(n)}`);
}
//@ chunk-e6aww6q8.js:3753574-3753607 placement
var iPe = Symbol("withheldResult");
//@ chunk-e6aww6q8.js:3753607-3753641 placement
var pUr = (e) => Object.hasOwn(e, iPe);
//@ chunk-e6aww6q8.js:3753641-3753706 placement
function mUr(e) {
  return (Object.defineProperty(e, iPe, { value: !0 }), e);
}

export {
  F3,
  FNi,
  QGt,
  B2e,
  $Br,
  Cht,
  OCe,
  zLe,
  Mht,
  Pht,
  GLe,
  noteWithheldPostToolUse,
  pluginToolContext,
  sUr,
  unwrapUserMessage,
  pUr,
  jLn,
  launchedAgentId,
  NLn,
  $Ln,
  OLn,
  JHr,
  rv,
  UJn,
  nUr,
  lastAssistantText,
  mUr,
  checkToolCallOwner,
  setPluginNotice,
  forget,
  watchWithheldResults,
  releaseWithheldWatch,
  Hqs,
};
