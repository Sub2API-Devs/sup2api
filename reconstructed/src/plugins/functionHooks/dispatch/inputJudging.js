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
import { Ayn } from "./dispatchScope.js";
import { hookMembersFor, awaitHooksRespawn, hookOriginFromStack } from "../hookDispatch.js";
import { handlerTier, reportChainFailure } from "./chain.js";
import { isPluginDefinedEvent } from "../hookApiSurface.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksError } from "../hooksErrors.js";
import { logForDebugging } from "../../../utils/debug.js";
import { Nae } from "../sites/siteRules.js";
import { wellFormedLeaves } from "../ui/validateTree.js";

//@ chunk-s61vbvea.js:599735-599772 placement
var EE = new Set(["session.identity"]);
/**
 * 被视为"界面/登记类输入"的 $ 调用集合（ui.open/toast/notify/status/log/notice/ask、tool/command/agent.register、prompt.fill/suggest）。
 */
//@ chunk-s61vbvea.js:599772-599949 placement
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
var RE = (e, n) => ({ raise: e.raise, among: e.among, drawn: n });
/**
 * （归属疑误：插件函数 hooks）派发插件函数 hook 事件：按来源筛选 hook、校验输入为对象、依次运行并合并结果。
 */
//@ chunk-s61vbvea.js:600003-601196 placement
async function judgeHookInput({
  event: event,
  args: args,
  caller: caller,
  bottom: bottom,
  raise: raise,
  among: among,
}) {
  if (bottom !== void 0 && isLoneSecDefaultShortcut(event, caller.origin, among))
    return Ayn(caller.scopeHolder?.scope, () => bottom.run(args, caller));
  let S = new Map(),
    w = hookMembersFor(
      event,
      caller.origin,
      RE({ raise: raise, among: among }, (ee, ae) => {
        S.set(ee, ae);
      }),
    ),
    x = EE.has(event) ? w.filter((ee) => handlerTier(ee) !== "user") : w,
    P = caller.scopeHolder?.scope;
  if (x.length === 0 && bottom) return Ayn(P, () => bottom.run(args, caller));
  let j = awaitHooksRespawn({ event: event, e: args, origin: caller.origin }, caller.signal);
  if (j !== void 0)
    return (
      await j,
      judgeHookInput({ event: event, args: args, caller: caller, bottom: bottom, raise: raise })
    );
  let G = isPluginDefinedEvent(event) && !isPlainObject(args),
    L = UI_INPUT_EVENTS.has(event);
  if (G)
    throw new HooksError(
      `${caller.plugin}: $.${event}: its input is no object, which the hooks on it (${x.map((ee) => ee.name).join(", ")}) take as e; pass one`,
    );
  let q = {
      sent: args,
      hooked: () =>
        x.map((ee) => {
          let ae = S.get(ee);
          if (ae === void 0)
            logForDebugging(
              `${caller.plugin}: $.${event}: no module is on record for the hook of ${ee.name}; what it passed down is judged a person's`,
              { level: "warn" },
            );
          return ae;
        }),
    },
    Z = await Ayn(P, () =>
      reportChainFailure({
        e: args,
        handlers: x,
        site: Nae(event, raise),
        signal: caller.signal,
        origin: hookOriginFromStack(caller.origin),
        bottom:
          bottom &&
          (async (ee) => {
            let ae = L ? wellFormedLeaves(ee) : ee,
              se = bottom.check?.(ae, caller);
            if (se !== void 0) throw new HooksError(`${event}: ${se} (host check)`);
            return { value: await bottom.run(ae, caller, q) };
          }),
      }),
    );
  if (Z.deny !== void 0) throw new HooksError(`${caller.plugin}: $.${event}: ${Z.deny}`);
  return Z.value;
}

export { judgeHookInput, UI_INPUT_EVENTS };
