/**
 * plugins/functionHooks/dispatch/inputJudging.ts
 *
 * 钩子输入判定与 ui.* 输入种类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (4)
 * attribution: placement 4
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

//@ chunk-s61vbvea.js:599735-599772 placement
/**
 * 界面/登记类输入集合
 */
var REGISTRATION_INPUTS = new Set(["session.identity"]);
//@ chunk-s61vbvea.js:599772-599949 placement
/**
 * 被视为"界面/登记类输入"的 $ 调用集合（ui.open/toast/notify/status/log/notice/ask、tool/command/agent.register、prompt.fill/suggest）。
 */
var UI_INPUT_EVENTS = new Set([
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
//@ chunk-s61vbvea.js:599949-600003 placement
/**
 * raise/among/drawn 结果
 */
var judgingResult = (e, drawn) => ({
  raise: e.raise,
  among: e.among,
  drawn,
});
//@ chunk-s61vbvea.js:600003-601196 placement
/**
 * （归属疑误：插件函数 hooks）派发插件函数 hook 事件：按来源筛选 hook、校验输入为对象、依次运行并合并结果。
 */
async function judgeHookInput({ event, args, caller, bottom, raise, among }) {
  if (bottom !== undefined && isLoneSecDefaultShortcut(event, caller.origin, among))
    return runInScope(caller.scopeHolder?.scope, () => bottom.run(args, caller));
  let S = new Map();
  let w = hookMembersFor(
    event,
    caller.origin,
    judgingResult(
      {
        raise,
        among,
      },
      (ee, ae) => {
        S.set(ee, ae);
      },
    ),
  );
  let x = REGISTRATION_INPUTS.has(event) ? w.filter((ee) => handlerTier(ee) !== "user") : w;
  let scope = caller.scopeHolder?.scope;
  if (x.length === 0 && bottom) return runInScope(scope, () => bottom.run(args, caller));
  let j = awaitHooksRespawn(
    {
      event,
      e: args,
      origin: caller.origin,
    },
    caller.signal,
  );
  if (j !== undefined) {
    await j;
    return judgeHookInput({
      event,
      args,
      caller,
      bottom,
      raise,
    });
  }
  let G = isPluginDefinedEvent(event) && !isPlainObject(args);
  let L = UI_INPUT_EVENTS.has(event);
  if (G)
    throw new HooksError(
      `${caller.plugin}: $.${event}: its input is no object, which the hooks on it (${x.map((ee) => ee.name).join(", ")}) take as e; pass one`,
    );
  let q = {
    sent: args,
    hooked: () =>
      x.map((ee) => {
        let ae = S.get(ee);
        if (ae === undefined)
          logForDebugging(
            `${caller.plugin}: $.${event}: no module is on record for the hook of ${ee.name}; what it passed down is judged a person's`,
            {
              level: "warn",
            },
          );
        return ae;
      }),
  };
  let Z = await runInScope(scope, () =>
    reportChainFailure({
      e: args,
      handlers: x,
      site: envSiteRuleFor(event, raise),
      signal: caller.signal,
      origin: hookOriginFromStack(caller.origin),
      bottom:
        bottom &&
        (async (ee) => {
          let ae = L ? wellFormedLeaves(ee) : ee;
          let se = bottom.check?.(ae, caller);
          if (se !== undefined) throw new HooksError(`${event}: ${se} (host check)`);
          return {
            value: await bottom.run(ae, caller, q),
          };
        }),
    }),
  );
  if (Z.deny !== undefined) throw new HooksError(`${caller.plugin}: $.${event}: ${Z.deny}`);
  return Z.value;
}
export { judgeHookInput, UI_INPUT_EVENTS };
