/**
 * plugins/functionHooks/dispatch/inputJudging.ts
 *
 * 钩子输入判定与 ui.* 输入种类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLoneSecDefaultShortcut } from "../modAdmission.js";
import { runInScope } from "./dispatchScope.js";
import { hookMembersFor, awaitHooksRespawn, hookOriginFromStack } from "../hookDispatch.js";
import { handlerTier, reportChainFailure } from "./chain.js";
import { isPluginDefinedEvent } from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksError } from "../hooksErrors.js";
import { logForDebugging } from "../../../utils/debug.js";
import { envSiteRuleFor } from "../sites/siteRules.js";
import { wellFormedLeaves } from "../ui/validateTree.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:517134-517171 placement
/**
 * 界面/登记类输入集合
 */
var REGISTRATION_INPUTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:517134", () => {
  REGISTRATION_INPUTS = new Set(["session.identity"]);
});
//@ chunk-7jxyna5q.js:517171-517348 placement
/**
 * 被视为"界面/登记类输入"的 $ 调用集合（ui.open/toast/notify/status/log/notice/ask、tool/command/agent.register、prompt.fill/suggest）。
 */
var UI_INPUT_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:517171", () => {
  UI_INPUT_EVENTS = new Set([
    "ui.open",
    "ui.toast",
    "ui.notify",
    "ui.status",
    "ui.log",
    "ui.notice",
    "ui.ask",
    "tool.register",
    "command.register",
    "agent.register",
    "prompt.fill",
    "prompt.suggest",
  ]);
});
//@ chunk-7jxyna5q.js:517348-517402 placement
/**
 * raise/among/drawn 结果
 */
var judgingResult = (judgement, drawn) => ({
  raise: judgement.raise,
  among: judgement.among,
  drawn,
});
//@ chunk-7jxyna5q.js:517402-518599 placement
/**
 * （归属疑误：插件函数 hooks）派发插件函数 hook 事件：按来源筛选 hook、校验输入为对象、依次运行并合并结果。
 */
async function judgeHookInput({ event, args, caller, bottom, raise, among }) {
  if (bottom !== undefined && isLoneSecDefaultShortcut(event, caller.origin, among))
    return runInScope(caller.scopeHolder?.scope, () => bottom.run(args, caller));
  let passedBy = new Map();
  let members = hookMembersFor(
    event,
    caller.origin,
    judgingResult(
      {
        raise,
        among,
      },
      (plugin, passed) => {
        passedBy.set(plugin, passed);
      },
    ),
  );
  let handlers = REGISTRATION_INPUTS.has(event)
    ? members.filter((handler) => handlerTier(handler) !== "user")
    : members;
  let scope = caller.scopeHolder?.scope;
  if (handlers.length === 0 && bottom) return runInScope(scope, () => bottom.run(args, caller));
  let respawn = awaitHooksRespawn(
    {
      event,
      e: args,
      origin: caller.origin,
    },
    caller.signal,
  );
  if (respawn !== undefined) {
    await respawn;
    return judgeHookInput({
      event,
      args,
      caller,
      bottom,
      raise,
    });
  }
  let isInputObject = isPluginDefinedEvent(event) && !isPlainObject(args);
  let isUiInput = UI_INPUT_EVENTS.has(event);
  if (isInputObject)
    throw new HooksError(
      `${caller.plugin}: $.${event}: its input is no object, which the hooks on it (${handlers.map((handler) => handler.name).join(", ")}) take as e; pass one`,
    );
  let descent = {
    sent: args,
    hooked: () =>
      handlers.map((handler) => {
        let passed = passedBy.get(handler);
        if (passed === undefined)
          logForDebugging(
            `${caller.plugin}: $.${event}: no module is on record for the hook of ${handler.name}; what it passed down is judged a person's`,
            {
              level: "warn",
            },
          );
        return passed;
      }),
  };
  let judged = await runInScope(scope, () =>
    reportChainFailure({
      e: args,
      handlers,
      site: envSiteRuleFor(event, raise),
      signal: caller.signal,
      origin: hookOriginFromStack(caller.origin),
      bottom:
        bottom &&
        (async (leaves) => {
          let normalized = isUiInput ? wellFormedLeaves(leaves) : leaves;
          let problem = bottom.check?.(normalized, caller);
          if (problem !== undefined) throw new HooksError(`${event}: ${problem} (host check)`);
          return {
            value: await bottom.run(normalized, caller, descent),
          };
        }),
    }),
  );
  if (judged.deny !== undefined) throw new HooksError(`${caller.plugin}: $.${event}: ${judged.deny}`);
  return judged.value;
}
export { judgeHookInput, UI_INPUT_EVENTS };
