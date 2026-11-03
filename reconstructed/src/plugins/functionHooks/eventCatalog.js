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
import { AGENT_OFFER_EVENT, Tso } from "./agentHooks.js";
import { Cle } from "./attributionHooks.js";
import { Ale, B1, qle, PROMPT_CONTEXT_EVENT, Ple, LX, $le, Lle, Ole } from "./coreHandlers.js";
import { TELEMETRY_LOG_EVENT, Sde } from "./telemetryHooks.js";
import { zle } from "./promptFillHooks.js";
import { Vle } from "./promptSuggestHooks.js";
import { gde } from "./skillPromptHooks.js";
import { TOOL_DESCRIBE_EVENT } from "./toolDescribeHooks.js";
import { ade, sde, SESSION_APPEND_EVENT, r_t, s_t, Xle, Yle, v_t, T_t } from "./sessionHooks.js";
import { Ede, xde } from "./uiHooks.js";
import { bUe, UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { isHookEvent } from "./hookApiSurface.js";
import { gYr } from "../../services/tools/toolExecution.js";
import { VFo } from "./toolCheckHooks.js";
import { VPs } from "./commandRunDispatch.js";
import { EFr } from "./configApi.js";
import { uTo } from "./promptSubmit.js";
import { u6o } from "./sessionCompactHook.js";
import { EVENT_PAYLOAD_SHAPES } from "./eventPayloads.js";
import {
  waitForHooksRespawn,
  hookMembersFor,
  modulesHookingEvent,
  hookOriginFromStack,
  streamMembersFor,
} from "./hookDispatch.js";
import { jme, reportChainFailure } from "./dispatch/chain.js";
import { HooksError } from "./hooksErrors.js";
import { withChainEnds } from "./classicHookBridge.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import { teeGeneratorResult, reportStreamChainFailure } from "./dispatch/streamChain.js";
import { renderDraws } from "./ui/renderDispatch.js";

//@ chunk-e6aww6q8.js:82804-83527 placement
var DESCRIBE_EVENT_NAMES = () => ({
  "agent.offer": AGENT_OFFER_EVENT.core,
  "attribution.text": Cle.core,
  "command.describe": Ale.core,
  "config.describe": B1.core,
  "telemetry.log": TELEMETRY_LOG_EVENT.core,
  "telemetry.mark": Sde.core,
  "prompt.section": qle.core,
  "prompt.context": PROMPT_CONTEXT_EVENT.core,
  "prompt.attachment": Ple.core,
  "prompt.compose": LX.core,
  "prompt.fill": zle.core,
  "prompt.edit": $le.core,
  "prompt.change": Lle.core,
  "prompt.autocomplete": Ole.core,
  "prompt.suggest": Vle.core,
  "skill.prompt": gde.core,
  "tool.describe": TOOL_DESCRIBE_EVENT.core,
  "session.start": ade.core,
  "session.receive": sde.core,
  "session.append": SESSION_APPEND_EVENT.core,
  "session.attach": r_t.core,
  "session.detach": s_t.core,
  "session.measure": Xle.core,
  "session.end": Yle.core,
  "turn.start": v_t.core,
  "turn.complete": T_t.core,
  "ui.scroll": Ede.core,
  "ui.focus": xde.core,
});
//@ chunk-e6aww6q8.js:83527-83613 placement
var I_t = new Set(["config.describe", "command.describe", "tool.describe", "agent.offer"]);
//@ chunk-e6aww6q8.js:83613-83706 placement
var D_t = new Set(["plugin.register", "telemetry.log", "telemetry.mark", "ui.scroll", "ui.focus"]);
//@ chunk-e6aww6q8.js:83706-83794 placement
var L_t = new Set(
  Object.keys(bUe)
    .filter(isHookEvent)
    .filter((e) => !D_t.has(e) && bUe[e] !== void 0),
);
//@ chunk-e6aww6q8.js:5049623-5049652 placement
var d5n = UI_ENV_SITE_RULES["prompt.mention"];
//@ chunk-e6aww6q8.js:5049652-5049679 placement
var u5n = UI_ENV_SITE_RULES["session.send"];
//@ chunk-e6aww6q8.js:5049679-5049703 placement
var G1r = UI_ENV_SITE_RULES["turn.step"];
//@ chunk-e6aww6q8.js:5049703-5050610 placement
var FUNCTION_HOOK_EVENT_NAMES = () => ({
  "tool.call": gYr,
  "tool.check": VFo,
  "tool.describe": TOOL_DESCRIBE_EVENT.site,
  "command.run": VPs,
  "command.describe": Ale.site,
  "config.set": EFr,
  "config.describe": B1.site,
  "telemetry.log": TELEMETRY_LOG_EVENT.site,
  "telemetry.mark": Sde.site,
  "prompt.submit": uTo,
  "prompt.fill": zle.site,
  "prompt.edit": $le.site,
  "prompt.change": Lle.site,
  "prompt.autocomplete": Ole.site,
  "prompt.suggest": Vle.site,
  "prompt.section": qle.site,
  "prompt.context": PROMPT_CONTEXT_EVENT.site,
  "prompt.attachment": Ple.site,
  "prompt.mention": d5n,
  "prompt.compose": LX.site,
  "agent.offer": AGENT_OFFER_EVENT.site,
  "agent.spawn": Tso,
  "skill.prompt": gde.site,
  "attribution.text": Cle.site,
  "session.start": ade.site,
  "session.receive": sde.site,
  "session.append": SESSION_APPEND_EVENT.site,
  "session.send": u5n,
  "session.compact": u6o,
  "session.attach": r_t.site,
  "session.detach": s_t.site,
  "session.measure": Xle.site,
  "session.end": Yle.site,
  "turn.start": v_t.site,
  "turn.step": G1r,
  "turn.complete": T_t.site,
  "ui.scroll": Ede.site,
  "ui.focus": xde.site,
});
/**
 * 把处理器插入到为引擎作答的处理器之前（没有则放在末尾）。
 */
//@ chunk-e6aww6q8.js:5050610-5050718 placement
function insertBeforeEngineAnswer(e, n) {
  let index = e.findIndex((s) => s.answersForEngine === !0);
  return e.toSpliced(index === -1 ? e.length : index, 0, n);
}
/**
 * 提示文本：钩子链底没有核心处理器（调用点没有安装 core）。
 */
//@ chunk-e6aww6q8.js:5050718-5051725 placement
var NO_CORE_AT_CHAIN_BOTTOM = (e, n) => (r) => {
  let s = L_t.has(e) && !n.withoutModuleHandlers,
    h = EVENT_PAYLOAD_SHAPES[e](r),
    y = s ? waitForHooksRespawn({ event: e, e: h, origin: n.origin, only: n.only }, n.signal) : void 0;
  if (y !== void 0) return y.then(() => NO_CORE_AT_CHAIN_BOTTOM(e, n)(r));
  let S = jme(),
    w = S ? void 0 : (n.core?.[e] ?? DESCRIBE_EVENT_NAMES()[e]);
  if (w === void 0 && !S)
    return Promise.reject(
      new HooksError(
        `$.${e}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
      ),
    );
  let L = FUNCTION_HOOK_EVENT_NAMES()[e],
    G = n.withoutModuleHandlers
      ? []
      : hookMembersFor(e, n.origin, {
          only: n.only,
          among: n.among?.(),
          ...(L.pinnedKeys !== void 0 && { pinned: { keys: L.pinnedKeys, e: h } }),
        }),
    q = S ? void 0 : n.managed?.[e],
    Z = S ? n.withheldCore?.[e] : void 0,
    Se = S ? n.withheldFloor?.[e]?.(h) : void 0,
    ke = Z === void 0 ? G : insertBeforeEngineAnswer(G, Z),
    we = withChainEnds(q, ke, w),
    Ee =
      q !== void 0 &&
      G.length === 0 &&
      L.pinnedKeys !== void 0 &&
      !n.withoutModuleHandlers &&
      modulesHookingEvent(e, n.origin, { only: n.only, among: n.among?.() }).length > 0,
    Ae = reportChainFailure({
      e: h,
      handlers: Ee ? [q, ...we] : we,
      site: L,
      signal: n.signal,
      cutAt: n.cutAt,
      origin: hookOriginFromStack(n.engineRaised ? void 0 : n.origin),
      trace: n.trace,
      ...(Se !== void 0 && { bottom: Se }),
    });
  return I_t.has(e) ? Ae.then((Ie) => wellFormedLeaves(Ie)) : Ae;
};
//@ chunk-e6aww6q8.js:5051725-5051930 placement
function buildStreamChainArgs({ event: event, bottom: bottom, core: core, args: args }) {
  let h = streamMembersFor(event, bottom.origin, { only: bottom.only }),
    y = core ? bottom.streamManaged?.[event] : void 0;
  return {
    e: EVENT_PAYLOAD_SHAPES[event](args),
    handlers: withChainEnds(y, h, core),
    site: FUNCTION_HOOK_EVENT_NAMES()[event],
    signal: bottom.signal,
    origin: hookOriginFromStack(bottom.origin),
  };
}
//@ chunk-e6aww6q8.js:5051930-5052200 placement
var createStreamEventCaller = (e, n) => (r) => {
  let s = jme(),
    h = s ? void 0 : n.streamCore?.[e];
  return h === void 0 && !s
    ? teeGeneratorResult(
        (async function* () {
          throw new HooksError(
            `$.${e}: no core at the bottom of the chain (the site did not install one and the call supplied none)`,
          );
        })(),
      )
    : reportStreamChainFailure(buildStreamChainArgs({ event: e, bottom: n, core: h, args: r }));
};
/**
 * 函数钩子全部事件名及其分组（tool.*、command.*、config.*、prompt.*、session.*、turn.*、ui.* 等）。
 */
//@ chunk-e6aww6q8.js:5052200-5053438 placement
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
  skill: { prompt: NO_CORE_AT_CHAIN_BOTTOM("skill.prompt", e) },
  attribution: { text: NO_CORE_AT_CHAIN_BOTTOM("attribution.text", e) },
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
/**
 * 用给定 signal/origin 生成全部函数钩子事件的调用器表。
 */
//@ chunk-e6aww6q8.js:5053438-5053543 placement
function createEventCallers(e = {}) {
  let n = { signal: e.signal ?? new AbortController().signal, origin: e.origin };
  return FUNCTION_HOOK_EVENTS(e, n);
}
//@ chunk-e6aww6q8.js:5053543-5053563 placement
var K1r = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053563-5053575 placement
var ASt = createEventCallers;
//@ chunk-e6aww6q8.js:5053575-5053595 placement
var Xue = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053595-5053615 placement
var W$n = (e) => createEventCallers(e);
//@ chunk-e6aww6q8.js:5053615-5053635 placement
var Jue = (e) => createEventCallers(e);

export {
  G1r,
  Jue,
  K1r,
  NO_CORE_AT_CHAIN_BOTTOM,
  Xue,
  insertBeforeEngineAnswer,
  createEventCallers,
  ASt,
  W$n,
};
