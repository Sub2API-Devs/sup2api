/**
 * plugins/functionHooks/sessionReceive.ts
 *
 * 2.1.316 新增：session.receive 事件钩子（处理收到的消息）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { dropHopChain } from "../../utils/peerMessageHeaders.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { HooksError } from "./hooksErrors.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";

//@ chunk-e6aww6q8.js:71511-71595 placement
var ANe = (e, n) => e.flatMap((r) => (r.type === "text" && r.text !== void 0 ? [r.text] : [])).join(n);
//@ chunk-e6aww6q8.js:71595-71739 placement
function receivedText(e, n) {
  let s = e.kind === "peer" ? dropHopChain : (y) => y;
  return typeof n === "string"
    ? s(n)
    : ANe(
        n.map((y) => (y.type === "text" ? { ...y, text: s(y.text) } : y)),
        `
`,
      );
}
//@ chunk-e6aww6q8.js:71739-71797 placement
var a_t = "a hook answered without passing the delivery on";
//@ chunk-e6aww6q8.js:71797-71912 placement
var RECEIVE_NOT_QUEUED_MESSAGE =
  "session.receive: the delivery was not queued (the drain refused or held it after the hooks passed it on)";
//@ chunk-e6aww6q8.js:71912-71999 placement
var d_t = (e, n) => ({ queued: () => e.done({ text: n.text }), [Symbol.dispose]: e[Symbol.dispose] });
/**
 * 把投递来源（对等或协调者，交还除外）转换为附件中的来源描述。
 */
//@ chunk-e6aww6q8.js:71999-72174 placement
function agentMessageOrigin(e) {
  if (e?.kind !== "peer" && e?.kind !== "coordinator") return;
  if (e.kind === "peer" && e.handback === !0) return;
  let { kind: kind, plugin: plugin } = e;
  return { kind: kind, ...(plugin !== void 0 && { plugin: plugin }) };
}
/**
 * 代理消息接收槽：有接收器时经 session.receive 钩子处理，可被消费或改写后入队。
 */
//@ chunk-e6aww6q8.js:72174-72503 placement
function createDeliveryReceiverSlot() {
  let e = pu();
  return {
    setDeliveryReceiver: e.set,
    receiveAgentMessage: async (n, r, s) => {
      let h = e.get();
      if (!h) return { text: r };
      let y = await h({ origin: n, content: r, ...(s !== void 0 && { agentId: s }) });
      if (y.consumed !== void 0) return { consumed: y.consumed };
      using queueing = y.queueing;
      queueing.queued();
      let { content: content } = y;
      return { text: typeof content === "string" ? content : r };
    },
  };
}
//@ chunk-e6aww6q8.js:72503-72517 placement
var Zle = createDeliveryReceiverSlot();
/**
 * 队友邮箱消息的来源：已验证且来自 team-lead 为 coordinator，否则 peer，附带插件与队友名。
 */
//@ chunk-e6aww6q8.js:72517-72663 placement
function teammateMessageOrigin(e, n) {
  return {
    kind: n && e.from === TEAM_LEAD ? "coordinator" : "peer",
    ...(e.from_plugin !== void 0 && { plugin: e.from_plugin }),
    teammate: e.from,
    isVerified: n,
  };
}
//@ chunk-e6aww6q8.js:72663-72695 placement
var receiveAgentMessage = Zle.receiveAgentMessage;
//@ chunk-e6aww6q8.js:72695-72727 placement
var setDeliveryReceiver = Zle.setDeliveryReceiver;
//@ chunk-e6aww6q8.js:72727-72799 placement
var D1r = (e) => ({ name: "core", isCore: !0, budgetMs: 0, run: (n) => e.perform(n) });
/**
 * 等待钩子链要么把事件传到核心（arrived），要么直接作答（answered），后者释放核心。
 */
//@ chunk-e6aww6q8.js:72799-72985 placement
async function awaitArrivalOrAnswer(e, n) {
  if (
    (await Promise.race([
      e.arrived,
      n.then(
        () => {
          return;
        },
        () => {
          return;
        },
      ),
    ]),
    e.hasArrived())
  )
    return { arrived: await e.arrived };
  return (e[Symbol.dispose](), { answered: await n });
}
/**
 * 核心交接器：perform 记录到达的参数并返回结果 Promise，done/failed 结算，dispose 以给定消息失败。
 */
//@ chunk-e6aww6q8.js:72985-73305 placement
function createCoreHandoff(e) {
  let withResolvers = Promise.withResolvers(),
    withResolvers_2 = Promise.withResolvers(),
    s = !1,
    h = !1;
  withResolvers_2.promise.catch(() => {
    return;
  });
  function y(S) {
    if (!h) ((h = !0), withResolvers_2.reject(S));
  }
  return {
    perform(S) {
      if (!s) ((s = !0), withResolvers.resolve(S));
      return withResolvers_2.promise;
    },
    arrived: withResolvers.promise,
    hasArrived: () => s,
    done(S) {
      if (!h) ((h = !0), withResolvers_2.resolve(S));
    },
    failed: y,
    [Symbol.dispose]() {
      y(new HooksError(e));
    },
  };
}
//@ chunk-e6aww6q8.js:73305-73380 placement
var freeze_3 = Object.freeze({
  queued: () => {
    return;
  },
  [Symbol.dispose]: () => {
    return;
  },
});
//@ chunk-e6aww6q8.js:73380-73484 placement
function replaceTextContent(e, n) {
  return typeof e === "string" ? n : [{ type: "text", text: n }, ...e.filter((s) => s.type !== "text")];
}
/**
 * 运行 session.receive 钩子链，钩子消费的消息不再入队。
 */
//@ chunk-e6aww6q8.js:73484-74082 placement
async function dispatchSessionReceiveHooks(e) {
  let { origin: origin, content: content, event: event, agentId: agentId } = e,
    y = { origin: origin, ...(agentId !== void 0 && { agentId: agentId }) };
  if (!hasModuleHookingSite("session.receive", y)) return { content: content, queueing: freeze_3 };
  let S = receivedText(origin, content),
    w = createCoreHandoff(RECEIVE_NOT_QUEUED_MESSAGE),
    L = await awaitArrivalOrAnswer(
      w,
      NO_CORE_AT_CHAIN_BOTTOM("session.receive", { core: { "session.receive": D1r(w) } })({
        origin: origin,
        text: S,
        ...(event !== void 0 && { event: event }),
        ...(agentId !== void 0 && { agentId: agentId }),
      }),
    );
  if (!L.arrived) {
    let Z = L.answered.consumed ?? a_t;
    return (
      logForDebugging(
        `session.receive (${origin.kind}): consumed by a hook (${Z}; hooked by ` +
          pluginsMatchingEvent("session.receive", y).join("+") +
          "); not queued",
      ),
      { consumed: Z }
    );
  }
  let { arrived: arrived } = L;
  return {
    content: arrived.text === S ? content : replaceTextContent(content, arrived.text),
    queueing: d_t(w, arrived),
  };
}
//@ chunk-e6aww6q8.js:74082-74091 placement
setDeliveryReceiver(dispatchSessionReceiveHooks);

export {
  dispatchSessionReceiveHooks,
  createCoreHandoff,
  awaitArrivalOrAnswer,
  D1r,
  ANe,
  agentMessageOrigin,
  receiveAgentMessage,
  teammateMessageOrigin,
};
