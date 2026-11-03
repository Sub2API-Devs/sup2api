/**
 * plugins/functionHooks/eventCatalog.ts
 *
 * 2.1.316 新增：函数钩子事件名清单（tool.call、prompt.*、session.*、ui.* 等）与链底缺失提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { AGENT_OFFER_EVENT, AGENT_SPAWN_SITE_RULES } from "./agentHooks.js";
import { ATTRIBUTION_TEXT_EVENT } from "./attributionHooks.js";
import {
  COMMAND_DESCRIBE_EVENT,
  CONFIG_DESCRIBE_EVENT,
  PROMPT_SECTION_EVENT,
  PROMPT_CONTEXT_EVENT,
  PROMPT_ATTACHMENT_EVENT,
  PROMPT_COMPOSE_EVENT,
  PROMPT_EDIT_EVENT,
  PROMPT_CHANGE_EVENT,
  PROMPT_AUTOCOMPLETE_EVENT,
} from "./coreHandlers.js";
import { TELEMETRY_LOG_EVENT, TELEMETRY_MARK_EVENT } from "./telemetryHooks.js";
import { promptFillEvent } from "./promptFillHooks.js";
import { PROMPT_SUGGEST_EVENT } from "./promptSuggestHooks.js";
import { SKILL_PROMPT_EVENT } from "./skillPromptHooks.js";
import { TOOL_DESCRIBE_EVENT } from "./toolDescribeHooks.js";
import {
  SESSION_START_EVENT,
  SESSION_RECEIVE_EVENT,
  SESSION_APPEND_EVENT,
  SESSION_ATTACH_EVENT,
  SESSION_DETACH_EVENT,
  SESSION_MEASURE_EVENT,
  SESSION_END_EVENT,
  TURN_START_EVENT,
  TURN_COMPLETE_EVENT,
} from "./sessionHooks.js";
import { UI_SCROLL_EVENT, UI_FOCUS_EVENT } from "./uiHooks.js";
import { TOOL_SITE_BY_EVENT, UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { isHookEvent } from "./hookApiSurface.js";
import { TOOL_CALL_SITE_RULES } from "../../services/tools/toolExecution.js";
import { TOOL_CHECK_RULES } from "./toolCheckHooks.js";
import { COMMAND_RUN_SITE_RULES } from "./commandRunDispatch.js";
import { CONFIG_SET_SITE_RULES } from "./configApi.js";
import { PROMPT_SUBMIT_RULES } from "./promptSubmit.js";
import { SESSION_COMPACT_RULES } from "./sessionCompactHook.js";
import { EVENT_PAYLOAD_SHAPES } from "./eventPayloads.js";
import {
  waitForHooksRespawn,
  hookMembersFor,
  modulesHookingEvent,
  hookOriginFromStack,
  streamMembersFor,
} from "./hookDispatch.js";
import { hasCurrentDispatch, reportChainFailure } from "./dispatch/chain.js";
import { HooksError } from "./hooksErrors.js";
import { withChainEnds } from "./classicHookBridge.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { teeGeneratorResult, reportStreamChainFailure } from "./dispatch/streamChain.js";
import { renderDraws } from "./ui/renderDispatch.js";

//@ chunk-e6aww6q8.js:82804-83527 placement
var DESCRIBE_EVENT_NAMES = () => ({
  "agent.offer": AGENT_OFFER_EVENT.core,
  "attribution.text": ATTRIBUTION_TEXT_EVENT.core,
  "command.describe": COMMAND_DESCRIBE_EVENT.core,
  "config.describe": CONFIG_DESCRIBE_EVENT.core,
  "telemetry.log": TELEMETRY_LOG_EVENT.core,
  "telemetry.mark": TELEMETRY_MARK_EVENT.core,
  "prompt.section": PROMPT_SECTION_EVENT.core,
  "prompt.context": PROMPT_CONTEXT_EVENT.core,
  "prompt.attachment": PROMPT_ATTACHMENT_EVENT.core,
  "prompt.compose": PROMPT_COMPOSE_EVENT.core,
  "prompt.fill": promptFillEvent.core,
  "prompt.edit": PROMPT_EDIT_EVENT.core,
  "prompt.change": PROMPT_CHANGE_EVENT.core,
  "prompt.autocomplete": PROMPT_AUTOCOMPLETE_EVENT.core,
  "prompt.suggest": PROMPT_SUGGEST_EVENT.core,
  "skill.prompt": SKILL_PROMPT_EVENT.core,
  "tool.describe": TOOL_DESCRIBE_EVENT.core,
  "session.start": SESSION_START_EVENT.core,
  "session.receive": SESSION_RECEIVE_EVENT.core,
  "session.append": SESSION_APPEND_EVENT.core,
  "session.attach": SESSION_ATTACH_EVENT.core,
  "session.detach": SESSION_DETACH_EVENT.core,
  "session.measure": SESSION_MEASURE_EVENT.core,
  "session.end": SESSION_END_EVENT.core,
  "turn.start": TURN_START_EVENT.core,
  "turn.complete": TURN_COMPLETE_EVENT.core,
  "ui.scroll": UI_SCROLL_EVENT.core,
  "ui.focus": UI_FOCUS_EVENT.core,
});
//@ chunk-e6aww6q8.js:83527-83613 placement
/**
 * 描述类事件
 */
var DESCRIBE_EVENTS = new Set(["config.describe", "command.describe", "tool.describe", "agent.offer"]);
//@ chunk-e6aww6q8.js:83613-83706 placement
/**
 * 不走钩子的事件
 */
var NON_HOOKABLE_EVENTS = new Set([
  "plugin.register",
  "telemetry.log",
  "telemetry.mark",
  "ui.scroll",
  "ui.focus",
]);
//@ chunk-e6aww6q8.js:83706-83794 placement
/**
 * 可由模块监听的事件
 */
var HOOKABLE_EVENTS = new Set(
  Object.keys(TOOL_SITE_BY_EVENT)
    .filter(isHookEvent)
    .filter((key) => !NON_HOOKABLE_EVENTS.has(key) && TOOL_SITE_BY_EVENT[key] !== undefined),
);
//@ chunk-e6aww6q8.js:5049623-5049652 placement
/**
 * prompt.mention 站点规则
 */
var PROMPT_MENTION_RULES = UI_ENV_SITE_RULES["prompt.mention"];
//@ chunk-e6aww6q8.js:5049652-5049679 placement
/**
 * session.send 站点规则
 */
var SESSION_SEND_RULES = UI_ENV_SITE_RULES["session.send"];
//@ chunk-e6aww6q8.js:5049679-5049703 placement
/**
 * turn.step 站点规则
 */
var TURN_STEP_RULES = UI_ENV_SITE_RULES["turn.step"];
//@ chunk-e6aww6q8.js:5049703-5050610 placement
var FUNCTION_HOOK_EVENT_NAMES = () => ({
  "tool.call": TOOL_CALL_SITE_RULES,
  "tool.check": TOOL_CHECK_RULES,
  "tool.describe": TOOL_DESCRIBE_EVENT.site,
  "command.run": COMMAND_RUN_SITE_RULES,
  "command.describe": COMMAND_DESCRIBE_EVENT.site,
  "config.set": CONFIG_SET_SITE_RULES,
  "config.describe": CONFIG_DESCRIBE_EVENT.site,
  "telemetry.log": TELEMETRY_LOG_EVENT.site,
  "telemetry.mark": TELEMETRY_MARK_EVENT.site,
  "prompt.submit": PROMPT_SUBMIT_RULES,
  "prompt.fill": promptFillEvent.site,
  "prompt.edit": PROMPT_EDIT_EVENT.site,
  "prompt.change": PROMPT_CHANGE_EVENT.site,
  "prompt.autocomplete": PROMPT_AUTOCOMPLETE_EVENT.site,
  "prompt.suggest": PROMPT_SUGGEST_EVENT.site,
  "prompt.section": PROMPT_SECTION_EVENT.site,
  "prompt.context": PROMPT_CONTEXT_EVENT.site,
  "prompt.attachment": PROMPT_ATTACHMENT_EVENT.site,
  "prompt.mention": PROMPT_MENTION_RULES,
  "prompt.compose": PROMPT_COMPOSE_EVENT.site,
  "agent.offer": AGENT_OFFER_EVENT.site,
  "agent.spawn": AGENT_SPAWN_SITE_RULES,
  "skill.prompt": SKILL_PROMPT_EVENT.site,
  "attribution.text": ATTRIBUTION_TEXT_EVENT.site,
  "session.start": SESSION_START_EVENT.site,
  "session.receive": SESSION_RECEIVE_EVENT.site,
  "session.append": SESSION_APPEND_EVENT.site,
  "session.send": SESSION_SEND_RULES,
  "session.compact": SESSION_COMPACT_RULES,
  "session.attach": SESSION_ATTACH_EVENT.site,
  "session.detach": SESSION_DETACH_EVENT.site,
  "session.measure": SESSION_MEASURE_EVENT.site,
  "session.end": SESSION_END_EVENT.site,
  "turn.start": TURN_START_EVENT.site,
  "turn.step": TURN_STEP_RULES,
  "turn.complete": TURN_COMPLETE_EVENT.site,
  "ui.scroll": UI_SCROLL_EVENT.site,
  "ui.focus": UI_FOCUS_EVENT.site,
});
//@ chunk-e6aww6q8.js:5050610-5050718 placement
/**
 * 把处理器插入到为引擎作答的处理器之前（没有则放在末尾）。
 */
function insertBeforeEngineAnswer(e, n) {
  let index = e.findIndex((s) => s.answersForEngine === true);
  return e.toSpliced(index === -1 ? e.length : index, 0, n);
}
//@ chunk-e6aww6q8.js:5050718-5051725 placement
/**
 * 提示文本：钩子链底没有核心处理器（调用点没有安装 core）。
 */
var NO_CORE_AT_CHAIN_BOTTOM = (e, n) => (r) => {
  let s = HOOKABLE_EVENTS.has(e) && !n.withoutModuleHandlers;
  let h = EVENT_PAYLOAD_SHAPES[e](r);
  let y = s
    ? waitForHooksRespawn(
        {
          event: e,
          e: h,
          origin: n.origin,
          only: n.only,
        },
        n.signal,
      )
    : undefined;
  if (y !== undefined) return y.then(() => NO_CORE_AT_CHAIN_BOTTOM(e, n)(r));
  let S = hasCurrentDispatch();
  let w = S ? undefined : (n.core?.[e] ?? DESCRIBE_EVENT_NAMES()[e]);
  if (w === undefined && !S)
    return Promise.reject(
      new HooksError(
        `$.${e}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
      ),
    );
  let L = FUNCTION_HOOK_EVENT_NAMES()[e];
  let G = n.withoutModuleHandlers
    ? []
    : hookMembersFor(e, n.origin, {
        only: n.only,
        among: n.among?.(),
        ...(L.pinnedKeys !== undefined && {
          pinned: {
            keys: L.pinnedKeys,
            e: h,
          },
        }),
      });
  let q = S ? undefined : n.managed?.[e];
  let Z = S ? n.withheldCore?.[e] : undefined;
  let Se = S ? n.withheldFloor?.[e]?.(h) : undefined;
  let ke = Z === undefined ? G : insertBeforeEngineAnswer(G, Z);
  let we = withChainEnds(q, ke, w);
  let Ee =
    q !== undefined &&
    G.length === 0 &&
    L.pinnedKeys !== undefined &&
    !n.withoutModuleHandlers &&
    modulesHookingEvent(e, n.origin, {
      only: n.only,
      among: n.among?.(),
    }).length > 0;
  let Ae = reportChainFailure({
    e: h,
    handlers: Ee ? [q, ...we] : we,
    site: L,
    signal: n.signal,
    cutAt: n.cutAt,
    origin: hookOriginFromStack(n.engineRaised ? undefined : n.origin),
    trace: n.trace,
    ...(Se !== undefined && {
      bottom: Se,
    }),
  });
  return DESCRIBE_EVENTS.has(e) ? Ae.then((Ie) => wellFormedLeaves(Ie)) : Ae;
};
//@ chunk-e6aww6q8.js:5051725-5051930 placement
function buildStreamChainArgs({ event, bottom, core, args }) {
  let h = streamMembersFor(event, bottom.origin, {
    only: bottom.only,
  });
  let y = core ? bottom.streamManaged?.[event] : undefined;
  return {
    e: EVENT_PAYLOAD_SHAPES[event](args),
    handlers: withChainEnds(y, h, core),
    site: FUNCTION_HOOK_EVENT_NAMES()[event],
    signal: bottom.signal,
    origin: hookOriginFromStack(bottom.origin),
  };
}
//@ chunk-e6aww6q8.js:5051930-5052200 placement
var createStreamEventCaller = (e, n) => (args) => {
  let s = hasCurrentDispatch();
  let h = s ? undefined : n.streamCore?.[e];
  return h === undefined && !s
    ? teeGeneratorResult(
        (async function* () {
          throw new HooksError(
            `$.${e}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
          );
        })(),
      )
    : reportStreamChainFailure(
        buildStreamChainArgs({
          event: e,
          bottom: n,
          core: h,
          args,
        }),
      );
};
//@ chunk-e6aww6q8.js:5052200-5053438 placement
/**
 * 函数钩子全部事件名及其分组（tool.*、command.*、config.*、prompt.*、session.*、turn.*、ui.* 等）。
 */
var FUNCTION_HOOK_EVENTS = (e, n) => ({
  tool: {
    call: NO_CORE_AT_CHAIN_BOTTOM("tool.call", e),
    check: NO_CORE_AT_CHAIN_BOTTOM("tool.check", e),
    describe: NO_CORE_AT_CHAIN_BOTTOM("tool.describe", e),
  },
  command: {
    run: NO_CORE_AT_CHAIN_BOTTOM("command.run", e),
    describe: NO_CORE_AT_CHAIN_BOTTOM("command.describe", e),
  },
  config: {
    set: NO_CORE_AT_CHAIN_BOTTOM("config.set", e),
    describe: NO_CORE_AT_CHAIN_BOTTOM("config.describe", e),
  },
  telemetry: {
    log: NO_CORE_AT_CHAIN_BOTTOM("telemetry.log", e),
    mark: NO_CORE_AT_CHAIN_BOTTOM("telemetry.mark", e),
  },
  prompt: {
    submit: NO_CORE_AT_CHAIN_BOTTOM("prompt.submit", e),
    fill: NO_CORE_AT_CHAIN_BOTTOM("prompt.fill", e),
    edit: NO_CORE_AT_CHAIN_BOTTOM("prompt.edit", e),
    change: NO_CORE_AT_CHAIN_BOTTOM("prompt.change", e),
    autocomplete: NO_CORE_AT_CHAIN_BOTTOM("prompt.autocomplete", e),
    suggest: NO_CORE_AT_CHAIN_BOTTOM("prompt.suggest", e),
    section: NO_CORE_AT_CHAIN_BOTTOM("prompt.section", e),
    context: NO_CORE_AT_CHAIN_BOTTOM("prompt.context", e),
    attachment: NO_CORE_AT_CHAIN_BOTTOM("prompt.attachment", e),
    mention: NO_CORE_AT_CHAIN_BOTTOM("prompt.mention", e),
    compose: NO_CORE_AT_CHAIN_BOTTOM("prompt.compose", e),
  },
  skill: {
    prompt: NO_CORE_AT_CHAIN_BOTTOM("skill.prompt", e),
  },
  attribution: {
    text: NO_CORE_AT_CHAIN_BOTTOM("attribution.text", e),
  },
  agent: {
    offer: NO_CORE_AT_CHAIN_BOTTOM("agent.offer", e),
    spawn: NO_CORE_AT_CHAIN_BOTTOM("agent.spawn", e),
  },
  session: {
    start: NO_CORE_AT_CHAIN_BOTTOM("session.start", e),
    receive: NO_CORE_AT_CHAIN_BOTTOM("session.receive", e),
    append: NO_CORE_AT_CHAIN_BOTTOM("session.append", e),
    send: NO_CORE_AT_CHAIN_BOTTOM("session.send", e),
    compact: NO_CORE_AT_CHAIN_BOTTOM("session.compact", e),
    attach: NO_CORE_AT_CHAIN_BOTTOM("session.attach", e),
    detach: NO_CORE_AT_CHAIN_BOTTOM("session.detach", e),
    measure: NO_CORE_AT_CHAIN_BOTTOM("session.measure", e),
    end: NO_CORE_AT_CHAIN_BOTTOM("session.end", e),
  },
  turn: {
    start: NO_CORE_AT_CHAIN_BOTTOM("turn.start", e),
    step: createStreamEventCaller("turn.step", e),
    complete: NO_CORE_AT_CHAIN_BOTTOM("turn.complete", e),
  },
  ui: {
    render: (r) => renderDraws.uiRender(r, n),
    scroll: NO_CORE_AT_CHAIN_BOTTOM("ui.scroll", e),
    focus: NO_CORE_AT_CHAIN_BOTTOM("ui.focus", e),
  },
});
//@ chunk-e6aww6q8.js:5053438-5053543 placement
/**
 * 用给定 signal/origin 生成全部函数钩子事件的调用器表。
 */
function createEventCallers(e = {}) {
  let n = {
    signal: e.signal ?? new AbortController().signal,
    origin: e.origin,
  };
  return FUNCTION_HOOK_EVENTS(e, n);
}
//@ chunk-e6aww6q8.js:5053543-5053563 placement
/**
 * 各事件调用器
 */
var eventCallersFor = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053563-5053575 placement
/**
 * createEventCallers 引用
 */
var createEventCallersRef = createEventCallers;
//@ chunk-e6aww6q8.js:5053575-5053595 placement
/**
 * 包装的调用器
 */
var eventCallersWrapper = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053595-5053615 placement
/**
 * 各事件调用器
 */
var eventCallersFor2 = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053615-5053635 placement
/**
 * 包装的调用器
 */
var eventCallersWrapper2 = (e) => createEventCallers(e);
export {
  TURN_STEP_RULES,
  eventCallersWrapper2,
  eventCallersFor,
  NO_CORE_AT_CHAIN_BOTTOM,
  eventCallersWrapper,
  insertBeforeEngineAnswer,
  createEventCallers,
  createEventCallersRef,
  eventCallersFor2,
};
