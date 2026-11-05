/**
 * plugins/functionHooks/eventCatalog.ts
 *
 * 2.1.316 新增：函数钩子事件名清单（tool.call、prompt.*、session.*、ui.* 等）与链底缺失提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:85354-86077 placement
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
//@ chunk-5xgkngpb.js:86077-86163 placement
/**
 * 描述类事件
 */
var DESCRIBE_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:86077", () => {
  DESCRIBE_EVENTS = new Set(["config.describe", "command.describe", "tool.describe", "agent.offer"]);
});
//@ chunk-5xgkngpb.js:86163-86256 placement
/**
 * 不走钩子的事件
 */
var NON_HOOKABLE_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:86163", () => {
  NON_HOOKABLE_EVENTS = new Set([
    "plugin.register",
    "telemetry.log",
    "telemetry.mark",
    "ui.scroll",
    "ui.focus",
  ]);
});
//@ chunk-5xgkngpb.js:86256-86344 placement
/**
 * 可由模块监听的事件
 */
var HOOKABLE_EVENTS; // deferred: uses TOOL_SITE_BY_EVENT (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:86256", () => {
  HOOKABLE_EVENTS = new Set(
    Object.keys(TOOL_SITE_BY_EVENT)
      .filter(isHookEvent)
      .filter((key) => !NON_HOOKABLE_EVENTS.has(key) && TOOL_SITE_BY_EVENT[key] !== undefined),
  );
});
//@ chunk-5xgkngpb.js:5204767-5204796 placement
/**
 * prompt.mention 站点规则
 */
var PROMPT_MENTION_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5204767", () => {
  PROMPT_MENTION_RULES = UI_ENV_SITE_RULES["prompt.mention"];
});
//@ chunk-5xgkngpb.js:5204796-5204823 placement
/**
 * session.send 站点规则
 */
var SESSION_SEND_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5204796", () => {
  SESSION_SEND_RULES = UI_ENV_SITE_RULES["session.send"];
});
//@ chunk-5xgkngpb.js:5204823-5204847 placement
/**
 * turn.step 站点规则
 */
var TURN_STEP_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5204823", () => {
  TURN_STEP_RULES = UI_ENV_SITE_RULES["turn.step"];
});
//@ chunk-5xgkngpb.js:5204847-5205754 placement
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
//@ chunk-5xgkngpb.js:5205754-5205862 placement
/**
 * 把处理器插入到为引擎作答的处理器之前（没有则放在末尾）。
 */
function insertBeforeEngineAnswer(handlers, handler) {
  let index = handlers.findIndex((handler) => handler.answersForEngine === true);
  return handlers.toSpliced(index === -1 ? handlers.length : index, 0, handler);
}
//@ chunk-5xgkngpb.js:5205862-5206872 placement
/**
 * 提示文本：钩子链底没有核心处理器（调用点没有安装 core）。
 */
var NO_CORE_AT_CHAIN_BOTTOM = (event, options) => (args) => {
  let needsRespawnWait = HOOKABLE_EVENTS.has(event) && !options.withoutModuleHandlers;
  let e = EVENT_PAYLOAD_SHAPES[event](args);
  let respawn = needsRespawnWait
    ? waitForHooksRespawn(
        {
          event,
          e,
          origin: options.origin,
          only: options.only,
        },
        options.signal,
      )
    : undefined;
  if (respawn !== undefined) return respawn.then(() => NO_CORE_AT_CHAIN_BOTTOM(event, options)(args));
  let isDispatching = hasCurrentDispatch();
  let core = isDispatching ? undefined : (options.core?.[event] ?? DESCRIBE_EVENT_NAMES()[event]);
  if (core === undefined && !isDispatching)
    return Promise.reject(
      new HooksError(
        `$.${event}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
      ),
    );
  let site = FUNCTION_HOOK_EVENT_NAMES()[event];
  let members = options.withoutModuleHandlers
    ? []
    : hookMembersFor(event, options.origin, {
        only: options.only,
        among: options.among?.(),
        ...(site.pinnedKeys !== undefined && {
          pinned: {
            keys: site.pinnedKeys,
            e,
          },
        }),
      });
  let managed = isDispatching ? undefined : options.managed?.[event];
  let withheldCore = isDispatching ? options.withheldCore?.[event] : undefined;
  let withheldFloor = isDispatching ? options.withheldFloor?.[event]?.(e) : undefined;
  let withCore = withheldCore === undefined ? members : insertBeforeEngineAnswer(members, withheldCore);
  let handlers = withChainEnds(managed, withCore, core);
  let hasPinnedModules =
    managed !== undefined &&
    members.length === 0 &&
    site.pinnedKeys !== undefined &&
    !options.withoutModuleHandlers &&
    modulesHookingEvent(event, options.origin, {
      only: options.only,
      among: options.among?.(),
    }).length > 0;
  let runPromise = reportChainFailure({
    e,
    handlers: hasPinnedModules ? [managed, ...handlers] : handlers,
    site,
    signal: options.signal,
    cutAt: options.cutAt,
    origin: hookOriginFromStack(options.engineRaised ? undefined : options.origin),
    trace: options.trace,
    ...(withheldFloor !== undefined && {
      bottom: withheldFloor,
    }),
  });
  return DESCRIBE_EVENTS.has(event) ? runPromise.then((value) => wellFormedLeaves(value)) : runPromise;
};
//@ chunk-5xgkngpb.js:5206872-5207050 placement
function buildStreamChainArgs({ event, bottom, core, args }) {
  let members = streamMembersFor(event, bottom.origin, {
    only: bottom.only,
  });
  return {
    e: EVENT_PAYLOAD_SHAPES[event](args),
    handlers: withChainEnds(undefined, members, core),
    site: FUNCTION_HOOK_EVENT_NAMES()[event],
    signal: bottom.signal,
    origin: hookOriginFromStack(bottom.origin),
  };
}
//@ chunk-5xgkngpb.js:5207050-5207320 placement
var createStreamEventCaller = (event, options) => (args) => {
  let isDispatching = hasCurrentDispatch();
  let core = isDispatching ? undefined : options.streamCore?.[event];
  return core === undefined && !isDispatching
    ? teeGeneratorResult(
        (async function* () {
          throw new HooksError(
            `$.${event}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
          );
        })(),
      )
    : reportStreamChainFailure(
        buildStreamChainArgs({
          event,
          bottom: options,
          core,
          args,
        }),
      );
};
//@ chunk-5xgkngpb.js:5207320-5208558 placement
/**
 * 函数钩子全部事件名及其分组（tool.*、command.*、config.*、prompt.*、session.*、turn.*、ui.* 等）。
 */
var FUNCTION_HOOK_EVENTS = (options, chainOptions) => ({
  tool: {
    call: NO_CORE_AT_CHAIN_BOTTOM("tool.call", options),
    check: NO_CORE_AT_CHAIN_BOTTOM("tool.check", options),
    describe: NO_CORE_AT_CHAIN_BOTTOM("tool.describe", options),
  },
  command: {
    run: NO_CORE_AT_CHAIN_BOTTOM("command.run", options),
    describe: NO_CORE_AT_CHAIN_BOTTOM("command.describe", options),
  },
  config: {
    set: NO_CORE_AT_CHAIN_BOTTOM("config.set", options),
    describe: NO_CORE_AT_CHAIN_BOTTOM("config.describe", options),
  },
  telemetry: {
    log: NO_CORE_AT_CHAIN_BOTTOM("telemetry.log", options),
    mark: NO_CORE_AT_CHAIN_BOTTOM("telemetry.mark", options),
  },
  prompt: {
    submit: NO_CORE_AT_CHAIN_BOTTOM("prompt.submit", options),
    fill: NO_CORE_AT_CHAIN_BOTTOM("prompt.fill", options),
    edit: NO_CORE_AT_CHAIN_BOTTOM("prompt.edit", options),
    change: NO_CORE_AT_CHAIN_BOTTOM("prompt.change", options),
    autocomplete: NO_CORE_AT_CHAIN_BOTTOM("prompt.autocomplete", options),
    suggest: NO_CORE_AT_CHAIN_BOTTOM("prompt.suggest", options),
    section: NO_CORE_AT_CHAIN_BOTTOM("prompt.section", options),
    context: NO_CORE_AT_CHAIN_BOTTOM("prompt.context", options),
    attachment: NO_CORE_AT_CHAIN_BOTTOM("prompt.attachment", options),
    mention: NO_CORE_AT_CHAIN_BOTTOM("prompt.mention", options),
    compose: NO_CORE_AT_CHAIN_BOTTOM("prompt.compose", options),
  },
  skill: {
    prompt: NO_CORE_AT_CHAIN_BOTTOM("skill.prompt", options),
  },
  attribution: {
    text: NO_CORE_AT_CHAIN_BOTTOM("attribution.text", options),
  },
  agent: {
    offer: NO_CORE_AT_CHAIN_BOTTOM("agent.offer", options),
    spawn: NO_CORE_AT_CHAIN_BOTTOM("agent.spawn", options),
  },
  session: {
    start: NO_CORE_AT_CHAIN_BOTTOM("session.start", options),
    receive: NO_CORE_AT_CHAIN_BOTTOM("session.receive", options),
    append: NO_CORE_AT_CHAIN_BOTTOM("session.append", options),
    send: NO_CORE_AT_CHAIN_BOTTOM("session.send", options),
    compact: NO_CORE_AT_CHAIN_BOTTOM("session.compact", options),
    attach: NO_CORE_AT_CHAIN_BOTTOM("session.attach", options),
    detach: NO_CORE_AT_CHAIN_BOTTOM("session.detach", options),
    measure: NO_CORE_AT_CHAIN_BOTTOM("session.measure", options),
    end: NO_CORE_AT_CHAIN_BOTTOM("session.end", options),
  },
  turn: {
    start: NO_CORE_AT_CHAIN_BOTTOM("turn.start", options),
    step: createStreamEventCaller("turn.step", options),
    complete: NO_CORE_AT_CHAIN_BOTTOM("turn.complete", options),
  },
  ui: {
    render: (tool) => renderDraws.uiRender(tool, chainOptions),
    scroll: NO_CORE_AT_CHAIN_BOTTOM("ui.scroll", options),
    focus: NO_CORE_AT_CHAIN_BOTTOM("ui.focus", options),
  },
});
//@ chunk-5xgkngpb.js:5208558-5208663 placement
/**
 * 用给定 signal/origin 生成全部函数钩子事件的调用器表。
 */
function createEventCallers(options = {}) {
  let chainOptions = {
    signal: options.signal ?? new AbortController().signal,
    origin: options.origin,
  };
  return FUNCTION_HOOK_EVENTS(options, chainOptions);
}
//@ chunk-5xgkngpb.js:5208663-5208683 placement
/**
 * 各事件调用器
 */
var eventCallersFor = (options) => createEventCallers(options);
//@ chunk-5xgkngpb.js:5208683-5208695 placement
/**
 * createEventCallers 引用
 */
var createEventCallersRef = createEventCallers;
//@ chunk-5xgkngpb.js:5208695-5208715 placement
/**
 * 包装的调用器
 */
var eventCallersWrapper = (options) => createEventCallers(options);
//@ chunk-5xgkngpb.js:5208715-5208735 placement
/**
 * 各事件调用器
 */
var eventCallersFor2 = (options) => createEventCallers(options);
//@ chunk-5xgkngpb.js:5208735-5208755 placement
/**
 * 包装的调用器
 */
var eventCallersWrapper2 = (options) => createEventCallers(options);
export {
  NO_CORE_AT_CHAIN_BOTTOM,
  createEventCallersRef,
  eventCallersFor2,
  eventCallersWrapper2,
  insertBeforeEngineAnswer,
  createEventCallers,
  TURN_STEP_RULES,
  eventCallersFor,
  eventCallersWrapper,
};
