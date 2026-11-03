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
/**
 * 拼接文本块
 */
var joinTextBlocks = (e, n) =>
  e.flatMap((r) => (r.type === "text" && r.text !== undefined ? [r.text] : [])).join(n);
//@ chunk-e6aww6q8.js:71595-71739 placement
function receivedText(origin, content) {
  let s = origin.kind === "peer" ? dropHopChain : (y) => y;
  return typeof content === "string"
    ? s(content)
    : joinTextBlocks(
        content.map((y) =>
          y.type === "text"
            ? {
                ...y,
                text: s(y.text),
              }
            : y,
        ),
        `
`,
      );
}
//@ chunk-e6aww6q8.js:71739-71797 placement
/**
 * 钩子未放行投递
 */
var DELIVERY_NOT_PASSED = "a hook answered without passing the delivery on";
//@ chunk-e6aww6q8.js:71797-71912 placement
var RECEIVE_NOT_QUEUED_MESSAGE =
  "session.receive: the delivery was not queued (the drain refused or held it after the hooks passed it on)";
//@ chunk-e6aww6q8.js:71912-71999 placement
/**
 * 排队投递结果
 */
var queuedDelivery = (coreHandoff, arrived) => ({
  queued: () =>
    coreHandoff.done({
      text: arrived.text,
    }),
  [Symbol.dispose]: coreHandoff[Symbol.dispose],
});
//@ chunk-e6aww6q8.js:71999-72174 placement
/**
 * 把投递来源（对等或协调者，交还除外）转换为附件中的来源描述。
 */
function agentMessageOrigin(origin) {
  if (origin?.kind !== "peer" && origin?.kind !== "coordinator") return;
  if (origin.kind === "peer" && origin.handback === true) return;
  let { kind, plugin } = origin;
  return {
    kind,
    ...(plugin !== undefined && {
      plugin,
    }),
  };
}
//@ chunk-e6aww6q8.js:72174-72503 placement
/**
 * 代理消息接收槽：有接收器时经 session.receive 钩子处理，可被消费或改写后入队。
 */
function createDeliveryReceiverSlot() {
  let e = pu();
  return {
    setDeliveryReceiver: e.set,
    receiveAgentMessage: async (origin, r, s) => {
      let h = e.get();
      if (!h)
        return {
          text: r,
        };
      let y = await h({
        origin,
        content: r,
        ...(s !== undefined && {
          agentId: s,
        }),
      });
      if (y.consumed !== undefined)
        return {
          consumed: y.consumed,
        };
      using queueing = y.queueing;
      queueing.queued();
      let { content } = y;
      return {
        text: typeof content === "string" ? content : r,
      };
    },
  };
}
//@ chunk-e6aww6q8.js:72503-72517 placement
/**
 * 投递接收槽
 */
var deliveryReceiverSlot = createDeliveryReceiverSlot();
//@ chunk-e6aww6q8.js:72517-72663 placement
/**
 * 队友邮箱消息的来源：已验证且来自 team-lead 为 coordinator，否则 peer，附带插件与队友名。
 */
function teammateMessageOrigin(e, n) {
  return {
    kind: n && e.from === TEAM_LEAD ? "coordinator" : "peer",
    ...(e.from_plugin !== undefined && {
      plugin: e.from_plugin,
    }),
    teammate: e.from,
    isVerified: n,
  };
}
//@ chunk-e6aww6q8.js:72663-72695 placement
var receiveAgentMessage = deliveryReceiverSlot.receiveAgentMessage;
//@ chunk-e6aww6q8.js:72695-72727 placement
var setDeliveryReceiver = deliveryReceiverSlot.setDeliveryReceiver;
//@ chunk-e6aww6q8.js:72727-72799 placement
/**
 * 执行核心步骤
 */
var performCoreStep = (coreHandoff) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: (n) => coreHandoff.perform(n),
});
//@ chunk-e6aww6q8.js:72799-72985 placement
/**
 * 等待钩子链要么把事件传到核心（arrived），要么直接作答（answered），后者释放核心。
 */
async function awaitArrivalOrAnswer(coreHandoff, n) {
  await Promise.race([
    coreHandoff.arrived,
    n.then(
      () => {
        return;
      },
      () => {
        return;
      },
    ),
  ]);
  if (coreHandoff.hasArrived())
    return {
      arrived: await coreHandoff.arrived,
    };
  coreHandoff[Symbol.dispose]();
  return {
    answered: await n,
  };
}
//@ chunk-e6aww6q8.js:72985-73305 placement
/**
 * 核心交接器：perform 记录到达的参数并返回结果 Promise，done/failed 结算，dispose 以给定消息失败。
 */
function createCoreHandoff(e) {
  let deferred = Promise.withResolvers();
  let deferred_2 = Promise.withResolvers();
  let s = false;
  let h = false;
  deferred_2.promise.catch(() => {
    return;
  });
  function y(S) {
    if (!h) {
      h = true;
      deferred_2.reject(S);
    }
  }
  return {
    perform(S) {
      if (!s) {
        s = true;
        deferred.resolve(S);
      }
      return deferred_2.promise;
    },
    arrived: deferred.promise,
    hasArrived: () => s,
    done(S) {
      if (!h) {
        h = true;
        deferred_2.resolve(S);
      }
    },
    failed: y,
    [Symbol.dispose]() {
      y(new HooksError(e));
    },
  };
}
//@ chunk-e6aww6q8.js:73305-73380 placement
var p_t = Object.freeze({
  queued: () => {
    return;
  },
  [Symbol.dispose]: () => {
    return;
  },
});
//@ chunk-e6aww6q8.js:73380-73484 placement
function replaceTextContent(content, text) {
  return typeof content === "string"
    ? text
    : [
        {
          type: "text",
          text,
        },
        ...content.filter((s) => s.type !== "text"),
      ];
}
//@ chunk-e6aww6q8.js:73484-74082 placement
/**
 * 运行 session.receive 钩子链，钩子消费的消息不再入队。
 */
async function dispatchSessionReceiveHooks(e) {
  let { origin, content, event, agentId } = e;
  let y = {
    origin,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
  if (!hasModuleHookingSite("session.receive", y))
    return {
      content,
      queueing: p_t,
    };
  let S = receivedText(origin, content);
  let coreHandoff = createCoreHandoff(RECEIVE_NOT_QUEUED_MESSAGE);
  let L = await awaitArrivalOrAnswer(
    coreHandoff,
    NO_CORE_AT_CHAIN_BOTTOM("session.receive", {
      core: {
        "session.receive": performCoreStep(coreHandoff),
      },
    })({
      origin,
      text: S,
      ...(event !== undefined && {
        event,
      }),
      ...(agentId !== undefined && {
        agentId,
      }),
    }),
  );
  if (!L.arrived) {
    let consumed = L.answered.consumed ?? DELIVERY_NOT_PASSED;
    logForDebugging(
      `session.receive (${origin.kind}): consumed by a hook (${consumed}; hooked by ` +
        pluginsMatchingEvent("session.receive", y).join("+") +
        "); not queued",
    );
    return {
      consumed,
    };
  }
  let { arrived } = L;
  return {
    content: arrived.text === S ? content : replaceTextContent(content, arrived.text),
    queueing: queuedDelivery(coreHandoff, arrived),
  };
}
//@ chunk-e6aww6q8.js:74082-74091 placement
setDeliveryReceiver(dispatchSessionReceiveHooks);
export {
  dispatchSessionReceiveHooks,
  createCoreHandoff,
  awaitArrivalOrAnswer,
  performCoreStep,
  joinTextBlocks,
  agentMessageOrigin,
  receiveAgentMessage,
  teammateMessageOrigin,
};
