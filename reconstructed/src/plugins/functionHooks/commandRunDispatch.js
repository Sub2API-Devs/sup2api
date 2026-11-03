/**
 * plugins/functionHooks/commandRunDispatch.ts
 *
 * 2.1.316 新增：斜杠命令经 command.run 钩子链分发执行，并处理中断、出队等结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { o5n, areBuiltinModulesLoaded, mgt } from "../../utils/messages/toolDeltas.js";
import { releaseServerHold } from "./pluginLifecycle.js";
import { rbe, Nde } from "./commandHooks.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { toError } from "../../utils/errors.js";
import { CW } from "../../utils/messages/nonUserMessages.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { getCommandName as getCommandName_2 } from "../../commands.js";
import { viewportInfo } from "./surfaceBinding.js";
import { unwrapAbortReason, isSilentAbortReason } from "../../utils/abortController.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { HooksError } from "./hooksErrors.js";
import { onProcessRootHost, getRootSession } from "../../bootstrap/state.js";
import { bVe, lhn } from "../../utils/messageQueueManager.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { createSignal, createLazySignal } from "../../utils/signal.js";

/**
 * 斜杠命令经 command.run 钩子链执行：钩子可改写或代答，链底运行真正的命令，并记录被丢弃的答复。
 */
//@ chunk-e6aww6q8.js:5045155-5046561 placement
async function dispatchCommandRunHooks({
  input: input,
  engine: engine,
  queued: queued,
  ahead: ahead,
  signal: signal,
}) {
  let { core: core, runs: runs } = o5n(engine),
    w = ahead?.join(input, core, signal);
  if (w === void 0) await releaseServerHold(rbe.ownerOf(input.command));
  let L =
    w === void 0
      ? pluginsMatchingEvent("command.run", { command: input.command }, queued?.origin)
      : await w.hooking;
  if (!(w !== void 0 || queued?.origin !== void 0 || L.length > 0)) {
    let run = await engine.run(input.args);
    return (queued?.settle(Nde(engine.textOf(run), engine.contextOf(run))), { kind: "engine", ran: run });
  }
  let q = areBuiltinModulesLoaded(L),
    Z;
  try {
    Z = await (w?.answer ??
      NO_CORE_AT_CHAIN_BOTTOM("command.run", {
        core: { "command.run": core },
        origin: queued?.origin,
        signal: signal,
      })(input));
  } catch (error) {
    throw (queued?.fail(toError(error)), error);
  }
  let Se = Z.text !== void 0 && !q,
    ke = Se ? L.map(CW).join("+") : void 0,
    we = Se ? `${ke}: ${Z.text}` : Z.text,
    of = runs.of(Z.ref),
    Ae = of ?? runs.last(),
    { exitCode: exitCode } = Z;
  if (!Ae)
    return (
      queued?.settle(Nde(Z.text, Z.context, exitCode)),
      mgt({ kind: "answered", text: we, plugin: ke, context: Z.context }, exitCode)
    );
  let Me = we === void 0 || (of !== void 0 && of.made.text === Z.text),
    We = Z.context === void 0 || Rs(Z.context) === Rs(Ae.made.context ?? []),
    ze = { text: Me ? void 0 : we, plugin: Me ? void 0 : ke, context: We ? void 0 : Z.context },
    lt = Me && We,
    Je = lt ? void 0 : engine.retell(Ae.made.ran, ze);
  if (!lt && Je === void 0)
    logForDebugging(
      `command.run /${input.command}: a hook's own answer after next() dropped; the command ran and its effect is not a record the answer can stand on (hooked by ${L.join("+")})`,
    );
  let pt = Je !== void 0,
    Et = pt && ze.text !== void 0,
    yt = pt && ze.context !== void 0;
  return (
    queued?.settle(Nde(Et ? Z.text : Ae.made.text, yt ? Z.context : Ae.made.context, exitCode)),
    mgt({ kind: "engine", ran: Je ?? Ae.made.ran }, exitCode)
  );
}
//@ chunk-e6aww6q8.js:5046561-5046587 placement
var VPs = UI_ENV_SITE_RULES["command.run"];
//@ chunk-e6aww6q8.js:5046587-5046674 placement
var iUo = (e, n, r) => ({
  command: getCommandName_2(e),
  args: n,
  origin: { kind: "composer" },
  presentation: viewportInfo(r),
});
//@ chunk-e6aww6q8.js:5046674-5046732 placement
var s5n = "the turn was interrupted before the command ran";
/**
 * 命令被中断时的处理结果：插件排队或关闭时不留消息，静默中止只留输入，否则加中断标记；不查询模型。
 */
//@ chunk-e6aww6q8.js:5046732-5046890 placement
function interruptedCommandResult({
  signal: signal,
  typed: typed,
  marker: marker,
  isQueuedByPlugin: isQueuedByPlugin,
}) {
  let h = unwrapAbortReason(signal.reason),
    y = isQueuedByPlugin || h === "shutdown",
    S = isSilentAbortReason(h);
  return { messages: y ? [] : S ? typed : [...typed, marker], shouldQuery: !1 };
}
//@ chunk-e6aww6q8.js:5046890-5047022 placement
var COMMAND_DID_NOT_RUN_MESSAGE =
  "the command did not go through command.run (no command of that name was enabled by then, or it was refused before it ran)";
//@ chunk-e6aww6q8.js:5047022-5047057 placement
var a5n = new HostScoped(() => ({ watching: !1 }));
/**
 * 排队命令的等待者表：按 uuid 登记，命令丢弃时以错误结算。
 */
//@ chunk-e6aww6q8.js:5047057-5047470 placement
function createQueuedCommandWaiters() {
  let e = new Map();
  function n(s) {
    let h = e.get(s);
    return (e.delete(s), h);
  }
  function r(s, h) {
    for (let y of s) if (y.uuid !== void 0) n(y.uuid)?.fail(new HooksError(h));
  }
  return {
    record: (s, h) => {
      let y = onProcessRootHost(a5n);
      if (!y.watching)
        ((y.watching = !0),
          bVe.subscribe((S) => r(S, "the command was removed from the queue before it ran")),
          lhn.subscribe((S) => r(S, "the command left the queue as text for the model; it did not run")));
      e.set(s, h);
    },
    take: n,
  };
}
//@ chunk-e6aww6q8.js:5047470-5047484 placement
var dLe = createQueuedCommandWaiters();
/**
 * 取出排队命令对应的等待者，提供 settle/fail/handOn；释放时未结算则以"未经 command.run"失败。
 */
//@ chunk-e6aww6q8.js:5047484-5047815 placement
function takeQueuedCommandWaiter(e) {
  let n = e === void 0 ? void 0 : dLe.take(e),
    r = !1;
  return {
    origin: n?.origin,
    settle(s) {
      ((r = !0), n?.settle(s));
    },
    fail(s) {
      ((r = !0), n?.fail(s));
    },
    handOn(s) {
      if (r || n === void 0 || e === void 0) return;
      ((r = !0),
        dLe.record(e, n),
        s.addEventListener(
          "abort",
          () => {
            dLe.take(e)?.fail(new HooksError(s5n));
          },
          { once: !0 },
        ));
    },
    [Symbol.dispose]() {
      if (!r) ((r = !0), n?.fail(new HooksError(COMMAND_DID_NOT_RUN_MESSAGE)));
    },
  };
}
//@ chunk-e6aww6q8.js:5047815-5047850 placement
var Yjt = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:5047850-5047906 placement
function aUo(e) {
  let n = Yjt.get(e);
  return (Yjt.delete(e), n);
}
/**
 * 若当前有同名同参的 command.run 分发在等，返回它以加入；释放时未加入则停止该分发。
 */
//@ chunk-e6aww6q8.js:5047906-5048261 placement
function joinCommandRunDispatch(e) {
  let n = e === void 0 ? void 0 : aUo(e),
    r = !1;
  return {
    join(s, h, y) {
      let S = n?.input.command === s.command && n.input.args === s.args;
      if (n === void 0 || !S) return;
      if (((r = !0), n.seat(h), y?.aborted)) n.stop(y.reason);
      return (y?.addEventListener("abort", () => n.stop(y.reason), { once: !0 }), n);
    },
    [Symbol.dispose]() {
      if (!r) n?.stop("the dispatch ended without running the command");
    },
  };
}
//@ chunk-e6aww6q8.js:5048261-5048339 placement
var VDr = (e, n) =>
  new Promise((r, s) => {
    dLe.record(e, { origin: n, settle: r, fail: s });
  });
//@ chunk-e6aww6q8.js:5048339-5048374 placement
var MZ = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:5048374-5048410 placement
var B1r = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:5048410-5048434 placement
var oMs = new HostScoped(() => createSignal());
//@ chunk-e6aww6q8.js:5048434-5048473 placement
function rMs() {
  return oMs.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:5048473-5048489 placement
var h0e = createLazySignal(rMs);

export {
  MZ,
  B1r,
  iUo,
  dispatchCommandRunHooks,
  h0e,
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
  Yjt,
  VPs,
  VDr,
  aUo,
};
